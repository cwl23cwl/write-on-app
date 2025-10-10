import { FONT_FAMILY, getSceneVersion } from "@excalidraw/excalidraw";
import { createCanvasAdapter } from "./CanvasAdapter";
import { getSafeDPR } from "./environment";
import type {
  AdapterPoint,
  AdapterTextPreset,
  AdapterToolName,
  ActiveToolChangeHandler,
  CanvasAdapter,
  CanvasSceneData,
  CanvasSceneSnapshot,
  ExcalidrawAdapterContract,
  ExcalidrawAdapterOptions,
  ExcalidrawAPILike,
  ExportPNGOptions,
  ReadyHandler,
  SceneChangeHandler,
  SceneMetadata,
  SelectionChangeHandler,
} from "./types/public";

type PendingOperation = () => void;

const DEFAULT_PAGE_WIDTH = 1200;
const DEFAULT_PAGE_HEIGHT = 2200;

const DEFAULT_PEN_COLOR = "#111827";
const DEFAULT_HIGHLIGHTER_COLOR = "#facc15";
const DEFAULT_TEXT_COLOR = "#1f2937";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const toOpacity = (percent: number): number => {
  if (!Number.isFinite(percent)) return 1;
  return clamp(percent / 100, 0, 1);
};

const isNonDeletedElement = (element: any): element is { id: string; isDeleted?: boolean } =>
  element && typeof element === "object" && typeof element.id === "string" && !element.isDeleted;

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

function elementsSignature(elements: readonly unknown[] | undefined): string {
  if (!Array.isArray(elements) || elements.length === 0) return "[]";
  const tokens: string[] = [];
  for (const element of elements) {
    if (!isObject(element)) continue;
    const id = typeof element.id === "string" ? element.id : "";
    const version = typeof element.version === "number" ? element.version : 0;
    const nonce = typeof element.versionNonce === "number" ? element.versionNonce : 0;
    tokens.push(`${id}:${version}:${nonce}`);
  }
  tokens.sort();
  return tokens.join("|");
}

function shallowArrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function normalizeSnapshot(snapshot: Record<string, unknown>): CanvasSceneData {
  const elements = Array.isArray(snapshot.elements) ? snapshot.elements.slice() : [];
  const appState = isObject(snapshot.appState) ? { ...snapshot.appState } : {};
  const files = isObject(snapshot.files) ? { ...snapshot.files } : undefined;
  return { elements, appState, files };
}

function getSelectedIds(appState: Record<string, unknown> | undefined): string[] {
  if (!appState || typeof appState !== "object") return [];
  const map = appState.selectedElementIds as Record<string, boolean> | undefined;
  if (!map) return [];
  return Object.keys(map).filter((key) => map[key]);
}

function nextFontId(name: string): number {
  const entry = Object.entries(FONT_FAMILY).find(([key]) => key.toLowerCase() === name.toLowerCase());
  if (entry) return entry[1] as number;
  if (typeof FONT_FAMILY.Excalifont === "number") return FONT_FAMILY.Excalifont;
  // Fallback to first value
  const first = Object.values(FONT_FAMILY).find((value) => typeof value === "number");
  return typeof first === "number" ? first : 1;
}

interface PenStyleState {
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

interface TextStyleState {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strokeColor: string;
  backgroundColor: string | null;
  borderColor: string | null;
}

export class ExcalidrawAdapterImpl implements ExcalidrawAdapterContract {
  private readonly canvas: CanvasAdapter;
  private readonly debug: boolean;

  private host: HTMLElement | null = null;
  private api: ExcalidrawAPILike | null = null;
  private readyState = false;

  private selection: string[] = [];
  private activeTool: AdapterToolName = "hand";
  private lastDrawTool: AdapterToolName = "pen";

  private penStyle: PenStyleState = {
    strokeColor: DEFAULT_PEN_COLOR,
    strokeWidth: 4,
    opacity: 1,
  };

  private highlighterStyle: PenStyleState = {
    strokeColor: DEFAULT_HIGHLIGHTER_COLOR,
    strokeWidth: 16,
    opacity: 0.45,
  };

  private textStyle: TextStyleState = {
    fontFamily: "Excalifont",
    fontSize: 28,
    bold: false,
    italic: false,
    underline: false,
    strokeColor: DEFAULT_TEXT_COLOR,
    backgroundColor: null,
    borderColor: null,
  };

  private eraserMode: "stroke" | "pixel" = "stroke";

  private baselineSignature: string | null = null;
  private lastSignature: string | null = null;
  private sceneVersion = 0;
  private dirtyFlag = false;
  private canUndoFlag = false;
  private canRedoFlag = false;
  private elementsCount = 0;

  private selectionListeners = new Set<SelectionChangeHandler>();
  private activeToolListeners = new Set<ActiveToolChangeHandler>();
  private sceneListeners = new Set<SceneChangeHandler>();
  private readyListeners = new Set<ReadyHandler>();

  private pendingOps: PendingOperation[] = [];
  private sceneUnsubscribe: (() => void) | null = null;

  constructor(options: ExcalidrawAdapterOptions = {}) {
    this.debug = Boolean(options.debug);
    this.canvas = createCanvasAdapter({ debug: this.debug });
    this.sceneUnsubscribe = this.canvas.onSceneChange((snapshot) => this.handleSceneChange(snapshot));

    if (options.host) {
      this.attachHost(options.host);
    }
  }

  attachHost(host: HTMLElement): void {
    if (!host) {
      throw new Error("attachHost requires a host element");
    }
    if (this.host === host) {
      return;
    }

    this.detachHost();
    this.host = host;

    try {
      this.canvas.mount(host);
    } catch (error) {
      this.log("Failed to mount canvas adapter", error);
    }

    // Attempt to hydrate ready state if API already available
    const existingApi = this.canvas.getImperativeApi();
    if (existingApi) {
      this.handleEngineReady(existingApi);
    }
  }

  detachHost(): void {
    this.api = null;
    this.readyState = false;
    if (this.host) {
      try {
        this.canvas.unmount();
      } catch (error) {
        this.log("Failed to unmount canvas adapter", error);
      }
    }
    this.host = null;
  }

  ready(): boolean {
    return this.readyState;
  }

  focusCanvas(): void {
    if (this.dispatchHostEvent("writeon:adapter-focus-canvas")) {
      return;
    }
    const canvas = this.resolveInteractiveCanvas();
    if (canvas) {
      if (canvas.tabIndex < 0) canvas.tabIndex = -1;
      try {
        canvas.focus({ preventScroll: true });
      } catch {}
    }
  }

  setPageSize(width: number, height: number): void {
    const safeWidth = Number.isFinite(width) ? Math.max(1, Math.round(width)) : DEFAULT_PAGE_WIDTH;
    const safeHeight = Number.isFinite(height) ? Math.max(1, Math.round(height)) : DEFAULT_PAGE_HEIGHT;
    this.canvas.syncSize({ width: safeWidth, height: safeHeight });
  }

  setPageScale(scale: number, effectiveDPR: number): void {
    const safeScale = Number.isFinite(scale) ? scale : 1;
    const safeDpr = Number.isFinite(effectiveDPR) ? effectiveDPR : 1;
    this.canvas.setPageScale(safeScale, safeDpr);
  }

  setTool(tool: AdapterToolName): void {
    this.runOrQueue(() => this.applyTool(tool));
  }

  setStrokeWidth(px: number): void {
    this.runOrQueue(() => this.applyStrokeWidth(px));
  }

  setStrokeColor(hex: string): void {
    this.runOrQueue(() => this.applyStrokeColor(hex));
  }

  setFillColor(hex: string | null): void {
    this.runOrQueue(() => {
      this.canvas.setFill(hex);
      this.textStyle.backgroundColor = hex ?? null;
    });
  }

  setOpacity(percent: number): void {
    this.runOrQueue(() => {
      const value = toOpacity(percent);
      if (this.activeTool === "highlighter") {
        this.highlighterStyle.opacity = value;
      }
      this.canvas.setOpacity(value);
    });
  }

  setEraserMode(mode: "stroke" | "pixel"): void {
    this.runOrQueue(() => {
      this.eraserMode = mode === "pixel" ? "pixel" : "stroke";
      this.canvas.setEraserMode(this.eraserMode);
    });
  }

  addTextAt(point: AdapterPoint, preset?: AdapterTextPreset): void {
    const payload = {
      point,
      preset: preset ?? this.currentTextPreset(),
    };
    if (!this.dispatchHostEvent("writeon:adapter-add-text", payload)) {
      this.log("Host did not handle add-text event");
    }
  }

  commitText(): void {
    if (this.dispatchHostEvent("writeon:adapter-commit-text")) {
      return;
    }
    const api = this.ensureApi();
    if (!api?.updateScene) return;
    try {
      api.updateScene({
        appState: { editingElement: null, selectedElementIds: {} },
        commitToHistory: true,
      });
    } catch (error) {
      this.log("commitText failed", error);
    }
  }

  toggleTextStyle(style: "bold" | "italic" | "underline"): void {
    this.runOrQueue(() => {
      const appState = this.api?.getAppState?.() ?? {};
      const next = !this.readCurrentTextStyle(style, appState);
      this.applyTextStyle(style, next);
    });
  }

  setFontFamily(name: string): void {
    this.runOrQueue(() => {
      const familyId = nextFontId(name);
      this.textStyle.fontFamily = name;
      this.canvas.setTextStyle({ fontFamily: familyId });
    });
  }

  setFontSize(px: number): void {
    this.runOrQueue(() => {
      const size = Number.isFinite(px) ? Math.max(1, Math.round(px)) : this.textStyle.fontSize;
      this.textStyle.fontSize = size;
      this.canvas.setTextStyle({ fontSize: size });
    });
  }

  setTextBgFill(color: string | null): void {
    this.setFillColor(color);
  }

  setTextBorder(color: string | null): void {
    this.runOrQueue(() => {
      const stroke = color ?? DEFAULT_TEXT_COLOR;
      this.textStyle.borderColor = color;
      this.canvas.setStroke(stroke, undefined);
    });
  }

  selectAll(): void {
    this.runOrQueue(() => {
      const api = this.ensureApi();
      if (!api?.updateScene) return;
      const elements = api.getSceneElements?.() ?? [];
      const selected: Record<string, boolean> = {};
      for (const element of elements) {
        if (isNonDeletedElement(element)) {
          selected[element.id] = true;
        }
      }
      try {
        api.updateScene({ appState: { selectedElementIds: selected }, commitToHistory: false });
      } catch (error) {
        this.log("selectAll failed", error);
      }
    });
  }

  clearSelection(): void {
    this.runOrQueue(() => {
      const api = this.ensureApi();
      if (!api?.updateScene) return;
      try {
        api.updateScene({ appState: { selectedElementIds: {} }, commitToHistory: false });
      } catch (error) {
        this.log("clearSelection failed", error);
      }
    });
  }

  deleteSelection(): void {
    this.runOrQueue(() => this.deleteSelectedElements());
  }

  bringToFront(): void {
    this.runOrQueue(() => this.restackSelection("front"));
  }

  sendToBack(): void {
    this.runOrQueue(() => this.restackSelection("back"));
  }

  undo(): void {
    this.canvas.undo();
  }

  redo(): void {
    this.canvas.redo();
  }

  isDirty(): boolean {
    return this.dirtyFlag;
  }

  canUndo(): boolean {
    return this.canUndoFlag;
  }

  canRedo(): boolean {
    return this.canRedoFlag;
  }

  async loadSnapshot(snapshot: Record<string, unknown>): Promise<void> {
    const normalized = normalizeSnapshot(snapshot);
    await this.canvas.loadScene(normalized);
    this.baselineSignature = elementsSignature(normalized.elements);
    this.lastSignature = this.baselineSignature;
    this.dirtyFlag = false;
  }

  exportSnapshot(): Record<string, unknown> {
    const scene = this.canvas.getScene() ?? {};
    return {
      elements: Array.isArray(scene.elements) ? scene.elements.slice() : [],
      appState: scene.appState ? { ...scene.appState } : {},
      files: scene.files ? { ...scene.files } : {},
    };
  }

  async importSVG(svgText: string): Promise<void> {
    if (typeof svgText !== "string" || !svgText.trim()) {
      throw new Error("importSVG expects a non-empty string");
    }
    if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      const parserError = doc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid SVG payload");
      }
    }
    if (!this.dispatchHostEvent("writeon:adapter-import-svg", { svg: svgText })) {
      this.log("Host ignored import-svg event");
    }
  }

  exportPNG(options?: ExportPNGOptions): Promise<Blob> {
    return this.canvas.exportPNG(options);
  }

  onSelectionChange(cb: SelectionChangeHandler): () => void {
    this.selectionListeners.add(cb);
    cb(this.selection.slice());
    return () => this.selectionListeners.delete(cb);
  }

  onActiveToolChange(cb: ActiveToolChangeHandler): () => void {
    this.activeToolListeners.add(cb);
    cb(this.activeTool);
    return () => this.activeToolListeners.delete(cb);
  }

  onSceneChange(cb: SceneChangeHandler): () => void {
    this.sceneListeners.add(cb);
    cb({ elements: this.elementsCount, version: this.sceneVersion });
    return () => this.sceneListeners.delete(cb);
  }

  onReady(cb: ReadyHandler): () => void {
    this.readyListeners.add(cb);
    if (this.ready()) {
      cb();
    }
    return () => this.readyListeners.delete(cb);
  }

  /** Cleanup to avoid leaks. */
  dispose(): void {
    this.detachHost();
    if (this.sceneUnsubscribe) {
      this.sceneUnsubscribe();
      this.sceneUnsubscribe = null;
    }
    this.selectionListeners.clear();
    this.activeToolListeners.clear();
    this.sceneListeners.clear();
    this.readyListeners.clear();
    this.pendingOps.length = 0;
  }

  // == Internal =================================================================

  private runOrQueue(operation: PendingOperation): void {
    if (this.ready()) {
      try {
        operation();
      } catch (error) {
        this.log("Operation failed", error);
      }
      return;
    }
    this.pendingOps.push(operation);
  }

  private flushPending(): void {
    if (!this.ready()) return;
    while (this.pendingOps.length > 0) {
      const op = this.pendingOps.shift();
      if (!op) continue;
      try {
        op();
      } catch (error) {
        this.log("Queued operation failed", error);
      }
    }
  }

  private handleSceneChange(snapshot: CanvasSceneSnapshot): void {
    const api = this.canvas.getImperativeApi();
    if (api && !this.readyState) {
      this.handleEngineReady(api);
    }

    const appState = snapshot.appState ?? {};
    const selectionIds = Array.isArray(snapshot.selectionIds)
      ? snapshot.selectionIds.slice()
      : getSelectedIds(appState);
    if (!shallowArrayEqual(selectionIds, this.selection)) {
      this.selection = selectionIds;
      this.emitSelectionChange();
    }

    const signature = elementsSignature(snapshot.elements);
    this.lastSignature = signature;
    if (this.baselineSignature == null) {
      this.baselineSignature = signature;
    }
    const dirty = this.baselineSignature !== signature;
    if (dirty !== this.dirtyFlag) {
      this.dirtyFlag = dirty;
    }

    this.updateHistoryFlags(appState);
    this.syncActiveTool(appState);

    const elementsCount = Array.isArray(snapshot.elements) ? snapshot.elements.length : 0;
    this.elementsCount = elementsCount;
    const version = Array.isArray(snapshot.elements)
      ? getSceneVersion(snapshot.elements as any)
      : this.sceneVersion + 1;
    this.sceneVersion = version;
    this.emitSceneChange({ elements: elementsCount, version });
  }

  private handleEngineReady(api: ExcalidrawAPILike): void {
    if (this.readyState && this.api === api) {
      return;
    }
    this.api = api;
    this.readyState = true;

    const scene = this.canvas.getScene();
    this.baselineSignature = elementsSignature(scene?.elements);
    this.lastSignature = this.baselineSignature;
    this.dirtyFlag = false;
    this.updateHistoryFlags(api.getAppState?.());

    this.flushPending();
    this.emitReady();
  }

  private applyTool(tool: AdapterToolName): void {
    const canvasToolMap: Record<AdapterToolName, "pen" | "textbox" | "eraser" | "hand" | "select"> = {
      pen: "pen",
      highlighter: "pen",
      eraser: "eraser",
      text: "textbox",
      hand: "hand",
    };
    const target = canvasToolMap[tool] ?? "hand";

    if (tool === "pen") {
      this.canvas.setActiveTool("pen");
      this.canvas.setStroke(this.penStyle.strokeColor, this.penStyle.strokeWidth);
      this.canvas.setOpacity(this.penStyle.opacity);
      this.canvas.setFill("transparent");
      this.lastDrawTool = "pen";
    } else if (tool === "highlighter") {
      this.canvas.setActiveTool("pen");
      this.canvas.setStroke(this.highlighterStyle.strokeColor, this.highlighterStyle.strokeWidth);
      this.canvas.setOpacity(this.highlighterStyle.opacity);
      this.canvas.setFill("transparent");
      this.lastDrawTool = "highlighter";
    } else if (tool === "text") {
      this.canvas.setActiveTool("textbox");
      this.canvas.setStroke(this.textStyle.strokeColor, undefined);
      this.canvas.setFill(this.textStyle.backgroundColor);
      this.canvas.setTextStyle({
        fontFamily: nextFontId(this.textStyle.fontFamily),
        fontSize: this.textStyle.fontSize,
        bold: this.textStyle.bold,
        italic: this.textStyle.italic,
        underline: this.textStyle.underline,
      });
    } else if (tool === "eraser") {
      this.canvas.setActiveTool("eraser");
      this.canvas.setEraserMode(this.eraserMode);
    } else {
      this.canvas.setActiveTool("hand");
    }

    this.activeTool = tool;
    this.emitActiveToolChange(tool);
  }

  private applyStrokeWidth(px: number): void {
    const width = Number.isFinite(px) ? Math.max(1, Math.round(px)) : 1;
    if (this.activeTool === "highlighter") {
      this.highlighterStyle.strokeWidth = width;
      this.canvas.setStroke(this.highlighterStyle.strokeColor, width);
    } else {
      this.penStyle.strokeWidth = width;
      this.canvas.setStroke(this.penStyle.strokeColor, width);
    }
  }

  private applyStrokeColor(hex: string): void {
    const color = typeof hex === "string" && hex.trim().length > 0 ? hex : DEFAULT_PEN_COLOR;
    if (this.activeTool === "highlighter") {
      this.highlighterStyle.strokeColor = color;
      this.canvas.setStroke(color, this.highlighterStyle.strokeWidth);
    } else if (this.activeTool === "text") {
      this.textStyle.strokeColor = color;
      this.canvas.setTextStyle({ color });
      this.canvas.setStroke(color, undefined);
    } else {
      this.penStyle.strokeColor = color;
      this.canvas.setStroke(color, this.penStyle.strokeWidth);
    }
  }

  private applyTextStyle(style: "bold" | "italic" | "underline", value: boolean): void {
    if (style === "bold") {
      this.textStyle.bold = value;
      this.canvas.setTextStyle({ bold: value });
    } else if (style === "italic") {
      this.textStyle.italic = value;
      this.canvas.setTextStyle({ italic: value });
    } else if (style === "underline") {
      this.textStyle.underline = value;
      this.canvas.setTextStyle({ underline: value });
    }
  }

  private readCurrentTextStyle(
    style: "bold" | "italic" | "underline",
    appState: Record<string, unknown>,
  ): boolean {
    if (style === "bold") {
      const weight = appState.currentItemFontWeight;
      if (typeof weight === "string") return weight === "bold";
      return this.textStyle.bold;
    }
    if (style === "italic") {
      const italic = appState.currentItemFontStyle;
      if (typeof italic === "string") return italic === "italic";
      return this.textStyle.italic;
    }
    const underline = appState.currentItemTextUnderline;
    if (typeof underline === "boolean") return underline;
    return this.textStyle.underline;
  }

  private currentTextPreset(): AdapterTextPreset {
    return {
      fontFamily: this.textStyle.fontFamily,
      fontSize: this.textStyle.fontSize,
      bold: this.textStyle.bold,
      italic: this.textStyle.italic,
      underline: this.textStyle.underline,
      bg: this.textStyle.backgroundColor,
      border: this.textStyle.borderColor,
    };
  }

  private deleteSelectedElements(): void {
    const api = this.ensureApi();
    if (!api?.updateScene) return;
    const elements = api.getSceneElements?.() ?? [];
    const appState = api.getAppState?.() ?? {};
    const selectedIds = new Set(getSelectedIds(appState));
    if (selectedIds.size === 0) return;
    const remaining = elements.filter((element) => !isNonDeletedElement(element) || !selectedIds.has(element.id));
    try {
      api.updateScene({ elements: remaining as any, commitToHistory: true });
    } catch (error) {
      this.log("deleteSelection failed", error);
    }
  }

  private restackSelection(direction: "front" | "back"): void {
    const api = this.ensureApi();
    if (!api?.updateScene) return;
    const elements = api.getSceneElements?.() ?? [];
    const appState = api.getAppState?.() ?? {};
    const selectedIds = new Set(getSelectedIds(appState));
    if (selectedIds.size === 0) return;

    const selected: any[] = [];
    const others: any[] = [];
    for (const element of elements) {
      if (isNonDeletedElement(element) && selectedIds.has(element.id)) {
        selected.push(element);
      } else {
        others.push(element);
      }
    }

    const reordered =
      direction === "front"
        ? [...others, ...selected]
        : [...selected, ...others];

    try {
      api.updateScene({ elements: reordered as any, commitToHistory: true });
    } catch (error) {
      this.log("restackSelection failed", error);
    }
  }

  private ensureApi(): ExcalidrawAPILike | null {
    if (this.api) return this.api;
    const api = this.canvas.getImperativeApi();
    if (api) {
      this.handleEngineReady(api);
    }
    return this.api;
  }

  private updateHistoryFlags(appState: Record<string, unknown> | undefined): void {
    if (!appState) return;
    const canUndo = Boolean((appState as any).canUndo);
    const canRedo = Boolean((appState as any).canRedo);
    this.canUndoFlag = canUndo || this.dirtyFlag;
    this.canRedoFlag = canRedo;
  }

  private syncActiveTool(appState: Record<string, unknown>): void {
    const activeTool = appState.activeTool;
    const toolType =
      typeof activeTool === "string"
        ? activeTool
        : isObject(activeTool) && typeof activeTool.type === "string"
        ? activeTool.type
        : "hand";

    let mapped: AdapterToolName = "hand";
    switch (toolType) {
      case "freedraw":
        mapped = this.lastDrawTool === "highlighter" ? "highlighter" : "pen";
        break;
      case "text":
        mapped = "text";
        break;
      case "eraser":
        mapped = "eraser";
        break;
      case "hand":
      case "selection":
      case "lasso":
        mapped = "hand";
        break;
      default:
        mapped = this.activeTool;
        break;
    }

    if (mapped !== this.activeTool) {
      this.activeTool = mapped;
      this.emitActiveToolChange(mapped);
    }
  }

  private emitSelectionChange(): void {
    const payload = this.selection.slice();
    this.selectionListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        this.log("selection listener failed", error);
      }
    });
  }

  private emitActiveToolChange(tool: AdapterToolName): void {
    this.activeToolListeners.forEach((listener) => {
      try {
        listener(tool);
      } catch (error) {
        this.log("active tool listener failed", error);
      }
    });
  }

  private emitSceneChange(meta: SceneMetadata): void {
    this.sceneListeners.forEach((listener) => {
      try {
        listener(meta);
      } catch (error) {
        this.log("scene listener failed", error);
      }
    });
  }

  private emitReady(): void {
    this.readyListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        this.log("ready listener failed", error);
      }
    });
  }

  private dispatchHostEvent(name: string, detail?: unknown): boolean {
    if (!this.host) return false;
    try {
      const event = new CustomEvent(name, { detail, bubbles: true, cancelable: false });
      return this.host.dispatchEvent(event);
    } catch (error) {
      this.log(`Failed to dispatch host event "${name}"`, error);
      return false;
    }
  }

  private resolveInteractiveCanvas(): HTMLCanvasElement | null {
    const node = this.host;
    if (!node) return null;
    const shadow = (node as HTMLElement & { shadowRoot?: ShadowRoot | null }).shadowRoot;
    if (!shadow) return null;
    const interactive = shadow.querySelector<HTMLCanvasElement>("canvas.excalidraw__canvas.interactive");
    return interactive ?? null;
  }

  private log(message: string, payload?: unknown): void {
    if (!this.debug) return;
    try {
      // eslint-disable-next-line no-console
      console.debug(`[ExcalidrawAdapter] ${message}`, payload ?? "");
    } catch {}
  }
}

let singleton: ExcalidrawAdapterImpl | null = null;

export function getExcalidrawAdapter(options: ExcalidrawAdapterOptions = {}): ExcalidrawAdapterContract {
  if (!singleton) {
    singleton = new ExcalidrawAdapterImpl(options);
  } else if (options.host) {
    singleton.attachHost(options.host);
  }
  return singleton;
}

export function disposeExcalidrawAdapter(): void {
  singleton?.dispose();
  singleton = null;
}

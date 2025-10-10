export interface ExcalidrawAPILike {
  setActiveTool?: (tool: { type: string }) => void;
  updateScene?: (scene: {
    elements?: readonly unknown[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
    commitToHistory?: boolean;
  }) => void;
  getAppState?: () => Record<string, unknown>;
  getSceneElements?: () => readonly unknown[];
  getFiles?: () => Record<string, unknown>;
  refresh?: () => void;
  history?: {
    undo?: () => void;
    redo?: () => void;
    clear?: () => void;
  };
}

export type CanvasToolName =
  | "select"
  | "pen"
  | "eraser"
  | "line"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "textbox"
  | "hand";

export interface CanvasPageSize {
  width: number;
  height: number;
}

export interface CanvasSceneData {
  elements?: readonly unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export interface CanvasSceneSnapshot extends CanvasSceneData {
  selectionIds: readonly string[];
}

export type SceneChangeCallback = (snapshot: CanvasSceneSnapshot) => void;

export interface ShapeStyleOptions {
  borderColor?: string | null;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  fill?: string | null;
  cornerRadius?: number;
}

export interface TextStyleOptions {
  fontFamily?: string | number;
  fontSize?: number;
  align?: "left" | "center" | "right";
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface ExportPNGOptions {
  scale?: number;
  includeBackground?: boolean;
  backgroundColor?: string;
}

export interface CanvasAdapterOptions {
  debug?: boolean;
}

export interface CanvasAdapter {
  mount(host: HTMLElement): void;
  unmount(): void;
  isReady(): boolean;
  setPageScale(scale: number, effectiveDpr: number): void;
  syncSize(size: CanvasPageSize): void;
  setActiveTool(tool: CanvasToolName): void;
  setStroke(color: string | null, width?: number): void;
  setFill(color: string | null): void;
  setOpacity(opacity: number): void;
  setEraserMode(mode: "stroke" | "pixel"): void;
  setTextStyle(style: TextStyleOptions): void;
  setShapeStyle(style: ShapeStyleOptions): void;
  createTextbox(initialText?: string): Promise<void>;
  exportPNG(options?: ExportPNGOptions): Promise<Blob>;
  exportSVG(): Promise<string>;
  undo(): void;
  redo(): void;
  loadScene(scene: CanvasSceneData | null): Promise<void>;
  getScene(): CanvasSceneData | null;
  onSceneChange(listener: SceneChangeCallback): () => void;
  getSelectionIds(): readonly string[];
  getImperativeApi(): ExcalidrawAPILike | null;
}

export type AdapterToolName = "pen" | "highlighter" | "eraser" | "text" | "hand";

export interface AdapterPoint {
  x: number;
  y: number;
}

export interface AdapterTextPreset {
  fontSize: number;
  fontFamily: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  bg?: string | null;
  border?: string | null;
}

export interface SceneMetadata {
  elements: number;
  version: number;
}

export type SelectionChangeHandler = (ids: string[]) => void;
export type ActiveToolChangeHandler = (tool: AdapterToolName) => void;
export type SceneChangeHandler = (meta: SceneMetadata) => void;
export type ReadyHandler = () => void;

export interface ExcalidrawAdapterOptions extends CanvasAdapterOptions {
  /**
   * Optional host element to mount immediately.
   */
  host?: HTMLElement | null;
  /**
   * Debug flag that enables verbose logging.
   */
  debug?: boolean;
}

export interface ExcalidrawAdapterContract {
  /** @internal - lifecycle */
  attachHost(host: HTMLElement): void;
  detachHost(): void;

  /** Session / Engine */
  ready(): boolean;
  focusCanvas(): void;
  setPageSize(width: number, height: number): void;
  setPageScale(scale: number, effectiveDPR: number): void;

  /** Tools */
  setTool(tool: AdapterToolName): void;
  setStrokeWidth(px: number): void;
  setStrokeColor(hex: string): void;
  setFillColor(hex: string | null): void;
  setOpacity(percent: number): void;
  setEraserMode(mode: "stroke" | "pixel"): void;

  /** Text */
  addTextAt(point: AdapterPoint, preset?: AdapterTextPreset): void;
  commitText(): void;
  toggleTextStyle(style: "bold" | "italic" | "underline"): void;
  setFontFamily(name: string): void;
  setFontSize(px: number): void;
  setTextBgFill(color: string | null): void;
  setTextBorder(color: string | null): void;

  /** Selection */
  selectAll(): void;
  clearSelection(): void;
  deleteSelection(): void;
  bringToFront(): void;
  sendToBack(): void;

  /** History */
  undo(): void;
  redo(): void;
  isDirty(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;

  /** Scene I/O */
  loadSnapshot(snapshot: Record<string, unknown>): Promise<void>;
  exportSnapshot(): Record<string, unknown>;
  importSVG(svgText: string): Promise<void>;
  exportPNG(options?: ExportPNGOptions): Promise<Blob>;

  /** Subscriptions */
  onSelectionChange(cb: SelectionChangeHandler): () => void;
  onActiveToolChange(cb: ActiveToolChangeHandler): () => void;
  onSceneChange(cb: SceneChangeHandler): () => void;
  onReady(cb: ReadyHandler): () => void;
}

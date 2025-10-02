import type {
  CanvasAdapter,
  CanvasAdapterOptions,
  CanvasPageSize,
  CanvasSceneData,
  CanvasSceneSnapshot,
  CanvasToolName,
  ExportPNGOptions,
  SceneChangeCallback,
  ShapeStyleOptions,
  TextStyleOptions,
} from "./types/public";

interface ExcalidrawAPILike {
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
  };
}

interface ReadyEventDetail {
  api: ExcalidrawAPILike | null;
}

interface SceneChangeEventDetail {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  files?: Record<string, unknown>;
}

const DEFAULT_PAGE_SIZE: CanvasPageSize = { width: 1200, height: 2200 };
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const MIN_EFFECTIVE_DPR = 0.5;
const MAX_EFFECTIVE_DPR = 4;
const ROUNDNESS_TYPE = 3;
const EPSILON = 0.0001;

const TOOL_TO_VENDOR: Record<CanvasToolName, string> = {
  select: "selection",
  pen: "freedraw",
  eraser: "eraser",
  line: "line",
  arrow: "arrow",
  rectangle: "rectangle",
  ellipse: "ellipse",
  textbox: "text",
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const nearlyEqual = (a: number, b: number, tolerance = EPSILON): boolean =>
  Math.abs(a - b) <= tolerance;

const cloneScene = (scene: CanvasSceneData | null): CanvasSceneData | null => {
  if (!scene) return null;
  return {
    elements: Array.isArray(scene.elements) ? scene.elements.slice() : [],
    appState: scene.appState ? { ...scene.appState } : undefined,
    files: scene.files ? { ...scene.files } : undefined,
  };
};

const extractSelectionIds = (appState: Record<string, unknown> | undefined): string[] => {
  const ids: string[] = [];
  if (!appState) return ids;
  const selected = appState.selectedElementIds as Record<string, boolean> | undefined;
  if (!selected) return ids;
  for (const key of Object.keys(selected)) {
    if (selected[key]) ids.push(key);
  }
  return ids;
};

class CanvasAdapterImpl implements CanvasAdapter {
  private readonly debug: boolean;
  private host: HTMLElement | null = null;
  private api: ExcalidrawAPILike | null = null;
  private mounted = false;
  private ready = false;
  private activeTool: CanvasToolName = "select";
  private pageSize: CanvasPageSize = { ...DEFAULT_PAGE_SIZE };
  private scale = 1;
  private effectiveDpr = 1;
  private physicalWidth = DEFAULT_PAGE_SIZE.width;
  private physicalHeight = DEFAULT_PAGE_SIZE.height;
  private lastScene: CanvasSceneData | null = null;
  private selectionIds: string[] = [];
  private sceneListeners = new Set<SceneChangeCallback>();
  private pendingOps: Array<() => void> = [];
  
  // Structured pending operations (replace-on-write, one per capability)
  private pendingTool: CanvasToolName | null = null;
  private pendingPageScale: { scale: number; dpr: number } | null = null;
  private pendingCanvasResolution: { width: number; height: number } | null = null;
  
  // H2: API version tracking to detect stale refs
  private apiVersion = 0;
  
  // Fix #5: React Strict Mode double-mount protection
  // In React 19/Next 15 strict mode, components mount/unmount/remount
  // Track instance ID to ignore stale ready events
  private static instanceCounter = 0;
  private readonly instanceId: number;

  constructor(options: CanvasAdapterOptions = {}) {
    this.debug = Boolean(options.debug);
    this.instanceId = ++CanvasAdapterImpl.instanceCounter;
    
    // H4: Log the complete tool mapping on construction
    if (this.debug) {
      console.info('[CanvasAdapter] Tool mapping table', TOOL_TO_VENDOR, { instanceId: this.instanceId });
    }
  }

  mount(host: HTMLElement): void {
    if (!host) {
      throw new Error("CanvasAdapter.mount requires a host element");
    }

    if (this.host === host && this.mounted) {
      return;
    }

    this.unmount();

    this.host = host;
    host.addEventListener("ready", this.handleReady as EventListener);
    host.addEventListener("scenechange", this.handleSceneChange as EventListener);
    host.addEventListener("error", this.handleError as EventListener);
    this.mounted = true;

    // If the host already dispatched a ready event before mount, attempt to read the API immediately
    try {
      const anyHost = host as unknown as { getExcalidrawAPI?: () => ExcalidrawAPILike | null };
      const api = anyHost.getExcalidrawAPI?.();
      if (api) {
        this.attachApi(api);
      }
    } catch {}

    this.applyPageMetrics();
  }

  unmount(): void {
    if (this.host) {
      try {
        this.host.removeEventListener("ready", this.handleReady as EventListener);
        this.host.removeEventListener("scenechange", this.handleSceneChange as EventListener);
        this.host.removeEventListener("error", this.handleError as EventListener);
      } catch {}
    }
    this.host = null;
    this.api = null;
    this.ready = false;
    this.mounted = false;
    this.pendingOps.length = 0;
  }

  isReady(): boolean {
    return this.ready;
  }

  setPageScale(scale: number, effectiveDpr: number): void {
    const normalizedScale = clamp(Number.isFinite(scale) ? scale : 1, MIN_SCALE, MAX_SCALE);
    const normalizedDpr = clamp(Number.isFinite(effectiveDpr) ? effectiveDpr : 1, MIN_EFFECTIVE_DPR, MAX_EFFECTIVE_DPR);

    const physicalWidth = Math.max(1, Math.round(this.pageSize.width * normalizedDpr));
    const physicalHeight = Math.max(1, Math.round(this.pageSize.height * normalizedDpr));

    const scaleChanged = !nearlyEqual(this.scale, normalizedScale);
    const dprChanged = !nearlyEqual(this.effectiveDpr, normalizedDpr);
    const widthChanged = this.physicalWidth !== physicalWidth;
    const heightChanged = this.physicalHeight !== physicalHeight;

    if (!scaleChanged && !dprChanged && !widthChanged && !heightChanged) {
      return;
    }

    this.scale = normalizedScale;
    this.effectiveDpr = normalizedDpr;
    this.physicalWidth = physicalWidth;
    this.physicalHeight = physicalHeight;
    
    if (!this.ready) {
      // Queue as pending (replace-on-write)
      this.pendingPageScale = { scale: normalizedScale, dpr: normalizedDpr };
      this.pendingCanvasResolution = { width: physicalWidth, height: physicalHeight };
      this.debugLog("setPageScale queued (not ready)", { scale: normalizedScale, dpr: normalizedDpr });
      return;
    }

    this.applyPageMetrics();
  }

  syncSize(size: CanvasPageSize): void {
    if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height)) {
      throw new Error("syncSize expects a finite width and height");
    }
    const width = Math.max(1, Math.round(size.width));
    const height = Math.max(1, Math.round(size.height));
    const changed = this.pageSize.width !== width || this.pageSize.height !== height;
    if (!changed) return;
    this.pageSize = { width, height };
    this.physicalWidth = Math.max(1, Math.round(width * this.effectiveDpr));
    this.physicalHeight = Math.max(1, Math.round(height * this.effectiveDpr));
    this.applyPageMetrics();
  }

  async loadScene(scene: CanvasSceneData): Promise<void> {
    const cloned = cloneScene(scene);
    this.lastScene = cloned;
    this.selectionIds = [];
    await this.runOrQueueAsync(async () => {
      try {
        // Strip activeTool from appState to prevent tool reset
        const appState = cloned?.appState ? { ...cloned.appState } : undefined;
        if (appState && 'activeTool' in appState) {
          delete (appState as any).activeTool;
          if (this.debug) {
            console.info('[CanvasAdapter] loadScene: stripped activeTool from appState');
          }
        }
        
        this.api?.updateScene?.({
          elements: cloned?.elements as readonly unknown[] | undefined,
          appState,
          files: cloned?.files,
          commitToHistory: false,
        });
      } catch (error) {
        this.debugLog("loadScene failed", error);
        throw error;
      }
    });
  }

  getScene(): CanvasSceneData | null {
    if (this.lastScene) {
      return cloneScene(this.lastScene);
    }
    if (!this.api) return null;
    try {
      const elements = this.api.getSceneElements?.() ?? [];
      const appState = this.api.getAppState?.() ?? {};
      const files = this.api.getFiles?.() ?? {};
      return {
        elements: elements.slice(),
        appState: { ...appState },
        files: { ...files },
      };
    } catch (error) {
      this.debugLog("getScene failed", error);
      return null;
    }
  }

  onSceneChange(listener: SceneChangeCallback): () => void {
    this.sceneListeners.add(listener);
    if (this.lastScene) {
      listener({
        elements: this.lastScene.elements,
        appState: this.lastScene.appState ?? {},
        files: this.lastScene.files,
        selectionIds: this.selectionIds.slice(),
      });
    }
    return () => {
      this.sceneListeners.delete(listener);
    };
  }

  getSelectionIds(): readonly string[] {
    return this.selectionIds.slice();
  }

  setActiveTool(tool: CanvasToolName): void {
    const next = TOOL_TO_VENDOR[tool] ?? TOOL_TO_VENDOR.select;
    this.activeTool = tool;
    
    // H4: Log both sides of tool mapping
    console.info('[Bridge] Tool mapping', {
      appTool: tool,
      engineTool: next,
      layer: 'Adapter->Excalidraw',
      mappingApplied: tool !== next
    });
    
    // H2: Validate API version and DOM presence
    const isHostInDocument = this.host ? document.body.contains(this.host) : false;
    
    if (this.debug) {
      console.info('[AdapterBridge] setTool ->', next, {
        ready: this.ready,
        apiVersion: this.apiVersion,
        hostInDOM: isHostInDocument
      });
    }
    
    if (!this.ready) {
      // Queue as pending (replace-on-write)
      this.pendingTool = tool;
      this.debugLog("setActiveTool queued (not ready)", tool);
      return;
    }
    
    // Defensive check: Ensure editor is editable before switching tools
    const appState = this.api?.getAppState?.();
    if (appState?.viewModeEnabled || appState?.readOnly) {
      console.warn('[Bridge] Cannot set tool - editor not editable', {
        viewModeEnabled: appState.viewModeEnabled,
        readOnly: appState.readOnly,
        tool
      });
      return;
    }
    
    try {
      // H3: Using official Excalidraw API (not private internals)
      // Note: setActiveTool internally calls App.setState, so timing matters
      if (this.debug) {
        console.info('[AdapterBridge] calling api.setActiveTool', { 
          type: next,
          hasAPI: !!this.api,
          hasMethod: typeof this.api?.setActiveTool === 'function'
        });
      }
      
      // Defensive: For pen tool, try 'freedraw' first, then 'draw' as fallback
      if (tool === 'pen') {
        this.trySetPenTool();
      } else {
        this.api?.setActiveTool?.({ type: next });
      }
      
      // H2: Immediately read back the activeTool to verify the call worked
      const activeTool = this.api?.getAppState?.()?.activeTool as any;
      const actualToolType = activeTool?.type || activeTool;
      const isMatch = actualToolType === next;
      
      // H4: Log the actual tool state after applying
      console.info('[Bridge] Tool verification', {
        requested: next,
        actual: actualToolType,
        match: isMatch,
        fullActiveTool: activeTool
      });
      
      if (this.debug) {
        console.info('[AdapterBridge] setTool result', {
          expected: next,
          actual: actualToolType,
          match: isMatch
        });
      }
      
      if (!isMatch) {
        console.warn('[Bridge] Tool mismatch!', {
          requestedAppTool: tool,
          mappedEngineTool: next,
          actualEngineTool: actualToolType,
          possibleCause: 'Wrong mapping or tool not supported'
        });
      }
    } catch (error) {
      console.error('[AdapterBridge] setActiveTool threw error', error);
      this.debugLog("setActiveTool failed", error);
    }
  }
  
  /**
   * Defensive pen tool setter: tries 'freedraw' first, then 'draw' as fallback.
   * Different Excalidraw versions use different keys for the drawing tool.
   */
  private trySetPenTool(): void {
    console.info('[Bridge] Trying defensive pen tool keys', {
      primary: 'freedraw',
      fallback: 'draw'
    });
    
    // Try 'freedraw' first (current vendor key)
    this.api?.setActiveTool?.({ type: 'freedraw' });
    
    // Verify it worked
    const activeTool1 = this.api?.getAppState?.()?.activeTool as any;
    const actualType1 = activeTool1?.type || activeTool1;
    
    console.info('[Bridge] After freedraw attempt', {
      activeTool: actualType1,
      success: actualType1 === 'freedraw'
    });
    
    if (actualType1 === 'freedraw') {
      console.info('[Bridge] ✓ freedraw key accepted');
      return;
    }
    
    // Fallback to 'draw' (older versions)
    console.warn('[Bridge] freedraw not accepted, trying fallback: draw');
    this.api?.setActiveTool?.({ type: 'draw' });
    
    // Verify fallback
    const activeTool2 = this.api?.getAppState?.()?.activeTool as any;
    const actualType2 = activeTool2?.type || activeTool2;
    
    console.info('[Bridge] After draw attempt', {
      activeTool: actualType2,
      success: actualType2 === 'draw'
    });
    
    if (actualType2 === 'draw') {
      console.info('[Bridge] ✓ draw key accepted (fallback)');
      // Update mapping for future calls
      TOOL_TO_VENDOR.pen = 'draw';
    } else {
      console.error('[Bridge] ✗ Neither freedraw nor draw accepted!', {
        actualTool: actualType2,
        possibleCause: 'Excalidraw version mismatch or API changed'
      });
    }
  }

  getActiveTool(): CanvasToolName {
    return this.activeTool;
  }

  setStroke(color: string | null, width?: number): void {
    const patch: Record<string, unknown> = {};
    if (color !== undefined) {
      patch.currentItemStrokeColor = color ?? "transparent";
    }
    if (typeof width === "number") {
      patch.currentItemStrokeWidth = width;
    }
    this.applyStylePatch(patch);
  }

  setFill(color: string | null): void {
    const patch: Record<string, unknown> = {
      currentItemBackgroundColor: color ?? "transparent",
    };
    this.applyStylePatch(patch);
  }

  setTextStyle(style: TextStyleOptions): void {
    const patch: Record<string, unknown> = {};
    if (style.fontFamily !== undefined) patch.currentItemFontFamily = style.fontFamily;
    if (style.fontSize !== undefined) patch.currentItemFontSize = style.fontSize;
    if (style.align !== undefined) patch.currentItemTextAlign = style.align;
    if (style.color !== undefined) patch.currentItemStrokeColor = style.color;
    if (style.bold !== undefined) patch.currentItemFontWeight = style.bold ? "bold" : "normal";
    if (style.italic !== undefined) patch.currentItemFontStyle = style.italic ? "italic" : "normal";
    if (style.underline !== undefined) patch.currentItemTextUnderline = style.underline;
    this.applyStylePatch(patch);
  }

  setShapeStyle(style: ShapeStyleOptions): void {
    const patch: Record<string, unknown> = {};
    if (style.borderColor !== undefined) patch.currentItemStrokeColor = style.borderColor ?? "transparent";
    if (style.borderWidth !== undefined) patch.currentItemStrokeWidth = style.borderWidth;
    if (style.borderStyle !== undefined && style.borderStyle !== "none") {
      patch.currentItemStrokeStyle = style.borderStyle;
    }
    if (style.fill !== undefined) patch.currentItemBackgroundColor = style.fill ?? "transparent";
    if (typeof style.cornerRadius === "number") {
      patch.currentItemRoundness = style.cornerRadius > 0 ? { type: ROUNDNESS_TYPE, value: style.cornerRadius } : undefined;
    }
    this.applyStylePatch(patch);
  }

  async createTextbox(initialText?: string): Promise<void> {
    if (!this.host) {
      throw new Error("createTextbox requires the adapter to be mounted");
    }
    const detail = {
      initialText: initialText ?? "",
      adapter: this as CanvasAdapter,
    };
    this.host.dispatchEvent(new CustomEvent("writeon:adapter-create-textbox", { detail, bubbles: false }));
  }

  async exportPNG(options: ExportPNGOptions = {}): Promise<Blob> {
    await this.ensureReady();
    const elements = this.api?.getSceneElements?.() ?? [];
    const appState = this.api?.getAppState?.() ?? {};
    const files = this.api?.getFiles?.() ?? {};

    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const scale = options.scale ?? this.effectiveDpr;
    return await exportToBlob({
      elements: elements as any,
      appState: appState as any,
      files: files as any,
      mimeType: "image/png",
      getDimensions: (width: number, height: number) => ({
        width: Math.round(width * scale),
        height: Math.round(height * scale),
      }),
      exportBackground: options.includeBackground ?? true,
      backgroundColor: options.backgroundColor ?? undefined,
    });
  }

  async exportSVG(): Promise<string> {
    await this.ensureReady();
    const elements = this.api?.getSceneElements?.() ?? [];
    const appState = this.api?.getAppState?.() ?? {};
    const files = this.api?.getFiles?.() ?? {};

    const { exportToSvg } = await import("@excalidraw/excalidraw");
    const svg = await exportToSvg({
      elements: elements as any,
      appState: appState as any,
      files: files as any,
    });
    return typeof svg === "string" ? svg : new XMLSerializer().serializeToString(svg);
  }

  undo(): void {
    this.runOrQueue(() => {
      try {
        this.api?.history?.undo?.();
      } catch (error) {
        this.debugLog("undo failed", error);
      }
    });
  }

  redo(): void {
    this.runOrQueue(() => {
      try {
        this.api?.history?.redo?.();
      } catch (error) {
        this.debugLog("redo failed", error);
      }
    });
  }

  private applyStylePatch(patch: Record<string, unknown>): void {
    if (!patch || Object.keys(patch).length === 0) return;
    this.runOrQueue(() => {
      try {
        // Never let style patches include activeTool (prevents reset to selection)
        const safePatch = { ...patch };
        if ('activeTool' in safePatch) {
          delete safePatch.activeTool;
          if (this.debug) {
            console.warn('[CanvasAdapter] applyStylePatch: stripped activeTool from patch');
          }
        }
        this.api?.updateScene?.({ appState: safePatch, commitToHistory: false });
      } catch (error) {
        this.debugLog("applyStylePatch failed", error);
      }
    });
  }

  private applyPageMetrics(): void {
    this.runOrQueue(() => {
      try {
        this.api?.updateScene?.({
          appState: {
            width: this.physicalWidth,
            height: this.physicalHeight,
          },
          commitToHistory: false,
        });
        // Fix B: Don't call refresh() - it calls _App.setState for canvas offsets
        // We control size explicitly via updateScene, so refresh is unnecessary
      } catch (error) {
        this.debugLog("applyPageMetrics failed", error);
      }
    });

    if (this.host) {
      const detail = {
        scale: this.scale,
        effectiveDPR: this.effectiveDpr,
        logicalWidth: this.pageSize.width,
        logicalHeight: this.pageSize.height,
        physicalWidth: this.physicalWidth,
        physicalHeight: this.physicalHeight,
      };
      try {
        this.host.dispatchEvent(new CustomEvent("writeon:adapter-pagescale", { detail }));
      } catch {}
    }
  }

  private attachApi(api: ExcalidrawAPILike, version: number = 0): void {
    // Fix #5: Ignore ready events from unmounted instances (React Strict Mode)
    if (!this.mounted) {
      if (this.debug) {
        console.warn('[CanvasAdapter] Ignoring ready from unmounted instance', { instanceId: this.instanceId });
      }
      return;
    }
    
    // CRITICAL: Validate API shape before using it
    if (!api || typeof api.updateScene !== 'function' || typeof api.setActiveTool !== 'function') {
      console.error('[CanvasAdapter] Invalid API shape - missing required methods', {
        hasApi: !!api,
        hasUpdateScene: typeof api?.updateScene === 'function',
        hasSetActiveTool: typeof api?.setActiveTool === 'function',
        apiKeys: api ? Object.keys(api) : [],
        instanceId: this.instanceId
      });
      return; // Don't proceed - prevents crash
    }
    
    if (this.debug) {
      console.info('[CanvasAdapter] API validation passed', {
        hasUpdateScene: typeof api.updateScene === 'function',
        hasSetActiveTool: typeof api.setActiveTool === 'function',
        hasGetAppState: typeof api.getAppState === 'function',
        hasGetSceneElements: typeof api.getSceneElements === 'function',
        instanceId: this.instanceId
      });
    }
    
    // CRITICAL: Do NOT mutate the API object - it's frozen/read-only
    // Excalidraw's API is immutable. Any attempt to wrap methods (api.updateScene = ...)
    // will throw an error and break initialization, leaving tools stuck in selection mode.
    // Instead, use the API methods directly without interception.
    
    this.api = api;
    this.ready = true;
    
    // H2: Store the API version
    this.apiVersion = version;
    
    // Fix #3: Pin viewModeEnabled OFF immediately to prevent select/hand lock
    // Excalidraw can briefly enable view mode, which disables drawing
    try {
      api.updateScene?.({
        appState: {
          viewModeEnabled: false,
          zenModeEnabled: false,
          gridSize: null,
        },
        commitToHistory: false,
      });
      if (this.debug) {
        console.info('[ExcalidrawAdapter] Pinned viewModeEnabled:false on ready');
      }
    } catch (error) {
      console.error('[ExcalidrawAdapter] Failed to pin view mode off', error);
    }
    
    if (this.debug) {
      console.info('[ExcalidrawAdapter] ready (flushing queued ops)', { apiVersion: version });
    }
    
    // Fix #4: Defer queued ops longer to avoid "setState on unmounted" warning
    // We need to wait for Excalidraw's App component to fully mount before calling ANY API
    // Use multiple RAF frames to ensure React has completed all mount/effect cycles
    try {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try { 
              this.replayPendingOps();
              this.flushPending(); 
            } catch (error) {
              this.debugLog('Error replaying pending ops', error);
            }
          });
        });
      });
    } catch {
      // Fallback if RAF is unavailable
      setTimeout(() => {
        setTimeout(() => {
          setTimeout(() => {
            try { 
              this.replayPendingOps();
              this.flushPending(); 
            } catch (error) {
              this.debugLog('Error replaying pending ops', error);
            }
          }, 32); // ~2 frames at 60fps
        }, 16);
      }, 16);
    }
  }
  
  private replayPendingOps(): void {
    // Replay in specific order: scale -> resolution -> tool
    if (this.debug && (this.pendingPageScale || this.pendingCanvasResolution || this.pendingTool)) {
      console.info('[Replay] scale->resolution->tool', {
        scale: this.pendingPageScale,
        resolution: this.pendingCanvasResolution,
        tool: this.pendingTool
      });
    }
    
    // 1. Apply page scale/DPR
    if (this.pendingPageScale) {
      this.debugLog("Replaying pendingPageScale", this.pendingPageScale);
      this.applyPageMetrics();
      this.pendingPageScale = null;
    }
    
    // 2. Apply canvas backing resolution (already handled by applyPageMetrics)
    if (this.pendingCanvasResolution) {
      this.debugLog("Replaying pendingCanvasResolution", this.pendingCanvasResolution);
      this.pendingCanvasResolution = null;
    }
    
    // 3. Apply tool (latest)
    if (this.pendingTool) {
      const tool = this.pendingTool;
      const vendorTool = TOOL_TO_VENDOR[tool] ?? TOOL_TO_VENDOR.select;
      this.debugLog("Replaying pendingTool", tool);
      try {
        this.api?.setActiveTool?.({ type: vendorTool });
      } catch (error) {
        this.debugLog("Replay setActiveTool failed", error);
      }
      this.pendingTool = null;
    }
  }

  private handleReady = (event: Event): void => {
    const detail = (event as CustomEvent<ReadyEventDetail>).detail;
    
    if (this.debug) {
      console.info('[CanvasAdapter] handleReady event received', {
        hasDetail: !!detail,
        hasApi: !!detail?.api,
        apiType: typeof detail?.api,
        instanceId: this.instanceId
      });
    }
    
    if (!detail) {
      console.warn('[CanvasAdapter] Ready event has no detail');
      return;
    }
    
    if (!detail.api) {
      console.warn('[CanvasAdapter] Ready event detail has no api', { detail });
      return;
    }
    
    // H2: Extract and store apiVersion from ready event
    const incomingVersion = (detail as any).apiVersion || 0;
    this.attachApi(detail.api, incomingVersion);
  };

  private handleSceneChange = (event: Event): void => {
    const detail = (event as CustomEvent<SceneChangeEventDetail>).detail;
    if (!detail) return;
    this.lastScene = {
      elements: detail.elements,
      appState: { ...detail.appState },
      files: detail.files ? { ...detail.files } : undefined,
    };
    this.selectionIds = extractSelectionIds(detail.appState);
    const snapshot: CanvasSceneSnapshot = {
      elements: detail.elements,
      appState: { ...detail.appState },
      files: detail.files ? { ...detail.files } : undefined,
      selectionIds: this.selectionIds.slice(),
    };
    for (const listener of this.sceneListeners) {
      try {
        listener(snapshot);
      } catch (error) {
        this.debugLog("scene listener failed", error);
      }
    }
  };

  private handleError = (event: Event): void => {
    if (!this.debug) return;
    const detail = (event as CustomEvent<{ message?: string }>).detail;
    this.debugLog("Adapter host error", detail);
  };

  private runOrQueue(operation: () => void): void {
    if (this.api) {
      try {
        operation();
      } catch (error) {
        this.debugLog("operation failed", error);
      }
      return;
    }
    this.pendingOps.push(operation);
  }

  private async runOrQueueAsync(operation: () => Promise<void>): Promise<void> {
    if (this.api) {
      await operation();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.pendingOps.push(() => {
        operation().then(resolve).catch(reject);
      });
    });
  }

  private flushPending(): void {
    if (!this.api) return;
    while (this.pendingOps.length > 0) {
      const op = this.pendingOps.shift();
      if (!op) continue;
      try {
        op();
      } catch (error) {
        this.debugLog("queued operation failed", error);
      }
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.ready) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });
  }

  private debugLog(message: string, payload?: unknown): void {
    if (!this.debug) return;
    try {
      // eslint-disable-next-line no-console
      console.debug(`[CanvasAdapter] ${message}`, payload ?? "");
    } catch {}
  }
}

export function createCanvasAdapter(options: CanvasAdapterOptions = {}): CanvasAdapter {
  return new CanvasAdapterImpl(options);
}

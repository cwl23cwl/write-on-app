export interface ViewportSlice {
  viewport: {
    scale: number;
    // legacy offsets (kept for compatibility)
    offsetX: number;
    offsetY: number;
    // canonical scroll coordinates for Phase 2/3
    scrollX: number;
    scrollY: number;
    containerWidth: number;
    containerHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    devicePixelRatio: number;
    // Phase 3: viewport and page sizing
    viewportSize: { w: number; h: number };
    pageSize: { w: number; h: number };
    virtualSize: { w: number; h: number };
    fitMode: 'fit-width' | 'free';
    step: number;
  };
}

export interface InteractionSlice {
  interactions: {
    isPanning: boolean;
    isZooming: boolean;
    lastPointerPosition: { x: number; y: number } | null;
  };
}

export interface ConstraintSlice {
  constraints: {
    minScale: number;
    maxScale: number;
    enablePan: boolean;
    enableZoom: boolean;
  };
}

export interface ViewportMeta {
  viewportReady: boolean;
}

export interface ViewportActions {
  setScale: (scale: number) => void;
  pan: (deltaX: number, deltaY: number) => void;
  setScroll: (x: number, y: number) => void;
  setViewState: (v: ViewState) => void;
  resetViewport: () => void;
  fitToScreen: () => void;
  updateContainerSize: (width: number, height: number) => void;
  updateCanvasSize: (width: number, height: number) => void;
  // Phase 3 actions
  setViewportSize: (w: number, h: number) => void;
  setPageSize: (w: number, h: number) => void;
  setFitMode: (mode: 'fit-width' | 'free') => void;
  fitWidth: () => void;
  getScaledPageW: () => number;
  getScaledPageH: () => number;
  getZoomPercent: () => number;
  setViewportReady?: (ready: boolean) => void;
}

export type ViewportStore = ViewportSlice & InteractionSlice & ConstraintSlice & ViewportMeta & ViewportActions;

// Unified view state contract used across adapters
export type ViewState = { scale: number; scrollX: number; scrollY: number };

// ---------- Canvas Store Types ----------

export type ToolType =
  | "select"
  | "pen"
  | "rectangle"
  | "textbox"
  | "eraser"
  | "hand";

export interface CanvasSlice {
  engine: {
    isInitialized: boolean;
    isReady: boolean;
    lastError: Error | null;
  };
  refs: {
    canvasElement: HTMLCanvasElement | null;
    containerElement: HTMLDivElement | null;
    excalidrawAPI: unknown | null;
  };
  resolution: {
    logicalWidth: number;
    logicalHeight: number;
    physicalWidth: number;
    physicalHeight: number;
    needsRedraw: boolean;
  };
  scene?: {
    elements: unknown[];
    appState: Record<string, unknown>;
    files?: Record<string, unknown>;
  };
  tools: {
    activeTool: ToolType;
    toolOptions: Record<string, unknown>;
  };
}

export interface CanvasActions {
  initializeCanvas: (element: HTMLCanvasElement) => void;
  destroyCanvas: () => void;
  setExcalidrawAPI: (api: unknown) => void;
  updateResolution: () => void;
  setActiveTool: (tool: ToolType) => void;
  requestRedraw: () => void;
  setLastError: (error: Error | null) => void;
  setScene: (scene: { elements: unknown[]; appState: Record<string, unknown>; files?: Record<string, unknown> }) => void;
  setCanvasResolution?: (resolution: { 
    logicalWidth: number; 
    logicalHeight: number; 
    physicalWidth: number; 
    physicalHeight: number; 
    effectiveDPR: number;
    needsRedraw: boolean;
  }) => void;
  setContainerRef?: (element: HTMLElement) => void;
}

export type CanvasStore = CanvasSlice & CanvasActions;

// Core workspace types used across components and stores

export interface ViewportState {
  scale: number; // zoom level (0.1–5.0 typical)
  offsetX: number; // pan X in px
  offsetY: number; // pan Y in px
  containerWidth: number; // viewport container width (CSS px)
  containerHeight: number; // viewport container height (CSS px)
  canvasWidth: number; // logical canvas width
  canvasHeight: number; // logical canvas height
  devicePixelRatio: number; // DPR used for crisp rendering
}

export interface ResolutionInfo {
  logicalWidth: number;
  logicalHeight: number;
  physicalWidth: number;
  physicalHeight: number;
  devicePixelRatio: number;
}

export type TransformMatrix = [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
];

export enum Tool {
  Select = "select",
  Pen = "pen",
  Rectangle = "rectangle",
  Textbox = "textbox",
  Eraser = "eraser",
  Hand = "hand",
}

export interface WorkspaceConfig {
  minScale: number;
  maxScale: number;
  enablePan: boolean;
  enableZoom: boolean;
  // When to zoom on wheel: hold Ctrl/Cmd, always, or disabled
  wheelZoom: "ctrlOrMeta" | "always" | "disabled";
}

export interface PointerEventData {
  pointerId: number;
  x: number; // clientX
  y: number; // clientY
  buttons: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export interface WheelEventData {
  deltaX: number;
  deltaY: number;
  x: number; // clientX at event
  y: number; // clientY at event
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export interface CanvasState<TApi = unknown> {
  engine: {
    isInitialized: boolean;
    isReady: boolean;
    lastError: Error | null;
  };
  refs: {
    canvasElement: HTMLCanvasElement | null;
    containerElement: HTMLDivElement | null;
    excalidrawAPI: TApi | null;
  };
  resolution: ResolutionInfo & { needsRedraw: boolean };
  tools: {
    activeTool: Tool;
    toolOptions: Record<string, unknown>;
  };
}


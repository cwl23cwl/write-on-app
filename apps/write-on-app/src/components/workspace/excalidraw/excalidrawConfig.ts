import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";

export const EXCALIDRAW_PROPS: Partial<ExcalidrawProps> = {
  zenModeEnabled: false,
  gridModeEnabled: false,
  viewBackgroundColor: "#ffffff",
  theme: "light",
  isCollaborating: false,
  detectScroll: false, // disable internal scroll/pan detection
  handleKeyboardGlobally: false, // we handle keyboard
  autoFocus: false, // prevent focus steal
};

export const INITIAL_APP_STATE: Record<string, unknown> = {
  zoom: { value: 1.0 },
  scrollX: 0,
  scrollY: 0,
  cursorButton: "up",
  scrolledOutside: false,
  viewModeEnabled: false,
};

export const CONSTRAINTS = {
  MIN_SCALE: 0.1,
  MAX_SCALE: 5.0,
  ZOOM_STEP: 0.1,
  MIN_CONTAINER_SIZE: 100,
  THROTTLE_MS: 16,
  DEBOUNCE_RESIZE_MS: 100,
} as const;

export const TOOL_MAP: Record<string, string> = {
  // CanvasStore -> Excalidraw
  select: "selection",
  selection: "selection",
  draw: "freedraw",
  pen: "freedraw",
  rectangle: "rectangle",
  ellipse: "ellipse",
  arrow: "arrow",
  line: "line",
  text: "text",
  textbox: "text",
  eraser: "eraser",
  hand: "hand",
};

// Helpers kept for convenience
export function getExcalidrawProps(): Partial<ExcalidrawProps> {
  return EXCALIDRAW_PROPS;
}

export function getInitialData(): ExcalidrawProps["initialData"] {
  return {
    elements: [],
    appState: { ...INITIAL_APP_STATE },
    scrollToContent: true,
  };
}

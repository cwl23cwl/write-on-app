import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";

export const EXCALIDRAW_PROPS: Partial<ExcalidrawProps> = {
  zenModeEnabled: true, // Hide all UI to get pure drawing canvas
  gridModeEnabled: false,
  viewBackgroundColor: "transparent", // Let page background show through
  theme: "light",
  isCollaborating: false,
  detectScroll: false, // disable internal scroll/pan detection
  handleKeyboardGlobally: false, // we handle keyboard
  autoFocus: false, // prevent focus steal
  // CRITICAL: Disable view mode to prevent UI overlays
  viewModeEnabled: false,
  // CRITICAL: Disable Excalidraw's internal zoom/pan behavior
  isBindingEnabled: false, // Disable binding interactions
  allowFullScreen: false, // Prevent fullscreen mode
  UIOptions: {
    // Disable ALL canvas actions
    canvasActions: {
      changeViewBackgroundColor: false,
      clearCanvas: false,
      export: false,
      loadScene: false,
      saveToActiveFile: false,
      toggleTheme: false,
      saveAsImage: false,
      // Additional action disables
      toggleGridMode: false,
      toggleZenMode: false,
      toggleStats: false,
    },
    // Disable ALL tools in built-in toolbar
    tools: {
      image: false,
      text: false,
      arrow: false,
      line: false,
      rectangle: false,
      diamond: false,
      ellipse: false,
      freedraw: false,
      eraser: false,
    },
    // Disable dock/panels
    dockedSidebarBreakpoint: 0, // Never show sidebar
  },
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
    appState: { ...INITIAL_APP_STATE, width: 1200, height: 2200 },
    scrollToContent: true,
  };
}

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ExcalidrawAPI } from "@/components/workspace/excalidraw/types";

interface ToolPrefs {
  textFamily: string;
  textSize: number;
  textBold: boolean;
  textItalic: boolean;
  textUnderline: boolean;
  textColor: string;
  highlighterColor: string;
  textBackground: boolean;
  textBackgroundColor: string | null;
  textBorder: boolean;
  textBorderColor: string;
}

interface TextStylePayload {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  strokeColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderEnabled?: boolean;
}

type ActiveToolValue =
  | string
  | {
      type: string;
      name?: string | null;
      customType?: string | null;
    };

interface WorkspaceStoreState {
  toolPrefs: ToolPrefs;
  activeTool: ActiveToolValue;
  excalidrawAPI: ExcalidrawAPI | null;
  updateToolPref: <K extends keyof ToolPrefs>(key: K, value: ToolPrefs[K]) => void;
  setActiveTool: (tool: ActiveToolValue) => void;
  setExcalidrawAPI: (api: ExcalidrawAPI | null) => void;
  applyTextStyleToSelection: (style: TextStylePayload) => void;
  selectTool: (tool: ActiveToolValue) => void;
  debugShowTextOptions: boolean;
  setDebugShowTextOptions: (show: boolean) => void;
}

const defaultPrefs: ToolPrefs = {
  textFamily: "Open Sans, sans-serif",
  textSize: 24,
  textBold: false,
  textItalic: false,
  textUnderline: false,
  textColor: "#111827",
  highlighterColor: "#fef08a",
  textBackground: false,
  textBackgroundColor: null,
  textBorder: false,
  textBorderColor: "#000000",
};

const appStateFieldForStyle: Partial<Record<keyof TextStylePayload, string>> = {
  fontFamily: "currentItemFontFamily",
  fontSize: "currentItemFontSize",
  strokeColor: "currentItemStrokeColor",
  backgroundColor: "currentItemBackgroundColor",
};

function applyStyleToAppState(api: ExcalidrawAPI, style: TextStylePayload): void {
  const updates: Record<string, unknown> = {};

  Object.entries(appStateFieldForStyle).forEach(([key, field]) => {
    const payloadKey = key as keyof TextStylePayload;
    const value = style[payloadKey];
    if (value !== undefined) {
      updates[field] = value;
    }
  });

  if (style.fontWeight) {
    updates.currentItemFontFamily = style.fontWeight === "bold" ? "Virgil" : updates.currentItemFontFamily ?? undefined;
  }

  if (style.fontStyle) {
    updates.currentItemFontStyle = style.fontStyle;
  }

  if (style.textDecoration) {
    updates.currentItemTextUnderline = style.textDecoration === "underline";
  }

  if (style.borderColor !== undefined) {
    updates.currentItemStrokeColor = style.borderColor;
  }

  if (style.borderEnabled !== undefined) {
    updates.currentItemStrokeStyle = style.borderEnabled ? "solid" : "none";
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  try {
    api.updateScene?.({ appState: updates } as any);
  } catch (error) {
    console.error("applyTextStyleToSelection", error);
  }
}

export const useWorkspaceStore = create<WorkspaceStoreState>()(
  immer((set, get) => ({
    toolPrefs: { ...defaultPrefs },
    activeTool: "select",
    excalidrawAPI: null,
    debugShowTextOptions: true,
    updateToolPref: (key, value) => {
      set((state) => {
        state.toolPrefs[key] = value;
      });
    },
    setActiveTool: (tool) => {
      set((state) => {
        state.activeTool = tool;
      });
      const api = get().excalidrawAPI;
      if (api && typeof api.setActiveTool === "function") {
        try {
          const toolType = typeof tool === "string" ? tool : tool?.type;
          if (toolType) {
            api.setActiveTool({ type: toolType } as any);
          }
        } catch (error) {
          console.error("setActiveTool", error);
        }
      }
    },
    setExcalidrawAPI: (api) => {
      set((state) => {
        state.excalidrawAPI = api;
      });
    },
    applyTextStyleToSelection: (style) => {
      const api = get().excalidrawAPI;
      if (!api) {
        return;
      }
      applyStyleToAppState(api, style);
    },
    selectTool: (tool) => {
      get().setActiveTool(tool);
    },
    setDebugShowTextOptions: (show) => {
      set((state) => {
        state.debugShowTextOptions = show;
      });
    },
  })),
);

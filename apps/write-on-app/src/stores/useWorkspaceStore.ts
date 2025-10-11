"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface ToolPrefs {
  textFamily: string;
  textSize: number;
  textColor: string;
}

interface WorkspaceStoreState {
  toolPrefs: ToolPrefs;
  updateToolPref: <K extends keyof ToolPrefs>(key: K, value: ToolPrefs[K]) => void;
}

const defaultPrefs: ToolPrefs = {
  textFamily: "Open Sans, sans-serif",
  textSize: 24,
  textColor: "#111827",
};

export const useWorkspaceStore = create<WorkspaceStoreState>()(
  immer((set) => ({
    toolPrefs: { ...defaultPrefs },
    updateToolPref: (key, value): void => {
      set((state) => {
        state.toolPrefs[key] = value;
      });
    },
  })),
);

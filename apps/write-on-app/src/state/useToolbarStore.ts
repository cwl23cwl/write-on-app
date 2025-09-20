"use client";

import { create } from "zustand";

export type ToolId = 'none' | 'select' | 'draw' | 'highlighter' | 'text' | 'erase' | 'shapes';

type ToolbarState = {
  activeTool: ToolId;
  setActiveTool: (id: ToolId) => void;
};

export const useToolbarStore = create<ToolbarState>()((set) => ({
  activeTool: 'none',
  setActiveTool: (id) => set({ activeTool: id }),
}));

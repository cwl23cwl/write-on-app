"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { CanvasStore, ToolType } from "@/types/state";

const getDpr = (): number =>
  typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;

const initialCanvasState: CanvasStore = {
  engine: {
    isInitialized: false,
    isReady: false,
    lastError: null,
  },
  refs: {
    canvasElement: null,
    containerElement: null,
    excalidrawAPI: null,
  },
  resolution: {
    logicalWidth: 0,
    logicalHeight: 0,
    physicalWidth: 0,
    physicalHeight: 0,
    needsRedraw: false,
  },
  scene: {
    elements: [],
    appState: {},
    files: {},
  },
  tools: {
    activeTool: "select" as ToolType,
    toolOptions: {},
  },

  initializeCanvas: () => {},
  destroyCanvas: () => {},
  setExcalidrawAPI: () => {},
  updateResolution: () => {},
  setActiveTool: () => {},
  requestRedraw: () => {},
  setLastError: () => {},
};

const devtoolsEnabled = typeof window !== "undefined" && !!(window as any).__REDUX_DEVTOOLS_EXTENSION__ && process.env.NODE_ENV === "development";

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    immer((set, get) => ({
      ...initialCanvasState,

      initializeCanvas: (element: HTMLCanvasElement): void => {
        set((s) => {
          s.refs.canvasElement = element;
          s.engine.isInitialized = true;
          s.engine.lastError = null;
        }, false, "canvas/initializeCanvas");

        // Attempt an initial resolution sync
        get().updateResolution();
      },

      destroyCanvas: (): void => {
        set((s) => {
          s.engine.isInitialized = false;
          s.engine.isReady = false;
          s.refs.canvasElement = null;
          s.refs.excalidrawAPI = null;
          s.resolution.needsRedraw = false;
        }, false, "canvas/destroyCanvas");
      },

      setExcalidrawAPI: (api: unknown): void => {
        set((s) => {
          s.refs.excalidrawAPI = api ?? null;
          s.engine.isReady = Boolean(api);
        }, false, "canvas/setExcalidrawAPI");
      },

      updateResolution: (): void => {
        const state = get();
        const canvas = state.refs.canvasElement;
        const container = state.refs.containerElement ?? canvas?.parentElement ?? null;
        if (!canvas || !container) return;

        const rect = (container as HTMLElement).getBoundingClientRect();
        const logicalWidth = Math.max(0, Math.round(rect.width));
        const logicalHeight = Math.max(0, Math.round(rect.height));
        const dpr = getDpr();
        const physicalWidth = Math.max(0, Math.round(logicalWidth * dpr));
        const physicalHeight = Math.max(0, Math.round(logicalHeight * dpr));

        set((s) => {
          s.resolution.logicalWidth = logicalWidth;
          s.resolution.logicalHeight = logicalHeight;
          s.resolution.physicalWidth = physicalWidth;
          s.resolution.physicalHeight = physicalHeight;
          s.resolution.needsRedraw = true;
        }, false, "canvas/updateResolution");

        // Apply to canvas element for crisp rendering
        if (canvas.width !== physicalWidth) canvas.width = physicalWidth;
        if (canvas.height !== physicalHeight) canvas.height = physicalHeight;
        // Do not write CSS size; keep canvas CSS size driven by the 1200x2200 page wrapper
        try {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } catch {}
      },

      setActiveTool: (tool: ToolType): void =>
        set((s) => {
          s.tools.activeTool = tool;
        }, false, "canvas/setActiveTool"),

      requestRedraw: (): void =>
        set((s) => {
          s.resolution.needsRedraw = true;
        }, false, "canvas/requestRedraw"),

      setLastError: (error: Error | null): void =>
        set((s) => {
          s.engine.lastError = error as Error;
          if (error) s.engine.isReady = false;
        }, false, "canvas/setLastError"),

      setScene: (scene): void =>
        set((s) => {
          s.scene = scene;
        }, false, "canvas/setScene"),
    })),
    { enabled: devtoolsEnabled, name: "CanvasStore" }
  )
);

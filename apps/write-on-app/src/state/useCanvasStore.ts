"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { CanvasStore, ToolType } from "@/types/state";
import { useViewportStore } from "@/state";

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
  },
  resolution: {
    logicalWidth: 0,
    logicalHeight: 0,
    physicalWidth: 0,
    physicalHeight: 0,
    needsRedraw: false,
  },
  tools: {
    activeTool: "select" as ToolType,
    toolOptions: {},
  },

  initializeCanvas: () => {},
  destroyCanvas: () => {},
  updateResolution: () => {},
  setActiveTool: () => {},
  requestRedraw: () => {},
  setLastError: () => {},
  setCanvasResolution: () => {},
  setContainerRef: () => {},
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
          s.resolution.needsRedraw = false;
        }, false, "canvas/destroyCanvas");
      },

      updateResolution: (): void => {
        const state = get();
        const canvas = state.refs.canvasElement;
        const container = state.refs.containerElement ?? canvas?.parentElement ?? null;
        if (!canvas || !container) return;

        // Never derive logical page size from DOM; use constants
        const PAGE_WIDTH = 1200;
        const PAGE_HEIGHT = 2200;
        const logicalWidth = PAGE_WIDTH;
        const logicalHeight = PAGE_HEIGHT;
        const dpr = getDpr();
        const zoom = (() => { try { const z = useViewportStore.getState().viewport.scale; return (z ?? 1); } catch { return 1; } })();
        let physicalWidth = Math.max(0, Math.round(logicalWidth * dpr * zoom));
        let physicalHeight = Math.max(0, Math.round(logicalHeight * dpr * zoom));
        // GPU caps (same as useCanvasResolution)
        const MAX_CANVAS_DIMENSION = 16384;
        const MAX_CANVAS_PIXELS = 268435456; // 256MP
        const totalPixels = physicalWidth * physicalHeight;
        if (physicalWidth > MAX_CANVAS_DIMENSION || physicalHeight > MAX_CANVAS_DIMENSION || totalPixels > MAX_CANVAS_PIXELS) {
          const dimRatio = Math.min(
            MAX_CANVAS_DIMENSION / Math.max(physicalWidth, physicalHeight),
            Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, totalPixels)),
          );
          const fallbackDPR = Math.max(0.75, Math.min(dpr * zoom * dimRatio, 3));
          physicalWidth = Math.round(logicalWidth * fallbackDPR);
          physicalHeight = Math.round(logicalHeight * fallbackDPR);
        }

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
          if (ctx) ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
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

      setCanvasResolution: (resolution): void =>
        set((s) => {
          s.resolution.logicalWidth = resolution.logicalWidth;
          s.resolution.logicalHeight = resolution.logicalHeight;
          s.resolution.physicalWidth = resolution.physicalWidth;
          s.resolution.physicalHeight = resolution.physicalHeight;
          s.resolution.needsRedraw = resolution.needsRedraw;
        }, false, "canvas/setCanvasResolution"),

      setContainerRef: (element: HTMLElement | null): void =>
        set((s) => {
          s.refs.containerElement = element ?? null;
        }, false, "canvas/setContainerRef"),
    })),
    { enabled: devtoolsEnabled, name: "CanvasStore" }
  )
);






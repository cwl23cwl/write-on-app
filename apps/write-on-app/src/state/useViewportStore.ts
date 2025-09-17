"use client";

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { ViewportStore } from "@/types/state";

const getDpr = (): number =>
  typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;

// Scrollable gutter around the page (CSS pixels on each side)
const PAGE_GUTTER = 64;

const initialState: Pick<ViewportStore, "viewport" | "interactions" | "constraints" | "viewportReady"> = {
  viewport: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    scrollX: 0,
    scrollY: 0,
    containerWidth: 0,
    containerHeight: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    devicePixelRatio: getDpr(),
    // Phase 3: viewport and page sizing
    viewportSize: { w: 0, h: 0 },
    pageSize: { w: 1200, h: 2200 },
    virtualSize: { w: 1200 + 2 * PAGE_GUTTER, h: 2200 + 2 * PAGE_GUTTER },
    fitMode: 'fit-width' as const,
    step: 0.1,
  },
  viewportReady: false,
  interactions: {
    isPanning: false,
    isZooming: false,
    lastPointerPosition: null,
  },
  constraints: {
    minScale: 0.5,
    maxScale: 3.0,
    enablePan: true,
    enableZoom: true,
  },
};

const devtoolsEnabled = typeof window !== "undefined" && !!(window as any).__REDUX_DEVTOOLS_EXTENSION__ && process.env.NODE_ENV === "development";

export const useViewportStore = create<ViewportStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        setScale: (scale: number): void =>
          set((s) => {
            if (!s.constraints.enableZoom) return;
            const { minScale, maxScale } = s.constraints;
            s.viewport.scale = Math.max(minScale, Math.min(scale, maxScale));
            s.viewport.devicePixelRatio = getDpr() * s.viewport.scale;
            s.interactions.isZooming = false;
          }, false, "viewport/setScale"),

        // Multiplicative zoom controls (~5% per step)
        zoomIn: (): void =>
          set((s) => {
            if (!s.constraints.enableZoom) return;
            const factor = 1.03;
            const next = s.viewport.scale * factor;
            const { minScale, maxScale } = s.constraints;
            s.viewport.scale = Math.max(minScale, Math.min(next, maxScale));
            s.viewport.devicePixelRatio = getDpr() * s.viewport.scale;
            s.interactions.isZooming = false;
          }, false, "viewport/zoomIn"),

        zoomOut: (): void =>
          set((s) => {
            if (!s.constraints.enableZoom) return;
            const factor = 1.03;
            const next = s.viewport.scale / factor;
            const { minScale, maxScale } = s.constraints;
            s.viewport.scale = Math.max(minScale, Math.min(next, maxScale));
            s.viewport.devicePixelRatio = getDpr() * s.viewport.scale;
            s.interactions.isZooming = false;
          }, false, "viewport/zoomOut"),

        pan: (dx: number, dy: number): void =>
          set((s) => {
            if (!s.constraints.enablePan) return;
            s.viewport.offsetX += dx;
            s.viewport.offsetY += dy;
            s.viewport.scrollX = s.viewport.offsetX;
            s.viewport.scrollY = s.viewport.offsetY;
            s.interactions.isPanning = false;
          }, false, "viewport/pan"),

        setScroll: (x: number, y: number): void =>
          set((s) => {
            s.viewport.scrollX = x;
            s.viewport.scrollY = y;
            // keep legacy offsets in sync
            s.viewport.offsetX = x;
            s.viewport.offsetY = y;
          }, false, "viewport/setScroll"),

        setViewState: (v): void =>
          set((s) => {
            const { minScale, maxScale } = s.constraints;
            s.viewport.scale = Math.max(minScale, Math.min(v.scale, maxScale));
            s.viewport.devicePixelRatio = getDpr() * s.viewport.scale;
            s.viewport.scrollX = v.scrollX;
            s.viewport.scrollY = v.scrollY;
            s.viewport.offsetX = v.scrollX;
            s.viewport.offsetY = v.scrollY;
          }, false, "viewport/setViewState"),

        resetViewport: (): void =>
          set((s) => {
            s.viewport.scale = 1;
            s.viewport.offsetX = 0;
            s.viewport.offsetY = 0;
            s.viewport.scrollX = 0;
            s.viewport.scrollY = 0;
            s.viewport.devicePixelRatio = getDpr();
            // sizes remain; DPR recalculated lazily
          }, false, "viewport/resetViewport"),

        fitToScreen: (): void =>
          set((s) => {
            const { containerWidth, containerHeight, canvasWidth, canvasHeight } = s.viewport;
            if (containerWidth <= 0 || containerHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
              return;
            }
            const scaleX = containerWidth / canvasWidth;
            const scaleY = containerHeight / canvasHeight;
            const nextScale = Math.min(scaleX, scaleY);
            const clamped = Math.max(s.constraints.minScale, Math.min(nextScale, s.constraints.maxScale));
            s.viewport.scale = clamped;
            // center canvas in container
            s.viewport.offsetX = (containerWidth - canvasWidth * clamped) / 2;
            s.viewport.offsetY = (containerHeight - canvasHeight * clamped) / 2;
          }, false, "viewport/fitToScreen"),

        updateContainerSize: (width: number, height: number): void =>
          set((s) => {
            s.viewport.containerWidth = Math.max(0, Math.round(width));
            s.viewport.containerHeight = Math.max(0, Math.round(height));
            s.viewport.devicePixelRatio = getDpr();
          }, false, "viewport/updateContainerSize"),

        updateCanvasSize: (width: number, height: number): void =>
          set((s) => {
            s.viewport.canvasWidth = Math.max(0, Math.round(width));
            s.viewport.canvasHeight = Math.max(0, Math.round(height));
          }, false, "viewport/updateCanvasSize"),

        // Phase 3 actions
        setViewportSize: (w: number, h: number): void =>
          set((s) => {
            s.viewport.viewportSize = { w: Math.max(0, Math.round(w)), h: Math.max(0, Math.round(h)) };
          }, false, "viewport/setViewportSize"),

        setPageSize: (w: number, h: number): void =>
          set((s) => {
            s.viewport.pageSize = { w: Math.max(0, Math.round(w)), h: Math.max(0, Math.round(h)) };
            // Update virtual size: page + scrollable gutters on all sides
            s.viewport.virtualSize = { 
              w: s.viewport.pageSize.w + 2 * PAGE_GUTTER,
              h: s.viewport.pageSize.h + 2 * PAGE_GUTTER
            };
          }, false, "viewport/setPageSize"),

        setFitMode: (mode: 'fit-width' | 'free'): void =>
          set((s) => {
            s.viewport.fitMode = mode;
          }, false, "viewport/setFitMode"),

        fitWidth: (): void =>
          set((s) => {
            const { viewportSize, pageSize } = s.viewport;
            if (viewportSize.w <= 0 || pageSize.w <= 0) return;
            
            // Calculate fit scale using full viewport width; horizontal centering is handled by CSS
            const availableWidth = viewportSize.w;
            const fitScale = availableWidth / pageSize.w;
            
            const { minScale, maxScale } = s.constraints;
            const clampedScale = Math.max(minScale, Math.min(fitScale, maxScale));
            
            s.viewport.scale = clampedScale;
            s.viewport.devicePixelRatio = getDpr() * clampedScale;
            s.viewport.fitMode = 'fit-width';
          }, false, "viewport/fitWidth"),

        getScaledPageW: (): number => {
          const state = useViewportStore.getState();
          return state.viewport.pageSize.w * state.viewport.scale;
        },

        getScaledPageH: (): number => {
          const state = useViewportStore.getState();
          return state.viewport.pageSize.h * state.viewport.scale;
        },

        getZoomPercent: (): number => {
          const state = useViewportStore.getState();
          return Math.round(state.viewport.scale * 100);
        },

        setViewportReady: (ready: boolean): void =>
          set((s) => {
            s.viewportReady = ready;
          }, false, "viewport/setViewportReady"),
      })),
      {
        name: "writeon-viewport",
        version: 3,
        migrate: (state: any, version: number) => {
          try {
            const min = state?.constraints?.minScale ?? 0.5;
            const max = state?.constraints?.maxScale ?? 3.0;
            const prev = state?.viewport?.scale ?? 1;
            const clamped = Math.max(min, Math.min(prev, max));
            if (state?.viewport) {
              state.viewport.scale = clamped;
              // recompute dpr from current device DPR if available at runtime; fall back to 1
              state.viewport.devicePixelRatio = 1;
            }
          } catch {}
          return state as any;
        },
        partialize: (s) => ({
          // persist user-meaningful viewport prefs
          viewport: {
            scale: s.viewport.scale,
            offsetX: s.viewport.offsetX,
            offsetY: s.viewport.offsetY,
            containerWidth: 0,
            containerHeight: 0,
            canvasWidth: 0,
            canvasHeight: 0,
            devicePixelRatio: 1,
          },
          constraints: s.constraints,
          interactions: { isPanning: false, isZooming: false, lastPointerPosition: null },
        }),
        storage: createJSONStorage(() => localStorage),
      }
    ),
    { enabled: devtoolsEnabled, name: "ViewportStore" }
  )
);

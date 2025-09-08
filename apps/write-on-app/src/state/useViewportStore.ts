"use client";

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { ViewportStore } from "@/types/state";

const getDpr = (): number =>
  typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;

const initialState: Pick<ViewportStore, "viewport" | "interactions" | "constraints"> = {
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
  },
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
      })),
      {
        name: "writeon-viewport",
        version: 2,
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

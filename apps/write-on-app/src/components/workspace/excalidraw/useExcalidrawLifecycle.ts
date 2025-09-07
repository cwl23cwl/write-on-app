"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore, useViewportStore } from "@/state";
import { CONSTRAINTS } from "@/components/workspace/excalidraw/excalidrawConfig";
import type { ExcalidrawAPI } from "@/components/workspace/excalidraw/types";
import type { ExcalidrawComponentProps } from "@/components/workspace/excalidraw/types";

type Args = {
  containerRef: React.RefObject<HTMLElement | null>;
  apiRef: React.RefObject<ExcalidrawAPI | null>;
  initialData?: ExcalidrawComponentProps["initialData"] | null;
  onReady?: (api: ExcalidrawAPI) => void;
};

export function useExcalidrawLifecycle({ containerRef, apiRef, initialData, onReady }: Args): void {
  const setExcalidrawAPI = useCanvasStore((s) => s.setExcalidrawAPI);
  const setScene = useCanvasStore((s) => s.setScene);
  const requestRedraw = useCanvasStore((s) => s.requestRedraw);
  const updateResolution = useCanvasStore((s) => s.updateResolution);
  const setSize = useViewportStore((s) => s.updateContainerSize);
  const scale = useViewportStore((s) => s.viewport.scale);

  const roRef = useRef<ResizeObserver | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount sequence
  useEffect((): void => {
    let cancelled = false;
  const waitForContainer = (): Promise<HTMLElement> => {
      return new Promise<HTMLElement>((resolve, reject): void => {
        const start = performance.now();
        const tick = (): void => {
          if (cancelled) return;
          const el = containerRef.current as HTMLElement | null;
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width >= 100 && rect.height >= 100) {
              resolve(el);
              return;
            }
          }
          if (performance.now() - start > 2000) {
            reject(new Error("Excalidraw container did not reach minimum size in time"));
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      });
    };

    const handleMount = async (): Promise<void> => {
      try {
        await waitForContainer();
        if (cancelled) return;
        // Ensure initial resolution and request a redraw
        updateResolution();
        requestRedraw();

        // Wait for API ready
        const api = apiRef.current;
        if (api) {
          setExcalidrawAPI(api);
          // Force internal zoom to 1.0 if supported
          try {
            (api as unknown as { setZoom?: (z: number) => void }).setZoom?.(1);
          } catch {}
          // Load initial data if provided (adapter also passes initialData; double-apply is harmless)
          if (initialData) {
            try {
              (api as unknown as { updateScene?: (scene: Record<string, unknown>) => void }).updateScene?.(initialData as Record<string, unknown>);
            } catch {}
          }
          onReady?.(api);
        } else {
          console.warn("[ExcalidrawAdapter] API not ready, deferring operation");
        }
      } catch (err) {
        console.warn("Excalidraw mount sequence warning:", err);
      }
    };

    handleMount();
    return () => { cancelled = true; };
  }, [apiRef, containerRef, initialData, onReady, requestRedraw, setExcalidrawAPI, updateResolution]);

  // Resolution update on scale changes
  useEffect((): void => {
    const api = apiRef.current;
    if (!api) return;
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < CONSTRAINTS.MIN_CONTAINER_SIZE || rect.height < CONSTRAINTS.MIN_CONTAINER_SIZE) {
      console.error("[ExcalidrawAdapter] Container too small", { width: rect.width, height: rect.height });
      return;
    }
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;
    const logicalWidth = Math.max(0, Math.round(rect.width));
    const logicalHeight = Math.max(0, Math.round(rect.height));
    const physicalWidth = Math.round(logicalWidth * scale * dpr);
    const physicalHeight = Math.round(logicalHeight * scale * dpr);
    try {
      (api as unknown as { updateScene?: (scene: { appState?: Record<string, unknown> }) => void }).updateScene?.({
        appState: { width: physicalWidth, height: physicalHeight },
      });
      (api as unknown as { refresh?: () => void }).refresh?.();
    } catch {}
  }, [apiRef, containerRef, scale]);

  // Observe container resize with debounce and update both stores
  useEffect(() => {
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;
    const apply = (): void => {
      const rect = el.getBoundingClientRect();
      setSize(rect.width, rect.height);
      updateResolution();
    };
    roRef.current = new ResizeObserver(() => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current as unknown as number);
      debounceTimer.current = setTimeout(apply, 100);
    });
    roRef.current.observe(el);
    return (): void => {
      try { roRef.current?.disconnect(); } catch {}
      if (debounceTimer.current) clearTimeout(debounceTimer.current as unknown as number);
    };
  }, [containerRef, setSize, updateResolution]);

  // Unmount sequence
  useEffect((): (() => void) => {
    const apiLocal = apiRef.current as unknown as { getSceneElements?: () => unknown[]; getFiles?: () => Record<string, unknown>; getAppState?: () => Record<string, unknown> } | null;
    return (): void => {
      try {
        if (apiLocal) {
          const elements = apiLocal.getSceneElements?.() ?? [];
          const files = apiLocal.getFiles?.() ?? {};
          const appState = apiLocal.getAppState?.() ?? {};
          setScene({ elements, appState, files });
        }
      } catch {}
      // Nullify API handled by adapter when it unmounts; mark as not ready
      setExcalidrawAPI(null);
    };
  }, [apiRef, setScene, setExcalidrawAPI]);
}

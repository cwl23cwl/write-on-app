"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore, useViewportStore } from "@/state";
import { CONSTRAINTS } from "@/components/workspace/excalidraw/excalidrawConfig";

type MaybeRefreshAPI = { refresh?: () => void };

// Event interception layer focused on wheel zoom redirection
export type ExcalidrawEventOptions = {
  enableTouchZoom?: boolean;
  blockShortcuts?: boolean;
};

export function useExcalidrawEvents(
  containerRef: React.RefObject<HTMLElement | null>,
  options: ExcalidrawEventOptions = { enableTouchZoom: false, blockShortcuts: false }
): void {
  const setScale = useViewportStore((s) => s.setScale);
  const current = useViewportStore((s) => s.viewport.scale);
  const api = useCanvasStore((s) => s.refs.excalidrawAPI);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);

  useEffect((): (() => void) | void => {
    const el = containerRef.current;
    if (!el) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const handleWheel = (_e: WheelEvent): void => {
      // Phase 2: no wheel interception; allow browser zoom and page scroll
      return;
    };

    const blockInternalShortcuts = (_e: KeyboardEvent): void => {
      if (!options.blockShortcuts) return;
      // Phase 2: do not block global shortcuts
    };

    // Touch pinch handling
    const getTouchDist = (e: TouchEvent): number => {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent): void => {
      if (!options.enableTouchZoom) return;
      if (e.touches.length === 2) {
        pinchStartDist.current = getTouchDist(e);
        pinchStartScale.current = current;
      }
    };

    const onTouchMove = (e: TouchEvent): void => {
      if (!options.enableTouchZoom) return;
      if (e.touches.length === 2 && pinchStartDist.current) {
        const dist = getTouchDist(e);
        const ratio = dist / pinchStartDist.current;
        const next = Math.min(Math.max(pinchStartScale.current * ratio, CONSTRAINTS.MIN_SCALE), CONSTRAINTS.MAX_SCALE);
        setScale(next);
        requestAnimationFrame(() => {
          const maybe = api as unknown as MaybeRefreshAPI | null;
          if (maybe && typeof maybe.refresh === "function") maybe.refresh();
          else console.warn("[ExcalidrawAdapter] API not ready, deferring operation");
        });
      }
    };

    const onTouchEnd = (): void => {
      if (!options.enableTouchZoom) return;
      if (pinchStartDist.current) {
        pinchStartDist.current = null;
      }
    };

    // Register listeners on the container only
    el.addEventListener("wheel", handleWheel as EventListener, { passive: true, capture: true, signal } as AddEventListenerOptions);
    el.addEventListener("keydown", blockInternalShortcuts as EventListener, { capture: true, signal } as AddEventListenerOptions);
    el.addEventListener("touchstart", onTouchStart as EventListener, { passive: true, capture: true, signal } as AddEventListenerOptions);
    el.addEventListener("touchmove", onTouchMove as EventListener, { passive: true, capture: true, signal } as AddEventListenerOptions);
    el.addEventListener("touchend", onTouchEnd as EventListener, { passive: true, capture: true, signal } as AddEventListenerOptions);

    return () => {
      controller.abort();
    };
  }, [containerRef, setScale, current, api, options.blockShortcuts, options.enableTouchZoom]);
}

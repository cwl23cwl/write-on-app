"use client";

import { useEffect, useRef } from "react";
import { useViewportStore, useCanvasStore } from "@/state";
import { getWorldPoint } from "@/components/workspace/utils/coords";
import { normalizedDeltaY } from "@/components/workspace/utils/events";

export function useViewportEvents(containerRef: React.RefObject<HTMLDivElement | null>): void {
  const setScale = useViewportStore((s) => s.setScale);
  const setViewState = useViewportStore((s) => s.setViewState);
  const setScroll = useViewportStore((s) => s.setScroll);
  const pan = useViewportStore((s) => s.pan);
  const constraints = useViewportStore((s) => s.constraints);

  const lastWorld = useRef<{ x: number; y: number } | null>(null);
  const panning = useRef(false);
  const currentScale = useViewportStore((s) => s.viewport.scale);
  const scrollX = useViewportStore((s) => s.viewport.scrollX);
  const scrollY = useViewportStore((s) => s.viewport.scrollY);
  const activeTool = useCanvasStore((s) => s.tools.activeTool);

  useEffect((): (() => void) | void => {
    const el = containerRef.current;
    if (!el) return;
    const scaler = (el as HTMLElement).querySelector('.workspace-scaler') as HTMLElement | null;

    const onWheel = (e: WheelEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        // App owns zoom: prevent browser zoom and normalize deltas
        e.preventDefault();
        const dy = normalizedDeltaY(e);
        // Smooth multiplicative factor (~gradual zoom)
        const factor = Math.exp(-dy * 0.0015);
        const min = constraints.minScale;
        const max = constraints.maxScale;
        const preScale = currentScale || 1;
        const newScale = Math.max(min, Math.min(preScale * factor, max));
        // Do not anchor to cursor; we re-center on scale change globally
        setViewState({ scale: newScale, scrollX: 0, scrollY: 0 });
        return;
      }
      // Let normal page scroll happen when not zooming
    };

    const onPointerDown = (e: PointerEvent): void => {
      if (!constraints.enablePan) return;
      if (activeTool !== 'hand') return;
      const host = (scaler as HTMLElement) || (el as HTMLElement);
      const world = getWorldPoint(e, host, { scale: currentScale, scrollX, scrollY });
      const capEl = (e.target as Element) ?? (e.currentTarget as Element);
      try { capEl.setPointerCapture(e.pointerId); } catch {}
      panning.current = true;
      lastWorld.current = world;
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (activeTool !== 'hand') return;
      if (!panning.current || !lastWorld.current) return;
      const host = (scaler as HTMLElement) || (el as HTMLElement);
      const world = getWorldPoint(e, host, { scale: currentScale, scrollX, scrollY });
      const dx = world.x - lastWorld.current.x;
      const dy = world.y - lastWorld.current.y;
      pan(dx, dy);
      lastWorld.current = world;
    };

    const onPointerUp = (e: PointerEvent): void => {
      const relEl = (e.target as Element) ?? (e.currentTarget as Element);
      try { relEl?.releasePointerCapture?.(e.pointerId); } catch {}
      panning.current = false;
      lastWorld.current = null;
    };

    // Keep store in sync with DOM scroll (for focus math)
    const onScroll = (): void => {
      setScroll(el.scrollLeft, el.scrollTop);
    };

    // Capture phase so we can intercept before inner libraries
    el.addEventListener("wheel", onWheel as EventListener, { passive: false, capture: true });
    el.addEventListener("scroll", onScroll as EventListener, { passive: true });
    el.addEventListener("pointerdown", onPointerDown as EventListener, { passive: true });
    el.addEventListener("pointermove", onPointerMove as EventListener, { passive: true });
    el.addEventListener("pointerup", onPointerUp as EventListener, { passive: true });
    el.addEventListener("pointercancel", onPointerUp as EventListener, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel as EventListener, { capture: true } as EventListenerOptions);
      el.removeEventListener("scroll", onScroll as EventListener);
      el.removeEventListener("pointerdown", onPointerDown as EventListener);
      el.removeEventListener("pointermove", onPointerMove as EventListener);
      el.removeEventListener("pointerup", onPointerUp as EventListener);
      el.removeEventListener("pointercancel", onPointerUp as EventListener);
    };
  }, [containerRef, setScale, pan, constraints, currentScale, activeTool, scrollX, scrollY, setViewState]);
}

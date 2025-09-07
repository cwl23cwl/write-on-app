"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ExcalidrawRef from "@/components/excalidraw/ExcalidrawRef";
import { EXCALIDRAW_PROPS, INITIAL_APP_STATE, CONSTRAINTS } from "@/components/workspace/excalidraw/excalidrawConfig";
import { useExcalidrawBridge } from "@/components/workspace/excalidraw/useExcalidrawBridge";
import { useExcalidrawLifecycle } from "@/components/workspace/excalidraw/useExcalidrawLifecycle";
import type { ExcalidrawAPI, ExcalidrawComponentProps } from "@/components/workspace/excalidraw/types";
import { useCanvasStore, useViewportStore } from "@/state";
import type { ToolType } from "@/types/state";
import { normalizedDeltaY } from "@/components/workspace/utils/events";

type Props = {
  initialData: ExcalidrawComponentProps["initialData"] | null;
  readOnly: boolean;
  onReady: (api: ExcalidrawAPI) => void;
  className?: string;
  testId?: string;
};

export function ExcalidrawAdapter({ initialData, readOnly, onReady, className, testId }: Props): JSX.Element {
  // Intercept wheel events to redirect zoom to ViewportStore
  const base = EXCALIDRAW_PROPS;

  // Internal state/refs
  const isMounted = useRef<boolean>(false);
  // Track API readiness via ref storage; no external state required
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setExcalidrawAPI = useCanvasStore((s) => s.setExcalidrawAPI);
  const activeTool = useCanvasStore((s) => s.tools.activeTool);
  const scale = useViewportStore((s) => s.viewport.scale);
  // setScale handled inside useExcalidrawEvents
  const requestRedraw = useCanvasStore((s) => s.requestRedraw);
  const updateResolution = useCanvasStore((s) => s.updateResolution);

  // Bridge: when API is set, notify consumers and store
  const handleApiReady = useCallback((api: ExcalidrawAPI | null): void => {
    apiRef.current = api;
    setExcalidrawAPI(api);
    if (api) {
      if (process.env.NODE_ENV === 'development') {
        try { console.info('[ExcalidrawAdapter] API ready'); } catch {}
      }
      onReady(api);
    } else {
      console.warn('[ExcalidrawAdapter] API not ready, deferring operation');
    }
  }, [onReady, setExcalidrawAPI]);

  // Phase 2: do not attach wheel/touch interception; allow page scroll to bubble.

  // Full lifecycle: mount, resolution updates, resize observer, unmount
  useExcalidrawLifecycle({ containerRef, apiRef, initialData, onReady });

  // Keep Excalidraw at zoom 1.0 visually; update canvas resolution on scale changes
  useEffect((): void => {
    try {
      // Some forks expose setZoom; if present, force 1
      const anyApi = apiRef.current as unknown as { setZoom?: (z: number) => void } | null;
      if (anyApi && typeof anyApi.setZoom === "function") anyApi.setZoom(1);
    } catch {}
    updateResolution();
    requestRedraw();
  }, [scale, updateResolution, requestRedraw]);

  // Optional guard: if engine attempts to change zoom, force back to 1
  useEffect(() => {
    const api = apiRef.current as unknown as { onScrollChange?: (cb: (sx: number, sy: number, zoom: { value: number }) => void) => () => void; setZoom?: (z: number) => void } | null;
    if (!api || typeof api.onScrollChange !== 'function') return;
    const un = api.onScrollChange!((_sx, _sy, zoom) => {
      try { if (zoom && typeof zoom.value === 'number' && zoom.value !== 1) api.setZoom?.(1); } catch {}
    });
    return () => { try { un?.(); } catch {} };
  }, [apiRef]);

  // Bridge tool and scene sync
  const { onChange, syncToolToExcalidraw } = useExcalidrawBridge(apiRef.current, { mountedRef: isMounted, readOnly });
  useEffect(() => { syncToolToExcalidraw(activeTool as ToolType); }, [activeTool, syncToolToExcalidraw]);

  useEffect(() => { isMounted.current = true; }, []);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (containerRef.current && !ready) setReady(true);
  }, [ready]);
  const data = initialData ?? { elements: [], appState: { ...INITIAL_APP_STATE, width: 1200, height: 2200 }, scrollToContent: true };

  // Phase 2 zoom/pinch guard: intercept wheel/pinch on Excalidraw root so it never sees the gesture
  useEffect(() => {
    const host = (containerRef.current as HTMLElement | null)?.querySelector('.excalidraw') as HTMLElement | null;
    if (!host) return;

    const onPageZoom = (e: WheelEvent): void => {
      // If an ancestor already handled zoom (defaultPrevented), skip to avoid double zoom
      if (e.defaultPrevented) return;
      const dy = (e as any).deltaY ?? 0;
      const unit = (e as any).deltaMode === 1 ? 16 : (e as any).deltaMode === 2 ? window.innerHeight : 1;
      const ndy = dy * unit;
      const factor = Math.exp(-ndy / 400);
      const preScale = useViewportStore.getState().viewport.scale;
      const { minScale, maxScale } = useViewportStore.getState().constraints;
      const newScale = Math.max(minScale, Math.min(preScale * factor, maxScale));
      const { scrollX, scrollY } = useViewportStore.getState().viewport;
      // Focus calculation relative to scaler if present
      const viewportEl = document.getElementById('workspace-viewport') as HTMLElement | null;
      const scaler = document.getElementById('workspace-scale-layer') as HTMLElement | null;
      const refEl = scaler || viewportEl || host;
      const rect = refEl?.getBoundingClientRect();
      const x = rect ? (e.clientX - rect.left) / (preScale || 1) + (scrollX || 0) : scrollX;
      const y = rect ? (e.clientY - rect.top) / (preScale || 1) + (scrollY || 0) : scrollY;
      const k = newScale / preScale;
      const newScrollX = x - (x - scrollX) * k;
      const newScrollY = y - (y - scrollY) * k;
      useViewportStore.getState().setViewState({ scale: newScale, scrollX: newScrollX, scrollY: newScrollY });
    };

    const onWheel = (e: WheelEvent): void => {
      const ctrlLike = e.ctrlKey || e.metaKey;
      if (ctrlLike) {
        e.preventDefault();
        onPageZoom(e);
      } else {
        // Programmatically scroll the viewport to guarantee scroll works
        const viewportEl = document.getElementById('workspace-viewport') as HTMLElement | null;
        if (viewportEl) {
          const dy = normalizedDeltaY(e);
          const dx = e.deltaX;
          viewportEl.scrollBy({ top: dy, left: dx, behavior: 'auto' });
          // Prevent default to avoid double scroll on browsers that still perform default scrolling
          e.preventDefault();
        }
        // Block the engine from seeing this wheel
        (e as any).stopImmediatePropagation?.();
        e.stopPropagation();
      }
    };

    const onGesture = (e: Event): void => {
      e.preventDefault();
      (e as any).stopImmediatePropagation?.();
      e.stopPropagation();
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      const ctrlLike = e.ctrlKey || e.metaKey;
      const k = e.key;
      if (ctrlLike && (k === '+' || k === '=' || k === '-' || k === '_' || k === '0')) {
        e.preventDefault();
        (e as any).stopImmediatePropagation?.();
        e.stopPropagation();
        const pre = useViewportStore.getState().viewport.scale;
        const { minScale, maxScale } = useViewportStore.getState().constraints;
        let next = pre;
        if (k === '+' || k === '=') next = pre * (1 + CONSTRAINTS.ZOOM_STEP);
        else if (k === '-' || k === '_') next = pre * (1 - CONSTRAINTS.ZOOM_STEP);
        else if (k === '0') next = 1;
        next = Math.max(minScale, Math.min(next, maxScale));
        useViewportStore.getState().setScale(next);
        return;
      }

      // Block panning shortcuts: space/hand key ('h') from reaching engine
      if (!ctrlLike && (e.code === 'Space' || k === ' ' || k === 'Spacebar' || k.toLowerCase() === 'h')) {
        // Do not prevent default for Space so page can still scroll if browser allows
        (e as any).stopImmediatePropagation?.();
        e.stopPropagation();
        return;
      }
    };

    const onPointerDown = (e: PointerEvent): void => {
      // Block middle-mouse pan from reaching engine
      if (e.button === 1) {
        (e as any).stopImmediatePropagation?.();
        e.stopPropagation();
        // allow default autoscroll if browser wants
      }
    };

    host.addEventListener('wheel', onWheel as EventListener, { capture: true, passive: false } as AddEventListenerOptions);
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
      host.addEventListener(type, onGesture as EventListener, { capture: true, passive: false } as AddEventListenerOptions);
    });
    host.addEventListener('keydown', onKeyDown as EventListener, { capture: true } as AddEventListenerOptions);
    host.addEventListener('pointerdown', onPointerDown as EventListener, { capture: true } as AddEventListenerOptions);

    return () => {
      try { host.removeEventListener('wheel', onWheel as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
      try {
        ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
          try { host.removeEventListener(type, onGesture as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
        });
      } catch {}
      try { host.removeEventListener('keydown', onKeyDown as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
      try { host.removeEventListener('pointerdown', onPointerDown as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`workspace-excalidraw ${className ?? ""}`.trim()}
      data-excalidraw-adapter
      data-testid={testId}
      style={{ position: "relative", pointerEvents: "auto", width: "100%", height: "100%" }}
    >
      {!ready && (
        <div className="workspace-excalidraw-placeholder text-xs text-gray-500" data-placeholder>
          Loading workspace…
        </div>
      )}
      {ready && (
        <ExcalidrawRef
          ref={handleApiReady}
          initialData={data}
          viewModeEnabled={readOnly}
          {...base}
          {...onChange}
          excalidrawAPI={handleApiReady as unknown as (api: unknown) => void}
          style={{ width: "100%", height: "100%" }}
        />
      )}
      <span className="workspace-marker hidden" aria-hidden />
    </div>
  );
}

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
import { useCanvasResolution } from "@/components/workspace/hooks/useCanvasResolution";

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
  
  // Set container reference in store for resolution management
  const setContainerRef = useCanvasStore((s) => s.setContainerRef);
  
  useEffect(() => {
    if (containerRef.current && setContainerRef) {
      setContainerRef(containerRef.current);
    }
  }, [setContainerRef]);

  const setExcalidrawAPI = useCanvasStore((s) => s.setExcalidrawAPI);
  const activeTool = useCanvasStore((s) => s.tools.activeTool);
  const scale = useViewportStore((s) => s.viewport.scale);
  // setScale handled inside useExcalidrawEvents
  const requestRedraw = useCanvasStore((s) => s.requestRedraw);

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

  // Phase 3 Step 3: Enhanced DPR-aware canvas resolution management
  useCanvasResolution();

  // Full lifecycle: mount, resolution updates, resize observer, unmount
  useExcalidrawLifecycle({ containerRef, apiRef, initialData, onReady });

  // Keep Excalidraw at zoom 1.0 visually; resolution is handled by useCanvasResolution
  useEffect((): void => {
    try {
      // Some forks expose setZoom; if present, force 1
      const anyApi = apiRef.current as unknown as { setZoom?: (z: number) => void } | null;
      if (anyApi && typeof anyApi.setZoom === "function") anyApi.setZoom(1);
    } catch {}
    requestRedraw();
  }, [scale, requestRedraw]);

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

  // Phase 2 zoom/pinch/keyboard guard: intercept gestures on Excalidraw to ensure engine never zooms/pans itself
  useEffect(() => {
    const excalHost = document.getElementById('excal-host') as HTMLElement | null;
    const excalRoot = (excalHost || (containerRef.current as HTMLElement | null))?.querySelector('.excalidraw') as HTMLElement | null;
    if (!excalHost && !excalRoot) return;

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

      // Block panning shortcuts: space/hand key ('h') from reaching engine,
      // but allow when typing inside Excalidraw text editors.
      const targetEl = (e.target as Element) ?? (document.activeElement as Element | null);
      const typing = !!targetEl?.closest?.('#excal-host [contenteditable="true"], #excal-host input, #excal-host textarea');
      if (!ctrlLike && !typing && (e.code === 'Space' || k === ' ' || k === 'Spacebar' || k.toLowerCase() === 'h')) {
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

    // Wrapper that only acts if event target is inside #excal-host
    const insideHost = (e: Event): boolean => {
      const t: any = e.target;
      let el: Element | null = null;
      if (t && typeof t.closest === 'function') {
        el = t as Element;
      } else if (t && t.ownerDocument && t.ownerDocument.activeElement) {
        el = t.ownerDocument.activeElement as Element;
      } else if (document && document.activeElement) {
        el = document.activeElement as Element;
      }
      return !!el?.closest?.('#excal-host');
    };

    const wheelWrapper = (e: Event) => { if (insideHost(e)) onWheel(e as WheelEvent); };
    const keyWrapper = (e: Event) => { if (insideHost(e)) onKeyDown(e as KeyboardEvent); };
    const ptrWrapper = (e: Event) => { if (insideHost(e)) onPointerDown(e as PointerEvent); };
    const gestWrapper = (e: Event) => { if (insideHost(e)) onGesture(e); };

    const addAll = (el: EventTarget | null) => {
      if (!el) return;
      el.addEventListener('wheel', wheelWrapper as EventListener, { capture: true, passive: false } as AddEventListenerOptions);
      ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
        el.addEventListener(type, gestWrapper as EventListener, { capture: true, passive: false } as AddEventListenerOptions);
      });
      el.addEventListener('keydown', keyWrapper as EventListener, { capture: true } as AddEventListenerOptions);
      el.addEventListener('pointerdown', ptrWrapper as EventListener, { capture: true } as AddEventListenerOptions);
    };

    const removeAll = (el: EventTarget | null) => {
      if (!el) return;
      try { el.removeEventListener('wheel', wheelWrapper as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
      try {
        ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
          try { el.removeEventListener(type, gestWrapper as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
        });
      } catch {}
      try { el.removeEventListener('keydown', keyWrapper as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
      try { el.removeEventListener('pointerdown', ptrWrapper as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
    };

    addAll(excalHost);
    addAll(excalRoot);
    addAll(document);

    return () => {
      removeAll(excalHost);
      removeAll(excalRoot);
      removeAll(document);
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

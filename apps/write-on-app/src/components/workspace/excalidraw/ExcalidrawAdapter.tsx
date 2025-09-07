"use client";

import { useCallback, useEffect, useRef } from "react";
import ExcalidrawRef from "@/components/excalidraw/ExcalidrawRef";
import { EXCALIDRAW_PROPS, INITIAL_APP_STATE } from "@/components/workspace/excalidraw/excalidrawConfig";
import { useExcalidrawBridge } from "@/components/workspace/excalidraw/useExcalidrawBridge";
import { useExcalidrawLifecycle } from "@/components/workspace/excalidraw/useExcalidrawLifecycle";
import type { ExcalidrawAPI, ExcalidrawComponentProps } from "@/components/workspace/excalidraw/types";
import { useCanvasStore, useViewportStore } from "@/state";
import type { ToolType } from "@/types/state";

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

  const ready = Boolean(containerRef.current);
  const data = initialData ?? { elements: [], appState: { ...INITIAL_APP_STATE }, scrollToContent: true };

  // Phase 2 zoom/scroll guard: stop wheel from reaching Excalidraw so browser/page handle it
  useEffect(() => {
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;
    const onWheelCapture = (e: WheelEvent): void => {
      // For zoom gestures, stop propagation to prevent Excalidraw internal zoom.
      // Parent capture handler on WorkspaceViewport already handled scaling.
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        (e as any).stopImmediatePropagation?.();
        e.stopPropagation();
      }
      // Otherwise let normal scroll bubble to the page
    };
    const onKeyDownCapture = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        const k = e.key;
        if (k === '+' || k === '-' || k === '=' || k === '0') {
          e.preventDefault();
          (e as any).stopImmediatePropagation?.();
          e.stopPropagation();
        }
      }
    };
    el.addEventListener('wheel', onWheelCapture as EventListener, { capture: true, passive: false } as AddEventListenerOptions);
    el.addEventListener('keydown', onKeyDownCapture as EventListener, { capture: true } as AddEventListenerOptions);
    return () => {
      try { el.removeEventListener('wheel', onWheelCapture as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
      try { el.removeEventListener('keydown', onKeyDownCapture as EventListener, { capture: true } as AddEventListenerOptions); } catch {}
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

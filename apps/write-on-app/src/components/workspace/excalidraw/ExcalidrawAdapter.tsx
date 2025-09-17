"use client";

import { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo } from "react";
import ExcalidrawRef from "@/components/excalidraw/ExcalidrawRef";
import { EXCALIDRAW_PROPS, INITIAL_APP_STATE, CONSTRAINTS } from "@/components/workspace/excalidraw/excalidrawConfig";
import { useExcalidrawBridge } from "@/components/workspace/excalidraw/useExcalidrawBridge";
import { useExcalidrawLifecycle } from "@/components/workspace/excalidraw/useExcalidrawLifecycle";
import type { ExcalidrawAPI, ExcalidrawComponentProps } from "@/components/workspace/excalidraw/types";
import { useCanvasStore, useViewportStore } from "@/state";
import type { ToolType } from "@/types/state";
import { normalizedDeltaY } from "@/components/workspace/utils/events";
import { useCanvasResolution } from "@/components/workspace/hooks/useCanvasResolution";
import { installCanvasGuards } from "@/components/workspace/excalidraw/debugCanvasGuards";
// Dynamic imports to avoid SSR issues with devicePixelRatio
// import { exportToSvg, exportToBlob } from "@excalidraw/excalidraw";

type Props = {
  initialData: ExcalidrawComponentProps["initialData"] | null;
  readOnly: boolean;
  onReady: (api: ExcalidrawAPI) => void;
  className?: string;
  testId?: string;
  // Step 7: Attribute-based inputs
  scale?: number;
  initialScene?: unknown;
};

// Step 7: Imperative API interface
export interface ExcalidrawContractAPI {
  requestExport(options: { type: 'png' | 'svg'; dpi?: number }): Promise<void>;
  setScene(scene: unknown): Promise<void>;
}

// Step 7: CustomEvent detail types
interface ReadyEventDetail {
  api: ExcalidrawAPI;
}

interface SceneChangeEventDetail {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  files?: Record<string, unknown>;
}

interface ExportEventDetail {
  type: 'png' | 'svg';
  blob?: Blob;
  dataURL?: string;
}

interface ErrorEventDetail {
  code: 'INVALID_SCENE' | 'EXPORT_FAILED' | 'API_ERROR';
  message: string;
  details?: unknown;
}

// Step 7: Scene validation constants
const MAX_SCENE_SIZE = 1024 * 1024; // 1MB
const REQUIRED_SCENE_FIELDS = ['elements'] as const;

// Step 7: Scene validation utilities
function validateSceneBoundary(scene: unknown): { valid: boolean; error?: string } {
  try {
    // Size check
    const jsonStr = JSON.stringify(scene);
    if (jsonStr.length > MAX_SCENE_SIZE) {
      return { valid: false, error: `Scene size ${jsonStr.length} exceeds limit ${MAX_SCENE_SIZE}` };
    }

    // JSON validity already confirmed by stringify above
    if (!scene || typeof scene !== 'object') {
      return { valid: false, error: 'Scene must be a valid object' };
    }

    // Required fields check
    const sceneObj = scene as Record<string, unknown>;
    for (const field of REQUIRED_SCENE_FIELDS) {
      if (!(field in sceneObj)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
      if (field === 'elements' && !Array.isArray(sceneObj[field])) {
        return { valid: false, error: 'Field "elements" must be an array' };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Invalid JSON: ${error}` };
  }
}

function sanitizeScene(scene: unknown): Record<string, unknown> {
  if (!scene || typeof scene !== 'object') {
    return { elements: [], appState: {} };
  }

  const sceneObj = scene as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  // Ensure required fields
  sanitized.elements = Array.isArray(sceneObj.elements) ? sceneObj.elements : [];
  
  // Coerce and preserve known fields
  if (sceneObj.appState && typeof sceneObj.appState === 'object') {
    sanitized.appState = { ...sceneObj.appState };
  } else {
    sanitized.appState = {};
  }

  if (sceneObj.files && typeof sceneObj.files === 'object') {
    sanitized.files = { ...sceneObj.files };
  }

  return sanitized;
}

function emitCustomEvent(element: HTMLElement | null, eventName: string, detail: unknown): void {
  if (!element) return;
  
  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: false
  });
  
  element.dispatchEvent(event);
}

export const ExcalidrawAdapter = forwardRef<ExcalidrawContractAPI, Props>(function ExcalidrawAdapter(
  { initialData, readOnly, onReady, className, testId, scale: propScale, initialScene }, 
  ref
) {
  // Intercept wheel events to redirect zoom to ViewportStore
  const base = EXCALIDRAW_PROPS;

  // Internal state/refs
  const isMounted = useRef<boolean>(false);
  // Track API readiness via ref storage; no external state required
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Step 7: Contract state
  const [isContractReady, setIsContractReady] = useState(false);
  const [sceneState, setSceneState] = useState<'valid' | 'invalid-scene' | 'loading'>('loading');
  const lastSceneRef = useRef<Record<string, unknown> | null>(null);
  
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

  // Step 7: Imperative API methods
  useImperativeHandle(ref, () => ({
    async requestExport({ type, dpi = 1 }: { type: 'png' | 'svg'; dpi?: number }) {
      if (!isContractReady || !apiRef.current) {
        emitCustomEvent(containerRef.current, 'error', {
          code: 'API_ERROR',
          message: 'Excalidraw not ready for export',
          details: { ready: isContractReady, api: !!apiRef.current }
        } as ErrorEventDetail);
        return;
      }
      
      try {
        emitCustomEvent(containerRef.current, 'exportstart', { type });
        
        const elements = apiRef.current.getSceneElements?.() ?? [];
        const appState = apiRef.current.getAppState?.() ?? {};
        const files = apiRef.current.getFiles?.() ?? {};
        
        if (type === 'svg') {
          const { exportToSvg } = await import('@excalidraw/excalidraw');
          const svg = await exportToSvg({ elements, appState, files });
          emitCustomEvent(containerRef.current, 'export', {
            type: 'svg',
            dataURL: `data:image/svg+xml;base64,${btoa(svg)}`
          } as ExportEventDetail);
        } else {
          const { exportToBlob } = await import('@excalidraw/excalidraw');
          const blob = await exportToBlob({
            elements, 
            appState, 
            files,
            mimeType: 'image/png',
            getDimensions: (width, height) => ({ width: width * dpi, height: height * dpi })
          });
          emitCustomEvent(containerRef.current, 'export', {
            type: 'png',
            blob
          } as ExportEventDetail);
        }
      } catch (error) {
        emitCustomEvent(containerRef.current, 'error', {
          code: 'EXPORT_FAILED',
          message: `Export failed: ${error}`,
          details: error
        } as ErrorEventDetail);
      } finally {
        emitCustomEvent(containerRef.current, 'exportend', { type });
      }
    },
    
    async setScene(scene: unknown) {
      if (!isContractReady || !apiRef.current) {
        emitCustomEvent(containerRef.current, 'error', {
          code: 'API_ERROR',
          message: 'Excalidraw not ready for scene update',
          details: { ready: isContractReady, api: !!apiRef.current }
        } as ErrorEventDetail);
        return;
      }
      
      const validation = validateSceneBoundary(scene);
      if (!validation.valid) {
        setSceneState('invalid-scene');
        emitCustomEvent(containerRef.current, 'error', {
          code: 'INVALID_SCENE',
          message: validation.error || 'Invalid scene data',
          details: scene
        } as ErrorEventDetail);
        return;
      }
      
      try {
        const sanitized = sanitizeScene(scene);
        lastSceneRef.current = sanitized;
        
        await apiRef.current.updateScene?.({
          elements: sanitized.elements as any[],
          appState: sanitized.appState as Record<string, unknown>,
          files: sanitized.files as Record<string, unknown>
        });
        
        setSceneState('valid');
      } catch (error) {
        setSceneState('invalid-scene');
        emitCustomEvent(containerRef.current, 'error', {
          code: 'INVALID_SCENE',
          message: `Scene update failed: ${error}`,
          details: error
        } as ErrorEventDetail);
      }
    }
  }), [isContractReady]);

  // Bridge: when API is set, notify consumers and store
  const handleApiReady = useCallback((api: ExcalidrawAPI | null): void => {
    apiRef.current = api;
    setExcalidrawAPI(api);
    if (api) {
      if (process.env.NODE_ENV === 'development') {
        try { console.info('[ExcalidrawAdapter] API ready'); } catch {}
      }
      setIsContractReady(true);
      setSceneState('valid');
      
      // Step 7: Emit ready event
      emitCustomEvent(containerRef.current, 'ready', { api } as ReadyEventDetail);
      
      // Feed Excalidraw sane page constants to avoid container-derived sizes
      try {
        (api as any)?.updateScene?.({ appState: { width: 1200, height: 2200, zoom: { value: 1 } } });
      } catch {}

      onReady(api);
    } else {
      console.warn('[ExcalidrawAdapter] API not ready, deferring operation');
      setIsContractReady(false);
    }
  }, [onReady, setExcalidrawAPI]);

  // Phase 2: do not attach wheel/touch interception; allow page scroll to bubble.

  // Phase 3 Step 3: Enhanced DPR-aware canvas resolution management
  useCanvasResolution();

  // Dev-only: install guards to detect runaway canvas sizing writes
  useEffect(() => {
    installCanvasGuards();
  }, []);

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

  // Step 7: Scene change event callback
  const handleSceneChange = useCallback((elements: readonly unknown[], appState: Record<string, unknown>, files?: Record<string, unknown>) => {
    // Emit scenechange event
    emitCustomEvent(containerRef.current, 'scenechange', {
      elements,
      appState,
      files
    } as SceneChangeEventDetail);
  }, []);

  // Bridge tool and scene sync
  const { onChange, syncToolToExcalidraw } = useExcalidrawBridge(apiRef.current, { 
    mountedRef: isMounted, 
    readOnly,
    onSceneChange: handleSceneChange 
  });
  useEffect(() => { syncToolToExcalidraw(activeTool as ToolType); }, [activeTool, syncToolToExcalidraw]);

  useEffect(() => { isMounted.current = true; }, []);

  // Step 7: Handle attribute-based inputs (simplified to prevent loops)
  useEffect(() => {
    if (propScale && propScale !== scale) {
      try {
        useViewportStore.getState().setScale(propScale);
      } catch (error) {
        console.warn('[ExcalidrawAdapter] Scale update failed:', error);
      }
    }
  }, [propScale]); // Removed 'scale' from deps to prevent loop

  useEffect(() => {
    if (initialScene) {
      try {
        const validation = validateSceneBoundary(initialScene);
        if (validation.valid) {
          const sanitized = sanitizeScene(initialScene);
          lastSceneRef.current = sanitized;
          setSceneState('valid');
        } else {
          setSceneState('invalid-scene');
          emitCustomEvent(containerRef.current, 'error', {
            code: 'INVALID_SCENE',
            message: validation.error || 'Invalid initial scene',
            details: initialScene
          } as ErrorEventDetail);
        }
      } catch (error) {
        console.error('[ExcalidrawAdapter] Scene processing failed:', error);
        setSceneState('invalid-scene');
      }
    }
  }, [initialScene]);

  // Step 7: Update data-state attribute
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.setAttribute('data-state', sceneState);
    }
  }, [sceneState]);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (containerRef.current && !ready) setReady(true);
  }, [ready]);
  // Step 7: Use initial scene if provided, otherwise use initialData
  const data = useMemo(() => {
    if (initialScene && lastSceneRef.current) {
      return {
        elements: lastSceneRef.current.elements as any[],
        appState: { ...INITIAL_APP_STATE, ...lastSceneRef.current.appState, width: 1200, height: 2200 },
        files: lastSceneRef.current.files || {},
        scrollToContent: true
      };
    }
    return initialData ?? { elements: [], appState: { ...INITIAL_APP_STATE, width: 1200, height: 2200 }, scrollToContent: true };
  }, [initialData, initialScene]); // Remove lastSceneRef.current from dependencies to prevent infinite loop

  // Phase 2 zoom/pinch/keyboard guard: simplified event interception
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;

    // Simplified wheel event handling to prevent zoom conflicts
    const onWheel = (e: WheelEvent): void => {
      const ctrlLike = e.ctrlKey || e.metaKey;
      if (ctrlLike) {
        // Let the parent handle zoom
        e.stopPropagation();
      }
    };

    // Add minimal event handling
    container.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      container.removeEventListener('wheel', onWheel);
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
      {sceneState === 'invalid-scene' && (
        <div className="workspace-excalidraw-error text-xs text-red-500 p-2 bg-red-50 border border-red-200 rounded" data-error-state="invalid-scene">
          Invalid scene data. Please check the scene format and try again.
        </div>
      )}
      {ready && sceneState !== 'invalid-scene' && (
        <ExcalidrawRef
          ref={handleApiReady}
          initialData={data}
          viewModeEnabled={readOnly}
          {...base}
          {...onChange}
          excalidrawAPI={handleApiReady as unknown as (api: unknown) => void}
        />
      )}
      <span className="workspace-marker hidden" aria-hidden />
    </div>
  );
});

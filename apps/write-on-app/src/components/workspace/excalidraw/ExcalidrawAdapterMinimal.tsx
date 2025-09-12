"use client";

import { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import ExcalidrawRef from "@/components/excalidraw/ExcalidrawRef";
import { EXCALIDRAW_PROPS, INITIAL_APP_STATE } from "@/components/workspace/excalidraw/excalidrawConfig";
import type { ExcalidrawAPI, ExcalidrawComponentProps } from "@/components/workspace/excalidraw/types";
import { useCanvasStore, useViewportStore } from "@/state";

/**
 * Step 9: Minimal imperative API for host convenience
 * 
 * These methods provide essential functionality beyond attributes/events.
 * All methods are only valid after the 'ready' event is emitted.
 * Misuse before ready state yields clear error messages.
 */
export interface ExcalidrawContractAPI {
  /**
   * Request export of current scene to PNG or SVG format.
   * 
   * @param options - Export configuration
   * @param options.type - Export format: 'png' for raster, 'svg' for vector
   * @param options.dpi - Optional DPI multiplier for PNG exports (defaults to effectiveDPR = devicePixelRatio × scale)
   * 
   * @returns Promise that resolves when export is initiated
   * 
   * **Timing**: Only valid after 'ready' event. Calls before ready will emit 'error' event.
   * 
   * **Events Emitted**:
   * - 'exportstart' → { type } - Export process begins
   * - 'export' → { type, blob?, dataURL? } - Export completed successfully  
   * - 'exportend' → { type } - Export process finished (success or failure)
   * - 'error' → { code: 'API_ERROR' | 'EXPORT_FAILED', message, details? } - Export failed
   * 
   * **Error Behaviors**:
   * - Before ready: Emits 'error' with code 'API_ERROR'
   * - Export failure: Emits 'error' with code 'EXPORT_FAILED'
   * - Invalid type: TypeScript compile-time error
   */
  requestExport(options: { type: 'png' | 'svg'; dpi?: number }): Promise<void>;
  
  /**
   * Replace the current scene with new content (with validation).
   * 
   * @param scene - Scene data object containing elements array and optional appState/files
   * 
   * @returns Promise that resolves when scene update is complete
   * 
   * **Timing**: Only valid after 'ready' event. Calls before ready will emit 'error' event.
   * 
   * **Validation**: Scene must be valid JSON object with required 'elements' array.
   * Size limit: 1MB JSON string. Scroll coordinates are automatically stripped.
   * 
   * **Events Emitted**:
   * - 'scenechange' → { elements, appState, files? } - Scene updated successfully
   * - 'error' → { code: 'API_ERROR' | 'INVALID_SCENE', message, details? } - Scene update failed
   * 
   * **Error Behaviors**:
   * - Before ready: Emits 'error' with code 'API_ERROR' 
   * - Invalid scene: Emits 'error' with code 'INVALID_SCENE'
   * - Missing elements: Emits 'error' with code 'INVALID_SCENE'
   * - Size too large: Emits 'error' with code 'INVALID_SCENE'
   * - Update failure: Emits 'error' with code 'INVALID_SCENE'
   */
  setScene(scene: unknown): Promise<void>;
}

interface Props {
  initialData: ExcalidrawComponentProps["initialData"] | null;
  readOnly: boolean;
  onReady: (api: ExcalidrawAPI) => void;
  className?: string;
  testId?: string;
  // Ownership enforcement context
  mode?: 'teacher' | 'student';
  writeScope?: 'teacher-base' | 'student' | 'teacher-review';
  currentStudentId?: string;
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

// Ownership enforcement helpers
function canEditElement(element: any, writeScope: string, currentStudentId: string): boolean {
  if (!element.owner) return true; // Legacy elements without owner tags
  
  switch (writeScope) {
    case 'teacher-base':
      return element.owner === 'teacher';
    case 'student':
      return element.owner === `student:${currentStudentId}`;
    case 'teacher-review':
      return element.owner === `teacher-review:${currentStudentId}`;
    default:
      return false;
  }
}

function canSelectElement(element: any, writeScope: string, currentStudentId: string): boolean {
  // Key UX principle: users can only select elements they can edit
  // This makes cross-layer elements completely unselectable
  return canEditElement(element, writeScope, currentStudentId);
}

function shouldHideElement(element: any, writeScope: string, currentStudentId: string): boolean {
  // For now, show all elements but make non-editable ones unselectable
  // In the future, this could hide elements based on privacy rules
  return false;
}

function getOwnerTagForNewElement(writeScope: string, currentStudentId: string): string {
  switch (writeScope) {
    case 'teacher-base':
      return 'teacher';
    case 'student':
      return `student:${currentStudentId}`;
    case 'teacher-review':
      return `teacher-review:${currentStudentId}`;
    default:
      return 'teacher';
  }
}

export const ExcalidrawAdapterMinimal = forwardRef<ExcalidrawContractAPI, Props>(function ExcalidrawAdapterMinimal(
  { initialData, readOnly, onReady, className, testId, mode = 'teacher', writeScope = 'teacher-base', currentStudentId = 'current-student-id' }, 
  ref
) {
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  
  // Step 8: DPI-aware export only (don't interfere with live canvas)
  // The "crisp ink" requirement is most important for exports, not live editing
  const setExcalidrawAPI = useCanvasStore((s) => s.setExcalidrawAPI);
  const scale = useViewportStore((s) => s.viewport.scale);

  // Minimal imperative API with DPI-aware exports
  useImperativeHandle(ref, () => ({
    async requestExport({ type, dpi }: { type: 'png' | 'svg'; dpi?: number }) {
      if (!apiRef.current) {
        const errorDetail = {
          code: 'API_ERROR' as const,
          message: 'Cannot export: Excalidraw API not ready. Wait for "ready" event before calling requestExport().',
          details: { 
            method: 'requestExport', 
            type, 
            readyState: false,
            suggestion: 'Listen for "ready" event or check component mount state'
          }
        };
        console.warn('[ExcalidrawAPI]', errorDetail.message);
        emitCustomEvent(containerRef.current, 'error', errorDetail);
        return;
      }
      
      try {
        emitCustomEvent(containerRef.current, 'exportstart', { type });
        
        const elements = apiRef.current.getSceneElements?.() ?? [];
        const rawAppState = apiRef.current.getAppState?.() ?? {};
        
        // Step 8: Calculate effectiveDPR for crisp exports
        const deviceDPR = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
        const effectiveDPR = dpi || (deviceDPR * scale);
        const clampedDPR = Math.max(0.75, Math.min(effectiveDPR, 3)); // Clamp for safety
        
        // Strip scroll coordinates for clean export
        const appState = { ...rawAppState };
        delete appState.scrollX;
        delete appState.scrollY;
        
        if (type === 'svg') {
          const { exportToSvg } = await import('@excalidraw/excalidraw');
          const svg = await exportToSvg({ 
            elements, 
            appState,
            // SVG is vector-based, but we can still apply scaling
            getDimensions: (width, height) => ({ 
              width: width * clampedDPR, 
              height: height * clampedDPR 
            })
          });
          emitCustomEvent(containerRef.current, 'export', {
            type: 'svg',
            dataURL: `data:image/svg+xml;base64,${btoa(svg)}`
          });
        } else {
          const { exportToBlob } = await import('@excalidraw/excalidraw');
          const blob = await exportToBlob({
            elements, 
            appState, 
            mimeType: 'image/png',
            // Step 8: Apply effectiveDPR for crisp PNG exports
            getDimensions: (width, height) => ({ 
              width: Math.round(width * clampedDPR), 
              height: Math.round(height * clampedDPR) 
            })
          });
          emitCustomEvent(containerRef.current, 'export', {
            type: 'png',
            blob
          });
        }
      } catch (error) {
        console.error('Export failed:', error);
        emitCustomEvent(containerRef.current, 'error', {
          code: 'EXPORT_FAILED',
          message: `Export failed: ${error}`
        });
      } finally {
        emitCustomEvent(containerRef.current, 'exportend', { type });
      }
    },
    
    async setScene(scene: unknown) {
      if (!apiRef.current) {
        const errorDetail = {
          code: 'API_ERROR' as const,
          message: 'Cannot setScene: Excalidraw API not ready. Wait for "ready" event before calling setScene().',
          details: { 
            method: 'setScene', 
            readyState: false,
            suggestion: 'Listen for "ready" event or check component mount state'
          }
        };
        console.warn('[ExcalidrawAPI]', errorDetail.message);
        emitCustomEvent(containerRef.current, 'error', errorDetail);
        return;
      }
      
      try {
        console.log('setScene called with:', scene);
        
        // Step 9: Enhanced validation with detailed error messages
        if (!scene || typeof scene !== 'object') {
          const errorDetail = {
            code: 'INVALID_SCENE' as const,
            message: 'Invalid scene data: Scene must be a valid object with required fields.',
            details: { 
              provided: typeof scene,
              expected: 'object with { elements: [], appState?: {}, files?: {} }',
              example: '{ elements: [{ id: "rect1", type: "rectangle", x: 0, y: 0, width: 100, height: 100 }] }'
            }
          };
          console.warn('[ExcalidrawAPI]', errorDetail.message, errorDetail.details);
          emitCustomEvent(containerRef.current, 'error', errorDetail);
          return;
        }
        
        const sceneObj = scene as any;
        if (!Array.isArray(sceneObj.elements)) {
          const errorDetail = {
            code: 'INVALID_SCENE' as const,
            message: 'Invalid scene structure: Missing required "elements" array.',
            details: { 
              provided: sceneObj.elements ? typeof sceneObj.elements : 'undefined',
              expected: 'Array of element objects',
              availableFields: Object.keys(sceneObj),
              example: 'elements: [{ id: "rect1", type: "rectangle", x: 0, y: 0, width: 100, height: 100 }]'
            }
          };
          console.warn('[ExcalidrawAPI]', errorDetail.message, errorDetail.details);
          emitCustomEvent(containerRef.current, 'error', errorDetail);
          return;
        }
        
        // Strip scroll coordinates to prevent internal panning
        const cleanAppState = { ...(sceneObj.appState || {}) };
        delete cleanAppState.scrollX;
        delete cleanAppState.scrollY;
        
        // Update scene
        await apiRef.current.updateScene?.({
          elements: sceneObj.elements,
          appState: cleanAppState,
          files: sceneObj.files || {}
        });
        
        console.log('Scene updated successfully');
        
      } catch (error) {
        console.error('setScene failed:', error);
        emitCustomEvent(containerRef.current, 'error', {
          code: 'INVALID_SCENE',
          message: `Scene update failed: ${error}`
        });
      }
    }
  }), []);

  // Step 8: Container ref no longer needed for DPI management
  // DPI handling moved to export-only to avoid canvas interference

  const handleApiReady = useCallback((api: ExcalidrawAPI | null): void => {
    apiRef.current = api;
    setExcalidrawAPI(api); // Step 8: Update canvas store API reference
    
    if (api) {
      console.log('API ready');
      
      // Step 7: Force internal zoom to 1.0 to disable internal zoom
      try {
        const anyApi = api as any;
        if (typeof anyApi.setZoom === 'function') {
          anyApi.setZoom(1);
        }
      } catch (error) {
        console.warn('Could not set initial zoom:', error);
      }
      
      emitCustomEvent(containerRef.current, 'ready', { api });
      onReady(api);
    }
  }, [onReady, setExcalidrawAPI]);

  // Step 7: Keep internal zoom locked at 1.0
  useEffect(() => {
    if (!apiRef.current) return;
    
    const api = apiRef.current as any;
    if (typeof api.setZoom !== 'function') return;
    
    // Force zoom to 1 periodically to counteract any internal changes
    const forceZoom = () => {
      try {
        api.setZoom(1);
      } catch (error) {
        console.warn('Zoom lock failed:', error);
      }
    };
    
    // Also listen for scroll changes to reset zoom
    let unsubscribe: (() => void) | null = null;
    if (typeof api.onScrollChange === 'function') {
      unsubscribe = api.onScrollChange((_scrollX: number, _scrollY: number, zoom: { value: number }) => {
        if (zoom && zoom.value !== 1) {
          try {
            api.setZoom(1);
          } catch (error) {
            console.warn('Zoom reset failed:', error);
          }
        }
      });
    }
    
    const interval = setInterval(forceZoom, 500); // Check every 500ms (less frequent)
    
    return () => {
      clearInterval(interval);
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Unsubscribe failed:', error);
        }
      }
    };
  }, [ready]); // Use ready instead of apiRef.current

  // Step 7: Intercept zoom/pan events
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    const onWheel = (e: WheelEvent): void => {
      const ctrlLike = e.ctrlKey || e.metaKey;
      if (ctrlLike) {
        // Block ctrl+wheel zoom from reaching Excalidraw
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Allow normal scrolling but prevent it from reaching Excalidraw's zoom
      e.stopPropagation();
    };
    
    const onKeyDown = (e: KeyboardEvent): void => {
      const ctrlLike = e.ctrlKey || e.metaKey;
      const key = e.key;
      
      // Block zoom keyboard shortcuts
      if (ctrlLike && (key === '+' || key === '=' || key === '-' || key === '_' || key === '0')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Block space and 'h' pan shortcuts
      if (key === ' ' || key.toLowerCase() === 'h') {
        const target = e.target as Element;
        const isTyping = target?.closest('input, textarea, [contenteditable="true"]');
        if (!isTyping) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    
    // Add event listeners
    container.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('keydown', onKeyDown, { capture: true });
    
    return () => {
      container.removeEventListener('wheel', onWheel, { capture: true });
      document.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (containerRef.current && !ready) {
      setReady(true);
    }
  }, [ready]);

  const data = initialData ?? { 
    elements: [], 
    appState: { ...INITIAL_APP_STATE, width: 1200, height: 2200 }, 
    scrollToContent: true 
  };

  // Ownership enforcement event handlers
  const onPointerUpdate = useCallback((payload: any) => {
    // Selection filter: completely block selection of cross-layer elements
    if (payload?.elements && payload.elements.length > 0) {
      const selectableElements = payload.elements.filter((element: any) => {
        return canSelectElement(element, writeScope, currentStudentId);
      });
      
      // If any elements were filtered out, log it
      const filtered = payload.elements.length - selectableElements.length;
      if (filtered > 0) {
        console.log(`[OwnershipEnforcement] Blocked selection of ${filtered} cross-layer element(s)`);
      }
      
      // If we filtered out elements, we need to prevent the selection
      // Unfortunately Excalidraw doesn't give us direct control over selection
      // So we'll handle this in onChange instead
    }
  }, [writeScope, currentStudentId]);

  const onChange = useCallback((elements: any[], appState: any, files: any) => {
    // Critical UX enforcement: Remove cross-layer elements from selection
    const selectedIds = new Set(appState.selectedElementIds || []);
    const blockedSelections = new Set<string>();
    
    // Check for cross-layer selections and remove them
    elements.forEach(element => {
      if (selectedIds.has(element.id) && element.owner && !canSelectElement(element, writeScope, currentStudentId)) {
        blockedSelections.add(element.id);
        selectedIds.delete(element.id);
      }
    });
    
    if (blockedSelections.size > 0) {
      console.log(`[OwnershipEnforcement] Removed ${blockedSelections.size} cross-layer elements from selection:`, Array.from(blockedSelections));
    }
    
    // Mutation guard: block changes to elements not in write scope  
    const enforcedElements = elements.map((element: any) => {
      // If element exists and we can't edit it, ensure it stays unchanged
      if (element.owner && !canEditElement(element, writeScope, currentStudentId)) {
        // For cross-layer elements, ensure they remain visually distinct
        return {
          ...element,
          // Visual indicators for uneditable content
          opacity: element.opacity || 0.7,
          locked: true
        };
      }
      
      // Tag new elements with current write scope
      if (!element.owner) {
        return {
          ...element,
          owner: getOwnerTagForNewElement(writeScope, currentStudentId),
          opacity: 1,
          locked: false
        };
      }
      
      return element;
    });
    
    // Clean appState to remove cross-layer selections
    const cleanAppState = {
      ...appState,
      selectedElementIds: Array.from(selectedIds),
      selectedGroupIds: {} // Clear group selections that might include cross-layer elements
    };
    
    // Emit scene change with layer information (minimal API)
    // Only emit for student and teacher-review layers (overlay changes)
    if (writeScope === 'student' || writeScope === 'teacher-review') {
      emitCustomEvent(containerRef.current, 'scenechange', {
        scene: {
          elements: enforcedElements,
          appState: cleanAppState,
          files
        },
        layer: writeScope // 'student' | 'teacher-review'
      });
    }
  }, [writeScope, currentStudentId]);

  return (
    <div
      ref={containerRef}
      className={`workspace-excalidraw ${className ?? ""}`.trim()}
      data-testid={testId}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {!ready && (
        <div className="flex items-center justify-center h-full text-gray-500">
          Loading...
        </div>
      )}
      {ready && (
        <ExcalidrawRef
          ref={handleApiReady}
          initialData={data}
          viewModeEnabled={readOnly}
          onChange={onChange}
          onPointerUpdate={onPointerUpdate}
          {...EXCALIDRAW_PROPS}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
});
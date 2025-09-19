/**
 * Step 10: Hook for managing Excalidraw Island integration
 * 
 * Provides:
 * - Scale synchronization with viewport store
 * - Island lifecycle management
 * - Route-based readonly/initial-scene logic
 * - Imperative API access
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useViewportStore } from '@/state';
import type { ExcalidrawIslandElement } from '@/components/workspace/ExcalidrawIsland';

interface UseExcalidrawIslandOptions {
  /** Container element where island will be mounted */
  containerRef: React.RefObject<HTMLElement | null>;
  /** View mode: who is viewing the canvas */
  mode?: 'teacher' | 'student';
  /** Write scope: which layer is writable */
  writeScope?: 'teacher-base' | 'student' | 'teacher-review';
  /** Teacher base layer scene data */
  baseScene?: unknown;
  /** Student/review overlay scene data */
  overlayScene?: unknown;
  /** Callback when island is ready */
  onReady?: (element: ExcalidrawIslandElement) => void;
  /** Callback when Excalidraw API is ready */
  onExcalidrawReady?: (api: any) => void;
}

interface UseExcalidrawIslandReturn {
  /** Island element reference */
  islandRef: React.RefObject<ExcalidrawIslandElement>;
  /** Current island element */
  island: ExcalidrawIslandElement | null;
  /** Excalidraw API (when ready) */
  excalidrawAPI: any;
  /** Island ready state */
  isReady: boolean;
  /** Mount the island in the container */
  mount: () => void;
  /** Unmount the island */
  unmount: () => void;
  /** Force remount (for HMR) */
  remount: () => void;
  /** Export function */
  requestExport: (options: { type: 'png' | 'svg'; dpi?: number }) => Promise<void>;
  /** Scene update function */
  setScene: (scene: unknown) => Promise<void>;
}

export function useExcalidrawIsland(options: UseExcalidrawIslandOptions): UseExcalidrawIslandReturn {
  const {
    containerRef,
    mode = 'teacher',
    writeScope = 'teacher-base',
    baseScene,
    overlayScene,
    onReady,
    onExcalidrawReady
  } = options;

  const islandRef = useRef<ExcalidrawIslandElement>(null);
  const DEBUG_EXCALIDRAW = process.env.NEXT_PUBLIC_EXCALIDRAW_DEBUG === '1';
  const mountedRef = useRef<boolean>(false);
  const [island, setIsland] = useState<ExcalidrawIslandElement | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const lastReadyRef = useRef<boolean>(false);
  const lastApiRef = useRef<any>(null);

  // Viewport store integration
  const scale = useViewportStore((state) => state.viewport.scale);

  // Create island element
  const createIsland = useCallback((): ExcalidrawIslandElement => {
    const islandElement = document.createElement('excalidraw-island') as ExcalidrawIslandElement;
    
    // Set initial attributes
    islandElement.scale = scale;
    islandElement.mode = mode;
    islandElement.writeScope = writeScope;
    if (baseScene) {
      islandElement.baseScene = JSON.stringify(baseScene);
    }
    if (overlayScene) {
      islandElement.overlayScene = JSON.stringify(overlayScene);
    }

    // Style: let host CSS define exact pixel size; avoid percent-based stretch
    islandElement.style.cssText = `
      display: block;
      border: none;
      background: transparent;
    `;

    return islandElement;
  }, [scale, mode, writeScope, baseScene, overlayScene]);

  // Mount island in container
  const mount = useCallback(() => {
    // Guard against multi-mount spam
    if (mountedRef.current) {
      return;
    }
    if (!containerRef.current) {
      console.warn('[useExcalidrawIsland] No container available for mounting');
      return;
    }

    // Import the island component to ensure it's registered
    import('@/components/workspace/ExcalidrawIsland').then(() => {
      if (!containerRef.current) return;

      // Clear container
      containerRef.current.innerHTML = '';

      // Create and mount island
      const islandElement = createIsland();
      containerRef.current.appendChild(islandElement);
      
      islandRef.current = islandElement;
      setIsland(islandElement);
      mountedRef.current = true;
      
      if (DEBUG_EXCALIDRAW) console.log('[useExcalidrawIsland] Island mounted');
    }).catch(error => {
      console.error('[useExcalidrawIsland] Failed to load island:', error);
    });
  }, [containerRef, createIsland]);

  // Unmount island
  const unmount = useCallback(() => {
    if (islandRef.current && islandRef.current.parentNode) {
      islandRef.current.parentNode.removeChild(islandRef.current);
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    islandRef.current = null;
    setIsland(null);
    setExcalidrawAPI(null);
    setIsReady(false);
    mountedRef.current = false;
    if (DEBUG_EXCALIDRAW) console.log('[useExcalidrawIsland] Island unmounted');
  }, [containerRef]);

  // Remount island (for HMR)
  const remount = useCallback(() => {
    if (DEBUG_EXCALIDRAW) console.log('[useExcalidrawIsland] Remounting island...');
    unmount();
    // Small delay to ensure cleanup
    setTimeout(mount, 100);
  }, [unmount, mount]);

  // Sync scale with viewport store
  useEffect(() => {
    if (island && island.scale !== scale) {
      island.scale = scale;
      if (DEBUG_EXCALIDRAW) console.log(`[useExcalidrawIsland] Scale synced to ${scale}`);
    }
  }, [island, scale]);

  // Sync mode
  useEffect(() => {
    if (island && island.mode !== mode) {
      island.mode = mode;
      if (DEBUG_EXCALIDRAW) console.log(`[useExcalidrawIsland] Mode synced to ${mode}`);
    }
  }, [island, mode]);

  // Sync write scope
  useEffect(() => {
    if (island && island.writeScope !== writeScope) {
      island.writeScope = writeScope;
      if (DEBUG_EXCALIDRAW) console.log(`[useExcalidrawIsland] Write scope synced to ${writeScope}`);
    }
  }, [island, writeScope]);

  // Sync base scene
  useEffect(() => {
    if (island && baseScene) {
      const sceneJson = JSON.stringify(baseScene);
      if (island.baseScene !== sceneJson) {
        island.baseScene = sceneJson;
        if (DEBUG_EXCALIDRAW) console.log('[useExcalidrawIsland] Base scene synced');
      }
    }
  }, [island, baseScene]);

  // Sync overlay scene
  useEffect(() => {
    if (island && overlayScene) {
      const sceneJson = JSON.stringify(overlayScene);
      if (island.overlayScene !== sceneJson) {
        island.overlayScene = sceneJson;
        if (DEBUG_EXCALIDRAW) console.log('[useExcalidrawIsland] Overlay scene synced');
      }
    }
  }, [island, overlayScene]);

  // Event listeners for island lifecycle (single ready event with everything)
  useEffect(() => {
    if (!island) return;

    const handleIslandReady = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { element, api } = customEvent.detail as { element: ExcalidrawIslandElement; api: any | null };
      const ready = Boolean(api);
      setIsReady(ready);
      setExcalidrawAPI(api ?? null);
      // Guard duplicate wiring/logs for identical state
      const sameState = ready === lastReadyRef.current && (ready ? lastApiRef.current === api : true);
      if (!sameState) {
        if (DEBUG_EXCALIDRAW) console.log('[useExcalidrawIsland] Island ready state changed', { ready });
        onReady?.(element);
        if (api) onExcalidrawReady?.(api);
        lastReadyRef.current = ready;
        lastApiRef.current = api;
      }
    };

    island.addEventListener('island-ready', handleIslandReady);

    // Check if island is already initialized (race condition fix)
    if ((island as any).isInitialized) {
      try {
        const api = (island as any).getExcalidrawAPI?.();
        const ready = Boolean(api);
        const sameState = ready === lastReadyRef.current && (ready ? lastApiRef.current === api : true);
        if (!sameState && DEBUG_EXCALIDRAW) {
          console.log('[useExcalidrawIsland] Island already initialized, setting ready state', { ready });
        }
        setIsReady(ready);
        if (api) {
          setExcalidrawAPI(api);
          if (!sameState) onExcalidrawReady?.(api);
        }
        if (!sameState) onReady?.(island);
        lastReadyRef.current = ready;
        lastApiRef.current = api;
      } catch {
        setIsReady(false);
      }
    }

    return () => {
      island.removeEventListener('island-ready', handleIslandReady);
    };
  }, [island, onReady, onExcalidrawReady]);

  // HMR support in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Listen for HMR updates
      const handleHMR = () => {
        if (DEBUG_EXCALIDRAW) console.log('[useExcalidrawIsland] HMR update detected, remounting...');
        remount();
      };

      // Simple HMR detection via module timestamp changes
      let lastCheck = Date.now();
      const hmrInterval = setInterval(() => {
        const now = Date.now();
        if (now - lastCheck > 2000) { // Check every 2 seconds
          // This is a simple approach; in a real HMR system you'd hook into webpack HMR
          lastCheck = now;
        }
      }, 2000);

      // Cleanup interval
      return () => clearInterval(hmrInterval);
    }
  }, [remount]);

  // Imperative API methods
  const requestExport = useCallback(async (options: { type: 'png' | 'svg'; dpi?: number }) => {
    if (!island) {
      throw new Error('Island not ready');
    }
    return await island.requestExport(options);
  }, [island]);

  const setScene = useCallback(async (scene: unknown) => {
    if (!island) {
      throw new Error('Island not ready');
    }
    return await island.setScene(scene);
  }, [island]);

  return {
    islandRef,
    island,
    excalidrawAPI,
    isReady,
    mount,
    unmount,
    remount,
    requestExport,
    setScene,
  };
}

export type { UseExcalidrawIslandOptions, UseExcalidrawIslandReturn };

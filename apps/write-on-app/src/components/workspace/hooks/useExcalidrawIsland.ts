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
  containerRef: React.RefObject<HTMLElement>;
  /** Readonly mode for student routes */
  readonly?: boolean;
  /** Initial scene data for teacher routes */
  initialScene?: unknown;
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
    readonly = false,
    initialScene,
    onReady,
    onExcalidrawReady
  } = options;

  const islandRef = useRef<ExcalidrawIslandElement>(null);
  const [island, setIsland] = useState<ExcalidrawIslandElement | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Viewport store integration
  const scale = useViewportStore((state) => state.viewport.scale);

  // Create island element
  const createIsland = useCallback((): ExcalidrawIslandElement => {
    const islandElement = document.createElement('excalidraw-island') as ExcalidrawIslandElement;
    
    // Set initial attributes
    islandElement.scale = scale;
    islandElement.readonly = readonly;
    if (initialScene) {
      islandElement.initialScene = JSON.stringify(initialScene);
    }

    // Style the island to fill container
    islandElement.style.cssText = `
      display: block;
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
    `;

    return islandElement;
  }, [scale, readonly, initialScene]);

  // Mount island in container
  const mount = useCallback(() => {
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
      
      console.log('[useExcalidrawIsland] Island mounted');
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
    console.log('[useExcalidrawIsland] Island unmounted');
  }, [containerRef]);

  // Remount island (for HMR)
  const remount = useCallback(() => {
    console.log('[useExcalidrawIsland] Remounting island...');
    unmount();
    // Small delay to ensure cleanup
    setTimeout(mount, 100);
  }, [unmount, mount]);

  // Sync scale with viewport store
  useEffect(() => {
    if (island && island.scale !== scale) {
      island.scale = scale;
      console.log(`[useExcalidrawIsland] Scale synced to ${scale}`);
    }
  }, [island, scale]);

  // Sync readonly state
  useEffect(() => {
    if (island && island.readonly !== readonly) {
      island.readonly = readonly;
      console.log(`[useExcalidrawIsland] Readonly synced to ${readonly}`);
    }
  }, [island, readonly]);

  // Sync initial scene
  useEffect(() => {
    if (island && initialScene) {
      const sceneJson = JSON.stringify(initialScene);
      if (island.initialScene !== sceneJson) {
        island.initialScene = sceneJson;
        console.log('[useExcalidrawIsland] Initial scene synced');
      }
    }
  }, [island, initialScene]);

  // Event listeners for island lifecycle
  useEffect(() => {
    if (!island) return;

    const handleIslandReady = (event: Event) => {
      const customEvent = event as CustomEvent;
      const element = customEvent.detail.element as ExcalidrawIslandElement;
      setIsReady(true);
      console.log('[useExcalidrawIsland] Island ready');
      onReady?.(element);
    };

    const handleExcalidrawReady = (event: Event) => {
      const customEvent = event as CustomEvent;
      const api = customEvent.detail.api;
      setExcalidrawAPI(api);
      console.log('[useExcalidrawIsland] Excalidraw API ready');
      onExcalidrawReady?.(api);
    };

    // Listen for events
    island.addEventListener('island-ready', handleIslandReady);
    island.addEventListener('excalidraw-ready', handleExcalidrawReady);

    return () => {
      island.removeEventListener('island-ready', handleIslandReady);
      island.removeEventListener('excalidraw-ready', handleExcalidrawReady);
    };
  }, [island, onReady, onExcalidrawReady]);

  // HMR support in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Listen for HMR updates
      const handleHMR = () => {
        console.log('[useExcalidrawIsland] HMR update detected, remounting...');
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
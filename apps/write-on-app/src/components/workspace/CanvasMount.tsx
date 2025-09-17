"use client";

import { useEffect, useRef } from 'react';
import { useExcalidrawIsland } from '@/components/workspace/hooks/useExcalidrawIsland';

type Props = { 
  className?: string;
  mode?: 'teacher' | 'student';
  writeScope?: 'teacher-base' | 'student' | 'teacher-review';
  baseScene?: unknown;
  overlayScene?: unknown;
  /** @deprecated - use mode and writeScope */
  readonly?: boolean;
  /** @deprecated - use baseScene */
  initialScene?: unknown;
};

// Step 10: Canvas mount with Excalidraw Island integration
export function CanvasMount({ 
  className, 
  mode = 'teacher', 
  writeScope = 'teacher-base', 
  baseScene, 
  overlayScene,
  readonly = false, 
  initialScene 
}: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const DEBUG_EXCALIDRAW = process.env.NEXT_PUBLIC_EXCALIDRAW_DEBUG === '1';
  const loggedReadyRef = useRef<boolean>(false);
  const loggedApiRef = useRef<boolean>(false);
  
  const {
    mount,
    unmount,
    isReady,
    island,
    excalidrawAPI
  } = useExcalidrawIsland({
    containerRef,
    mode,
    writeScope,
    baseScene: baseScene || initialScene, // Legacy support
    overlayScene,
    onReady: () => {
      if (DEBUG_EXCALIDRAW && !loggedReadyRef.current) {
        console.log('[CanvasMount] Excalidraw Island ready');
        loggedReadyRef.current = true;
      }
    },
    onExcalidrawReady: () => {
      if (DEBUG_EXCALIDRAW && !loggedApiRef.current) {
        console.log('[CanvasMount] Excalidraw API ready');
        loggedApiRef.current = true;
      }
    }
  });

  // Mount island once on component mount, cleanup on unmount
  useEffect(() => {
    const w = typeof window !== 'undefined' ? (window as any) : undefined;
    if (w) {
      if (w.__WRITEON_CANVAS_HOST_MOUNTED__) {
        if (DEBUG_EXCALIDRAW) console.warn('[CanvasMount] Another interactive host is already mounted; skipping mount');
        return () => {};
      }
      w.__WRITEON_CANVAS_HOST_MOUNTED__ = true;
      // Dev sanity: warn if duplicate hosts exist in DOM
      try {
        const hosts = document.querySelectorAll('#excal-host');
        if (hosts.length > 1 && DEBUG_EXCALIDRAW) {
          console.warn('[CanvasMount] Detected multiple #excal-host elements in DOM:', hosts.length);
        }
      } catch {}
    }

    mount();
    return () => {
      unmount();
      if (w) {
        try { w.__WRITEON_CANVAS_HOST_MOUNTED__ = false; } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
      <div 
        className={`workspace-canvas-mount ${className ?? ""}`.trim()} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          // Fill the page wrapper exactly; parent does centering
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
          boxSizing: 'border-box'
        }}
      >
        {/* Step 10: Island container - will be filled by excalidraw-island Web Component */}
        <div
          id="excal-host"
          ref={containerRef}
          className="excalidraw-island-container"
          style={{
            // Children inherit page box from parent wrapper; island fills wrapper
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            background: '#ffffff',
            pointerEvents: 'auto'
          }}
        />
      
      {/* Loading state */}
      {!isReady && (
        <div 
          className="excalidraw-loading"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#666',
            fontSize: '14px',
            fontFamily: 'system-ui, sans-serif'
          }}
        >
          Loading Excalidraw Island...
        </div>
      )}
      
      {/* Ready indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && isReady && (
        <div 
          className="excalidraw-ready-indicator"
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            padding: '4px 8px',
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#16a34a',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          Island Ready
        </div>
      )}
    </div>
  );
}

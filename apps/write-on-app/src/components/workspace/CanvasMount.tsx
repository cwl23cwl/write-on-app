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
    onReady: (element) => {
      console.log('[CanvasMount] Excalidraw Island ready');
    },
    onExcalidrawReady: (api) => {
      console.log('[CanvasMount] Excalidraw API ready');
    }
  });

  // Mount island on component mount
  useEffect(() => {
    mount();
    return () => {
      unmount();
    };
  }, [mount, unmount]);

  return (
    <div 
      className={`workspace-canvas-mount ${className ?? ""}`.trim()} 
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%', 
        height: '100%',
        zIndex: 1,  // Above the white page background
        pointerEvents: 'none',  // Allow clicks through to page, re-enable for canvas
        // Canvas mount positioned above page surface
        boxSizing: 'border-box'
      }}
    >
      {/* Step 10: Island container - will be filled by excalidraw-island Web Component */}
      <div
        ref={containerRef}
        className="excalidraw-island-container"
        style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          position: 'relative',
          pointerEvents: 'auto'  // Re-enable pointer events for Excalidraw
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

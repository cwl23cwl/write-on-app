"use client";

import { useEffect, useRef } from 'react';
import { useExcalidrawIsland } from '@/components/workspace/hooks/useExcalidrawIsland';

type Props = { 
  className?: string;
  readonly?: boolean;
  initialScene?: unknown;
};

// Step 10: Canvas mount with Excalidraw Island integration
export function CanvasMount({ className, readonly = false, initialScene }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    mount,
    unmount,
    isReady,
    island,
    excalidrawAPI
  } = useExcalidrawIsland({
    containerRef,
    readonly,
    initialScene,
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
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      {/* Step 10: Island container - will be filled by excalidraw-island Web Component */}
      <div
        ref={containerRef}
        className="excalidraw-island-container"
        style={{
          width: 'var(--page-width)',
          height: 'var(--page-height)',
          background: '#ffffff',
          boxShadow: '0 0 6px rgba(0,0,0,0.2)',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
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

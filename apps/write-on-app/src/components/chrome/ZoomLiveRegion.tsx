"use client";

import { useEffect, useState, useCallback, useRef, type JSX } from "react";
import { useViewportStore } from "@/state";
import { roundZoomPercent } from "@/components/workspace/utils/coords";

/**
 * Accessibility component that announces zoom changes to screen readers
 * Uses aria-live="polite" to announce zoom percentage after changes settle
 */
export function ZoomLiveRegion(): JSX.Element {
  const scale = useViewportStore((s) => s.viewport.scale);
  const fitMode = useViewportStore((s) => s.viewport.fitMode);
  const [announcement, setAnnouncement] = useState<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced announcement to avoid rapid-fire updates during smooth zoom
  const announceZoom = useCallback((newScale: number, newFitMode: 'fit-width' | 'free'): void => {
    // Clear any pending announcement
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Use RAF and timeout to ensure announcement happens after zoom settles
    requestAnimationFrame(() => {
      timeoutRef.current = setTimeout(() => {
        const percent = roundZoomPercent(newScale);
        const message = newFitMode === 'fit-width' 
          ? `Fit to width`
          : `Zoom: ${percent} percent`;
        
        setAnnouncement(message);
        
        // Clear announcement after brief delay so it can be re-announced
        setTimeout(() => setAnnouncement(""), 100);
      }, 150); // Wait for zoom to settle
    });
  }, []);

  useEffect((): () => void => {
    announceZoom(scale, fitMode);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scale, fitMode, announceZoom]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only chrome-zoom-live-region"
      style={{ 
        position: 'absolute', 
        width: 1, 
        height: 1, 
        overflow: 'hidden', 
        clip: 'rect(1px, 1px, 1px, 1px)', 
        clipPath: 'inset(50%)', 
        whiteSpace: 'nowrap' 
      }}
    >
      {announcement}
    </div>
  );
}





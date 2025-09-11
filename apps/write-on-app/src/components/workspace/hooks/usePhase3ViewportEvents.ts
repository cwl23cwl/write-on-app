"use client";

import { useEffect } from "react";
import { useViewportStore } from "@/state";

export function usePhase3ViewportEvents(containerRef: React.RefObject<HTMLDivElement | null>): void {
  const zoomAtPointer = useViewportStore((s) => s.zoomAtPointer);
  const constraints = useViewportStore((s) => s.constraints);
  const scale = useViewportStore((s) => s.viewport.scale);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Phase 3: Focused zoom with pointer pivot
    const onWheel = (e: WheelEvent): void => {
      const isZoomIntent = e.ctrlKey || e.metaKey;
      
      if (!isZoomIntent) {
        // Non-zoom: let normal scroll happen
        return;
      }

      // Prevent browser zoom
      e.preventDefault();
      e.stopPropagation();

      // Calculate new scale
      const sensitivity = 0.002; // Adjust for smooth zooming
      const deltaY = e.deltaY;
      const factor = Math.exp(-deltaY * sensitivity);
      const newScale = Math.max(
        constraints.minScale,
        Math.min(scale * factor, constraints.maxScale)
      );

      // Skip if scale didn't change meaningfully
      if (Math.abs(newScale - scale) < 0.001) {
        return;
      }

      // Get viewport rect for pointer calculation
      const rect = el.getBoundingClientRect();
      
      // Apply focused zoom at pointer location
      zoomAtPointer(e.clientX, e.clientY, newScale, rect);
    };

    // Use capture phase and non-passive for preventDefault
    el.addEventListener('wheel', onWheel, { 
      capture: true, 
      passive: false 
    });

    return () => {
      el.removeEventListener('wheel', onWheel, { 
        capture: true 
      } as EventListenerOptions);
    };
  }, [containerRef, zoomAtPointer, constraints, scale]);
}
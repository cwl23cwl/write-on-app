"use client";

import { useEffect, useRef } from "react";
import { useViewportStore } from "@/state";

// Centers the scaled page horizontally within the scrollable viewport on initial mount.
// It computes the target scrollLeft from the known logical page width and current zoom.
export function useInitialHorizontalCenter(containerRef: React.RefObject<HTMLDivElement | null>): void {
  const scale = useViewportStore((s) => s.viewport.scale);
  const centeredRef = useRef(false);

  // Helper: compute center target using scrollWidth - clientWidth (accounts for padding)
  const centerNow = () => {
    const viewport = containerRef.current;
    if (!viewport) return;
    const targetX = Math.max(0, Math.round((viewport.scrollWidth - viewport.clientWidth) / 2));
    const targetY = Math.max(0, Math.round((viewport.scrollHeight - viewport.clientHeight) / 2));
    viewport.scrollLeft = targetX;
    viewport.scrollTop = targetY;
  };

  // Initial center after layout
  useEffect(() => {
    const viewport = containerRef.current;
    if (!viewport) return;
    if (centeredRef.current) return;
    const raf = requestAnimationFrame(() => {
      centerNow();
      centeredRef.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [containerRef]);

  // Re-center on window resize
  useEffect(() => {
    const onResize = () => {
      // Next frame to wait for layout
      requestAnimationFrame(centerNow);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Re-center when the viewport element itself resizes (e.g., CSS changes)
  useEffect(() => {
    const viewport = containerRef.current;
    if (!viewport) return;
    const ro = new ResizeObserver(() => requestAnimationFrame(centerNow));
    ro.observe(viewport);
    return () => {
      try { ro.disconnect(); } catch {}
    };
  }, [containerRef]);

  // Re-center whenever zoom scale changes so the page stays under the indicator
  useEffect(() => {
    const raf = requestAnimationFrame(centerNow);
    return () => cancelAnimationFrame(raf);
  }, [scale]);
}

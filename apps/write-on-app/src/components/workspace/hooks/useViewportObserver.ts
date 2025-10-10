"use client";

import { useEffect } from "react";
import { useViewportStore } from "@/state";

export function useViewportObserver(targetRef: React.RefObject<HTMLElement | null>): void {
  const setViewportSize = useViewportStore((s) => s.setViewportSize);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const applyMetrics = (width: number, height: number) => {
      const safeWidth = Math.max(0, Math.round(width));
      const safeHeight = Math.max(0, Math.round(height));
      setViewportSize(safeWidth, safeHeight);
    };

    applyMetrics(node.clientWidth, node.clientHeight);

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        applyMetrics(width, height);
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, setViewportSize]);
}

"use client";

import { useEffect } from "react";
import { useViewportStore } from "@/state";

export function useKeyboardShortcuts(): void {
  const zoomIn = useViewportStore((s) => s.zoomIn);
  const zoomOut = useViewportStore((s) => s.zoomOut);
  const fitToScreen = useViewportStore((s) => s.fitToScreen);
  const resetViewport = useViewportStore((s) => s.resetViewport);

  useEffect((): (() => void) => {
    const onKey = (e: KeyboardEvent): void => {
      // ctrl/cmd + 0 => reset
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        resetViewport();
        return;
      }
      // ctrl/cmd + +/- => zoom (multiplicative ~5% steps)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          zoomIn();
          return;
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          zoomOut();
          return;
        }
      }
      // f => fit to screen
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        fitToScreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, fitToScreen, resetViewport]);
}

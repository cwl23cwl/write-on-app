"use client";

import { useEffect } from "react";
import { useViewportStore } from "@/state";

export function useKeyboardShortcuts(): void {
  const setScale = useViewportStore((s) => s.setScale);
  const fitToScreen = useViewportStore((s) => s.fitToScreen);
  const resetViewport = useViewportStore((s) => s.resetViewport);
  const current = useViewportStore((s) => s.viewport.scale);

  useEffect((): (() => void) => {
    const onKey = (e: KeyboardEvent): void => {
      // ctrl/cmd + 0 => reset
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        resetViewport();
        return;
      }
      // ctrl/cmd + +/- => zoom
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setScale(current * 1.1);
          return;
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setScale(current / 1.1);
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
  }, [current, setScale, fitToScreen, resetViewport]);
}

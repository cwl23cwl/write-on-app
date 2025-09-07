"use client";

import { useEffect } from "react";
import { useCanvasStore, useViewportStore } from "@/state";

export function useResolutionSync(): void {
  const requestRedraw = useCanvasStore((s) => s.requestRedraw);
  const updateResolution = useCanvasStore((s) => s.updateResolution);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const scale = useViewportStore((s) => s.viewport.scale);

  useEffect((): void => {
    updateResolution();
    requestRedraw();
  }, [scale, updateResolution, requestRedraw]);

  useEffect((): (() => void) => {
    const onResize = (): void => {
      updateResolution();
      requestRedraw();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dpr, updateResolution, requestRedraw]);
}

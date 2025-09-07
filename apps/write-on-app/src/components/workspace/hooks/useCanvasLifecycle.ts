"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/state";

type Args = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

export function useCanvasLifecycle({ containerRef, canvasRef }: Args): void {
  const initializeCanvas = useCanvasStore((s) => s.initializeCanvas);
  const destroyCanvas = useCanvasStore((s) => s.destroyCanvas);
  const updateResolution = useCanvasStore((s) => s.updateResolution);

  useEffect((): (() => void) | void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initializeCanvas(canvas);

    updateResolution();
    return () => {
      destroyCanvas();
    };
  }, [canvasRef, containerRef, initializeCanvas, destroyCanvas, updateResolution]);
}

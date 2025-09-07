"use client";

import { useEffect } from "react";
import { useViewportStore } from "@/state";

export function useApplyZoomCssVar(
  ref: React.RefObject<HTMLElement | null>,
  varName: string = "--workspace-zoom",
): void {
  const scale = useViewportStore((s) => s.viewport.scale);

  useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    try {
      el.style.setProperty(varName, String(scale));
    } catch {}
  }, [ref, scale, varName]);
}


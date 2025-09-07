"use client";

import { useEffect } from "react";
import { useViewportStore } from "@/state";

export function useContainerSizeObserver(ref: React.RefObject<HTMLElement | null>): void {
  const updateContainerSize = useViewportStore((s) => s.updateContainerSize);

  useEffect((): void | (() => void) => {
    const el = ref.current;
    if (!el) return;
    const apply = (): void => {
      const rect = el.getBoundingClientRect();
      updateContainerSize(rect.width, rect.height);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      try { ro.disconnect(); } catch {}
    };
  }, [ref, updateContainerSize]);
}

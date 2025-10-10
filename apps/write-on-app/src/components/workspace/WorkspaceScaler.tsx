"use client";

import { useEffect, useRef, type JSX, type PropsWithChildren } from "react";
import { useViewportStore } from "@/state";
import { useApplyZoomCssVar } from "@/components/workspace/hooks/useApplyZoomCssVar";

// WorkspaceScaler: in Phase 2 this does not apply transforms.
// In Phase 3, transform: scale(S) will be applied here.
export function WorkspaceScaler({ children }: PropsWithChildren): JSX.Element {
  // Wrapper holds the scaled-size spacer; inner layer applies transform
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const scale = useViewportStore((s) => s.viewport.scale);
  const offsetX = useViewportStore((s) => s.viewport.offsetX);
  const pageWidth = useViewportStore((s) => s.viewport.pageSize.w);
  const pageHeight = useViewportStore((s) => s.viewport.pageSize.h);
  // Apply CSS var on wrapper (for spacer sizing)
  useApplyZoomCssVar(wrapperRef);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const node = wrapperRef.current;
    if (!node) return;

    const nextScale = Number.isFinite(scale) ? scale : 1;
    const nextOffset = Number.isFinite(offsetX) ? offsetX : 0;
    const widthPx = Number.isFinite(pageWidth) ? Math.max(0, pageWidth) : 1200;
    const heightPx = Number.isFinite(pageHeight) ? Math.max(0, pageHeight) : 2200;

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      node.style.transformOrigin = "0 0";
      node.style.transform = `translate3d(${nextOffset}px, 0px, 0px) scale(${nextScale})`;
      node.style.width = `${widthPx}px`;
      node.style.height = `${heightPx}px`;
      node.style.willChange = "transform";
      frameRef.current = null;
    });

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [scale, offsetX, pageWidth, pageHeight]);

  return (
    <div ref={wrapperRef} className="workspace-scaler">
      {children}
    </div>
  );
}

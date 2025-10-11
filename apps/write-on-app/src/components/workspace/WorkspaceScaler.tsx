"use client";

import { useRef, type JSX, type PropsWithChildren } from "react";
import { useViewportStore } from "@/state";
import { useApplyZoomCssVar } from "@/components/workspace/hooks/useApplyZoomCssVar";

// WorkspaceScaler: fixed-size wrapper with no CSS transforms.
export function WorkspaceScaler({ children }: PropsWithChildren): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pageWidth = useViewportStore((s) => s.viewport.pageSize?.w ?? 1200);
  const pageHeight = useViewportStore((s) => s.viewport.pageSize?.h ?? 2200);

  // Expose current zoom to CSS consumers without applying transforms.
  useApplyZoomCssVar(wrapperRef);

  return (
    <div
      ref={wrapperRef}
      className="workspace-scaler"
      data-role="canvas-wrapper"
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        transform: "none",
      }}
    >
      {children}
    </div>
  );
}

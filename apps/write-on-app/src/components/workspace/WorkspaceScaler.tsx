"use client";

import { useRef, type JSX, type PropsWithChildren } from "react";
import { useApplyZoomCssVar } from "@/components/workspace/hooks/useApplyZoomCssVar";

// WorkspaceScaler: in Phase 2 this does not apply transforms.
// In Phase 3, transform: scale(S) will be applied here.
export function WorkspaceScaler({ children }: PropsWithChildren): JSX.Element {
  // Wrapper holds the scaled-size spacer; inner layer applies transform
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Apply CSS var on wrapper (for spacer sizing)
  useApplyZoomCssVar(wrapperRef);
  return (
    <div ref={wrapperRef} className="workspace-scaler">
      {children}
    </div>
  );
}

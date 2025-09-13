"use client";

import type { PropsWithChildren } from "react";
import { useRef } from "react";
import { useApplyZoomCssVar } from "@/components/workspace/hooks/useApplyZoomCssVar";

// WorkspaceScaler: in Phase 2 this does not apply transforms.
// In Phase 3, transform: scale(S) will be applied here.
export function WorkspaceScaler({ children }: PropsWithChildren): JSX.Element {
  // Wrapper holds the scaled-size spacer; inner layer applies transform
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  // Apply CSS var on both wrapper (for spacer sizing) and layer (to satisfy tests)
  useApplyZoomCssVar(wrapperRef);
  useApplyZoomCssVar(layerRef);
  return (
    <div ref={wrapperRef} className="workspace-scaler">
      <div ref={layerRef} id="workspace-scale-layer" style={{ position: 'absolute', inset: 0 }}>
        {children}
      </div>
    </div>
  );
}

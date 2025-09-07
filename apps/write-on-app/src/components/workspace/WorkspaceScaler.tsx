"use client";

import type { PropsWithChildren } from "react";
import { useRef } from "react";
import { useApplyZoomCssVar } from "@/components/workspace/hooks/useApplyZoomCssVar";

// WorkspaceScaler: in Phase 2 this does not apply transforms.
// In Phase 3, transform: scale(S) will be applied here.
export function WorkspaceScaler({ children }: PropsWithChildren): JSX.Element {
  const scaleRef = useRef<HTMLDivElement | null>(null);
  useApplyZoomCssVar(scaleRef);
  return (
    <div
      ref={scaleRef}
      id="workspace-scale-layer"
      className="workspace-scaler"
      style={{
        // Transform is owned by CSS (#workspace-scale-layer)
      }}
    >
      <div
        className="page-wrapper"
        style={{
          backgroundColor: '#fafafa',
          border: '1px solid #e5e5e5',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div id="excal-host" style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

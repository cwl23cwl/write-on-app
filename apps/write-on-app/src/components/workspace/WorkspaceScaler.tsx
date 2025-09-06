"use client";

import type { PropsWithChildren } from "react";

// WorkspaceScaler: in Phase 2 this does not apply transforms.
// In Phase 3, transform: scale(S) will be applied here.
export function WorkspaceScaler({ children }: PropsWithChildren): JSX.Element {
  return (
    <div
      className="workspace-scaler"
      style={{
        width: 'var(--page-width, 1200px)',
        minHeight: 'var(--page-height, 1200px)',
        margin: '0 auto',
        backgroundColor: '#fafafa',
        border: '1px solid #e5e5e5',
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        // Phase 2: No scaling here; all input & rendering at 1:1 CSS pixels
        transform: 'none',
        transformOrigin: '0 0',
      }}
    >
      {children}
    </div>
  );
}

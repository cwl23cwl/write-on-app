"use client";

import { useRef, type JSX, type ReactNode } from "react";
import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";

// Sticky centered row that hosts the PageIndicator pill.
export function PageIndicatorRow({ children }: { children: ReactNode }): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  // Measure to expose --h-indicator for the backdrop height calc
  useMeasureCssVar(ref, "--h-indicator");
  return (
    <div
      ref={ref}
      className="chrome-page-indicator-row w-full flex justify-center"
      style={{
        backgroundColor: 'transparent',
        marginTop: 0,
        marginBottom: 0,
        position: 'relative',
        zIndex: 'var(--z-indicator, 2900)',
      }}
    >
      {children}
    </div>
  );
}

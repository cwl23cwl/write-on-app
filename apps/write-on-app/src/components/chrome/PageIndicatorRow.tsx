"use client";

import { useRef } from "react";
import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";

// Sticky centered row that hosts the PageIndicator pill.
export function PageIndicatorRow({ children }: { children: React.ReactNode }): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  // Measure to expose --h-indicator for the backdrop height calc
  useMeasureCssVar(ref, "--h-indicator");
  return (
    <div
      ref={ref}
      className="chrome-page-indicator-row w-full flex justify-center"
      style={{
        contain: 'layout paint',
        backgroundColor: 'transparent',
        marginTop: 0,
        marginBottom: 0,
      }}
    >
      {children}
    </div>
  );
}

"use client";

import { useEffect, useRef, type JSX, type ReactNode } from "react";
import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";

// Sticky centered row that hosts the PageIndicator pill.
export function PageIndicatorRow({ children }: { children: ReactNode }): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  // Measure to expose --h-indicator for the backdrop height calc
  useMeasureCssVar(ref, "--h-indicator");
  // Notify workspace to recompute offsets when this row's size changes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dispatch = (): void => {
      window.dispatchEvent(new Event("control-strip:recompute"));
    };
    const ro = new ResizeObserver((): void => {
      dispatch();
    });
    ro.observe(el);
    return (): void => {
      try {
        ro.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);
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

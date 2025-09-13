"use client";

import { useEffect, useRef } from "react";
import { useViewportEvents } from "@/components/workspace/hooks/useViewportEvents";
import { useInitialHorizontalCenter } from "@/components/workspace/hooks/useInitialHorizontalCenter";
import { useKeyboardZoom } from "@/components/workspace/hooks/useKeyboardZoom";
import { useViewportStore } from "@/state";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

// WorkspaceViewport: no transforms are applied here in Phase 2.
// It establishes the virtual workspace area and hosts input listeners.
export function WorkspaceViewport({ className, children }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setViewportSize = useViewportStore((s) => s.setViewportSize);
  const viewportSize = useViewportStore((s) => s.viewport.viewportSize);
  const pageSize = useViewportStore((s) => s.viewport.pageSize);
  const fitMode = useViewportStore((s) => s.viewport.fitMode);
  const setScale = useViewportStore((s) => s.setScale);
  const setFitMode = useViewportStore((s) => s.setFitMode);
  
  useViewportEvents(containerRef);
  useInitialHorizontalCenter(containerRef); // Re-enabled for proper horizontal centering
  useKeyboardZoom(containerRef);

  // Phase 3: Measure viewport size and store it
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize(rect.width, rect.height);
    };

    // Initial measurement
    updateSize();

    // Observe size changes
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(el);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [setViewportSize]);

  // Phase 3 Step 2: Initial fit width calculation and auto-refit on resize
  useEffect(() => {
    if (viewportSize.w > 0 && pageSize.w > 0 && fitMode === 'fit-width') {
      // Calculate fit scale accounting for horizontal padding (80px total: 40px each side)
      const paddingX = 80;
      const availableWidth = viewportSize.w - paddingX;
      const fitScale = availableWidth / pageSize.w;
      
      // Clamp to constraints
      const { minScale, maxScale } = useViewportStore.getState().constraints;
      const clampedScale = Math.max(minScale, Math.min(fitScale, maxScale));
      
      setScale(clampedScale);
    }
  }, [viewportSize.w, pageSize.w, fitMode, setScale]);

  // Phase 3 Step 2: Set initial fit mode on mount
  useEffect(() => {
    if (viewportSize.w > 0 && pageSize.w > 0) {
      setFitMode('fit-width');
    }
  }, [viewportSize.w, pageSize.w, setFitMode]);

  // Guardrail: detect transforms on ancestors and warn
  useEffect(() => {
    let el: HTMLElement | null = containerRef.current?.parentElement as HTMLElement | null;
    while (el && el !== document.body) {
      const transform = getComputedStyle(el).transform;
      if (transform && transform !== "none") {
        console.warn(
          "WorkspaceViewport ancestor has transform applied. This may break pointer/scroll behavior.",
          el,
        );
        break;
      }
      el = el.parentElement;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      id="workspace-viewport"
      className={`workspace-viewport flex-1 ${className ?? ""}`.trim()}
      style={{
        paddingLeft: 'var(--page-padding-x)',
        paddingRight: 'var(--page-padding-x)',
        paddingTop: '8px', // Minimal tight gap between PageIndicator and canvas
      }}
    >
      {children}
      <span className="workspace-marker hidden" aria-hidden />
    </div>
  );
}

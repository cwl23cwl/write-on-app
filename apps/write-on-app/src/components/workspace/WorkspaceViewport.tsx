"use client";

import { useEffect, useRef, type JSX, type ReactNode } from "react";
import { useViewportEvents } from "@/components/workspace/hooks/useViewportEvents";
import { useInitialHorizontalCenter } from "@/components/workspace/hooks/useInitialHorizontalCenter";
import { useKeyboardZoom } from "@/components/workspace/hooks/useKeyboardZoom";
import { useWorkspaceContext } from "@/components/workspace/WorkspaceProvider";
import { useViewportStore } from "@/state";

type Props = {
  className?: string;
  children?: ReactNode;
};

// WorkspaceViewport: no transforms are applied here in Phase 2.
// It establishes the virtual workspace area and hosts input listeners.
export function WorkspaceViewport({ className, children }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Scroll container should be the workspace-root provided by context
  const { containerRef: rootRef } = useWorkspaceContext();
  const setViewportSize = useViewportStore((s) => s.setViewportSize);
  const viewportSize = useViewportStore((s) => s.viewport.viewportSize);
  const pageSize = useViewportStore((s) => s.viewport.pageSize);
  const fitMode = useViewportStore((s) => s.viewport.fitMode);
  const setScale = useViewportStore((s) => s.setScale);
  const setFitMode = useViewportStore((s) => s.setFitMode);
  
  useViewportEvents(rootRef);
  useInitialHorizontalCenter(rootRef); // Proper horizontal centering on the scroll container
  useKeyboardZoom(rootRef);

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
      // Calculate fit scale based on actual viewport width; horizontal centering handled via CSS
      const availableWidth = viewportSize.w;
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
    >
      {children}
      <span className="workspace-marker hidden" aria-hidden />
    </div>
  );
}

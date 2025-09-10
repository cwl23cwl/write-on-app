"use client";

import { useEffect, useRef } from "react";
import { useViewportStore } from "@/state";
import { zoomAtClientPoint, hasDeviatedFromFitWidth, getAdaptiveZoomStep, calculateFitWidthDeviation } from "@/components/workspace/utils/coords";

export function useKeyboardZoom(containerRef: React.RefObject<HTMLDivElement | null>): void {
  const setViewState = useViewportStore((s) => s.setViewState);
  const setFitMode = useViewportStore((s) => s.setFitMode);
  const fitWidth = useViewportStore((s) => s.fitWidth);
  const constraints = useViewportStore((s) => s.constraints);
  const scale = useViewportStore((s) => s.viewport.scale);
  const scrollX = useViewportStore((s) => s.viewport.scrollX);
  const scrollY = useViewportStore((s) => s.viewport.scrollY);
  const step = useViewportStore((s) => s.viewport.step);
  const fitMode = useViewportStore((s) => s.viewport.fitMode);
  const viewportSize = useViewportStore((s) => s.viewport.viewportSize);
  const pageSize = useViewportStore((s) => s.viewport.pageSize);
  const virtualSize = useViewportStore((s) => s.viewport.virtualSize);
  
  // Access to shared cumulative deviation tracking
  const cumulativeDeviationFromFit = useRef<number>(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // Respect focus and app hotkey suppression
      const target = e.target as HTMLElement;
      const isInputFocused = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]')
      );
      
      // Don't steal focus or inject characters when typing in inputs
      if (isInputFocused) return;
      
      const ctrlLike = e.ctrlKey || e.metaKey;
      if (!ctrlLike) return;
      
      const k = e.key;
      if (!(k === '+' || k === '=' || k === '-' || k === '_' || k === '0')) return;
      
      // Always prevent default for zoom intents
      e.preventDefault();
      e.stopPropagation();
      
      const el = containerRef.current as HTMLDivElement | null;
      if (!el) return;
      
      // Use viewport center for keyboard zoom anchoring
      const rect = el.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;

      if (k === '0') {
        // Ctrl/Cmd+0: Restore fit width and recenter, reset deviation tracking
        setFitMode('fit-width');
        fitWidth();
        cumulativeDeviationFromFit.current = 0; // Reset deviation tracking
        return;
      }

      // Compute new scale for zoom in/out using adaptive step
      let nextScale = scale || 1;
      const adaptiveStep = getAdaptiveZoomStep(nextScale);
      if (k === '+' || k === '=') nextScale = (scale || 1) * (1 + adaptiveStep);
      else if (k === '-' || k === '_') nextScale = (scale || 1) / (1 + adaptiveStep);
      
      nextScale = Math.max(constraints.minScale, Math.min(nextScale, constraints.maxScale));

      // Smart fit-width mode switching with cumulative deviation threshold
      if (fitMode === 'fit-width') {
        // Calculate current fit-width scale for comparison
        if (viewportSize.w > 0 && pageSize.w > 0) {
          const paddingX = 80; // Updated horizontal padding
          const availableWidth = viewportSize.w - paddingX;
          const fitScale = availableWidth / pageSize.w;
          const clampedFitScale = Math.max(constraints.minScale, Math.min(fitScale, constraints.maxScale));
          
          // Simple threshold check - exit fit-width if deviation is significant  
          if (hasDeviatedFromFitWidth(nextScale, clampedFitScale, 0.03)) {
            setFitMode('free');
          }
        } else {
          setFitMode('free');
          cumulativeDeviationFromFit.current = 0;
        }
      }

      // Use pointer-centered zoom anchored at viewport center with clamping
      const currentView = { scale: scale || 1, scrollX: scrollX || 0, scrollY: scrollY || 0 };
      const contentSize = { w: virtualSize.w, h: virtualSize.h };
      const newView = zoomAtClientPoint(clientX, clientY, nextScale, currentView, el, contentSize);
      
      setViewState(newView);
    };
    
    // Use capture phase to ensure we intercept before other handlers
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [containerRef, setViewState, setFitMode, fitWidth, constraints, scale, scrollX, scrollY, step, fitMode, viewportSize, pageSize, virtualSize]);
}

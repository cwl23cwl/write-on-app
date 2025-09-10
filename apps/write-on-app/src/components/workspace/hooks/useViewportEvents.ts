"use client";

import { useEffect, useRef } from "react";
import { useViewportStore, useCanvasStore } from "@/state";
import { getWorldPoint, zoomAtClientPoint, hasDeviatedFromFitWidth, getAdaptiveZoomSensitivity, isSignificantScaleChange, calculateFitWidthDeviation } from "@/components/workspace/utils/coords";
import { normalizedDeltaY } from "@/components/workspace/utils/events";

export function useViewportEvents(containerRef: React.RefObject<HTMLDivElement | null>): void {
  const setScale = useViewportStore((s) => s.setScale);
  const setViewState = useViewportStore((s) => s.setViewState);
  const setScroll = useViewportStore((s) => s.setScroll);
  const setFitMode = useViewportStore((s) => s.setFitMode);
  const pan = useViewportStore((s) => s.pan);
  const constraints = useViewportStore((s) => s.constraints);
  const fitMode = useViewportStore((s) => s.viewport.fitMode);
  const fitWidth = useViewportStore((s) => s.fitWidth);
  const viewportSize = useViewportStore((s) => s.viewport.viewportSize);
  const virtualSize = useViewportStore((s) => s.viewport.virtualSize);

  const lastWorld = useRef<{ x: number; y: number } | null>(null);
  const panning = useRef(false);
  const gestureBaseline = useRef<{ scale: number; clientX: number; clientY: number } | null>(null);
  const currentScale = useViewportStore((s) => s.viewport.scale);
  const scrollX = useViewportStore((s) => s.viewport.scrollX);
  const scrollY = useViewportStore((s) => s.viewport.scrollY);
  const activeTool = useCanvasStore((s) => s.tools.activeTool);
  
  // Delta accumulation for fine zoom control
  const deltaAccumulator = useRef(0);
  const lastZoomTime = useRef(0);
  const fitWidthNudgeCount = useRef(0);
  const lastFitWidthNudgeTime = useRef(0);

  useEffect((): (() => void) | void => {
    const el = containerRef.current;
    if (!el) return;
    const scaler = (el as HTMLElement).querySelector('.workspace-scaler') as HTMLElement | null;

    const onWheel = (e: WheelEvent): void => {
      const isZoomIntent = e.ctrlKey || e.metaKey;
      
      if (isZoomIntent) {
        // Always prevent default for zoom intents
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();
        const dy = normalizedDeltaY(e);
        
        // Reset accumulator if too much time has passed (>200ms = new gesture)
        if (now - lastZoomTime.current > 200) {
          deltaAccumulator.current = 0;
        }
        lastZoomTime.current = now;
        
        // Adaptive sensitivity: easier to zoom in when very zoomed out, finer when zoomed in
        let sensitivity = 0.0005; // Base sensitivity
        if (currentScale < 0.5) {
          sensitivity = 0.0008; // Easier to zoom in when zoomed out
        } else if (currentScale > 2.0) {
          sensitivity = 0.0003; // Finer control when zoomed in
        }
        
        const factor = Math.exp(-dy * sensitivity);
        const min = constraints.minScale;
        const max = constraints.maxScale;
        const preScale = currentScale || 1;
        const newScale = Math.max(min, Math.min(preScale * factor, max));
        
        // Epsilon filter: ignore tiny scale changes
        if (!isSignificantScaleChange(preScale, newScale)) {
          return;
        }
        
        // Enhanced fit-width mode handling with cumulative deviation
        if (fitMode === 'fit-width') {
          // Calculate current fit-width scale for comparison
          const fitWidthState = useViewportStore.getState();
          const { viewportSize, pageSize } = fitWidthState.viewport;
          if (viewportSize.w > 0 && pageSize.w > 0) {
            const paddingX = 80;
            const availableWidth = viewportSize.w - paddingX;
            const fitScale = availableWidth / pageSize.w;
            const clampedFitScale = Math.max(min, Math.min(fitScale, max));
            
            // Improved fit-width protection: require multiple nudges before switching
            const now = Date.now();
            if (hasDeviatedFromFitWidth(newScale, clampedFitScale, 0.02)) {
              // Reset counter if too much time has passed (>2 seconds)
              if (now - lastFitWidthNudgeTime.current > 2000) {
                fitWidthNudgeCount.current = 0;
              }
              
              fitWidthNudgeCount.current++;
              lastFitWidthNudgeTime.current = now;
              
              // Only exit fit-width after 3 nudges in 2 seconds
              if (fitWidthNudgeCount.current >= 3) {
                setFitMode('free');
                fitWidthNudgeCount.current = 0;
              }
            }
          } else {
            setFitMode('free');
            fitWidthNudgeCount.current = 0;
          }
        }
        
        // Use pointer-centered zoom with content size for clamping
        const currentView = { scale: preScale, scrollX, scrollY };
        const contentSize = { w: virtualSize.w, h: virtualSize.h };
        const newView = zoomAtClientPoint(e.clientX, e.clientY, newScale, currentView, el, contentSize);
        setViewState(newView);
        return;
      }
      
      // Non-zoom: let normal scroll happen, never preventDefault
    };

    // Safari gesture events for pinch zoom
    const onGestureStart = (e: any): void => {
      e.preventDefault();
      e.stopPropagation();
      
      // Record baseline for relative gesture scaling
      gestureBaseline.current = {
        scale: currentScale || 1,
        clientX: e.clientX || window.innerWidth / 2,
        clientY: e.clientY || window.innerHeight / 2
      };
      
      // Reset nudge count for new gesture
      fitWidthNudgeCount.current = 0;
    };

    const onGestureChange = (e: any): void => {
      e.preventDefault();
      e.stopPropagation();
      
      const baseline = gestureBaseline.current;
      if (!baseline) return;

      // Calculate new scale from gesture
      const gestureScale = e.scale || 1;
      const newScale = Math.max(
        constraints.minScale, 
        Math.min(baseline.scale * gestureScale, constraints.maxScale)
      );

      // Epsilon filter: ignore tiny scale changes
      if (!isSignificantScaleChange(currentScale, newScale)) {
        return;
      }

      // Enhanced fit-width mode handling with cumulative deviation
      if (fitMode === 'fit-width') {
        const fitWidthState = useViewportStore.getState();
        const { viewportSize, pageSize } = fitWidthState.viewport;
        if (viewportSize.w > 0 && pageSize.w > 0) {
          const paddingX = 80;
          const availableWidth = viewportSize.w - paddingX;
          const fitScale = availableWidth / pageSize.w;
          const clampedFitScale = Math.max(constraints.minScale, Math.min(fitScale, constraints.maxScale));
          
          // Use same improved fit-width protection for gestures
          if (hasDeviatedFromFitWidth(newScale, clampedFitScale, 0.02)) {
            const now = Date.now();
            if (now - lastFitWidthNudgeTime.current > 2000) {
              fitWidthNudgeCount.current = 0;
            }
            
            fitWidthNudgeCount.current++;
            lastFitWidthNudgeTime.current = now;
            
            if (fitWidthNudgeCount.current >= 3) {
              setFitMode('free');
              fitWidthNudgeCount.current = 0;
            }
          }
        } else {
          setFitMode('free');
          fitWidthNudgeCount.current = 0;
        }
      }

      // Use pointer-centered zoom with cached anchor point and content size
      const currentView = { scale: currentScale || 1, scrollX, scrollY };
      const contentSize = { w: virtualSize.w, h: virtualSize.h };
      const newView = zoomAtClientPoint(baseline.clientX, baseline.clientY, newScale, currentView, el, contentSize);
      setViewState(newView);
    };

    const onGestureEnd = (e: any): void => {
      e.preventDefault();
      e.stopPropagation();
      gestureBaseline.current = null;
    };

    const onPointerDown = (e: PointerEvent): void => {
      if (!constraints.enablePan) return;
      if (activeTool !== 'hand') return;
      const host = (scaler as HTMLElement) || (el as HTMLElement);
      const world = getWorldPoint(e, host, { scale: currentScale, scrollX, scrollY });
      const capEl = (e.target as Element) ?? (e.currentTarget as Element);
      try { capEl.setPointerCapture(e.pointerId); } catch {}
      panning.current = true;
      lastWorld.current = world;
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (activeTool !== 'hand') return;
      if (!panning.current || !lastWorld.current) return;
      const host = (scaler as HTMLElement) || (el as HTMLElement);
      const world = getWorldPoint(e, host, { scale: currentScale, scrollX, scrollY });
      const dx = world.x - lastWorld.current.x;
      const dy = world.y - lastWorld.current.y;
      pan(dx, dy);
      lastWorld.current = world;
    };

    const onPointerUp = (e: PointerEvent): void => {
      const relEl = (e.target as Element) ?? (e.currentTarget as Element);
      try { relEl?.releasePointerCapture?.(e.pointerId); } catch {}
      panning.current = false;
      lastWorld.current = null;
    };

    // Keep store in sync with DOM scroll (for focus math)
    const onScroll = (): void => {
      setScroll(el.scrollLeft, el.scrollTop);
    };

    // Browser-specific event handling
    // Firefox requires non-passive wheel events when preventing default
    const wheelOptions = { passive: false, capture: true };
    
    // Disable overscroll behavior on custom scroller
    el.style.overscrollBehavior = 'none';
    el.style.touchAction = 'pan-x pan-y'; // Allow panning but block pinch
    
    // Capture phase so we can intercept before inner libraries
    el.addEventListener("wheel", onWheel as EventListener, wheelOptions);
    el.addEventListener("scroll", onScroll as EventListener, { passive: true });
    el.addEventListener("pointerdown", onPointerDown as EventListener, { passive: true });
    el.addEventListener("pointermove", onPointerMove as EventListener, { passive: true });
    el.addEventListener("pointerup", onPointerUp as EventListener, { passive: true });
    el.addEventListener("pointercancel", onPointerUp as EventListener, { passive: true });
    
    // Safari gesture events with proper preventDefault for edge cases
    el.addEventListener("gesturestart", onGestureStart as EventListener, { passive: false, capture: true });
    el.addEventListener("gesturechange", onGestureChange as EventListener, { passive: false, capture: true });
    el.addEventListener("gestureend", onGestureEnd as EventListener, { passive: false, capture: true });

    return () => {
      el.removeEventListener("wheel", onWheel as EventListener, { capture: true } as EventListenerOptions);
      el.removeEventListener("scroll", onScroll as EventListener);
      el.removeEventListener("pointerdown", onPointerDown as EventListener);
      el.removeEventListener("pointermove", onPointerMove as EventListener);
      el.removeEventListener("pointerup", onPointerUp as EventListener);
      el.removeEventListener("pointercancel", onPointerUp as EventListener);
      el.removeEventListener("gesturestart", onGestureStart as EventListener, { capture: true } as EventListenerOptions);
      el.removeEventListener("gesturechange", onGestureChange as EventListener, { capture: true } as EventListenerOptions);
      el.removeEventListener("gestureend", onGestureEnd as EventListener, { capture: true } as EventListenerOptions);
    };
  }, [containerRef, setScale, pan, constraints, currentScale, activeTool, scrollX, scrollY, setViewState, setFitMode, fitMode, fitWidth, viewportSize, virtualSize]);
}

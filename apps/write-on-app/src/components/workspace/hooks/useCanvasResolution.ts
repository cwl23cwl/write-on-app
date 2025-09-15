"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore, useViewportStore } from "@/state";

// GPU-safe canvas limits (conservative estimates)
const MAX_CANVAS_DIMENSION = 16384; // Most GPUs support at least 16K
const MAX_CANVAS_PIXELS = 268435456; // 16K × 16K = 256MP, use 256MP as safe limit

/**
 * Enhanced canvas resolution management for Phase 3 Step 3
 * Handles DPR-aware canvas re-raster with GPU limits and RAF batching
 */
export function useCanvasResolution(): void {
  const canvas = useCanvasStore((s) => s.refs.canvasElement);
  const container = useCanvasStore((s) => s.refs.containerElement);
  const excalidrawAPI = useCanvasStore((s) => s.refs.excalidrawAPI);
  const scale = useViewportStore((s) => s.viewport.scale);
  const requestRedraw = useCanvasStore((s) => s.requestRedraw);
  
  // RAF batching
  const rafRef = useRef<number | null>(null);
  const lastComputedRef = useRef<{
    backingWidth: number;
    backingHeight: number;
    effectiveDPR: number;
  } | null>(null);

  // Device pixel ratio watcher
  const currentDPR = useRef<number>(typeof window !== "undefined" ? window.devicePixelRatio : 1);

  const refreshSurface = (): void => {
    // Ensure container exists
    if (!container) return;
    // Determine page wrapper for logical (unscaled) dimensions
    const pageEl = (container as HTMLElement).closest('.page-wrapper') as HTMLElement | null;
    const sizeEl = pageEl ?? (container as HTMLElement);

    // Get logical (unscaled) dimensions using clientWidth/Height
    const logicalWidth = Math.max(0, Math.round(sizeEl.clientWidth));
    const logicalHeight = Math.max(0, Math.round(sizeEl.clientHeight));

    if (logicalWidth === 0 || logicalHeight === 0) return;

    // Compute effectiveDPR with clamping
    const deviceDPR = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const rawEffectiveDPR = deviceDPR * (scale ?? 1);
    const effectiveDPR = Math.max(0.75, Math.min(rawEffectiveDPR, 3));

    // Compute integer backing store dimensions (CSS size * effectiveDPR)
    let backingWidth = Math.round(logicalWidth * effectiveDPR);
    let backingHeight = Math.round(logicalHeight * effectiveDPR);

    // GPU limits protection
    const totalPixels = backingWidth * backingHeight;
    if (backingWidth > MAX_CANVAS_DIMENSION || 
        backingHeight > MAX_CANVAS_DIMENSION || 
        totalPixels > MAX_CANVAS_PIXELS) {
      
      // Fallback: reduce DPR proportionally to fit within limits
      const dimensionRatio = Math.min(
        MAX_CANVAS_DIMENSION / Math.max(backingWidth, backingHeight),
        Math.sqrt(MAX_CANVAS_PIXELS / totalPixels)
      );
      
      const fallbackDPR = effectiveDPR * dimensionRatio;
      backingWidth = Math.round(logicalWidth * fallbackDPR);
      backingHeight = Math.round(logicalHeight * fallbackDPR);

      if (process.env.NODE_ENV === 'development') {
        console.warn(`[CanvasResolution] GPU limits hit, reducing DPR from ${effectiveDPR.toFixed(2)} to ${fallbackDPR.toFixed(2)}`);
      }
    }

    // Optimization: skip if backing size unchanged
    const lastComputed = lastComputedRef.current;
    if (lastComputed && 
        lastComputed.backingWidth === backingWidth &&
        lastComputed.backingHeight === backingHeight &&
        Math.abs(lastComputed.effectiveDPR - effectiveDPR) < 0.01) {
      return; // No change needed
    }

    // Cache computed values
    lastComputedRef.current = { backingWidth, backingHeight, effectiveDPR };

    try {
      // Update all canvases inside the Excalidraw container (static + interactive)
      const canvases = (container as HTMLElement).querySelectorAll('canvas');
      canvases.forEach((cv) => {
        if ((cv as HTMLCanvasElement).width !== backingWidth) (cv as HTMLCanvasElement).width = backingWidth;
        if ((cv as HTMLCanvasElement).height !== backingHeight) (cv as HTMLCanvasElement).height = backingHeight;
        const ctx = (cv as HTMLCanvasElement).getContext('2d');
        if (ctx) {
          ctx.setTransform(effectiveDPR, 0, 0, effectiveDPR, 0, 0);
          ctx.imageSmoothingEnabled = false;
        }
      });

      // Update canvas store resolution state
      useCanvasStore.getState().setCanvasResolution?.({
        logicalWidth,
        logicalHeight,
        physicalWidth: backingWidth,
        physicalHeight: backingHeight,
        effectiveDPR,
        needsRedraw: true
      });

      // Request immediate repaint
      requestRedraw();

      if (process.env.NODE_ENV === 'development') {
        console.log(`[CanvasResolution] Updated: logical=${logicalWidth}×${logicalHeight}, backing=${backingWidth}×${backingHeight}, DPR=${effectiveDPR.toFixed(2)}`);
      }

    } catch (error) {
      // Safari fallback: if canvas dimension setting fails
      if (process.env.NODE_ENV === 'development') {
        console.warn('[CanvasResolution] Canvas dimension setting failed, trying fallback:', error);
      }
      
      // Try with reduced dimensions
      const safeDPR = Math.max(0.75, Math.min(effectiveDPR * 0.8, 2));
      const safeWidth = Math.round(logicalWidth * safeDPR);
      const safeHeight = Math.round(logicalHeight * safeDPR);
      
      try {
        canvasElement.width = safeWidth;
        canvasElement.height = safeHeight;
        const ctx = canvasElement.getContext('2d');
        if (ctx) ctx.setTransform(safeDPR, 0, 0, safeDPR, 0, 0);
      } catch {
        // Last resort: use minimal DPR
        canvasElement.width = logicalWidth;
        canvasElement.height = logicalHeight;
        const ctx = canvasElement.getContext('2d');
        if (ctx) ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
  };

  const scheduleRefresh = (): void => {
    if (rafRef.current !== null) return; // Already scheduled
    
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      refreshSurface();
    });
  };

  // Effect: respond to scale changes
  useEffect(() => {
    scheduleRefresh();
  }, [scale]);

  // Effect: respond to canvas/container changes
  useEffect(() => {
    scheduleRefresh();
  }, [canvas, container]);

  // Effect: DPR monitoring (for monitor changes, OS scaling)
  useEffect(() => {
    const checkDPR = () => {
      const newDPR = window.devicePixelRatio;
      if (Math.abs(newDPR - currentDPR.current) > 0.1) {
        currentDPR.current = newDPR;
        scheduleRefresh();
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[CanvasResolution] DPR changed to ${newDPR}, refreshing surface`);
        }
      }
    };

    // Monitor DPR changes (cross-monitor, OS scale changes)
    const interval = setInterval(checkDPR, 500); // Check every 500ms
    window.addEventListener('resize', checkDPR);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkDPR);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Effect: container resize observer
  useEffect(() => {
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      scheduleRefresh();
    });

    resizeObserver.observe(container as Element);
    return () => resizeObserver.disconnect();
  }, [container]);
}

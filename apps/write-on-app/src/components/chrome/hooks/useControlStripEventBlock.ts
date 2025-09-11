"use client";

import { useEffect } from "react";

/**
 * Blocks all zoom events that originate from the control strip.
 * Control strip should be completely zoom-inert - no functionality, no effects.
 */
export function useControlStripEventBlock(): void {
  useEffect(() => {
    const onWheel = (e: WheelEvent): void => {
      const isZoomIntent = e.ctrlKey || e.metaKey;
      
      if (!isZoomIntent) {
        // Not a zoom intent, let it proceed normally
        return;
      }

      // Check if the event originated from the control strip
      const target = e.target as Element;
      const isFromControlStrip = target && target.closest('.control-strip');
      
      if (!isFromControlStrip) {
        // Not from control strip, let other handlers deal with it
        return;
      }

      // This is a control strip zoom event - block it completely
      e.preventDefault();
      e.stopPropagation();
      // Do nothing - control strip is zoom-inert
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      const isFromControlStrip = target && target.closest('.control-strip');
      
      if (!isFromControlStrip) {
        return;
      }

      const ctrlLike = e.ctrlKey || e.metaKey;
      if (!ctrlLike) return;
      
      const k = e.key;
      if (!(k === '+' || k === '=' || k === '-' || k === '_' || k === '0')) return;
      
      // Block keyboard zoom shortcuts on control strip
      e.preventDefault();
      e.stopPropagation();
      // Do nothing - control strip is zoom-inert
    };

    // Use capture phase to intercept before any other handlers
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('keydown', onKeyDown, { capture: true });

    return () => {
      document.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
      document.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []);
}
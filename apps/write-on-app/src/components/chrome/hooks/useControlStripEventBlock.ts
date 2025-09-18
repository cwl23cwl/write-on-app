"use client";

import { useEffect } from "react";

/**
 * Blocks all zoom events that originate from the control strip.
 * Control strip should be completely zoom-inert - no functionality, no effects.
 */
export function useControlStripEventBlock(): void {
  useEffect((): () => void => {
    const onWheel = (): void => {
      // Passive listener: never call preventDefault here.
      // Plain wheel should bubble to scroll the page.
      // Ctrl/Meta+wheel will be handled by the workspace root zoom listener.
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
    document.addEventListener('wheel', onWheel, { capture: true, passive: true });
    document.addEventListener('keydown', onKeyDown, { capture: true });

    return () => {
      document.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
      document.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []);
}



"use client";

import { useLayoutEffect } from "react";
import { useWorkspaceContext } from "@/components/workspace/WorkspaceProvider";

// Measures a chrome element and writes its height to a CSS var on the workspace root.
// - Uses rAF to coalesce writes and avoid layout thrash.
// - Does not mutate composite vars (CSS owns --h-chrome via calc()).
// - Single-writer policy for atomic vars: --h-header | --h-top | --h-opts
export function useMeasureCssVar(
  targetRef: React.RefObject<HTMLElement | null>,
  varName: string,
): void {
  const { containerRef } = useWorkspaceContext();

  useLayoutEffect(() => {
    const el = targetRef.current as HTMLElement | null;
    const root = (containerRef.current as HTMLElement | null);
    if (!root) return;
    if (!el || !root) return;

    let frame = 0;
    let pending = false;
    let lastHeight: number | null = null;

    const write = (h: number) => {
      // Prefer exact pixels; avoid rounding unless needed for visual gaps.
      root.style.setProperty(varName, `${h}px`);
    };

    const measure = (): number => {
      // getBoundingClientRect().height ignores margins (desired for sticky offsets)
      // and includes borders/padding, which is what we want for sticky stacking.
      return el.getBoundingClientRect().height;
    };

    const flush = () => {
      pending = false;
      if (lastHeight != null) write(lastHeight);
    };

    const schedule = (nextHeight?: number) => {
      if (typeof nextHeight === "number") {
        lastHeight = nextHeight;
      } else {
        lastHeight = measure();
      }
      if (pending) return;
      pending = true;
      frame = window.requestAnimationFrame(flush);
    };

    // Initial measurement
    schedule();

    let ro: ResizeObserver | null = null;
    try {
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver((entries) => {
          // Use the height provided by RO when available to avoid extra reads
          const entry = entries.find((e) => e.target === el) ?? entries[0];
          const h = (entry as any)?.contentRect?.height as number | undefined;
          if (typeof h === "number") schedule(h);
          else schedule();
        });
        ro.observe(el);
      }
    } catch {
      // No-op: fall back to window resize listener only
    }

    const onResize = () => schedule();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      try { ro?.unobserve(el); } catch {}
      try { ro?.disconnect(); } catch {}
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [containerRef, targetRef, varName]);
}

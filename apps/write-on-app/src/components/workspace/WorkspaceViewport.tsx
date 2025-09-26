"use client";

import { useEffect, useRef, type JSX, type ReactNode, type HTMLAttributes } from "react";
import { useViewportEvents } from "@/components/workspace/hooks/useViewportEvents";
import { useKeyboardZoom } from "@/components/workspace/hooks/useKeyboardZoom";
import { useWorkspaceContext } from "@/components/workspace/WorkspaceProvider";
import { useViewportStore } from "@/state";

type Props = Omit<HTMLAttributes<HTMLDivElement>, "children" | "ref"> & {
  children?: ReactNode;
};

const DEV = process.env.NODE_ENV !== "production";

// WorkspaceViewport: no transforms are applied here.
// It establishes the virtual workspace area and hosts input listeners.
export function WorkspaceViewport({ className, children, style, ...rest }: Props): JSX.Element {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const { containerRef } = useWorkspaceContext();
  const rootRef = containerRef;
  const setViewportSize = useViewportStore((s) => s.setViewportSize);
  const setScale = useViewportStore((s) => s.setScale);
  const fitMode = useViewportStore((s) => s.fitMode);
  const pageSize = useViewportStore((s) => s.pageSize);
  const scale = useViewportStore((s) => s.scale);
  const minScale = useViewportStore((s) => s.minScale);
  const maxScale = useViewportStore((s) => s.maxScale);

  // Root element owns scrolling and event capture.
  useViewportEvents(rootRef);
  useKeyboardZoom(rootRef);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof window === "undefined") return;

    const parsePx = (value: string): number => {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const applyLayoutMetrics = () => {
      if (!el) return;
      const outerWidth = el.clientWidth;
      const outerHeight = el.clientHeight;

      if (outerWidth <= 0 || outerHeight <= 0) {
        setViewportSize(0, 0);
        return;
      }

      const pageWidth = pageSize.w;
      let targetScale = scale;

      if (pageWidth > 0 && fitMode === "fit-width") {
        const fit = outerWidth / pageWidth;
        const clamped = Math.max(minScale, Math.min(fit, maxScale));
        targetScale = clamped;
        if (Math.abs(clamped - scale) > 1e-3) {
          setScale(clamped);
        }
      }

      const scaledWidth = pageWidth > 0 ? pageWidth * targetScale : 0;
      const horizontalPad = pageWidth > 0 ? Math.max(0, (outerWidth - scaledWidth) / 2) : 0;
      el.style.paddingLeft = `${horizontalPad}px`;
      el.style.paddingRight = `${horizontalPad}px`;

      const styles = window.getComputedStyle(el);
      const paddingLeft = parsePx(styles.paddingLeft);
      const paddingRight = parsePx(styles.paddingRight);
      const paddingTop = parsePx(styles.paddingTop);
      const paddingBottom = parsePx(styles.paddingBottom);

      const contentWidth = Math.max(0, outerWidth - paddingLeft - paddingRight);
      const contentHeight = Math.max(0, outerHeight - paddingTop - paddingBottom);

      setViewportSize(contentWidth, contentHeight);
    };

    applyLayoutMetrics();

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(applyLayoutMetrics) : null;
    resizeObserver?.observe(el);

    const onWindowResize = () => applyLayoutMetrics();
    window.addEventListener("resize", onWindowResize, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [setViewportSize, setScale, pageSize.w, fitMode, scale, minScale, maxScale]);

  useEffect(() => {
    let node: HTMLElement | null = viewportRef.current;
    while (node && node !== document.body) {
      const transform = getComputedStyle(node).transform;
      if (transform && transform !== "none") {
        console.warn(
          "WorkspaceViewport or an ancestor has transform applied. This breaks zoom isolation.",
          node,
        );
        break;
      }
      node = node.parentElement;
    }
  }, []);

  useEffect(() => {
    if (!DEV) return;
    if (typeof document === "undefined") return;
    const raf = requestAnimationFrame(() => {
      const matches = document.querySelectorAll(".workspace-viewport");
      if (matches.length !== 1) {
        console.warn(
          `[WorkspaceViewport] Expected exactly one .workspace-viewport in the DOM, found ${matches.length}.`,
          matches,
        );
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const combinedClassName = ["workspace-viewport", className ?? ""].filter(Boolean).join(" ");

  return (
    <div
      {...rest}
      ref={viewportRef}
      id="workspace-viewport"
      className={combinedClassName}
      style={{ ...style, transform: "none" }}
    >
      {children}
      <span className="workspace-marker hidden" aria-hidden />
    </div>
  );
}

"use client";

import { useEffect, useRef, type JSX, type ReactNode, type HTMLAttributes } from "react";
import { useViewportEvents } from "@/components/workspace/hooks/useViewportEvents";
import { useKeyboardZoom } from "@/components/workspace/hooks/useKeyboardZoom";
import { useViewportObserver } from "@/components/workspace/hooks/useViewportObserver";
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
  const setScale = useViewportStore((s) => s.setScale);
  const fitMode = useViewportStore((s) => s.viewport.fitMode);
  const pageWidth = useViewportStore((s) => s.viewport.pageSize.w);
  const scale = useViewportStore((s) => s.viewport.scale);
  const minScale = useViewportStore((s) => s.constraints.minScale);
  const maxScale = useViewportStore((s) => s.constraints.maxScale);
  const viewportWidth = useViewportStore((s) => s.viewport.viewportSize.w);

  // Root element owns scrolling and event capture.
  useViewportEvents(rootRef);
  useKeyboardZoom(rootRef);
  useViewportObserver(viewportRef);

  useEffect(() => {
    if (fitMode !== "fit-width") return;
    if (viewportWidth <= 0 || pageWidth <= 0) return;

    const fit = viewportWidth / pageWidth;
    const clamped = Math.max(minScale, Math.min(fit, maxScale));

    if (Math.abs(clamped - scale) > 1e-3) {
      setScale(clamped);
    }
  }, [fitMode, viewportWidth, pageWidth, minScale, maxScale, scale, setScale]);

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


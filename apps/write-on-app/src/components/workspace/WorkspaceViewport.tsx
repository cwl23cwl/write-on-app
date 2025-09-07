"use client";

import { useEffect, useRef } from "react";
import { useViewportEvents } from "@/components/workspace/hooks/useViewportEvents";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

// WorkspaceViewport: no transforms are applied here in Phase 2.
// It establishes the virtual workspace area and hosts input listeners.
export function WorkspaceViewport({ className, children }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useViewportEvents(containerRef);

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
        paddingLeft: 'var(--page-padding)',
        paddingRight: 'var(--page-padding)',
      }}
    >
      {children}
      <span className="workspace-marker hidden" aria-hidden />
    </div>
  );
}

"use client";

import { useRef } from "react";
import { useCanvasStore, useViewportStore } from "@/state";
import { useWorkspaceContext } from "@/components/workspace/WorkspaceProvider";
import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";

export function TopToolbar(): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  useMeasureCssVar(ref, "--h-top");
  const activeTool = useCanvasStore((s) => s.tools.activeTool);
  const { activateTool, exApi } = useWorkspaceContext();
  const ready = Boolean(exApi);
  const tools: Array<{ key: typeof activeTool; label: string }> = [
    { key: "select", label: "Select" },
    { key: "pen", label: "Pen" },
    { key: "rectangle", label: "Rect" },
    { key: "textbox", label: "Text" },
    { key: "eraser", label: "Eraser" },
    { key: "hand", label: "Hand" },
  ];
  const zoomIn = useViewportStore((s) => s.zoomIn);
  const zoomOut = useViewportStore((s) => s.zoomOut);
  const scale = useViewportStore((s) => s.viewport.scale);
  return (
    <div
      ref={ref}
      className="chrome-top-toolbar top-toolbar h-10 w-full flex items-center gap-2 px-2"
      style={{ contain: 'layout paint', backgroundColor: 'transparent', marginTop: 'var(--gap-header-top)', marginBottom: 0 }}
    >
      {/* Zoom controls */}
      <button
        className="px-2 py-1 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => zoomOut()}
        aria-label="Zoom out"
        style={{ minHeight: 32, minWidth: 32 }}
      >
        -
      </button>
      <button
        className="px-2 py-1 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => zoomIn()}
        aria-label="Zoom in"
        style={{ minHeight: 32, minWidth: 32 }}
      >
        +
      </button>
      <span aria-hidden className="text-xs text-gray-600 px-1 select-none">{Math.round(scale * 100)}%</span>

      {tools.map((t) => (
        <button
          key={t.key}
          className={`px-2 py-1 rounded ${activeTool === t.key ? "bg-black text-white" : "bg-gray-100"} ${(!ready || t.key === 'hand') ? "opacity-50 cursor-not-allowed" : ""} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          onClick={() => activateTool(t.key)}
          disabled={!ready || t.key === 'hand'}
          aria-disabled={!ready || t.key === 'hand'}
          title={t.key === 'hand' ? 'Hand disabled in Phase 2' : undefined}
          aria-pressed={activeTool === t.key}
          aria-label={t.label}
          style={{ minHeight: 32, minWidth: 32 }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useTLDraw, type TLDrawToolName } from "@/components/workspace/tldraw/TLDrawProvider";
import { useToolbarStore, type ToolId } from "@/state/useToolbarStore";

const TOOLBAR_TO_TL: Partial<Record<ToolId, TLDrawToolName>> = {
  select: "select",
  draw: "draw",
  highlighter: "highlight",
  text: "text",
  erase: "eraser",
  shapes: "geo",
};

const TL_TO_TOOLBAR: Partial<Record<string, ToolId>> = {
  select: "select",
  draw: "draw",
  highlight: "highlighter",
  text: "text",
  eraser: "erase",
  geo: "shapes",
  hand: "select",
  laser: "draw",
};

// Sync toolbar selections with the active canvas tool.
export function useToolbarCanvasSync(): void {
  const activeTool = useToolbarStore((s) => s.activeTool);
  const setActiveTool = useToolbarStore((s) => s.setActiveTool);
  const prevRef = useRef<ToolId | null>(null);

  const { setTool: setTLTool, currentTool: tlTool, isReady: tlReady } = useTLDraw();

  useEffect(() => {
    if (!tlReady) return;
    const mapped = activeTool === "none" ? "select" : TOOLBAR_TO_TL[activeTool] ?? "select";
    setTLTool(mapped);
    prevRef.current = activeTool;
  }, [activeTool, setTLTool, tlReady]);

  useEffect(() => {
    if (!tlTool) return;
    const mapped = TL_TO_TOOLBAR[tlTool] ?? "select";
    if (mapped !== prevRef.current) {
      prevRef.current = mapped;
      setActiveTool(mapped);
    }
  }, [tlTool, setActiveTool]);
}

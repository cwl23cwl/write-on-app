"use client";

import { useEffect, useRef } from "react";
import {
  useCanvasAdapter,
  type CanvasToolId,
} from "@/components/canvas/adapter/CanvasAdapter";
import { useToolbarStore, type ToolId } from "@/state/useToolbarStore";

const TOOLBAR_TO_CANVAS: Partial<Record<ToolId, CanvasToolId>> = {
  select: "select",
  draw: "draw",
  highlighter: "highlight",
  text: "text",
  erase: "eraser",
  shapes: "geo",
};

const CANVAS_TO_TOOLBAR: Partial<Record<CanvasToolId, ToolId>> = {
  select: "select",
  draw: "draw",
  highlight: "highlighter",
  text: "text",
  eraser: "erase",
  geo: "shapes",
  hand: "select",
  none: "none",
};

// Sync toolbar selections with the active canvas tool.
export function useToolbarCanvasSync(): void {
  const activeTool = useToolbarStore((s) => s.activeTool);
  const setActiveTool = useToolbarStore((s) => s.setActiveTool);
  const prevRef = useRef<ToolId | null>(null);

  const { isReady, setTool, currentTool } = useCanvasAdapter();

  useEffect(() => {
    if (!isReady) return;
    const mapped = activeTool === "none" ? "select" : TOOLBAR_TO_CANVAS[activeTool] ?? "select";
    setTool(mapped);
    prevRef.current = activeTool;
  }, [activeTool, isReady, setTool]);

  useEffect(() => {
    if (!currentTool) return;
    const mapped = CANVAS_TO_TOOLBAR[currentTool] ?? "select";
    if (mapped !== prevRef.current) {
      prevRef.current = mapped;
      setActiveTool(mapped);
    }
  }, [currentTool, setActiveTool]);
}

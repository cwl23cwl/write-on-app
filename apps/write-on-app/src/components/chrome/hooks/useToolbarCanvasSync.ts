"use client";

import { useEffect, useRef } from "react";
import { useToolbarStore, type ToolId } from "@/state/useToolbarStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

// Sync toolbar activeTool changes to the canvas input mode for Text.
// When entering Text, set Excalidraw to text; when leaving Text, exit by switching to select.
export function useToolbarCanvasSync(): void {
  const activeTool = useToolbarStore((s) => s.activeTool);
  const setWorkspaceTool = useWorkspaceStore((s) => s.setActiveTool);
  const prevRef = useRef<ToolId | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (activeTool === "text") {
      // Enter text insertion mode in Excalidraw/canvas
      setWorkspaceTool("text");
    } else if (prev === "text") {
      // Exit text insertion mode when switching away
      setWorkspaceTool("select");
    }
    prevRef.current = activeTool;
  }, [activeTool, setWorkspaceTool]);
}

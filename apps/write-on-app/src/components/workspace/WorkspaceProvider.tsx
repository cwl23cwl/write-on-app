"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
  type RefObject,
} from "react";
import type { ExcalidrawAPI } from "@/components/workspace/excalidraw/types";
import { TOOL_MAP } from "@/components/workspace/excalidraw/excalidrawConfig";
import type { ToolType } from "@/types/state";
import { useCanvasStore } from "@/state";

export type WorkspaceContextValue = {
  // The root DOM element wrapping the workspace (unscaled container)
  containerRef: RefObject<HTMLDivElement | null>;
  // Excalidraw API wiring
  exApi: ExcalidrawAPI | null;
  setExApi: (api: ExcalidrawAPI | null) => void;
  getExApi: () => ExcalidrawAPI | null;
  activateTool: (tool: ToolType) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ value, children }: { value: { containerRef: RefObject<HTMLDivElement | null> }; children: ReactNode }): JSX.Element {
  const [exApi, setExApiState] = useState<ExcalidrawAPI | null>(null);
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const setActiveToolStore = useCanvasStore((s) => s.setActiveTool);
  const pendingToolRef = useRef<ToolType | null>(null);

  const setExApi = useCallback((api: ExcalidrawAPI | null): void => {
    apiRef.current = api;
    setExApiState(api);
  }, []);

  const getExApi = useCallback((): ExcalidrawAPI | null => apiRef.current, []);

  const activateTool = useCallback((tool: ToolType): void => {
    // Always reflect UI state immediately
    setActiveToolStore(tool);
    const api = apiRef.current as unknown as { setActiveTool?: (t: { type: string }) => void; refresh?: () => void } | null;
    const exTool = TOOL_MAP[tool] ?? (tool as unknown as string);
    if (api && typeof api.setActiveTool === "function") {
      try { api.setActiveTool({ type: exTool }); api.refresh?.(); } catch {}
    } else {
      // Queue until API becomes available
      pendingToolRef.current = tool;
    }
  }, [setActiveToolStore]);

  // When API becomes available, flush any pending tool activation
  const exApiReady = Boolean(exApi);
  useEffect(() => {
    if (!exApiReady) return;
    const pending = pendingToolRef.current;
    if (pending) {
      pendingToolRef.current = null;
      const api = apiRef.current as unknown as { setActiveTool?: (t: { type: string }) => void } | null;
      const exTool = TOOL_MAP[pending] ?? (pending as unknown as string);
      if (api && typeof api.setActiveTool === 'function') {
        try { api.setActiveTool({ type: exTool }); } catch {}
      }
    }
  }, [exApiReady]);

  const ctxValue = useMemo<WorkspaceContextValue>(() => ({
    containerRef: value.containerRef,
    exApi,
    setExApi,
    getExApi,
    activateTool,
  }), [value.containerRef, exApi, setExApi, getExApi, activateTool]);

  return <WorkspaceContext.Provider value={ctxValue}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  return ctx;
}

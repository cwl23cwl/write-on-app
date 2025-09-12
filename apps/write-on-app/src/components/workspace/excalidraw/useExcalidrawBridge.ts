"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ExcalidrawAPI } from "@/components/workspace/excalidraw/types";
import { useCanvasStore, useViewportStore } from "@/state";
import type { ToolType } from "@/types/state";
import { TOOL_MAP } from "@/components/workspace/excalidraw/excalidrawConfig";

type MaybeZoomAPI = { setZoom?: (zoom: number) => void };
type MaybeToolAPI = { setActiveTool?: (t: { type: string }) => void };

function mapToolToExcalidraw(tool: ToolType): string {
  return TOOL_MAP[tool] ?? (tool as string);
}

function mapToolFromExcalidraw(exTool: unknown): ToolType {
  const t = exTool as { type?: string } | string | undefined;
  const key = typeof t === "string" ? t : t?.type ?? "select";
  // invert TOOL_MAP for reverse lookup
  const entry = Object.entries(TOOL_MAP).find(([, v]) => v === key);
  if (entry) return (entry[0] as ToolType);
  return (key as ToolType) ?? "select";
}

type ExcalidrawAppStateLike = {
  zoom?: number | { value?: number };
  scrollX?: number;
  scrollY?: number;
  activeTool?: unknown;
} & Record<string, unknown>;

type BridgeOptions = { 
  mountedRef?: React.RefObject<boolean>; 
  readOnly?: boolean;
  onSceneChange?: (elements: readonly unknown[], appState: Record<string, unknown>, files?: Record<string, unknown>) => void;
};

export function useExcalidrawBridge(api: ExcalidrawAPI | null, opts: BridgeOptions = {}): {
  onChange: (elements: unknown[], appState: Record<string, unknown>, files?: Record<string, unknown>) => void;
  syncToolToExcalidraw: (tool: ToolType) => void;
  syncToolToStore: (exTool: unknown) => void;
} {
  const setExcalidrawAPI = useCanvasStore((s) => s.setExcalidrawAPI);
  const setScene = useCanvasStore((s) => s.setScene);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const requestRedraw = useCanvasStore((s) => s.requestRedraw);
  const scale = useViewportStore((s) => s.viewport.scale);

  const rafId = useRef<number | null>(null);
  const pending = useRef<{ els: unknown[]; state: Record<string, unknown>; files?: Record<string, unknown> } | null>(null);
  const zoomViolations = useRef<number>(0);

  // Keep store API up to date
  useEffect(() => { setExcalidrawAPI(api); }, [api, setExcalidrawAPI]);
  const mounted = opts.mountedRef?.current ?? true;

  const enforceZoomLock = useCallback((state: Record<string, unknown>): Record<string, unknown> => {
    const s = { ...state } as ExcalidrawAppStateLike;
    const z = s.zoom;
    const current = typeof z === "number" ? z : (z && typeof z === "object" && "value" in z ? (z as { value?: number }).value ?? 1 : 1);
    if (current !== 1) {
      if (process.env.NODE_ENV === "development") {
        console.error("[ExcalidrawAdapter] Zoom violation detected!", z);
      }
      zoomViolations.current += 1;
      try {
        const zApi = api as unknown as MaybeZoomAPI | null;
        if (zApi && typeof zApi.setZoom === "function" && mounted) {
          zApi.setZoom(1);
        } else if (!mounted) {
          // Not mounted yet; skip without throwing to avoid error boundaries during hydration
          console.warn('[ExcalidrawAdapter] Skipping zoom lock before mount');
        } else if (!zApi) {
          console.warn("[ExcalidrawAdapter] API not ready, deferring operation");
        }
      } catch {}
      s.zoom = 1;
    }
    // Strip scroll
    if (typeof s.scrollX === "number") s.scrollX = 0;
    if (typeof s.scrollY === "number") s.scrollY = 0;
    return s as Record<string, unknown>;
  }, [api, mounted]);

  const flush = useCallback(() => {
    if (!pending.current) return;
    const { els, state, files } = pending.current;
    pending.current = null;
    setScene({ elements: els.slice(), appState: state, files });
    requestRedraw();
    
    // Step 7: Emit scene change event if callback provided
    if (opts.onSceneChange) {
      opts.onSceneChange(els, state, files);
    }
    
    rafId.current = null;
  }, [requestRedraw, setScene, opts]);

  const onChange = useCallback((elements: unknown[], appState: Record<string, unknown>, files?: Record<string, unknown>): void => {
    const cleanState = enforceZoomLock(appState);
    pending.current = { els: elements, state: cleanState, files };
    if (rafId.current == null) {
      rafId.current = requestAnimationFrame(flush);
    }
  }, [enforceZoomLock, flush]);

  const syncToolToExcalidraw = useCallback((tool: ToolType): void => {
    if (opts.readOnly) return;
    const apiTool = api as unknown as MaybeToolAPI | null;
    if (apiTool && typeof apiTool.setActiveTool === "function" && mounted) {
      try { apiTool.setActiveTool({ type: mapToolToExcalidraw(tool) }); } catch {}
    } else if (!mounted) {
      // Not ready yet; ignore the sync and wait for mount
      return;
    }
  }, [api, mounted, opts.readOnly]);

  const syncToolToStore = useCallback((exTool: unknown): void => {
    if (opts.readOnly) return;
    setActiveTool(mapToolFromExcalidraw(exTool));
  }, [opts.readOnly, setActiveTool]);

  // Keep internal zoom at 1 when viewport scale changes
  useEffect(() => {
    try {
      const zApi = api as unknown as MaybeZoomAPI | null;
      if (zApi && typeof zApi.setZoom === "function" && mounted) zApi.setZoom(1);
    } catch {}
  }, [api, scale, mounted]);

  return { onChange, syncToolToExcalidraw, syncToolToStore };
}

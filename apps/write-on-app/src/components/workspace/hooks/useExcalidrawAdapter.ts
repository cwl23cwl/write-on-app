"use client";

import { useCallback, useEffect, useState } from "react";
import { useViewportStore } from "@/state";
import { getSafeDPR } from "../../../../../../packages/woe-excalidraw-adapter/src/environment";
import type { ExcalidrawIslandElement } from "@/components/workspace/ExcalidrawIsland";
import type {
  AdapterToolName,
  ExcalidrawAdapterContract,
} from "../../../../../../packages/woe-excalidraw-adapter/src/types/public";

const DEFAULT_PAGE_WIDTH = 1200;
const DEFAULT_PAGE_HEIGHT = 2200;
const ADAPTER_GUARD_ENABLED = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_EXCALIDRAW_ADAPTER_V2 !== "0" : true;

const arraysShallowEqual = (a: readonly string[], b: readonly string[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
};

export interface AdapterStatus {
  adapter: ExcalidrawAdapterContract | null;
  ready: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  selectionIds: readonly string[];
  activeTool: AdapterToolName;
  attachHost: (host: ExcalidrawIslandElement | null) => void;
  detachHost: (host?: ExcalidrawIslandElement | null) => void;
}

export function useExcalidrawAdapter(): AdapterStatus {
  const [adapter, setAdapter] = useState<ExcalidrawAdapterContract | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [selectionIds, setSelectionIds] = useState<readonly string[]>([]);
  const [activeTool, setActiveTool] = useState<AdapterToolName>("hand");
  const guardEnabled = ADAPTER_GUARD_ENABLED;

  useEffect(() => {
    let cancelled = false;
    import("../../../../../../packages/woe-excalidraw-adapter/src")
      .then((mod) => {
        if (cancelled) return;
        const instance = mod.getExcalidrawAdapter();
        setAdapter(instance);
        setReady(instance.ready());
        setCanUndo(instance.canUndo());
        setCanRedo(instance.canRedo());
        setIsDirty(instance.isDirty());
        setSelectionIds(instance.getSelectionIds());
      })
      .catch((error) => {
        console.error("[useExcalidrawAdapter] Failed to load adapter module", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!adapter) {
      return;
    }
    const updateHistoryFlags = () => {
      const nextCanUndo = adapter.canUndo();
      const nextCanRedo = adapter.canRedo();
      const nextIsDirty = adapter.isDirty();
      setCanUndo((prev) => (guardEnabled && prev === nextCanUndo ? prev : nextCanUndo));
      setCanRedo((prev) => (guardEnabled && prev === nextCanRedo ? prev : nextCanRedo));
      setIsDirty((prev) => (guardEnabled && prev === nextIsDirty ? prev : nextIsDirty));
    };

    const onReadyUnsub = adapter.onReady(() => {
      setReady((prev) => (guardEnabled && prev ? prev : true));
      updateHistoryFlags();
    });

    const onSelectionUnsub = adapter.onSelectionChange((ids) => {
      setSelectionIds((prev) => (guardEnabled && arraysShallowEqual(prev, ids) ? prev : ids.slice()));
    });

    const onToolUnsub = adapter.onActiveToolChange((tool) => {
      setActiveTool((prev) => (guardEnabled && prev === tool ? prev : tool));
    });

    const onSceneUnsub = adapter.onSceneChange(() => {
      updateHistoryFlags();
    });

    return () => {
      onReadyUnsub();
      onSelectionUnsub();
      onToolUnsub();
      onSceneUnsub();
    };
  }, [adapter, guardEnabled]);

  useEffect(() => {
    if (!adapter) return;
    const state = useViewportStore.getState();
    const initialScale = state.viewport.scale;
    const initialDpr = state.viewport.devicePixelRatio || getSafeDPR();
    adapter.setPageSize(DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT);
    adapter.setPageScale(initialScale, initialDpr);

    let prevScale = initialScale;
    let prevDpr = initialDpr;
    const unsubscribe = useViewportStore.subscribe(
      (state) => ({
        scale: state.viewport.scale,
        dpr: state.viewport.devicePixelRatio || getSafeDPR(),
      }),
      ({ scale, dpr }) => {
        if (scale !== prevScale || dpr !== prevDpr) {
          prevScale = scale;
          prevDpr = dpr;
          adapter.setPageScale(scale, dpr);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [adapter]);

  const detachHost = useCallback(
    (host?: ExcalidrawIslandElement | null) => {
      if (host) {
        host.adapter = null;
      }
      if (adapter) {
        adapter.detachHost();
      }
      setReady(false);
      setSelectionIds([]);
      setCanUndo(false);
      setCanRedo(false);
      setIsDirty(false);
    },
    [adapter],
  );

  const attachHost = useCallback(
    (host: ExcalidrawIslandElement | null) => {
      if (!adapter) return;
      if (!host) {
        detachHost();
        return;
      }
      host.adapter = adapter;
      adapter.attachHost(host);
      adapter.setPageSize(DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT);
      const state = useViewportStore.getState();
      adapter.setPageScale(
        state.viewport.scale,
        state.viewport.devicePixelRatio || (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1,
      );
      setReady(adapter.ready());
      setCanUndo(adapter.canUndo());
      setCanRedo(adapter.canRedo());
      setIsDirty(adapter.isDirty());
    },
    [adapter, detachHost],
  );

  return {
    adapter,
    ready,
    canUndo,
    canRedo,
    isDirty,
    selectionIds,
    activeTool,
    attachHost,
    detachHost,
  };
}

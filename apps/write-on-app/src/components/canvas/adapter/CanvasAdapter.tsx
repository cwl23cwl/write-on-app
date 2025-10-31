"use client";

import { createContext, useContext, type PropsWithChildren } from "react";

export type CanvasToolId =
  | "select"
  | "hand"
  | "draw"
  | "eraser"
  | "text"
  | "highlight"
  | "geo"
  | "none";

export type CanvasTextSize = "s" | "m" | "l" | "xl";

export type CanvasFitMode = "fit-width" | "free";

export interface CanvasSharedStyles {
  stroke?: string;
  fill?: "none" | "semi" | "solid" | "pattern" | "fill";
  font?: string;
  size?: CanvasTextSize;
  textAlign?: "start" | "middle" | "end";
  opacity?: number;
}

export interface CanvasPagesAdapter {
  current: number;
  total: number;
  setCurrent: (next: number) => void;
  setTotal: (next: number) => void;
}

export interface CanvasAdapter {
  isReady: boolean;
  currentTool: CanvasToolId | null;
  setTool: (tool: CanvasToolId) => void;
  undo: () => void;
  redo: () => void;
  sharedStyles: CanvasSharedStyles;
  setStroke: (hex: string) => void;
  setFill?: (fill: CanvasSharedStyles["fill"]) => void;
  setTextFont: (font: string) => void;
  setTextSize: (size: CanvasTextSize) => void;
  setTextAlign?: (align: "start" | "middle" | "end") => void;
  setOpacity?: (opacity: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  fitMode: CanvasFitMode;
  setFitMode: (mode: CanvasFitMode) => void;
  pages: CanvasPagesAdapter;
  registerToolListener?: (listener: (tool: CanvasToolId | null) => void) => () => void;
  mountReady?: () => void;
}

const noop = (): void => {};

const defaultCanvasAdapter: CanvasAdapter = {
  isReady: false,
  currentTool: null,
  setTool: noop,
  undo: noop,
  redo: noop,
  sharedStyles: {},
  setStroke: noop,
  setTextFont: noop,
  setTextSize: noop,
  zoom: 1,
  setZoom: noop,
  fitMode: "free",
  setFitMode: noop,
  pages: {
    current: 1,
    total: 1,
    setCurrent: noop,
    setTotal: noop,
  },
  mountReady: noop,
};

const CanvasAdapterContext = createContext<CanvasAdapter>(defaultCanvasAdapter);

export function CanvasAdapterProvider({
  value,
  children,
}: PropsWithChildren<{ value: CanvasAdapter }>): JSX.Element {
  return <CanvasAdapterContext.Provider value={value}>{children}</CanvasAdapterContext.Provider>;
}

export function useCanvasAdapter(): CanvasAdapter {
  return useContext(CanvasAdapterContext);
}

export function createDefaultCanvasAdapter(overrides: Partial<CanvasAdapter> = {}): CanvasAdapter {
  return {
    ...defaultCanvasAdapter,
    ...overrides,
    pages: {
      ...defaultCanvasAdapter.pages,
      ...overrides.pages,
    },
  };
}

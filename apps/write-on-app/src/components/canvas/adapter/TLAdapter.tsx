"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  DefaultColorStyle,
  DefaultFillStyle,
  DefaultFontStyle,
  DefaultSizeStyle,
  DefaultTextAlignStyle,
  type StyleProp,
} from "@tldraw/tlschema";
import {
  CanvasAdapterProvider,
  type CanvasAdapter,
  type CanvasSharedStyles,
  type CanvasToolId,
  type CanvasTextSize,
  type CanvasFitMode,
} from "@/components/canvas/adapter/CanvasAdapter";
import { usePageStore, useViewportStore } from "@/state";
import {
  cssFontToTl,
  hexToTlColor,
  tlAlignToTextAlign,
  tlColorToHex,
  tlFontToCss,
} from "@/components/workspace/tldraw/utils";
import { useEditor, type Editor } from "@tldraw/tldraw";

const CANVAS_TO_TL: Record<CanvasToolId, string> = {
  select: "select",
  hand: "hand",
  draw: "draw",
  eraser: "eraser",
  text: "text",
  highlight: "highlight",
  geo: "geo",
  none: "select",
};

const TL_TO_CANVAS: Record<string, CanvasToolId> = {
  select: "select",
  hand: "hand",
  draw: "draw",
  eraser: "eraser",
  text: "text",
  highlight: "highlight",
  highlighter: "highlight",
  geo: "geo",
  shapes: "geo",
};

function mapToolToCanvas(toolId: string | null | undefined): CanvasToolId | null {
  if (!toolId) return null;
  return TL_TO_CANVAS[toolId] ?? null;
}

function applyStyle<T>(
  editor: Editor | null,
  selectionCount: number,
  style: StyleProp<T>,
  value: T,
): void {
  if (!editor) return;
  try {
    if (selectionCount > 0) {
      editor.setStyleForSelectedShapes(style, value);
    } else {
      editor.setStyleForNextShapes(style, value);
    }
  } catch (error) {
    console.error("[TLAdapter] Failed to apply style", error);
  }
}

function computeSharedStyles(editor: Editor | null): CanvasSharedStyles {
  if (!editor) return {};
  try {
    const styles = editor.getSharedStyles();
    const stroke = tlColorToHex(styles.getAsKnownValue(DefaultColorStyle));
    const fill = styles.getAsKnownValue(DefaultFillStyle) as CanvasSharedStyles["fill"];
    const font = tlFontToCss(styles.getAsKnownValue(DefaultFontStyle));
    const size = styles.getAsKnownValue(DefaultSizeStyle) as CanvasTextSize | undefined;
    const textAlign = tlAlignToTextAlign(styles.getAsKnownValue(DefaultTextAlignStyle));

    return {
      stroke,
      fill,
      font,
      size,
      textAlign,
    };
  } catch (error) {
    console.warn("[TLAdapter] Failed to compute shared styles", error);
    return {};
  }
}

export function TLAdapterProvider({ children }: PropsWithChildren): JSX.Element {
  const editor = useEditor();
  const [isReady, setIsReady] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);
  const [currentTool, setCurrentTool] = useState<CanvasToolId | null>(null);
  const [sharedStyles, setSharedStyles] = useState<CanvasSharedStyles>({});

  const zoom = useViewportStore((s) => s.viewport.scale ?? 1);
  const fitMode = useViewportStore((s) => s.viewport.fitMode ?? "free");
  const setScale = useViewportStore((s) => s.setScale);
  const setFitModeStore = useViewportStore((s) => s.setFitMode);

  const currentPage = usePageStore((s) => s.current);
  const totalPages = usePageStore((s) => s.total);
  const setPageCurrent = usePageStore((s) => s.setCurrent);
  const setPageTotal = usePageStore((s) => s.setTotal);

  const updateSharedStyles = useCallback(() => {
    if (!editor) return;
    setSharedStyles(computeSharedStyles(editor));
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      setIsReady(false);
      setCurrentTool(null);
      setSelectionCount(0);
      setSharedStyles({});
      return;
    }

    let disposed = false;

    const handleState = () => {
      if (disposed) return;
      const tool = mapToolToCanvas(editor.getCurrentToolId());
      setCurrentTool(tool);
      setSelectionCount(editor.getSelectedShapeIds().length);
      updateSharedStyles();
      setScale(editor.getZoomLevel());
    };

    const unsubscribe = editor.store.listen(handleState, { source: "user" });
    editor.on("change", handleState);
    editor.on("update", handleState);
    editor.on("event", handleState);

    handleState();
    setIsReady(true);

    return () => {
      disposed = true;
      unsubscribe?.();
      editor.off("change", handleState);
      editor.off("update", handleState);
      editor.off("event", handleState);
      setIsReady(false);
      setCurrentTool(null);
      setSelectionCount(0);
      setSharedStyles({});
    };
  }, [editor, setScale, updateSharedStyles]);

  const setTool = useCallback(
    (tool: CanvasToolId) => {
      if (!editor) return;
      const target = CANVAS_TO_TL[tool] ?? "select";
      try {
        editor.setCurrentTool(target);
        setCurrentTool(tool === "none" ? "select" : tool);
      } catch (error) {
        console.error("[TLAdapter] Failed to set tool", error);
      }
    },
    [editor],
  );

  const undo = useCallback(() => {
    if (!editor) return;
    try {
      if (editor.canUndo()) {
        editor.undo();
        setScale(editor.getZoomLevel());
      }
    } catch (error) {
      console.error("[TLAdapter] Failed to undo", error);
    }
  }, [editor, setScale]);

  const redo = useCallback(() => {
    if (!editor) return;
    try {
      if (editor.canRedo()) {
        editor.redo();
        setScale(editor.getZoomLevel());
      }
    } catch (error) {
      console.error("[TLAdapter] Failed to redo", error);
    }
  }, [editor, setScale]);

  const setStroke = useCallback(
    (hex: string) => {
      if (!editor) return;
      const tlColor = hexToTlColor(hex);
      applyStyle(editor, selectionCount, DefaultColorStyle, tlColor as any);
      updateSharedStyles();
    },
    [editor, selectionCount, updateSharedStyles],
  );

  const setFill = useCallback(
    (fill: CanvasSharedStyles["fill"]) => {
      if (!editor || typeof fill === "undefined") return;
      applyStyle(editor, selectionCount, DefaultFillStyle, fill as any);
      updateSharedStyles();
    },
    [editor, selectionCount, updateSharedStyles],
  );

  const setTextFont = useCallback(
    (font: string) => {
      if (!editor) return;
      const tlFont = cssFontToTl(font);
      applyStyle(editor, selectionCount, DefaultFontStyle, tlFont as any);
      updateSharedStyles();
    },
    [editor, selectionCount, updateSharedStyles],
  );

  const setTextSize = useCallback(
    (size: CanvasTextSize) => {
      if (!editor) return;
      applyStyle(editor, selectionCount, DefaultSizeStyle, size);
      updateSharedStyles();
    },
    [editor, selectionCount, updateSharedStyles],
  );

  const setTextAlign = useCallback(
    (align: "start" | "middle" | "end") => {
      if (!editor) return;
      applyStyle(editor, selectionCount, DefaultTextAlignStyle, align);
      updateSharedStyles();
    },
    [editor, selectionCount, updateSharedStyles],
  );

  const setOpacity = useCallback(
    (opacity: number) => {
      if (!editor) return;
      try {
        if (selectionCount > 0) {
          editor.setOpacityForSelectedShapes(opacity);
        } else {
          editor.setOpacityForNextShapes(opacity);
        }
      } catch (error) {
        console.error("[TLAdapter] Failed to set opacity", error);
      }
    },
    [editor, selectionCount],
  );

  const setZoomCb = useCallback(
    (nextZoom: number) => {
      const safeZoom = Number.isFinite(nextZoom) && nextZoom > 0 ? nextZoom : 1;
      setScale(safeZoom);
      if (!editor) return;
      try {
        const camera = editor.getCamera();
        editor.setCamera({ ...camera, z: safeZoom }, { force: true });
      } catch (error) {
        console.error("[TLAdapter] Failed to set zoom", error);
      }
    },
    [editor, setScale],
  );

  const setFitMode = useCallback(
    (mode: CanvasFitMode) => {
      setFitModeStore(mode);
    },
    [setFitModeStore],
  );

  const mountReady = useCallback(() => {
    updateSharedStyles();
  }, [updateSharedStyles]);

  const adapterValue = useMemo<CanvasAdapter>(
    () => ({
      isReady,
      currentTool,
      setTool,
      undo,
      redo,
      sharedStyles,
      setStroke,
      setFill,
      setTextFont,
      setTextSize,
      setTextAlign,
      setOpacity,
      zoom,
      setZoom: setZoomCb,
      fitMode,
      setFitMode,
      pages: {
        current: currentPage,
        total: totalPages,
        setCurrent: setPageCurrent,
        setTotal: setPageTotal,
      },
      mountReady,
    }),
    [
      currentPage,
      currentTool,
      fitMode,
      isReady,
      mountReady,
      redo,
      setFill,
      setFitMode,
      setPageCurrent,
      setPageTotal,
      setStroke,
      setTextAlign,
      setTextFont,
      setTextSize,
      setTool,
      setZoomCb,
      sharedStyles,
      totalPages,
      undo,
      zoom,
    ],
  );

  return <CanvasAdapterProvider value={adapterValue}>{children}</CanvasAdapterProvider>;
}

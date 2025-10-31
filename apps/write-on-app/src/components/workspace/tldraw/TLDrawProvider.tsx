"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Editor,
  TLShapeId,
  TLShape,
  TLShapePartial,
  TLStoreSnapshot,
  TLCamera,
} from "@tldraw/tldraw";
import {
  DefaultColorStyle,
  DefaultFillStyle,
  DefaultFontStyle,
  DefaultSizeStyle,
  DefaultTextAlignStyle,
  type StyleProp,
} from "@tldraw/tlschema";
import {
  cssFontToTl,
  hexToTlColor,
  tlAlignToTextAlign,
  tlColorToHex,
  tlFontToCss,
} from "@/components/workspace/tldraw/utils";

type TLDrawToolName = "select" | "hand" | "draw" | "eraser" | "text" | "highlight" | "geo";

const ESSENTIAL_TOOL_IDS: ReadonlyArray<string> = ["select", "draw"];

export type TLDrawSharedStyles = {
  stroke: string | undefined;
  fill: "none" | "semi" | "solid" | "pattern" | "fill" | undefined;
  font: string | undefined;
  size: "s" | "m" | "l" | "xl" | undefined;
  textAlign: "start" | "middle" | "end" | undefined;
};

type TLDrawSnapshot = Partial<TLStoreSnapshot>;

export interface TLDrawApi {
  editor: Editor | null;
  ready: boolean;
  isReady: boolean;
  selectionCount: number;
  currentTool: TLDrawToolName | null;
  sharedStyles: TLDrawSharedStyles;
  zoom: number;
  camera: TLCamera;
  registerEditor: (editor: Editor | null) => void;
  setTool: (tool: TLDrawToolName) => void;
  undo: () => void;
  redo: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToContent: () => void;
  fitToPage: (size?: { width: number; height: number }) => void;
  setCamera: (camera: Partial<TLCamera>, opts?: { immediate?: boolean }) => void;
  setStroke: (color: string) => void;
  setFill: (fill: "none" | "semi" | "solid" | "pattern" | "fill") => void;
  setTextFont: (font: string) => void;
  setTextSize: (size: "s" | "m" | "l" | "xl") => void;
  setTextAlign: (align: "start" | "middle" | "end") => void;
  setOpacity: (opacity: number) => void;
  setStylesForSelection: <T>(style: StyleProp<T>, value: T) => void;
  setStylesForNextShapes: <T>(style: StyleProp<T>, value: T) => void;
  serializeScene: () => TLDrawSnapshot | null;
  loadScene: (snapshot: TLDrawSnapshot) => void;
}

const noop = () => {};

const defaultApi: TLDrawApi = {
  editor: null,
  ready: false,
  isReady: false,
  selectionCount: 0,
  currentTool: null,
  sharedStyles: {
    stroke: undefined,
    fill: undefined,
    font: undefined,
    size: undefined,
    textAlign: undefined,
  },
  zoom: 1,
  camera: { x: 0, y: 0, z: 1 },
  registerEditor: noop,
  setTool: noop,
  undo: noop,
  redo: noop,
  zoomIn: noop,
  zoomOut: noop,
  fitToContent: noop,
  fitToPage: noop,
  setCamera: noop,
  setStroke: noop,
  setFill: noop,
  setTextFont: noop,
  setTextSize: noop,
  setTextAlign: noop,
  setOpacity: noop,
  setStylesForSelection: noop,
  setStylesForNextShapes: noop,
  serializeScene: () => null,
  loadScene: noop,
};

const TLDrawContext = createContext<TLDrawApi>(defaultApi);

const DEBUG_FLAG = typeof window !== "undefined" && window.location.hash.includes("debug-tldraw");
const logDebug = (...args: unknown[]): void => {
  if (DEBUG_FLAG) {
    // eslint-disable-next-line no-console
    console.debug("[TLDraw]", ...args);
  }
};

const toolMap: Record<TLDrawToolName, string> = {
  select: "select",
  hand: "hand",
  draw: "draw",
  eraser: "eraser",
  text: "text",
  highlight: "highlight",
  geo: "geo",
};

export function TLDrawProvider({ children }: { children: ReactNode }): JSX.Element {
  const editorRef = useRef<Editor | null>(null);
  const [ready, setReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);
  const [currentTool, setCurrentTool] = useState<TLDrawToolName | null>(null);
  const [sharedStyles, setSharedStyles] = useState<TLDrawSharedStyles>(defaultApi.sharedStyles);
  const [zoom, setZoom] = useState(1);
  const [camera, setCameraState] = useState<TLCamera>(defaultApi.camera);

  const teardownListeners = useRef<(() => void) | null>(null);
  const readyCheckFrame = useRef<{ id: number; token: number } | null>(null);
  const isReadyRef = useRef(false);
  const toolLogPrintedRef = useRef(false);
  const availableToolsRef = useRef<Set<string>>(new Set());
  const mountTokenRef = useRef(0);

  const cancelReadyCheck = useCallback((token?: number) => {
    if (readyCheckFrame.current !== null && typeof window !== "undefined") {
      if (token === undefined || readyCheckFrame.current.token === token) {
        window.cancelAnimationFrame(readyCheckFrame.current.id);
        readyCheckFrame.current = null;
      }
    }
  }, []);

  const unregisterEditor = useCallback(() => {
    if (teardownListeners.current) {
      teardownListeners.current();
      teardownListeners.current = null;
    }
    editorRef.current = null;
    cancelReadyCheck();
    isReadyRef.current = false;
    toolLogPrintedRef.current = false;
    availableToolsRef.current = new Set();
    setReady(false);
    setIsReady(false);
    setSelectionCount(0);
    setCurrentTool(null);
    setSharedStyles(defaultApi.sharedStyles);
    setZoom(1);
    setCameraState(defaultApi.camera);
  }, [cancelReadyCheck]);

  useEffect(() => () => unregisterEditor(), [unregisterEditor]);

  const syncSharedStyles = useCallback((editor: Editor) => {
    const styles = editor.getSharedStyles();
    const stroke = styles.getAsKnownValue(DefaultColorStyle);
    const fill = styles.getAsKnownValue(DefaultFillStyle);
    const font = styles.getAsKnownValue(DefaultFontStyle);
    const size = styles.getAsKnownValue(DefaultSizeStyle);
    const textAlign = styles.getAsKnownValue(DefaultTextAlignStyle);
    setSharedStyles({
      stroke: tlColorToHex(stroke),
      fill: (typeof fill === "string" ? (fill as TLDrawSharedStyles["fill"]) : undefined) ?? undefined,
      font: tlFontToCss(font),
      size: size ?? undefined,
      textAlign: tlAlignToTextAlign(textAlign),
    });
  }, []);

  const evaluateToolRegistration = useCallback(
    (editor: Editor, token: number): boolean => {
      if (mountTokenRef.current !== token) {
        return false;
      }
      const root = editor.root as { children?: Record<string, unknown> } | null | undefined;
      const toolIds = root?.children ? Object.keys(root.children) : [];
      availableToolsRef.current = new Set(toolIds);
      const hasEssentialTools = ESSENTIAL_TOOL_IDS.every((id) => toolIds.includes(id));
      if (!hasEssentialTools) {
        return false;
      }

      if (!isReadyRef.current) {
        isReadyRef.current = true;
        setIsReady(true);
        if (!toolLogPrintedRef.current) {
          toolLogPrintedRef.current = true;
          logDebug("TLDraw tools registered", toolIds);
        }
        const currentId = editor.getCurrentToolId();
        if (currentId) {
          const mappedEntry = Object.entries(toolMap).find(([, value]) => value === currentId)?.[0];
          if (mappedEntry) {
            setCurrentTool(mappedEntry as TLDrawToolName);
          } else {
            setCurrentTool(null);
          }
        }
      }

      return true;
    },
    [],
  );

  const startReadyCheck = useCallback(
    (editor: Editor, token: number) => {
      cancelReadyCheck(token);
      if (evaluateToolRegistration(editor, token)) {
        return;
      }

      if (typeof window === "undefined") return;

      const tick = () => {
        if (mountTokenRef.current !== token) {
          cancelReadyCheck(token);
          return;
        }

        if (!editorRef.current || editorRef.current !== editor) {
          cancelReadyCheck(token);
          return;
        }

        if (!evaluateToolRegistration(editor, token)) {
          const frameId = window.requestAnimationFrame(tick);
          readyCheckFrame.current = { id: frameId, token };
        } else {
          readyCheckFrame.current = null;
        }
      };

      const frameId = window.requestAnimationFrame(tick);
      readyCheckFrame.current = { id: frameId, token };
    },
    [cancelReadyCheck, evaluateToolRegistration],
  );

  const registerEditor = useCallback(
    (editor: Editor | null) => {
      if (!editor) {
        mountTokenRef.current += 1;
        unregisterEditor();
        return;
      }

      if (editorRef.current === editor) return;
      unregisterEditor();
      const token = ++mountTokenRef.current;
      isReadyRef.current = false;
      toolLogPrintedRef.current = false;
      availableToolsRef.current = new Set();
      editorRef.current = editor;
      setReady(true);

      try {
        editor.user.updateUserPreferences({ areKeyboardShortcutsEnabled: false });
      } catch (error) {
        console.warn("[TLDraw] Failed to disable TLDraw hotkeys", error);
      }

      try {
        const options = editor.getCameraOptions();
        editor.setCameraOptions({
          ...options,
          wheelBehavior: "none",
        });
      } catch (error) {
        console.warn("[TLDraw] Failed to configure TLDraw camera options", error);
      }

      const unsubscribe = editor.store.listen(
        () => {
          if (mountTokenRef.current !== token) return;
          const ids = editor.getSelectedShapeIds();
          setSelectionCount(ids.length);
          syncSharedStyles(editor);
        },
        { source: "user" },
      );

      const handleChange = () => {
        if (mountTokenRef.current !== token) return;
        const ids = editor.getSelectedShapeIds();
        setSelectionCount(ids.length);
        syncSharedStyles(editor);
        setZoom(editor.getZoomLevel());
        setCameraState(editor.getCamera());
        evaluateToolRegistration(editor, token);
      };

      const handleTool = () => {
        if (mountTokenRef.current !== token) return;
        const tool = editor.getCurrentToolId();
        const mappedEntry = Object.entries(toolMap).find(([, value]) => value === tool)?.[0];
        if (mappedEntry) {
          setCurrentTool(mappedEntry as TLDrawToolName);
        } else {
          setCurrentTool(null);
        }
        evaluateToolRegistration(editor, token);
      };

      editor.on("change", handleChange);
      editor.on("update", handleChange);
      editor.on("event", handleChange);
      editor.on("event", handleTool);

      const cleanup = () => {
        cancelReadyCheck(token);
        unsubscribe?.();
        editor.off("change", handleChange);
        editor.off("update", handleChange);
        editor.off("event", handleChange);
        editor.off("event", handleTool);
        if (teardownListeners.current === cleanup) {
          teardownListeners.current = null;
        }
      };

      teardownListeners.current = cleanup;

      if (mountTokenRef.current === token) {
        setSelectionCount(editor.getSelectedShapeIds().length);
        syncSharedStyles(editor);
        setZoom(editor.getZoomLevel());
        setCameraState(editor.getCamera());
        startReadyCheck(editor, token);
      }
      logDebug("Editor registered");
    },
    [cancelReadyCheck, evaluateToolRegistration, startReadyCheck, syncSharedStyles, unregisterEditor],
  );

  const applyStyle = useCallback(
    <T,>(style: StyleProp<T>, value: T, opts: { toSelection?: boolean } = {}): void => {
      const editor = editorRef.current;
      if (!editor) return;
      try {
        if (opts.toSelection) {
          editor.setStyleForSelectedShapes(style, value);
        } else {
          editor.setStyleForNextShapes(style, value);
        }
      } catch (error) {
        console.error("[TLDraw] Failed to set style", error);
      }
    },
    [],
  );

  const api = useMemo<TLDrawApi>(() => {
    const ensureEditor = (): Editor | null => {
      const instance = editorRef.current;
      if (!instance) {
        logDebug("Editor not ready");
      }
      return instance ?? null;
    };

    return {
      editor: editorRef.current,
      ready,
      isReady,
      selectionCount,
      currentTool,
      sharedStyles,
      zoom,
      camera,
      registerEditor,
      setTool: (tool) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        const mapped = toolMap[tool] ?? tool;
        const available = availableToolsRef.current;
        if (available.size > 0 && !available.has(mapped)) {
          logDebug("Requested tool not registered", { requested: tool, mapped, available: Array.from(available) });
          if (mapped !== "select" && available.has("select")) {
            try {
              instance.setCurrentTool("select");
              setCurrentTool("select");
            } catch (error) {
              console.error("[TLDraw] Failed to fallback to select tool", error);
            }
          }
          return;
        }
        try {
          instance.setCurrentTool(mapped);
          setCurrentTool(tool);
          logDebug("Tool set", tool);
        } catch (error) {
          console.error("[TLDraw] Failed to set tool", error);
        }
      },
      undo: () => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        if (instance.canUndo()) {
          instance.undo();
          logDebug("Undo");
        }
      },
      redo: () => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        if (instance.canRedo()) {
          instance.redo();
          logDebug("Redo");
        }
      },
      zoomIn: () => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        instance.zoomIn();
        setZoom(instance.getZoomLevel());
        setCameraState(instance.getCamera());
      },
      zoomOut: () => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        instance.zoomOut();
        setZoom(instance.getZoomLevel());
        setCameraState(instance.getCamera());
      },
      fitToContent: () => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        instance.zoomToFit();
        setZoom(instance.getZoomLevel());
        setCameraState(instance.getCamera());
      },
      fitToPage: (size) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        try {
          const width = size?.width ?? 1200;
          const height = size?.height ?? 2200;
          const viewport = instance.getViewportScreenBounds();
          const nextZoom = Math.max(0.0001, Math.min(viewport.width / width, viewport.height / height));
          const current = instance.getCamera();
          instance.setCamera({ x: current.x, y: current.y, z: nextZoom }, { force: true });
          instance.centerOnPoint({ x: width / 2, y: height / 2 }, { force: true });
          setZoom(instance.getZoomLevel());
          setCameraState(instance.getCamera());
        } catch (error) {
          console.error("[TLDraw] Failed to fit camera to page", error);
        }
      },
      setCamera: (partialCamera, opts) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        try {
          const current = instance.getCamera();
          const next = {
            x: partialCamera.x ?? current.x,
            y: partialCamera.y ?? current.y,
            z: partialCamera.z ?? current.z,
          };
          instance.setCamera(next, { ...opts, force: true });
          setZoom(instance.getZoomLevel());
          setCameraState(instance.getCamera());
        } catch (error) {
          console.error("[TLDraw] Failed to set TLDraw camera", error);
        }
      },
      setStroke: (color) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
          const tlColor = hexToTlColor(color);
          applyStyle(DefaultColorStyle, tlColor as any, { toSelection: selectionCount > 0 });
          logDebug("Stroke", tlColor);
        },
      setFill: (fill) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
          applyStyle(DefaultFillStyle, fill as any, { toSelection: selectionCount > 0 });
          logDebug("Fill", fill);
        },
      setTextFont: (font) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
          const tlFont = cssFontToTl(font);
          applyStyle(DefaultFontStyle, tlFont as any, { toSelection: selectionCount > 0 });
          logDebug("Font", tlFont);
        },
      setTextSize: (size) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
          applyStyle(DefaultSizeStyle, size, { toSelection: selectionCount > 0 });
          logDebug("Size", size);
      },
      setTextAlign: (align) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        applyStyle(DefaultTextAlignStyle, align, { toSelection: selectionCount > 0 });
      },
      setOpacity: (opacity) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        if (selectionCount > 0) {
          instance.setOpacityForSelectedShapes(opacity);
        } else {
          instance.setOpacityForNextShapes(opacity);
        }
        logDebug("Opacity", opacity);
      },
      setStylesForSelection: (style, value) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        try {
          instance.setStyleForSelectedShapes(style, value);
        } catch (error) {
          console.error("[TLDraw] Failed to set selection style", error);
        }
      },
      setStylesForNextShapes: (style, value) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        try {
          instance.setStyleForNextShapes(style, value);
        } catch (error) {
          console.error("[TLDraw] Failed to set next shape style", error);
        }
      },
      serializeScene: () => {
        if (!isReady) return null;
        const instance = ensureEditor();
        if (!instance) return null;
        try {
          const snapshot = instance.getSnapshot();
          logDebug("Serialize scene");
          return snapshot;
        } catch (error) {
          console.error("[TLDraw] Failed to serialize snapshot", error);
          return null;
        }
      },
      loadScene: (snapshot) => {
        if (!isReady) return;
        const instance = ensureEditor();
        if (!instance) return;
        try {
          instance.loadSnapshot(snapshot);
          syncSharedStyles(instance);
          setSelectionCount(instance.getSelectedShapeIds().length);
          logDebug("Load snapshot");
        } catch (error) {
          console.error("[TLDraw] Failed to load snapshot", error);
        }
      },
    };
  }, [ready, isReady, selectionCount, currentTool, sharedStyles, zoom, camera, registerEditor, applyStyle, syncSharedStyles]);

  return <TLDrawContext.Provider value={api}>{children}</TLDrawContext.Provider>;
}

export function useTLDraw(): TLDrawApi {
  return useContext(TLDrawContext);
}

export type { TLDrawToolName };

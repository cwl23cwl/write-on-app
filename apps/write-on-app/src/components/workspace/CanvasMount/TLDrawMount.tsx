"use client";

import { useCallback, useEffect, useMemo, useRef, type JSX, type ReactNode, type CSSProperties } from "react";
import { TldrawEditor, type Editor } from "@tldraw/editor";
import {
  defaultBindingUtils,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
} from "@tldraw/tldraw";
import { useTLDraw } from "@/components/workspace/tldraw/TLDrawProvider";
import { useViewportStore } from "@/state";

type Props = {
  readonly?: boolean;
  children?: ReactNode;
};

const CANVAS_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  borderRadius: "inherit",
  overflow: "hidden",
  touchAction: "none",
  transform: "none",
  transformOrigin: "top left",
  zoom: 1,
  willChange: "auto",
};

const applyReadonly = (editor: Editor | null, readonly: boolean): void => {
  if (!editor) return;
  try {
    editor.updateInstanceState({ isReadonly: readonly });
  } catch (error) {
    console.error("[TLDrawMount] Failed to toggle readonly state", error);
  }
};

export function TLDrawMount({ readonly = false, children }: Props): JSX.Element {
  const editorRef = useRef<Editor | null>(null);
  const tl = useTLDraw();
  const { registerEditor, setCamera, camera, ready } = tl;
  const tools = useMemo(() => [...defaultTools, ...defaultShapeTools], []);
  const shapeUtils = useMemo(() => [...defaultShapeUtils], []);
  const bindingUtils = useMemo(() => [...defaultBindingUtils], []);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      registerEditor(editor);
      applyReadonly(editor, readonly);
      return () => {
        registerEditor(null);
        editorRef.current = null;
      };
    },
    [readonly, registerEditor],
  );

  useEffect(() => {
    applyReadonly(editorRef.current, readonly);
  }, [readonly]);
  const scale = useViewportStore((s) => s.viewport.scale ?? 1);
  const scrollX = useViewportStore((s) => s.viewport.scrollX ?? 0);
  const scrollY = useViewportStore((s) => s.viewport.scrollY ?? 0);

  useEffect(() => {
    if (!ready) return;
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const targetX = Number.isFinite(scrollX) ? -scrollX : 0;
    const targetY = Number.isFinite(scrollY) ? -scrollY : 0;
    const epsilon = 1e-4;
    if (
      Math.abs(camera.x - targetX) <= epsilon &&
      Math.abs(camera.y - targetY) <= epsilon &&
      Math.abs(camera.z - safeScale) <= epsilon
    ) {
      return;
    }
    setCamera({ x: targetX, y: targetY, z: safeScale }, { immediate: true });
  }, [ready, scale, scrollX, scrollY, setCamera, camera]);

  return (
    <div data-engine="tldraw" data-role="canvas-surface" style={CANVAS_STYLE}>
      <TldrawEditor
        onMount={handleMount}
        className="tl-headless-editor"
        tools={tools}
        shapeUtils={shapeUtils}
        bindingUtils={bindingUtils}
        autoFocus={false}
      />
      {children}
    </div>
  );
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Tldraw } from "@tldraw/tldraw"
import "@tldraw/tldraw/tldraw.css"
import type { Editor } from "@tldraw/editor"
import { setApp } from "../../shared/hooks/useTLApp"
import { PageContainer, PageHitMask } from "./PageContainer"
import { useCameraCentering } from "./hooks/useCameraCentering"
import { useViewportZoom } from "./hooks/useViewportZoom"

const STROKE_TOOL_IDS = new Set(["draw", "highlight"])

export function CanvasShell() {
  const editorRef = useRef<Editor | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const isTrackingStroke = useRef(false)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)

  const handleMount = useCallback(
    (app: Editor) => {
      editorRef.current = app
      setEditorInstance(app)
      setApp(app)
      if (process.env.NODE_ENV !== "production") {
        console.log("[CanvasShell] TL app mounted:", app)
      }
    },
    [],
  )

  useEffect(() => {
    const isInsidePage = (event: PointerEvent) => {
      const pageEl = pageRef.current
      if (!pageEl) return false
      const rect = pageEl.getBoundingClientRect()
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
    }

    const handlePointerDown = (event: PointerEvent) => {
      const editor = editorRef.current
      if (!editor) {
        isTrackingStroke.current = false
        return
      }

      if (!isInsidePage(event)) {
        isTrackingStroke.current = false
        return
      }

      const activeToolId = typeof editor.getCurrentToolId === "function" ? editor.getCurrentToolId() : undefined
      isTrackingStroke.current = activeToolId ? STROKE_TOOL_IDS.has(activeToolId) : false
    }

    const handlePointerUp = () => {
      isTrackingStroke.current = false
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!isTrackingStroke.current) return
      if (isInsidePage(event)) return

      isTrackingStroke.current = false
      const editor = editorRef.current
      if (editor) {
        editor.complete()
      }
      event.stopImmediatePropagation()
      event.preventDefault()
    }

    window.addEventListener("pointerdown", handlePointerDown, true)
    window.addEventListener("pointerup", handlePointerUp, true)
    window.addEventListener("pointercancel", handlePointerUp, true)
    window.addEventListener("pointermove", handlePointerMove, true)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true)
      window.removeEventListener("pointerup", handlePointerUp, true)
      window.removeEventListener("pointercancel", handlePointerUp, true)
      window.removeEventListener("pointermove", handlePointerMove, true)
    }
  }, [])

  useEffect(() => {
    return () => {
      editorRef.current = null
      setEditorInstance(null)
      setApp(null)
    }
  }, [])

  useCameraCentering(editorInstance)
  useViewportZoom(viewportRef)

  return (
    <div className="canvas-root">
      <div className="woe-viewport" ref={viewportRef}>
        <div className="woe-scaler">
          <PageContainer ref={pageRef} />
          <Tldraw hideUi onMount={handleMount} />
        </div>
      </div>
      <PageHitMask />
    </div>
  )
}

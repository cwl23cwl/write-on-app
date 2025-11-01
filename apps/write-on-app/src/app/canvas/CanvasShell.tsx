"use client"

import { useCallback, useEffect, useRef } from "react"
import { Tldraw } from "@tldraw/tldraw"
import "@tldraw/tldraw/tldraw.css"
import type { Editor } from "@tldraw/editor"
import { setApp } from "../../shared/hooks/useTLApp"
import { PageContainer, PageHitMask, PAGE_HEIGHT, PAGE_WIDTH } from "./PageContainer"

const PAGE_VIEWPORT_PADDING = 96 // total inset (48px per side)
const STROKE_TOOL_IDS = new Set(["draw", "highlight"])
const PAGE_BOUNDS = {
  x: -PAGE_WIDTH / 2,
  y: -PAGE_HEIGHT / 2,
  w: PAGE_WIDTH,
  h: PAGE_HEIGHT,
}

export function CanvasShell() {
  const editorRef = useRef<Editor | null>(null)
  const centerRaf = useRef<number | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)
  const isTrackingStroke = useRef(false)

  const centerOnPage = useCallback((editor: Editor) => {
    if (centerRaf.current) {
      cancelAnimationFrame(centerRaf.current)
    }
    centerRaf.current = requestAnimationFrame(() => {
      centerRaf.current = null
      editor.zoomToBounds(PAGE_BOUNDS, {
        inset: PAGE_VIEWPORT_PADDING,
        immediate: true,
      })
    })
  }, [])

  const handleMount = useCallback(
    (app: Editor) => {
      editorRef.current = app
      setApp(app)
      centerOnPage(app)
      if (process.env.NODE_ENV !== "production") {
        console.log("[CanvasShell] TL app mounted:", app)
      }
    },
    [centerOnPage],
  )

  useEffect(() => {
    const handleResize = () => {
      const editor = editorRef.current
      if (!editor) return
      centerOnPage(editor)
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [centerOnPage])

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
      if (centerRaf.current) {
        cancelAnimationFrame(centerRaf.current)
      }
      editorRef.current = null
      setApp(null)
    }
  }, [])

  return (
    <div className="canvas-root">
      <Tldraw hideUi onMount={handleMount} />
      <PageContainer ref={pageRef} />
      <PageHitMask />
    </div>
  )
}

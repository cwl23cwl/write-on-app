"use client"

import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import type { Editor } from "@tldraw/editor"
import { setAutoCenterResumeHandler } from "../autoCenterControl"

type PageBounds = { x: number; y: number; w: number; h: number }

type CameraTarget = { x: number; y: number; z: number }

function clampZoom(value: number) {
  const minZoom = 0.0001
  return Number.isFinite(value) ? Math.max(value, minZoom) : minZoom
}

export function useCameraCentering(editor: Editor | null, page: PageBounds, pad = 24) {
  const appliedOnceRef = useRef(false)
  const lockedXRef = useRef<number | null>(null)
  const lockedYRef = useRef<number | null>(null)
  const isInteractingRef = useRef(false)
  const suspendAutoCenterRef = useRef(false)
  const lastAppliedFromHookRef = useRef(false)
  const spacePanActiveRef = useRef(false)

  const computeFit = useCallback(
    (viewportW: number, viewportH: number) => {
      const paddedW = Math.max(viewportW - pad * 2, 1)
      const paddedH = Math.max(viewportH - pad * 2, 1)
      const fitW = paddedW / page.w
      const fitH = paddedH / page.h
      const z = clampZoom(Math.min(fitW, fitH))
      const pageCx = page.x + page.w / 2
      const pageCy = page.y + page.h / 2
      const camX = pageCx - viewportW / (2 * z)
      const camY = pageCy - viewportH / (2 * z)
      return { z, camX, camY, fitW, fitH }
    },
    [page.x, page.y, page.w, page.h, pad],
  )

  const getViewportPx = useCallback(() => {
    const bounds = editor?.getViewportScreenBounds?.()
    const viewportW = bounds?.width ?? bounds?.w ?? window.innerWidth
    const viewportH = bounds?.height ?? bounds?.h ?? window.innerHeight
    return { viewportW, viewportH }
  }, [editor])

  const suspendAutoCenter = useCallback(
    (reason: string) => {
      if (suspendAutoCenterRef.current) return
      suspendAutoCenterRef.current = true
      if (process.env.NODE_ENV !== "production") {
        console.log("[center-pause]", { reason })
      }
    },
    [],
  )

  const applyCamera = useCallback(
    (target: CameraTarget, logTag: string, { force = false, animate = true }: { force?: boolean; animate?: boolean } = {}) => {
      if (!editor) return false
      if (!force && suspendAutoCenterRef.current) return false

      lastAppliedFromHookRef.current = true

      const animationOpts = animate
        ? {
            animation: {
              duration: 200,
              easing: (t: number) => t * (2 - t),
            },
          }
        : undefined

      // Try animateCamera if available, otherwise fall back to setCamera with animation options.
      const animateCamera = (editor as unknown as { animateCamera?: (camera: CameraTarget, opts?: { duration?: number; easing?: (t: number) => number }) => boolean }).animateCamera
      const didAnimate = animate && typeof animateCamera === "function" ? Boolean(animateCamera(target, { duration: 200, easing: (t) => t * (2 - t) })) : false

      if (!didAnimate) {
        editor.setCamera(target, {
          force: true,
          ...(animationOpts ?? {}),
        })
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(logTag, target)
      }

      requestAnimationFrame(() => {
        lastAppliedFromHookRef.current = false
      })

      return true
    },
    [editor],
  )

  const recenter = useCallback(
    (logTag: string, { force = false, animate = true }: { force?: boolean; animate?: boolean } = {}) => {
      const { viewportW, viewportH } = getViewportPx()
      const { z, camX, camY } = computeFit(viewportW, viewportH)

      if (lockedXRef.current === null || lockedYRef.current === null) {
        lockedXRef.current = camX
        lockedYRef.current = camY
        if (process.env.NODE_ENV !== "production") {
          console.log("[camera-lock]", { lockedX: camX, lockedY: camY })
        }
      }

      const x = lockedXRef.current ?? camX
      const y = lockedYRef.current ?? camY

      return applyCamera({ x, y, z }, logTag, { force, animate })
    },
    [applyCamera, computeFit, getViewportPx],
  )

  useLayoutEffect(() => {
    if (!editor || appliedOnceRef.current) return

    const rafId = requestAnimationFrame(() => {
      if (!editor || appliedOnceRef.current) return
      const applied = recenter("[center-apply]", { force: true, animate: false })
      if (applied) {
        appliedOnceRef.current = true
      }
    })

    return () => cancelAnimationFrame(rafId)
  }, [editor, recenter])

  useEffect(() => {
    if (!editor) return

    let frameId: number | null = null
    let timeoutId: number | null = null

    const handleResize = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        if (frameId) {
          cancelAnimationFrame(frameId)
        }

        frameId = requestAnimationFrame(() => {
          frameId = null
          if (isInteractingRef.current) return
          if (suspendAutoCenterRef.current) return
          recenter("[center-resize-anim]", { animate: true })
        })
      }, 120)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (timeoutId) window.clearTimeout(timeoutId)
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [editor, recenter])

  useEffect(() => {
    if (!editor) return

    const container = editor.getContainer?.()
    if (!container) return

    const preventPan = (event: WheelEvent) => {
      if (event.ctrlKey) return
      suspendAutoCenter("wheel:container")
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!spacePanActiveRef.current) return
      suspendAutoCenter("space-pan")
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!spacePanActiveRef.current) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const markSuspend = () => {
      suspendAutoCenter("pointer:container")
    }

    container.addEventListener("wheel", preventPan, { passive: false })
    container.addEventListener("wheel", markSuspend, { passive: true })
    container.addEventListener("pointerdown", markSuspend, { passive: true })
    container.addEventListener("pointerdown", handlePointerDown, { passive: false })
    container.addEventListener("pointermove", handlePointerMove, { passive: false })

    return () => {
      container.removeEventListener("wheel", preventPan)
      container.removeEventListener("wheel", markSuspend)
      container.removeEventListener("pointerdown", markSuspend)
      container.removeEventListener("pointerdown", handlePointerDown)
      container.removeEventListener("pointermove", handlePointerMove)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const handlePointerDown = () => {
      isInteractingRef.current = true
    }

    const handlePointerUp = () => {
      isInteractingRef.current = false
      spacePanActiveRef.current = false
    }

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        suspendAutoCenter("wheel")
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spacePanActiveRef.current = true
        event.preventDefault()
      }
      if (["Space", "Spacebar", "+", "=", "-", "_"].includes(event.key)) {
        suspendAutoCenter(`key:${event.key}`)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spacePanActiveRef.current = false
      }
    }

    const offCameraEvent =
      typeof editor.on === "function"
        ? editor.on("camera", () => {
            if (lastAppliedFromHookRef.current) return
            suspendAutoCenter("camera")
          })
        : undefined

    window.addEventListener("pointerdown", handlePointerDown, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    window.addEventListener("pointercancel", handlePointerUp, { passive: true })
    window.addEventListener("blur", handlePointerUp)
    window.addEventListener("wheel", handleWheel, { passive: true })
    window.addEventListener("keydown", handleKeyDown, { passive: false })
    window.addEventListener("keyup", handleKeyUp, { passive: true })

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
      window.removeEventListener("blur", handlePointerUp)
      window.removeEventListener("wheel", handleWheel)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      if (typeof offCameraEvent === "function") {
        offCameraEvent()
      }
    }
  }, [editor, suspendAutoCenter])

  useEffect(() => {
    if (!editor) {
      setAutoCenterResumeHandler(null)
      return
    }

    const resume = () => {
      suspendAutoCenterRef.current = false
      recenter("[center-resume]", { force: true, animate: true })
    }

    setAutoCenterResumeHandler(resume)

    return () => {
      setAutoCenterResumeHandler(null)
    }
  }, [editor, recenter])
}

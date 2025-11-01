"use client"

import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import type { Editor } from "@tldraw/editor"
import { setAutoCenterResumeHandler } from "../autoCenterControl"

const DEFAULT_CAMERA = { x: 0, y: 0, z: 1 }
const EPSILON = 1e-5

interface Options {
  force?: boolean
  animate?: boolean
  tag?: string
}

function camerasDiffer(camera: { x: number; y: number; z: number }, target: typeof DEFAULT_CAMERA) {
  return (
    Math.abs(camera.x - target.x) > EPSILON ||
    Math.abs(camera.y - target.y) > EPSILON ||
    Math.abs(camera.z - target.z) > EPSILON
  )
}

export function useCameraCentering(editor: Editor | null) {
  const appliedOnceRef = useRef(false)
  const lastAppliedByHookRef = useRef(false)
  const suspendAutoCenterRef = useRef(false)
  const spaceKeyActiveRef = useRef(false)

  const applyCamera = useCallback(
    ({ force = false, animate = false, tag = "[camera-apply]" }: Options = {}) => {
      if (!editor) return false
      if (!force && suspendAutoCenterRef.current) return false

      lastAppliedByHookRef.current = true

      const animation = animate
        ? {
            animation: {
              duration: 200,
              easing: (t: number) => t * (2 - t),
            },
          }
        : undefined

      editor.setCamera(DEFAULT_CAMERA, {
        force: true,
        ...(animation ?? {}),
      })

      if (process.env.NODE_ENV !== "production") {
        console.log(tag, DEFAULT_CAMERA)
      }

      requestAnimationFrame(() => {
        lastAppliedByHookRef.current = false
      })

      return true
    },
    [editor],
  )

  // Apply once on mount.
  useLayoutEffect(() => {
    if (!editor || appliedOnceRef.current) return
    const id = requestAnimationFrame(() => {
      if (applyCamera({ force: true, animate: false, tag: "[center-apply]" })) {
        appliedOnceRef.current = true
        if (process.env.NODE_ENV !== "production") {
          console.log("[camera-lock]", DEFAULT_CAMERA)
        }
      }
    })
    return () => cancelAnimationFrame(id)
  }, [editor, applyCamera])

  // Keep TL camera locked; reset immediately if TL changes it.
  useEffect(() => {
    if (!editor) return

    const handleCameraChange = () => {
      if (lastAppliedByHookRef.current) return
      const camera = editor.getCamera()
      if (camerasDiffer(camera, DEFAULT_CAMERA)) {
        applyCamera({ force: true, animate: false, tag: "[camera-reset]" })
      }
    }

    const off = typeof editor.on === "function" ? editor.on("camera", handleCameraChange) : undefined
    return () => {
      if (typeof off === "function") {
        off()
      }
    }
  }, [editor, applyCamera])

  // Re-apply on resize when not suspended.
  useEffect(() => {
    if (!editor) return

    let timer: number | null = null
    let frame: number | null = null

    const handleResize = () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (frame) cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
          frame = null
          applyCamera({ animate: true, tag: "[center-resize-anim]" })
        })
      }, 120)
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      if (timer) window.clearTimeout(timer)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [editor, applyCamera])

  // Prevent native zoom / pan gestures reaching TLDraw.
  useEffect(() => {
    if (!editor) return
    const container = editor.getContainer?.()
    if (!container) return

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      suspendAutoCenterRef.current = true
      event.stopImmediatePropagation()
      event.preventDefault()
      if (process.env.NODE_ENV !== "production") {
        console.log("[center-pause]", { reason: "wheel" })
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        suspendAutoCenterRef.current = true
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })

    return () => {
      container.removeEventListener("wheel", handleWheel)
      container.removeEventListener("touchmove", handleTouchMove)
    }
  }, [editor])

  // Global keyboard / wheel listeners to block camera changes and mark suspension.
  useEffect(() => {
    if (!editor) return

    const handlePointerDown = () => {
      suspendAutoCenterRef.current = true
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault()
        suspendAutoCenterRef.current = true
        if (process.env.NODE_ENV !== "production") {
          console.log("[center-pause]", { reason: "ctrl-wheel" })
        }
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spaceKeyActiveRef.current = true
        event.preventDefault()
      }
      if (["Space", "Spacebar", "+", "=", "-", "_"].includes(event.key)) {
        suspendAutoCenterRef.current = true
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spaceKeyActiveRef.current = false
      }
    }

    window.addEventListener("pointerdown", handlePointerDown, { passive: true })
    window.addEventListener("wheel", handleWheel, { passive: false })
    window.addEventListener("keydown", handleKeyDown, { passive: false })
    window.addEventListener("keyup", handleKeyUp, { passive: true })

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("wheel", handleWheel)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [editor])

  // Expose a resume handler for the toolbar.
  useEffect(() => {
    if (!editor) {
      setAutoCenterResumeHandler(null)
      return
    }

    const resume = () => {
      suspendAutoCenterRef.current = false
      applyCamera({ force: true, animate: true, tag: "[center-resume]" })
    }

    setAutoCenterResumeHandler(resume)
    return () => setAutoCenterResumeHandler(null)
  }, [editor, applyCamera])
}

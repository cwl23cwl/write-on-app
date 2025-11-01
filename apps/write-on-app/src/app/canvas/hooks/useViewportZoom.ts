import { RefObject, useEffect, useRef, useState } from "react"

const SCALE_MIN = 0.25
const SCALE_MAX = 6
const WHEEL_SENSITIVITY = 0.0015

export interface ViewportZoomState {
  scale: number
  offsetX: number
  offsetY: number
}

export function useViewportZoom(containerRef: RefObject<HTMLElement>) {
  const [state, setState] = useState<ViewportZoomState>({ scale: 1, offsetX: 0, offsetY: 0 })
  const stateRef = useRef(state)

  const updateCSSVars = (next: ViewportZoomState) => {
    const el = containerRef.current
    if (!el) return
    el.style.setProperty("--woe-scale", `${next.scale}`)
    el.style.setProperty("--woe-offset-x", `${next.offsetX}px`)
    el.style.setProperty("--woe-offset-y", `${next.offsetY}px`)
  }

  const setZoomState = (next: ViewportZoomState) => {
    stateRef.current = next
    setState(next)
    updateCSSVars(next)
  }

  useEffect(() => {
    updateCSSVars(stateRef.current)

    const el = containerRef.current
    if (!el) return

    const handleWheel = (event: WheelEvent) => {
      const isCtrlZoom = event.ctrlKey || event.metaKey
      if (!isCtrlZoom) return

      const rect = el.getBoundingClientRect()
      const withinX = event.clientX >= rect.left && event.clientX <= rect.right
      const withinY = event.clientY >= rect.top && event.clientY <= rect.bottom
      if (!withinX || !withinY) return

      event.preventDefault()
      event.stopImmediatePropagation()

      const px = event.clientX - rect.left
      const py = event.clientY - rect.top

      const { scale, offsetX, offsetY } = stateRef.current

      const focusX = (px - offsetX) / scale
      const focusY = (py - offsetY) / scale

      const nextScale = Math.min(
        SCALE_MAX,
        Math.max(SCALE_MIN, scale * Math.exp(-WHEEL_SENSITIVITY * event.deltaY)),
      )

      const nextOffsetX = px - nextScale * focusX
      const nextOffsetY = py - nextScale * focusY

      const nextState: ViewportZoomState = {
        scale: nextScale,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      }

      setZoomState(nextState)

      if (process.env.NODE_ENV !== "production") {
        console.log("[viewport-zoom]", nextState)
      }
    }

    el.addEventListener("wheel", handleWheel, { capture: true, passive: false })

    return () => {
      el.removeEventListener("wheel", handleWheel, true)
    }
  }, [containerRef])

  return {
    state,
    setZoomState,
  }
}

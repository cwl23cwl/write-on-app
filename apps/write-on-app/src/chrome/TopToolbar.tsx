"use client"

import { getApp } from "../shared/hooks/useTLApp"
import { triggerAutoCenterResume } from "../app/canvas/autoCenterControl"

const groupStyle = {
  backgroundColor: "var(--chrome-surface-muted)",
  borderRadius: "var(--group-radius)",
  padding: "4px",
}

export function TopToolbar() {
  const handleInspectApp = () => {
    const app = getApp()
    if (process.env.NODE_ENV !== "production") {
      console.log("[TopToolbar] Current TL app:", app)
    }
  }

  const handleSetTool = (toolId: "draw" | "text") => {
    const editor = getApp()
    if (!editor) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[TopToolbar] TL app not ready")
      }
      return
    }
    editor.setCurrentTool(toolId)
    if (process.env.NODE_ENV !== "production") {
      console.log("[TopToolbar] Active tool:", editor.getCurrentToolId())
    }
  }

  const handleRecenter = () => {
    triggerAutoCenterResume()
  }

  return (
    <nav className="chrome-toolbar" aria-label="Canvas toolbar">
      <div className="flex items-center gap-2">
        <button className="tool-btn" type="button">
          Undo
        </button>
        <button className="tool-btn" type="button">
          Redo
        </button>
      </div>

      <div className="flex items-center justify-center gap-2" style={groupStyle}>
        <button className="tool-btn" type="button">
          Select
        </button>
        <button className="tool-btn" type="button" onClick={() => handleSetTool("draw")}>
          Draw
        </button>
        <button className="tool-btn" type="button" onClick={() => handleSetTool("text")}>
          Text
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button className="tool-btn" type="button" onClick={handleInspectApp}>
          Save
        </button>
        <button className="tool-btn" type="button">
          Share
        </button>
        <button className="tool-btn" type="button" onClick={handleRecenter}>
          Recenter
        </button>
      </div>
    </nav>
  )
}

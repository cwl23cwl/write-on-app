"use client"

import { useEffect, useState } from "react"
import type { Editor } from "@tldraw/editor"

let appRef: Editor | null = null

export function setApp(app: Editor | null) {
  appRef = app
}

export function getApp() {
  return appRef
}

export function useTLApp() {
  const [app, setAppState] = useState<Editor | null>(() => appRef)

  useEffect(() => {
    setAppState(appRef)
  }, [])

  return app
}

import type { ReactNode } from "react"
import { AppHeader } from "../../chrome/AppHeader"
import { TopToolbar } from "../../chrome/TopToolbar"

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div className="chrome-root">
        <AppHeader />
        <TopToolbar />
      </div>
    </>
  )
}

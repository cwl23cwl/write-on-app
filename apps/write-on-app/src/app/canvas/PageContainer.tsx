import { forwardRef } from "react"

export const PAGE_WIDTH = 1200
export const PAGE_HEIGHT = 2200

export const PageContainer = forwardRef<HTMLDivElement>(function PageContainerComponent(_props, ref) {
  return <div ref={ref} className="page-container" aria-hidden="true" />
})

export function PageHitMask() {
  return (
    <>
      <div className="page-hitmask-block page-hitmask-block--top" aria-hidden="true" />
      <div className="page-hitmask-block page-hitmask-block--bottom" aria-hidden="true" />
      <div className="page-hitmask-block page-hitmask-block--left" aria-hidden="true" />
      <div className="page-hitmask-block page-hitmask-block--right" aria-hidden="true" />
    </>
  )
}

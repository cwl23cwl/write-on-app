"use client";

import type { JSX, ReactNode } from "react";

const PAGE_WIDTH_PX = 1200;
const PAGE_HEIGHT_PX = 2200;

type Props = {
  children?: ReactNode;
};

// Logical page surface that Excalidraw renders into.
// Exposes a stable 1200x2200 CSS box with a subtle drop shadow.
export function Page({ children }: Props = {}): JSX.Element {
  return (
    <div
      className="canvas-page"
      role="presentation"
      style={{ width: `${PAGE_WIDTH_PX}px`, height: `${PAGE_HEIGHT_PX}px` }}
    >
      <div className="page-surface" aria-hidden />
      {children}
    </div>
  );
}
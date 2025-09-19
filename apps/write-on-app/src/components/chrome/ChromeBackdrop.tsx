"use client";

import type { JSX } from "react";

// Sticky backdrop that spans the full chrome height (header + toolbars + indicator)
// and sits behind all chrome; non-interactive.
export function ChromeBackdrop(): JSX.Element {
  return (
    <div
      className="chrome-backdrop sticky w-full pointer-events-none"
      style={{
        top: 0,
        left: 0,
        right: 0,
        // Firefox: ensure flex-basis reserves space equal to stack height
        flex: '0 0 var(--h-stack, 160px)',
        // Use shared stack height with a safe fallback
        height: 'var(--h-stack, 160px)',
        lineHeight: 0,
        backgroundColor: 'var(--chrome-bg, #fff)',
        zIndex: 2800,
        borderBottom: '1px solid var(--border-subtle, #e5e7eb)',
      }}
      aria-hidden
    />
  );
}

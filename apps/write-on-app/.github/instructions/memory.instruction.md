---
applyTo: '**'
---

# User Memory

## User Preferences
- Programming languages: 
- Code style preferences: 
- Development environment: 
- Communication style: concise, goal-oriented

## Project Context
- Current project type: Web app with canvas workspace
- Tech stack: Next.js (App Router), TypeScript, Zustand, Turborepo, pnpm; vendor Excalidraw fork
- Architecture patterns: Monorepo with app at `apps/write-on-app`, vendor packages under `vendor/`
- Key requirements: Clean canvas architecture with sticky chrome, page-only scroll, section-only zoom, crisp rendering, predictable lifecycle and state

## Coding Patterns
- Preferred patterns and practices: Single source of truth for viewport; adapter for canvas engine; strict z-index discipline; no transforms on sticky chrome ancestors
- Code organization preferences: Workspace components under `src/components/workspace`, state under `src/state`
- Testing approaches: Unit tests for viewport math and lifecycle; visual checks for zoom/scroll behavior
- Documentation style: Phase-based architecture docs in `docs/CANVAS ARCHITECTURE.md`

## Context7 Research History
- Libraries researched on Context7: 
- Best practices discovered: 
- Implementation patterns used: 
- Version-specific findings: 

## Conversation History
- Important decisions made: Initialize memory file for Phase 3 preparation; Implemented Phase 3 Step 1 (Viewport foundation) by augmenting Zustand store without behavior changes
- Recurring questions or topics: Canvas workspace architecture and autonomous agent protocols
- Solutions that worked well: N/A
- Things to avoid or that didn't work: Avoid overlays blocking canvas input; avoid transforms on sticky chrome ancestors

## Notes
- Phase 3 Step 1 implemented:
  - Added `fitMode`, `viewportSize`, `pageSize`, and `step` to viewport store (kept existing min/max scale values).
  - Added actions: `setViewportSize`, `setPageSize`, `setFitMode`, `fitWidth` (non-disruptive unless used).
  - Added selectors: `getScaledPageW`, `getScaledPageH`, `getZoomPercent`.
  - Kept `.workspace-scaler` reading scale via CSS var, no new wheel/gesture changes.
  - Default page size 1200x2200 is present via CSS tokens and store initialization.
  - Part 2: Wired scaler transform to store via CSS var with GPU hint: `translate3d(0,0,0) scale(var(--workspace-zoom, var(--page-scale, 1)))`; set `transform-origin: 0 0` and `will-change: transform`.
  - Part 3-6:
    - Set `--page-scale` CSS variable from store alongside `--workspace-zoom`.
    - Call `setPageSize(1200, 2200)` once in `WorkspaceRoot` mount.
    - Measure clientWidth/clientHeight in `WorkspaceViewport` and call `setViewportSize(w, h)` on mount and resize.
    - Excalidraw guardrails remain active (internal zoom/pan disabled via props and adapters) without adding new user-facing behavior.
    - Static centering remains via `#workspace-viewport { display:flex; justify-content:center; }`.
  - Step 2.1 (Initial Fit Width):
    - In `WorkspaceViewport`, compute `fitScale = (viewportW - (paddingLeft + paddingRight)) / pageW` and clamp; call `setViewportSize`, `setScale(fitScale)`, and `setFitMode('fit-width')` on mount.
    - Add `ResizeObserver` and window `resize` DPR watcher to recompute fit scale only when `fitMode==='fit-width'`.
  - Step 2.2 (Safe wheel/gesture zoom):
    - Added `wheel` handler on `WorkspaceViewport` with `{ passive:false, capture:true }`; prevents default only when `Ctrl/Cmd` pressed; otherwise lets page scroll.
    - Added Safari `gesture*` fallback (start/change/end) updating scale; prevents default only for gesture events.
    - Disabled ExcalidrawAdapter’s wheel/gesture/keyboard interception to avoid double-handling; kept internal zoom frozen via props/API.
    - Any user-initiated zoom exits `fit-width` to `free`; fit-mode sync uses internal `setScaleFromFit`.
    - Implemented pointer-centered zoom: compute world point under pointer and adjust scroll so the point remains anchored across scale changes; optional `pointermove` caches last clientX/Y for Safari anchor.
  - Step 2.3 (Normalize + Anchor details):
    - Wheel normalization: discrete notches (~|Δ|>=80px) map to ~10% per notch via `(1+0.10)^(±n)`; small deltas use smooth `exp(-dy*k)` mapping.
    - Direction: negative delta zooms in, positive zooms out; clamped to `[minScale, maxScale]`.
    - Fit-mode threshold: when `fitMode==='fit-width'`, flip to `free` only if new scale deviates from live fit width by >0.5%.
    - Anchor conversion: compute world point from `clientX/Y` against `#workspace-scale-layer` using current `scale` and `scrollX/Y`, then adjust scroll post-scale.
  - Steps I–K (finalized):
    - Safari: gesturestart records baseline scale and frozen anchor (last pointer or viewport center); gesturechange prevents default, computes `baseline*gesture.scale`, anchors and coalesces scale+scroll via RAF; gestureend cleans temp state.
    - Excalidraw: internal zoom/pan disabled via props/API; added capturing wheel on host that stops propagation only for zoom-intent (no preventDefault) to ensure viewport owns zoom; normal scrolling flows.
    - Accessibility/keyboard: added document-level Ctrl/Cmd +/−/0 in `useKeyboardZoom`, anchored at viewport center with the same math; added `ZoomLiveRegion` (aria-live polite) announcing zoom percent.
  - Step L (Performance):
    - Coalesced back-to-back wheel/gesture updates into a single RAF using a pending state; applies latest scale+anchor once per frame.
    - Ensured `#workspace-scale-layer` has `transform-origin: 0 0` and `will-change: transform`.
    - Debounced ResizeObserver callbacks (viewport and container) to the next animation frame.
  - Step M (Cleanup & Guards):
    - Removed all listeners on unmount; cancel any pending RAF.
    - All scroll reads/writes target `#workspace-viewport` (scroll container), not window.
    - Added epsilon guard (~0.05% relative) to avoid store thrash on tiny deltas.
  - Step N (Cross-browser checks):
    - Chrome/Edge: Ctrl/Cmd+wheel zooms; plain wheel scrolls; pinch behaves like wheel+ctrl.
    - Firefox: no passive-listener warnings; plain wheel scroll intact.
    - Safari: gesture path active; pinch anchored and smooth; plain wheel scrolls; no page zoom.
    - All: sticky chrome never scales; Ctrl/Cmd+0 restores Fit width; focal point remains anchored at edges.

- Viewport padding & virtual size (latest):
  - Set `--page-padding-x:150px`, `--page-padding-top:200px`, `--page-padding-bottom:150px` on WorkspaceViewport.
  - `.workspace-scaler` sizes include paddings; `.page-wrapper` positioned at `(paddingX, paddingTop)`.
  - Store now tracks `viewport.virtualSize = { w: 1500, h: 2550 }` (from 1200×2200 + paddings).
  - Acceptance: borders are clean and balanced; toolbars remain fixed; proportional zoom preserved.

- Open issue to revisit: Chrome Ctrl/Cmd + wheel zoom reliability under control strip. Window/document capture + viewport capture with geometry gating and preventDefault are in place; needs on-device verification in your environment. Next pass: instrument event flow and temporarily isolate other handlers if needed.

- 2025-09-09: Phase 3 Ctrl+Wheel Zoom Fix
  - Symptom: Ctrl/Cmd + wheel did not trigger zoom within the viewport.
  - Root cause hypothesis: Some environments fail to reflect modifier state on WheelEvent reliably, causing ctrl/meta detection to miss; very small deltas were also filtered by epsilon.
  - Fix implemented:
    - Added global key state tracking for 'Control'/'Meta' to detect zoom intent even when WheelEvent.ctrlKey/metaKey are unreliable.
    - Used this fallback in both window/document capture and element listeners.
    - Lowered relative-change epsilon from 0.0005 to 0.0001 to accept small trackpad deltas.
    - Kept listeners as `{ passive:false, capture:true }` to preempt browser page zoom; geometry gating remains based on viewport rect.
  - Files changed: `src/components/workspace/hooks/useViewportEvents.ts`.
  - Testing: Added a JSDOM test harness for ctrl+wheel and marked it skipped due to JSDOM WheelEvent limitations; all existing tests remain green.
- 2025-09-11: Current task — resolve `next/font error: Unknown font 'Geist'` by installing `geist` package and updating `apps/write-on-app/src/app/layout.tsx` to import from `geist/font`, wiring font variables into `<body>`.
  - Progress: `pnpm add geist` installed package (warnings: unmet peer `sass@^1.70.0` from `vite@7.1.4`, existing `node_modules`)
  - Updated `src/app/layout.tsx` to import fonts from `geist/font`, initializing sans/mono with latin subset and wiring `geistSans.variable` / `geistMono.variable` onto `<body>`.
  - Ran `pnpm lint`; eslint completed with exit code 0.

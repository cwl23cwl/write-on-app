# Canvas Workspace Architecture

This document describes the overall architecture for building the canvas workspace from the ground up.  
It is divided into **phases**, beginning with Phase 0 (non-negotiable goals) and extending through implementation, testing, and packaging.

---

## Phase 0 — Goals & Non-negotiables

- **Page-only scroll**: Scrolling works anywhere on the page, including when the mouse is over the canvas.  
- **Section-only zoom**: Ctrl/Cmd + wheel scales the workspace section (not toolbars), keeping UI at 1:1.  
- **Crisp ink**: Recalculate canvas resolution after zoom/resize so strokes never blur.  
- **No overlays blocking input**: Nothing sits over the canvas that can steal pointer/scroll events.  
- **Toolbars always visible**: Header, TopToolbar, OptionsToolbar, PageIndicator are sticky and never scale.  
- **Solid state model**: One source of truth for viewport scale, canvas size, and tool state.  
- **Predictable errors**: Guard rails and health checks (mount order, refs, size observers).  

---

## Phase 1 — Project Skeleton & Conventions

- Set up **Next.js (App Router)** with **TypeScript**.  
- Add **Zustand** (or Redux Toolkit) for state management.  
- Strict **ESLint/Prettier** configuration.  
- Establish naming & ownership rules:
  - **Viewport store** is the only source of truth for zoom/size.
  - **Canvas adapter** owns refs and engine lifecycle.
  - **No transforms on sticky chrome ancestors.**

**Monorepo folder structure (recommended):**
write-on-app/
├─ apps/
│ └─ write-on-app/
│ ├─ src/
│ │ ├─ app/ # Next.js app router
│ │ │ ├─ layout.tsx
│ │ │ └─ page.tsx
│ │ ├─ components/
│ │ │ ├─ chrome/ # Header, TopToolbar, OptionsToolbar, PageIndicator
│ │ │ └─ workspace/ # WorkspaceRoot, Viewport, Scaler, CanvasMount, hooks
│ │ ├─ state/ # useViewportStore, useCanvasStore
│ │ └─ styles/ # globals.css, tokens.css
│ ├─ public/
│ ├─ next.config.js
│ ├─ package.json
│ └─ tsconfig.json
├─ packages/ # (optional) shared libs
├─ vendor/ # excalidraw fork or adapterable engine
├─ docs/
│ └─ ARCHITECTURE.md # this file (canonical reference)
├─ pnpm-workspace.yaml
├─ package.json # workspace scripts
└─ turbo.json / nx.json # (optional) task runner

---

## Phase 2 — Layout & Sticky Chrome

- Implement **sticky toolbars** (Header, TopToolbar, OptionsToolbar, PageIndicator).  
- Create **WorkspaceRoot** (scroll container).  
- Inside, use **WorkspaceViewport** and **WorkspaceScaler** for zoom handling.  
- Apply `transform: scale()` only on the scaler element (never on sticky bars).
- Keep all sticky chrome **outside** the scaler so they never scale.

**Structure**
<AppRoot> <AppHeader /> // sticky; top: 0; z: 50 <TopToolbar /> // sticky; below header; z: 40 <OptionsToolbar /> // sticky; below top toolbar; z: 40 <PageIndicator /> // sticky; right-aligned; z: 40 <WorkspaceRoot> // page scroll lives here <WorkspaceViewport> // virtual size & padding; NO transforms <WorkspaceScaler> // transform: scale(S); houses the canvas <CanvasMount /> </WorkspaceScaler> </WorkspaceViewport> </WorkspaceRoot> </AppRoot> ```

---

## Phase 3 — Viewport Model (Zoom, Sizing, DPR)

- Create `useViewportStore` with:  
  - `scale`, `minScale`, `maxScale`, `step`.  
  - `virtualSize` (logical workspace size).  
  - `effectiveDPR = window.devicePixelRatio * scale`.  
- Wheel handler: intercept Ctrl/Cmd+wheel for zoom; otherwise allow natural page scroll.  
- `ResizeObserver` for recalculating fit width/page sizes.

---

## Phase 4 — Canvas Mount

- Build `CanvasMount.tsx` with `forwardRef`.  
- Manage a single canvas ref and Excalidraw instance.  
- Disable internal zoom/pan inside the drawing engine.  
- On zoom/resize, recalc canvas backing store using `effectiveDPR`.  
- Ensure strokes remain crisp and pointer math stays consistent.

---

## Phase 5 — Toolbars & Tool State

- **TopToolbar**: core tool buttons (pen, eraser, shapes, zoom, undo/redo).  
- **OptionsToolbar**: context-sensitive settings (color, stroke width, etc.).  
- **PageIndicator**: zoom % and quick reset button.  
- Store tool settings in `useCanvasStore`; keep viewport state separate.

---

## Phase 6 — Accessibility & Keyboard

- All toolbars tabbable and ARIA-labeled.  
- Shortcuts:  
  - `Ctrl/Cmd + +/−/0` for zoom.  
  - No canvas panning on spacebar unless explicitly mapped to page scroll.  

---

## Phase 7 — Performance & Stability

- Debounce canvas resizes to animation frames.  
- Ensure no overlays with `pointer-events: auto` sit above canvas.  
- Consistent z-index discipline (sticky chrome > workspace).  
- Dispose of engine cleanly on unmount.

---

## Phase 8 — Testing & Diagnostics

- Visual tests:  
  - Zoom from 50%–300% while drawing, strokes remain sharp.  
  - Wheel scroll always scrolls page.  
  - Sticky bars never scale.  
- Unit tests: viewport math, ref lifecycle.  
- Runtime warnings for common pitfalls (overlay, transforms on sticky ancestors).

---

## Phase 9 — Theming & Extensibility

- Use design tokens for sizes, spacing, colors.  
- Add dark mode with CSS variables.  
- Plan for additional panels (layers, thumbnails) outside workspace scaler.

---

## Phase 10 — Build & Packaging

- Keep Excalidraw fork isolated in `vendor/`.  
- Provide a thin adapter (`CanvasMount`) so the engine can be swapped later.  
- Type-safe public API for consumers.  

---

## Common Pitfalls Avoided

- Sticky bars breaking → avoid transforms on ancestors.  
- Page not scrolling → don’t prevent default on wheel unless Ctrl/Cmd pressed.  
- Blurry strokes → always recalc DPR on zoom/resize.  
- Ref errors → use `forwardRef` and mount guards.  

---

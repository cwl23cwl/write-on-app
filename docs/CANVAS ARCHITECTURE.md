# Canvas Workspace Architecture

This document describes the overall architecture for building the canvas workspace from the ground up.  
It is divided into **phases**, beginning with Phase 0 (non-negotiable goals) and extending through implementation, testing, and packaging.
Make this compatible with all major browsers (chrome, firefox, safari). be aware of known issues and common pitfalls regarding these browsers

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
│  └─ write-on-app/
│     ├─ src/
│     │  ├─ app/                       # Next.js App Router
│     │  │  ├─ (marketing)/            # public landing pages
│     │  │  │  └─ page.tsx
│     │  │  ├─ (auth)/                 # sign-in, sign-up, reset, SSO callbacks
│     │  │  │  ├─ sign-in/page.tsx
│     │  │  │  └─ callback/route.ts
│     │  │  ├─ (dashboard)/            # isolated dashboards layout shell
│     │  │  │  ├─ layout.tsx           # top nav, side nav, user menu
│     │  │  │  ├─ teacher/
│     │  │  │  │  ├─ page.tsx          # teacher home (KPIs, quick links)
│     │  │  │  │  ├─ classes/page.tsx  # teacher class list
│     │  │  │  │  ├─ classes/[classId]/page.tsx
│     │  │  │  │  ├─ assignments/
│     │  │  │  │  │  ├─ page.tsx       # all assignments
│     │  │  │  │  │  ├─ new/page.tsx   # create assignment (from workspace template)
│     │  │  │  │  │  └─ [assignmentId]/
│     │  │  │  │  │     ├─ page.tsx    # assignment overview (teacher view)
│     │  │  │  │  │     └─ grade/page.tsx # grading hub
│     │  │  │  │  └─ workspace/
│     │  │  │  │     └─ page.tsx       # teacher-only editable canvas (Excalidraw)
│     │  │  │  └─ student/
│     │  │  │     ├─ page.tsx          # student home (due soon, feedback)
│     │  │  │     ├─ classes/page.tsx  # enrolled classes
│     │  │  │     ├─ assignments/
│     │  │  │     │  ├─ page.tsx
│     │  │  │     │  └─ [assignmentId]/page.tsx  # read-only canvas version + submit
│     │  │  │     └─ submissions/
│     │  │  │        └─ [submissionId]/page.tsx  # view feedback
│     │  │  ├─ api/                      # route handlers grouped by resource
│     │  │  │  ├─ assignments/
│     │  │  │  │  ├─ route.ts           # POST create assignment template (teacher)
│     │  │  │  │  └─ [assignmentId]/
│     │  │  │  │     ├─ route.ts        # GET/PUT/PATCH assignment (teacher)
│     │  │  │  │     └─ duplicate/route.ts # POST duplicate for class distribution
│     │  │  │  ├─ submissions/
│     │  │  │  │  ├─ route.ts           # POST submit (student)
│     │  │  │  │  └─ [submissionId]/route.ts # GET feedback, PUT resubmit
│     │  │  │  ├─ classes/route.ts      # list/create classes (teacher)
│     │  │  │  └─ auth/route.ts         # session helper endpoints if needed
│     │  │  └─ layout.tsx               # root layout (theme, providers)
│     │  ├─ components/
│     │  │  ├─ chrome/                   # Header, Sidebar, PageShell
│     │  │  ├─ workspace/                # WorkspaceRoot, Viewport, Scaler, CanvasMount
│     │  │  ├─ dashboards/               # dashboard cards, tables, filters
│     │  │  └─ forms/                    # CreateAssignmentForm, GradeForm
│     │  ├─ state/                       # Zustand/Jotai stores local to this app
│     │  │  ├─ useViewportStore.ts
│     │  │  └─ useCanvasStore.ts
│     │  ├─ styles/                      # globals.css, tokens.css
│     │  ├─ lib/                         # per-app helpers (auth session, RBAC)
│     │  │  ├─ auth.ts
│     │  │  └─ rbac.ts
│     │  └─ types/                       # app-local types (DTOs)
│     ├─ public/
│     ├─ next.config.js
│     ├─ package.json
│     └─ tsconfig.json
├─ packages/
│  ├─ ui/               # shared UI kit (Button, Card, DataTable, Dialog)
│  ├─ data/             # cross-app data access: Prisma client, queries
│  ├─ schemas/          # zod schemas for assignments, submissions, classes
│  ├─ utils/            # generic helpers (date, ids, logging)
│  └─ auth/             # shared NextAuth config, adapters, RBAC helpers
├─ vendor/
│  └─ excalidraw/       # fork or adapter; exposed via packages/ui or packages/data if needed
├─ docs/
│  └─ ARCHITECTURE.md
├─ pnpm-workspace.yaml
└─ turbo.json


---

## Phase 2 — Layout & Sticky Chrome

- Implement **sticky toolbars** (Header, TopToolbar, OptionsToolbar, PageIndicator).  
- Create **WorkspaceRoot** (scroll container).  
- Inside, use **WorkspaceViewport** and **WorkspaceScaler** for zoom handling.  
- Apply `transform: scale()` only on the scaler element (never on sticky bars).
- Keep all sticky chrome **outside** the scaler so they never scale.

**Structure**
<AppRoot> <AppHeader /> // sticky; top: 0; z: 50 <TopToolbar /> // sticky; below header; z: 40 <OptionsToolbar /> // sticky; below top toolbar; z: 40 <PageIndicator /> // sticky; right-aligned; z: 40 <WorkspaceRoot> // page scroll lives here <WorkspaceViewport> // virtual size & padding; NO transforms <WorkspaceScaler> // transform: scale(S); houses the canvas <CanvasMount /> </WorkspaceScaler> </WorkspaceViewport> </WorkspaceRoot> </AppRoot> ```

## Phase 2 — Guardrails (Control Strip Freeze)

The **control strip** (AppHeader, TopToolbar, OptionsToolbar, PageIndicator) is now considered *frozen*. It must always remain pinned at the top of the viewport and outside the scaler. The following guardrails ensure this cannot regress:

### DOM Placement
- Control strip must be a **direct sibling** above `<WorkspaceRoot>`.
- It must **never** be placed inside `<WorkspaceScaler>` (or any element with `transform`, `filter`, `backdrop-filter`, or `perspective`).

```tsx
<AppRoot>
  <div className="control-strip">{/* AppHeader, TopToolbar, OptionsToolbar, PageIndicator */}</div>
  <WorkspaceRoot>
    <WorkspaceViewport>
      <WorkspaceScaler>
        <CanvasMount />
      </WorkspaceScaler>
    </WorkspaceViewport>
  </WorkspaceRoot>
</AppRoot>

.control-strip {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 1000 !important;
  display: flex;
  flex-direction: column;
}

.workspace-root {
  padding-top: var(--control-strip-height, 160px);
}

.workspace-scaler {
  transform-origin: 0 0;
  will-change: transform;
}
!important used sparingly here to prevent overrides from future layout rules.

--control-strip-height centralizes height for easy updates.

Z-Index Discipline

Define constants (TS or CSS vars) to avoid z-index drift:
export const Z = {
  CONTROL_STRIP: 1000,
  WORKSPACE: 0,
};

:root {
  --z-control-strip: 1000;
  --z-workspace: 0;
}

Runtime Guard

Detect regressions in development:
useEffect(() => {
  const ctrl = document.querySelector('.control-strip');
  if (ctrl?.closest('.workspace-scaler')) {
    console.warn("⚠️ Control strip is inside scaler — move it out!");
  }
}, []);




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
**Goal:** Keep the host app on React 19 while running Excalidraw (and our forked features) on React 18 inside an isolated “island,” preserving stability and avoiding peer-dep issues.

### 4.1 Choose island style
- **Default:** Web Component island (custom element + Shadow DOM)
- **Alternative:** Iframe island (only if we need maximum isolation)

### 4.2 Island package
- Create `packages/excalidraw-island/` (React 18).
- Bundle a single file `excalidraw-island.js` that **includes** React 18 and the forked Excalidraw.
- Export `<excalidraw-island>` custom element with Shadow DOM.
- Public API (attributes/props):
  - `initial-scene` (string or JSON)
  - `readonly` (boolean attribute)
  - `scale` (number, effective page zoom)
- Events the host listens to:
  - `scenechange` → `{ scene }`
  - `export` → `{ blob | dataURL }`
  - `ready`

### 4.3 Host wiring (Next app, React 19)
- Lazy-load `/excalidraw-island.js` on the workspace route.
- Render `<excalidraw-island>` inside the **page zoom wrapper**.
- Forward page zoom changes to the island via:
  - Setting the `scale` attribute, and
  - Dispatching a `resize` or custom `setscale` event if needed.
- Keep toolbars/header at 1:1. Disable Excalidraw internal zoom/pan.

### 4.4 Canvas sizing & DPI
- On `scale` change, island recalculates canvas pixel ratio and updates Excalidraw view so ink stays sharp.
- Respect fixed page scrolling. The canvas does not scroll independently.

### 4.5 Data flow & state
- On `scenechange`, sync to `useCanvasStore` (host) for autosave and assignment duplication.
- Implement `requestExport()` in host to ask island for PNG/SVG; island replies via `export` event.

### 4.6 QA checklist
- Mount/unmount cycles without memory leaks.
- Draw/type/edit on island; no SSR warnings.
- Zoom page anywhere; toolbars remain fixed size; canvas re-DPI looks crisp.
- Export PNG/SVG works.
- Read-only mode for student view is respected.

### 4.7 Iframe fallback (only if needed)
- Serve `/island.html` (Vite build) with React 18 Excalidraw.
- Bridge with `postMessage`: INIT, SET_SCENE, SET_SIZE/SET_SCALE, REQUEST_EXPORT, SCENE_CHANGE, EXPORTED_BLOB, READY.
- Same-origin for clipboard/drag.
- Build `CanvasMount.tsx` with `forwardRef`.  
- Manage a single canvas ref and Excalidraw instance.  
- Disable internal zoom/pan inside the drawing engine.  
- On zoom/resize, recalc canvas backing store using `effectiveDPR`.  
- Ensure strokes remain crisp and pointer math stays consistent.

---

## Phase 5 — Toolbars & Tool State (Updated)

- **Scope of this phase**
  - Add user-facing tools in the app (not the vendor fork) and keep tool state separate from viewport state, consistent with earlier phases.

### 5.1 Toolbars
- **TopToolbar**: core tools (select, pen, eraser, shapes, zoom, undo/redo) plus a new **Textbox** button.
- **OptionsToolbar**: context-sensitive controls. For Textbox, show: Fill color, Border (width/style/radius), Font family/size, Text color, Align, Padding.
- **PageIndicator**: zoom% and quick reset remain as defined in earlier phases.

### 5.2 Textbox Tool (Option A: Rectangle + Bound Text, app-level)
- **Creation (single scene batch):**
  - Create a **rectangle** (with background fill, border, corner radius).
  - Create a **text** element and set `containerId = rectangle.id` (bound text).
  - **Auto-group** the pair and **select** it; start text editing immediately.
- **Sync rules (always keep the pair feeling like one object):**
  - On rectangle move/resize: update the text’s `x/y/width` with padding; maintain top-left anchoring.
  - On text edit (reflow): if height exceeds container, either (a) auto-grow container, or (b) clamp and show a subtle overflow cue.
  - On duplicate/copy: ensure the group is copied as one.
  - On delete: deleting either member deletes the pair.
- **Error-proofing:**
  - Guard all API calls (check `apiRef.current` and method existence).
  - Wrap the host in a React **ErrorBoundary** so tool exceptions never crash the page.
  - Perform all changes inside one `updateScene` to avoid flicker/inconsistent state.
- **Why app-level (not vendor toolbar now):**
  - Keeps the vendor clean for stability and upgrades; migrate later if you choose to fork the UI.

### 5.3 Rich-Text Overlay (optional, but recommended)
- **Editing model:** when a Textbox enters edit mode, mount a positioned **DOM overlay editor** (e.g., TipTap/ProseMirror) aligned to the rectangle’s content box.
- **Zoom integration:** the overlay is rendered in the workspace layer, scaled/translated with the **WorkspaceScaler** so it stays aligned at any zoom.
- **Commit behavior:** on blur/confirm,
  - Serialize structured content to `element.customData.richText`.
  - Generate a cached bitmap of the rendered rich text (offscreen render) and attach to `element.customData.raster`.
  - During normal rendering and **export**, draw the cached bitmap inside the rectangle (re-rasterize at export DPI for sharp output).

### 5.4 State Design (`useCanvasStore`)
- `activeTool: 'select' | 'pen' | 'rectangle' | 'textbox' | …`
- `textbox`: `{ fill, borderWidth, borderStyle, radius, padding, fontFamily, fontSize, textColor, align }`
- `lastCreatedIds`: `{ rectId?: string; textId?: string; groupId?: string }`
- Keep **viewport state** (zoom, virtual size, DPR) in `useViewportStore`, not here.

### 5.5 Events & Sync Hooks
- Subscribe to engine `onChange`/scene updates:
  - For each rectangle with a bound text child, enforce padding/width sync if the rectangle changed.
  - If `richText` is present, prefer drawing the cached raster; invalidate cache when content, font, or width changes.
- Keyboard:
  - Enter/Double-click → edit text (mount overlay).
  - Esc/Blur → commit overlay, return to select.

### 5.6 Stability Guardrails (tooling)
- **Version pinning** of the drawing engine in `package.json` (no caret).
- **API capability checks** before invoking optional methods (e.g., `bindTextToShape`).
- **Z-index discipline:** toolbars stay above workspace; overlays never block pointer events to the canvas except while actively editing.
- **No transforms** on sticky chrome ancestors; all scaling remains inside the WorkspaceScaler.

### 5.7 Testing checklist for this phase
- Create, move, resize, duplicate, and delete a Textbox; the pair stays in sync and behaves as one.
- Edit rich text; content persists and exports sharply at multiple DPIs.
- Zoom between 50–300% while editing; overlay remains aligned; toolbars never scale.


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

# TLDraw Chrome Audit

## AppHeader (`src/components/chrome/AppHeader.tsx`)
- **Inputs**: Reads `mode`, `targetStudentId`, `userId` via `useWorkspaceRoute`; measures CSS var `--h-header` through `useMeasureCssVar`.
- **Outputs**: Renders fixed header (`z-index` via `--z-header`, default 2000) announcing workspace owner; exposes size via CSS variable.
- **State/Stores**: No writes; purely derived from route context.
- **Events**: None beyond CSS measurement hook.
- **Styling/Layout**: Positioned relative inside control strip; relies on CSS vars for spacing.
- **Couplings**: Depends on workspace route context shape (`mode`, `targetStudentId`, `userId`).

## TopToolbar (`src/components/chrome/TopToolbar.tsx`)
- **Inputs**: Reads toolbar state from `useToolbarStore`; TL editor state/actions (`undo`, `redo`, `setTool`, `isReady`) via `useTLDraw`; measures `--h-top`.
- **Outputs**: Buttons for undo/redo and tool selection, save badge stub.
- **State/Stores**: Updates `useToolbarStore.setActiveTool`; TL actions trigger editor tool changes.
- **Events**: Global `keydown` listener for `Escape`; button handlers; sets dropdown expansions.
- **Styling/Layout**: `z-index` via `--z-toolbar` (default 1900); button classes expect control strip environment.
- **Couplings**: Tool mapping tables (`TOOLBAR_TO_TL_TOOL`) assume TL tool ids; Save badge placeholder.

## OptionsToolbar (`src/components/chrome/OptionsToolbar.tsx`)
- **Inputs**: Reads `activeTool` from `useToolbarStore`; measures `--h-opts`.
- **Outputs**: Conditionally renders `TextOptionsPanel`.
- **State/Stores**: None (read-only).
- **Events**: None.
- **Styling/Layout**: Fixed spacing, uses `--z-toolbar`; slot toggles visibility/pointer events.
- **Couplings**: Hard-coded to only show text options when `activeTool === "text"`.

## PageIndicator (`src/components/chrome/PageIndicator.tsx`)
- **Inputs**: Reads pagination data/actions (`current`, `total`, `next`, `prev`, dropdown state) from `usePageStore`.
- **Outputs**: Renders navigation buttons and dropdown list; updates store via `setCurrent`.
- **State/Stores**: Calls `usePageStore` actions; enforces bounds.
- **Events**: Registers `keydown` (Escape) and document `mousedown` to close dropdown.
- **Styling/Layout**: Renders pill styled container; dropdown uses absolute positioning with high `z-index` via container class `z-50`.
- **Couplings**: Assumes `usePageStore` manages scene pagination counts.

## PageIndicatorRow (`src/components/chrome/PageIndicatorRow.tsx`)
- **Inputs**: Children (indicator).
- **Outputs**: Wraps indicator row, dispatches `control-strip:recompute` custom event on resize.
- **State/Stores**: None.
- **Events**: Uses `ResizeObserver` to emit window event.
- **Styling/Layout**: Centers child; `z-index` from `--z-indicator` (default 2900).
- **Couplings**: Relies on downstream listeners for `control-strip:recompute`.

## TextOptionsPanel (`src/components/chrome/TextOptionsPanel.tsx`)
- **Inputs**: `activeTool` prop (unused except for presence); TL editor shared styles and actions (`sharedStyles`, `setStroke`, `setTextFont`, `setTextSize`, `isReady`) via `useTLDraw`; persisted prefs through `useWorkspaceStore`.
- **Outputs**: Invokes TL actions and updates workspace tool prefs; renders color/font/size controls and overlays.
- **State/Stores**: Writes to `useWorkspaceStore.updateToolPref`; uses TL shared styles for live reflection.
- **Events**: Click handlers for swatches; color picker portal; toggles font menu; ensures readiness; uses `useEffect` for color syncing.
- **Styling/Layout**: Inline panel inside options toolbar; portals overlay with fixed positioning (`z` near 9999).
- **Couplings**: Depends heavily on TL style enums (`sharedStyles.size`, `DefaultColorStyle`, etc.) and conversion helpers (`nextTlSize`, `tlSizeToPoints`).

## ZoomLiveRegion (`src/components/chrome/ZoomLiveRegion.tsx`)
- **Inputs**: Reads `viewport.scale` and `viewport.fitMode` from `useViewportStore`.
- **Outputs**: Announces zoom changes via `aria-live`.
- **State/Stores**: None (read-only).
- **Events**: Uses `requestAnimationFrame` and timeouts to debounce announcements.
- **Styling/Layout**: Visually hidden live region with absolute positioning.
- **Couplings**: Expects `useViewportStore` to maintain `fitMode` and scale semantics.

## Chrome Hooks
### useControlStripEventBlock (`src/components/chrome/hooks/useControlStripEventBlock.ts`)
- **Inputs**: None; operates globally.
- **Outputs**: Prevents default zoom interactions when originating from `.control-strip`.
- **State/Stores**: None.
- **Events**: Adds capture listeners for `wheel` and `keydown`.
- **Styling/Layout**: Relies on `.control-strip` class being present.
- **Couplings**: Implicit assumption of control strip DOM structure.

### useToolbarCanvasSync (`src/components/chrome/hooks/useToolbarCanvasSync.ts`)
- **Inputs**: Reads/sets `useToolbarStore` tool; reads TL editor state (`currentTool`, `isReady`) and `setTool`.
- **Outputs**: Keeps toolbar and editor tool selections in sync.
- **State/Stores**: Writes to `useToolbarStore.setActiveTool`; calls `setTool` on TL editor.
- **Events**: React effects watching store/editor values.
- **Styling/Layout**: None.
- **Couplings**: Mapping tables tie TL tool ids to toolbar ids; assumes TL exposes select/draw/etc.

## ChromeLayout (`src/components/chrome/ChromeLayout.tsx`)
- **Inputs**: None beyond hooks.
- **Outputs**: Arranges chrome stack (`AppHeader`, `TopToolbar`, `OptionsToolbar`, `PageIndicatorRow`).
- **State/Stores**: Invokes hooks for event block & tool syncing.
- **Events**: None.
- **Styling/Layout**: Wraps children in `.control-strip`.
- **Couplings**: Expects TL provider higher in tree to supply context.

## ChromeBackdrop (`src/components/chrome/ChromeBackdrop.tsx`)
- **Inputs**: None.
- **Outputs**: Sticky backdrop div sized by `--h-stack`.
- **State/Stores**: None.
- **Events**: None.
- **Styling/Layout**: `z-index: 2800`; pointer-events disabled; assumes CSS variables set.
- **Couplings**: None specific beyond shared CSS variables.

## TL Canvas Mount Reference
### TLDrawProvider (`src/components/canvas/TLDrawProvider.tsx`)
- **Inputs**: None; headless store creation using `createTLStore` with `defaultShapeUtils`, `defaultBindingUtils`.
- **Outputs**: Provides `TldrawEditor` with `DefaultCanvas`.
- **State/Stores**: Local TL store memoized.
- **Events**: None directly.
- **Styling/Layout**: Fixed full-viewport wrapper.
- **Couplings**: Requires TL editor library; current chrome expects `useTLDraw` context (from workspace provider, not this file).

### TLHeadless & `/canvas` route
- **Inputs**: Simply renders `TLDrawRoot` within `<main>` sized to viewport.
- **Outputs/Styling**: Ensures canvas covers `100dvh`/`100vw`.
- **Couplings**: None beyond the headless provider.

## Known Couplings & Migration Targets
- Toolbar tooling is hard-coded to TL tool ids (`select`, `draw`, `highlight`, `text`, `eraser`, `geo`); Excalidraw equivalents will need mapping or adapter.
- `TextOptionsPanel` depends on TL shared style enums, conversion helpers (`nextTlSize`, `tlSizeToPoints`, `pointsToTlSize`), and TL color/style utils; Excalidraw analog must supply compatible API.
- `useTLDraw` context is assumed by multiple chrome components; integrating another engine requires implementing the same API surface (`undo`, `redo`, `setTool`, `sharedStyles`, `setStroke`, `setTextFont`, `setTextSize`, `isReady`, `currentTool`).
- Page indicator relies on external store updates for `total`/`current`; any new adapter must drive that store when scenes change.
- CSS variable measurement hooks (`useMeasureCssVar`) and `control-strip:recompute` event expect consumer to manage layout offsets—new canvas mounts must honor these triggers.
- Control strip event blocker assumes a `.control-strip` ancestor and that zoom gestures should be ignored there; replacement UIs must maintain this structure or provide equivalent selectors.

## Proposed TLDraw Adapter Interface
- `useTLChromeAdapter(): TLChromeAdapter`
  - `isReady: boolean` – mirrors editor readiness; gate chrome interactions.
  - `currentTool: TLToolId | null` – normalized to chrome tool ids; drives toolbar highlighting.
  - `setTool(tool: TLToolId): void` – idempotent setter used by toolbar and sync hook.
  - `undo(): void`, `redo(): void` – history controls for top toolbar buttons.
  - `sharedStyles: { stroke?: string; font?: string; size?: TLSizeEnum; textAlign?: 'start'|'middle'|'end' }` – feeds text panel; values already normalized for UI.
  - `setStroke(hex: string): void`, `setTextFont(font: string): void`, `setTextSize(size: TLSizeEnum): void` – invoked from text options panel & workspace prefs.
  - `zoom: number`, `setZoom(next: number): void`, `fitMode: 'fit-width' | 'free'` – expose zoom state for live region and future controls (hook into `useViewportStore` or TL camera).
  - `registerToolbarListener(cb: (tool: TLToolId) => void): () => void` – optional subscription used by `useToolbarCanvasSync` to avoid polling.
  - `pages: { current: number; total: number; setCurrent(n: number): void; setTotal(n: number): void }` – adapter updates `usePageStore` to keep indicator in sync.
  - `mountReady(): void` – callback for chrome to invoke once layout variables measured (allows editor to fit/center).
- Adapter should internally bridge TL editor events (selection change, history, shared styles) to chrome stores (`useToolbarStore`, `useWorkspaceStore`, `usePageStore`, `useViewportStore`) to keep UI declarative.

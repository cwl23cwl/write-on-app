---
applyTo: '**'
---

# User Memory

## User Preferences
- Programming languages: TypeScript, React, Next.js
- Code style preferences: Concise, modular, robust error handling
- Development environment: pnpm, Turborepo, Prisma ORM (assumed), Next.js app router
- Communication style: Concise updates, actionable steps

## Project Context
- Current task: Refine AppHeader padding for branding and workspace label (2025-02-18).
- Recent task: Update AppHeader branding and dynamic student workspace label (2025-02-18).
- Recent task: Add 12px padding below Excalidraw control strip before canvas drawing region (2025-02-18).
- Recent task: Integrate legacy SimplifiedColorPicker into workspace toolbar (2025-02-17).
- Recent task: Remove quick text/highlight palettes from TopToolbar UI (2025-02-17).
- Recent task: Update PageIndicator UI using legacy design while keeping usePageStore integration (2025-02-16).
- Previous task: Rebuild toolbar UI (TopToolbar, OptionsToolbar) using legacy blueprint; new components render UI with stubbed actions (2025-02-14).
- Current project type: Web app (monorepo) with Next.js app router
- Tech stack: React 19, Next 15, Excalidraw integration via custom island/web component (`ExcalidrawIsland`)
- Architecture patterns: Hooks + adapters + custom web component (`ExcalidrawIsland`)
- Key requirements: Fix runtime ReferenceError in `ExcalidrawAdapterMinimal`, stabilize mount/unmount
 - Current defect: Runaway canvas height on initial mount causing `excalidraw__canvas static` to inflate (style.height and height attribute extremely large)

## Coding Patterns
- Preferred patterns and practices: Hooks with refs, defensive guards, cleanup in effects
- Code organization preferences: Separate hooks/adapters/components
- Testing approaches: Manual runtime verification in dev; console logs present
- Documentation style: Inline JSDoc minimal

## Context7 Research History
- 2025-02-18: Context7 search for Excalidraw canvas padding returned dynamic Next.js shell; no accessible static docs.
- 2025-02-17: Context7 search for Simplified Color Picker returned dynamic Next.js shell with no accessible data; proceeded with legacy implementation.
- 2025-02-16: Context7 search for Excalidraw scaling returned JS shell; relying on internal architecture notes for canvas-scaler alignment.
- 2025-02-16: Attempted Context7 search for Lucide pagination patterns (JS-rendered results inaccessible); sourced lucide.dev package usage docs instead.
- Libraries researched on Context7: N/A (network restricted in this environment)
- Best practices discovered: N/A
- Implementation patterns used: `useRef` for containers; effect guards against null
- Version-specific findings: React 19/Next 15 concurrent effects require effect safety

## Conversation History
- Important decisions made: Target bug `container is not defined` at `ExcalidrawAdapterMinimal.tsx:184`
- Recurring questions or topics: Excalidraw initialization, island ready events
- Solutions that worked well: To be determined
- Things to avoid or that didn't work: Accessing variables not defined in scope
 - New findings: Runaway height not tied to zoom handler; fires during initial mount from React effect/Excalidraw init. Our `useCanvasResolution` and `useCanvasStore.updateResolution` were writing canvas attributes based on container/clientHeight, potentially propagating runaway sizes to Excalidraw canvases.

## Notes
- 2025-09-20: Reintroduced a lightweight `.workspace-canvas-mount` wrapper inside `CanvasMount` to maintain backward-compatible test selectors while keeping the island mounted directly under `.page-wrapper`. The wrapper is `position:relative; width/height:100%` and non-intrusive (span anchor remains `display:contents`).
- 2025-09-20: Increased spacing so page surface starts 15px below PageIndicator; set `--control-strip-gap` to 15px in `globals.css` and `WorkspaceRoot` inline defaults. Added guardrails to verify the control strip is outside any ancestor with `transform`, `filter`, or `backdrop-filter`. Implemented dynamic recompute of `--control-strip-height` on window resize, font load, row show/hide mutations, and PageIndicator size changes via a custom `control-strip:recompute` event.
 - 2025-09-20: Exposed spacer CSS vars: `--control-strip-height` (header+top+opts), `--pageindicator-bottom-offset` (gap-above + pill height + 15px), and `--workspace-top-pad` (sum). Wired `.workspace-root` padding to `--workspace-top-pad` and compute all at runtime in `WorkspaceRoot`.
- 2025-02-18: Tweaked AppHeader spacing with Tailwind padding (`pl-6`, `pr-6`) after feedback for neater layout; lint rerun still blocks on pre-existing errors in OptionsToolbar/useWorkspaceStore.
- 2025-02-18: Updated AppHeader copy to "Write on English" with enlarged typography and dynamic `'Name's Workspace'` label driven by useWorkspaceRoute; wraps label in single quotes.
- 2025-02-18: `pnpm --filter write-on-app lint` fails due to pre-existing lint errors in OptionsToolbar and useWorkspaceStore; recorded for awareness.
- 2025-02-18: Ran `pnpm test controlStripDom` after control strip offset update; tests passed with no regressions.
- 2025-02-18: DuckDuckGo search for "Excalidraw canvas padding" yielded no explicit guidance; proceeding with custom CSS gap (12px) under control strip.
- 2025-02-17: Raised chrome z-index, removed stacking contexts, and dropped Excalidraw host z-order to keep toolbars visible.
- 2025-02-17: Introduced workspace Zustand store syncing Excalidraw API for toolbar integration.
- 2025-02-17: Added legacy SimplifiedColorPicker to workspace components and reimplemented color conversion helpers.
- 2025-02-17: Removed TopToolbar quick text/highlight color selectors per UI request.
- 2025-02-17: Restored legacy OptionsToolbar layout with full text/highlight controls.
- 2025-02-16: Adjusted workspace scaler/page layout to center-scale using virtual padding; pending verification after drift fix.
- 2025-02-16: Verified PageIndicator updates pass workspace lint suite.
- 2025-02-16: Updated PageIndicator to reuse legacy pill UI with lucide icons and usePageStore wiring.
- Fixed undefined `container` in adapter by guarding with `containerRef.current` in mutation observer.
- Gated adapter `ready` state on actual Excalidraw API readiness; removed container-based ready effect.
- Removed forced `api.setZoom(1)`; zoom remains under host scaler control (avoids fighting external scaling).
- Switched overlay elimination observer to `useLayoutEffect` and guaranteed cleanup (disconnect + clearInterval).
- Island now dispatches `island-ready` only after adapter's `onReady` fires; sets `isInitialized` at that time.
- Added lightweight error boundary around adapter render in `ExcalidrawIsland`.
- Prevented multi-mount spam via `mountedRef` guard in `useExcalidrawIsland`; `CanvasMount` now mounts once with proper cleanup.
- Added shadow DOM style so host and container fill available space (`:host{display:block;width:100%;height:100%}` and `.container{width:100%;height:100%;position:relative}`).
- Ensured adapter and inner Excalidraw root have `width:100%; height:100%`.
- Added cleanup symmetry: interval + `MutationObserver` disconnect, event listeners removal, API ref nulling on unmount.
- Ready contract unified: only `island-ready` is dispatched, carrying `{ api, element }`; the hook listens to one event and sets both `isReady` and `excalidrawAPI`.
- Added listener management in island via `addListener` with stored disposers; `cleanup()` iterates and removes all, making unmount idempotent.
- Island mount is idempotent: reuses a single `[data-exc-island-root]` container, unmounts any existing React root before remounting; prevents multiple canvas roots.
- Excalidraw import hardening: resolve both `default` and named `Excalidraw` exports and render the resolved component directly to ensure ref delivery.
- Logging now gated by `NEXT_PUBLIC_EXCALIDRAW_DEBUG=1`; default logs suppressed to reduce noise. Dev diagnostics removed from island render.
- Mitigation for runaway height: Clamp logical dimensions and prefer fixed page size (1200x2200) when `.page-wrapper` present. Limit `useCanvasResolution` to only update `canvas.excalidraw__canvas.interactive`, avoiding writing to static canvas. Added GPU caps to `useCanvasStore.updateResolution` and safety clamps.
 - Updated invariant: Never derive page size from DOM. Always use `PAGE_W=1200`, `PAGE_H=2200`. Do not set per-canvas CSS sizes (no `style.width/height`). Attributes only: `width=PAGE_W*DPR*scale`, `height=PAGE_H*DPR*scale`. Clamps: <=16384/32768 per-axis and ~256MP total.
 - Removed `ExcalidrawIsland` canvas CSS rule that forced `width/height:100% !important`; wrapper controls size.
- 2025-02-14: New chrome TopToolbar mirrors legacy layout with stubbed handlers.
- 2025-02-14: New chrome OptionsToolbar replicates legacy accordion layout with stub-only controls.
- 2025-02-14: Added lucide-react workspace dependency for toolbar icons.
- 2025-02-15: Verifying chrome/OptionsToolbar imports and dependencies.
- 2025-02-15: Context7 research unavailable (no network); proceeding with local analysis.
- 2025-02-15: Planned new Zustand workspace store (tool prefs, API sync) and shared SimplifiedColorPicker with color-utils.
- 2025-02-15: Implemented Zustand workspace store (toolPrefs, activeTool sync) and shared SimplifiedColorPicker with new color utils.
- 2025-02-15: Implemented Zustand workspace store (toolPrefs, activeTool sync) and shared SimplifiedColorPicker with new color utils.
- 2025-02-15: Committed workspace/legacy toolbar experiments to 'workspace-store-experiments' branch for future work.



## Critical Guardrails

- **Zoom Handling**
  - Never modify or re-enable Excalidraw’s internal zoom/pan/scroll.
  - Zoom logic only exists in the host `WorkspaceScaler` via `useViewportStore`.
  - Canvas zoom must always be disabled inside Excalidraw — only external scaling applies.
  - Page size is fixed (1200 × 2200 CSS pixels). Do not derive dimensions from DOM.

- **Control Strip**
  - The control strip (AppHeader, TopToolbar, OptionsToolbar, PageIndicator) is frozen.
  - It must never scale, zoom, or move with the canvas.
  - DOM placement: must remain a direct sibling above `<WorkspaceRoot>`, never inside `<WorkspaceScaler>`.
  - Allowed changes: **UI/visual design only** (colors, typography, spacing).  
    No layout/DOM restructuring.

- **DOM Structure & Nesting**
  - All core containers must stay intact and correctly nested:
    ```
    <AppRoot>
      <AppHeader/>
      <TopToolbar/>
      <OptionsToolbar/>
      <PageIndicator/>
      <WorkspaceRoot>
        <WorkspaceViewport>
          <WorkspaceScaler>
            <CanvasMount>
              <Page/>
            </CanvasMount>
          </WorkspaceScaler>
        </WorkspaceViewport>
      </WorkspaceRoot>
    </AppRoot>
    ```
  - Sticky chrome (control strip) must remain **outside** the scaler.
  - Never apply `transform`, `filter`, `backdrop-filter`, or `perspective` on sticky chrome ancestors.

- **Non-negotiables**
  - Page scroll must always work, even over the canvas.
  - Control strip must remain visible and pinned.
  - No overlays may block pointer/scroll events on the canvas.
  - Excalidraw island stays isolated; host owns toolbars and UI.
  - Do not alter island mount/unmount patterns, API contracts, or ready event wiring.

- **Scope of Work**
  - For contributors other than the lead developer:  
    - Allowed: **UI and design** improvements only (colors, typography, spacing, visual polish).  
    - Not allowed: architectural changes to zoom handling, state stores, DOM hierarchy, or Excalidraw island.  
  - For the lead developer (project owner):  
    - May adjust architecture, wire Excalidraw API, sync tools/state, and continue implementing phases as defined in `CANVAS ARCHITECTURE.md`.

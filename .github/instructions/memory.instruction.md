---
applyTo: '**'
---

# User Memory

## User Preferences
- Programming languages: TypeScript, React, Next.js
- Code style preferences: Concise, componentized, TailwindCSS utility classes
- Development environment: Monorepo (Turborepo), pnpm, Prisma ORM
- Communication style: Concise status updates, step-by-step execution

## Project Context
- Current project type: Web app with canvas workspace
- Tech stack: Next.js + React + Tailwind, Excalidraw vendor tree
- Architecture patterns: WorkspaceRoot (scroll owner), sticky chrome inside scroller, WorkspaceViewport (no transforms), WorkspaceScaler (Phase 3 transforms), CanvasMount adapter
- Key requirements: Page-only scroll, crisp ink, no overlays blocking input, sticky toolbars never scale

## Coding Patterns
- Prefer sticky chrome as direct children of scroll container
- Avoid transforms on sticky ancestors; apply zoom only on scaler (Phase 3)
- Keep canvas inputs unobstructed (no fixed overlays intercepting events)

## Context7 Research History
- Libraries researched on Context7: N/A (internal docs used)
- Best practices discovered: Place sticky chrome inside scroll container; avoid transforms on ancestors
- Implementation patterns used: WorkspaceRoot owns scroll; WorkspaceViewport (no transforms) > WorkspaceScaler > CanvasMount
- Version-specific findings: N/A

## Conversation History
- Phase 2 Step 0: Completed – WorkspaceRoot is the sole scroll container; sticky chrome are direct children (fragment); components renamed (AppHeader, WorkspaceViewport, WorkspaceScaler); removed transforms from viewport; updated ESLint plugin allowances.
- Phase 2 Step 1: Completed – WorkspaceRoot set to 100vh with overflow:auto; sticky positions use CSS variables (--h-header, --h-top); TopToolbar/OptionsToolbar/PageIndicator use correct z-index and top calc; PageIndicator right-aligned via self-end; WorkspaceViewport has no transforms; WorkspaceScaler reserved for future scale(). No transforms/filters on sticky ancestors.
- Phase 2 Step 2: Completed – Defined CSS custom properties on WorkspaceRoot: --h-header, --h-top, --h-opts, --h-chrome, --gutter-right, --z-header, --z-toolbar, --page-padding. Updated chrome components to use z-index/top via vars. Adjusted WorkspaceViewport padding to reserve right gutter and apply horizontal page padding.
- Phase 2 Step 3: Completed – Added ResizeObserver-based hook to dynamically measure AppHeader, TopToolbar, and OptionsToolbar heights and update CSS variables on WorkspaceRoot, ensuring --h-chrome stays accurate across layout changes and localization.
- Phase 2 Step 3 (refined): Updated useMeasureCssVar to:
  - Stop rewriting --h-chrome (CSS calc owns it)
  - Use requestAnimationFrame with coalesced single write per frame
  - Avoid rounding; write exact pixel values
  - Keep RO + throttled window resize with rAF scheduling
  - Null-safe cleanup with unobserve + disconnect
  - Enforce single-writer policy for atomic vars (--h-header|--h-top|--h-opts)
- Phase 2 Step 4: Completed – WorkspaceRoot is the only scroller with height:100vh, overflow:auto, overscroll-behavior:contain; applied contain: layout paint style; added opaque background via --workspace-bg to prevent sticky transparency artifacts; no transforms added.
- Phase 2 Step 5: Completed – Implemented PageIndicatorRow sticky placement; PageIndicator pill centered, intrinsic width with 36px min-height, 16px horizontal padding, min-width 120px, max-width 70vw, rounded-full, solid background and subtle border; keyboard handlers (Left/Right = prev/next page, Enter opens dropdown, Esc closes); 32px hit targets for controls; no wheel listeners to allow page scroll; respects prefers-reduced-motion by avoiding animations; added usePageStore for page state with single-writer policy.
- Phase 2 Step 6: Completed – WorkspaceViewport adds padding-top: var(--h-chrome) and symmetric horizontal padding via --page-padding; no right gutter needed per centered PageIndicator; no transforms applied.
- Phase 2 Step 7: Completed – WorkspaceScaler future-proofed with transform-origin: top left and will-change: transform; no overflow or scroll behavior set.
- Phase 2 Step 8: Completed – CanvasMount sizes to container with width:100% and height: var(--page-height); ensured no page-level wheel capture beyond adapter redirection; Excalidraw internal zoom prevented and page scroll allowed when cursor over canvas.
- Phase 2 Step 9: Completed – Enforced z-index tokens: header 50, toolbars 40, indicator 40; avoided new stacking contexts on WorkspaceViewport/Scaler.
- Phase 2 Step 10: Completed – Introduced --gutter-right (64px); WorkspaceViewport padding-right reserves gutter; added PageIndicatorRail sticky right rail hosting the pill.
- Phase 2 Step 11: Completed – Added contain: layout paint style on sticky bars and WorkspaceRoot; avoided heavy shadows; border separators used.
- Phase 2 Step 12: Noted responsive behavior – RO-driven offsets keep correctness; future collapse of OptionsToolbar possible without code change; vars remain accurate.
- Phase 2 Step 13: Verified event flow – no wheel/touchmove preventDefault unless zoom-modified; page scroll remains owned by WorkspaceRoot; Excalidraw globals scoped via adapter.

 - 2025-09-06: Control strip converted to a single fixed container (.control-strip) spanning full width (z-index 1000). Removed per-child sticky from AppHeader, TopToolbar, OptionsToolbar, and PageIndicatorRow to avoid nested sticky complexities. Implemented vertical gaps via CSS vars: TopToolbar margin-top var(--gap-header-top), OptionsToolbar margin-top var(--gap-top-opts), and PageIndicator pill margins var(--gap-indicator-above/below). WorkspaceViewport offsets content with padding-top: var(--h-stack), keeping the workspace clear under the fixed strip. useMeasureCssVar continues to write --h-header/--h-top/--h-opts/--h-indicator. Build succeeded with Next.js 15.5.2 (Turbopack).
   - Cross-browser hardening: replaced contain: 'layout paint style' with 'layout paint' for Safari/Firefox compatibility; added .chrome-header safe-area insets (env/constant) so header measurement includes iOS notch; added dvh fallback (height: 100vh; height: 100dvh) on .workspace-root; guarded ResizeObserver usage in useMeasureCssVar to avoid crashes on older engines.

## Notes
- Source reference: docs/CANVAS ARCHITECTURE.md (internal)
- Renames: Header -> AppHeader, ViewportContainer -> WorkspaceViewport, CanvasScaler -> WorkspaceScaler

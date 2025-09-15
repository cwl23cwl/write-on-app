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
- Current project type: Web app (monorepo) with Next.js app router
- Tech stack: React 19, Next 15, Excalidraw integration via custom island/web component
- Architecture patterns: Hooks + adapters + custom web component (`ExcalidrawIsland`)
- Key requirements: Fix runtime ReferenceError in `ExcalidrawAdapterMinimal`, stabilize mount/unmount

## Coding Patterns
- Preferred patterns and practices: Hooks with refs, defensive guards, cleanup in effects
- Code organization preferences: Separate hooks/adapters/components
- Testing approaches: Manual runtime verification in dev; console logs present
- Documentation style: Inline JSDoc minimal

## Context7 Research History
- Libraries researched on Context7: N/A (network restricted in this environment)
- Best practices discovered: N/A
- Implementation patterns used: UseRef for containers; effect guards against null
- Version-specific findings: React 19/Next 15 concurrent effects require effect safety

## Conversation History
- Important decisions made: Target bug `container is not defined` at `ExcalidrawAdapterMinimal.tsx:184`
- Recurring questions or topics: Excalidraw initialization, island ready events
- Solutions that worked well: To be determined
- Things to avoid or that didn't work: Accessing variables not defined in scope

## Notes
- Fixed undefined `container` in adapter by guarding with `containerRef.current` in mutation observer.
- Gated adapter `ready` state on actual Excalidraw API readiness; removed container-based ready effect.
- Removed forced `api.setZoom(1)`; zoom remains under host scaler control (avoids fighting external scaling).
- Switched overlay elimination observer to `useLayoutEffect` and guaranteed cleanup (disconnect + clearInterval).
- Island now dispatches `island-ready` only after adapter’s `onReady` fires; sets `isInitialized` at that time.
- Added lightweight error boundary around adapter render in `ExcalidrawIsland`.
- Prevented multi-mount spam via `mountedRef` guard in `useExcalidrawIsland`; `CanvasMount` now mounts once with proper cleanup.
- Added shadow DOM style so host and container fill available space (`:host{display:block;width:100%;height:100%}` and `.container{width:100%;height:100%;position:relative}`).
- Ensured adapter and inner Excalidraw root have `width:100%; height:100%`.
- Added cleanup symmetry: interval + MutationObserver disconnect, event listeners removal, API ref nulling on unmount.
- Ready contract unified: only `island-ready` is dispatched, carrying `{ api, element }`; the hook listens to one event and sets both `isReady` and `excalidrawAPI`.
- Added listener management in island via `addListener` with stored disposers; `cleanup()` iterates and removes all, making unmount idempotent.
- Island mount is idempotent: reuses a single `[data-exc-island-root]` container, unmounts any existing React root before remounting; prevents multiple canvas roots.
- Excalidraw import hardening: resolve both `default` and named `Excalidraw` exports and render the resolved component directly to ensure ref delivery.
- Logging now gated by `NEXT_PUBLIC_EXCALIDRAW_DEBUG=1`; default logs suppressed to reduce noise. Dev diagnostics removed from island render.

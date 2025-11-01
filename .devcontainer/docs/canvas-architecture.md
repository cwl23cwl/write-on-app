# TLDraw Canvas Architecture vNext (Write-On-App)

> **Author:** ChatGPT  
> **Date:** 2025-11-01  
> **Scope:** Canvas and chrome integration for the Write-On-App workspace

---

## 0) North Star

- A fast, crisp, classroom-ready canvas that feels native on tablet, laptop, and pen devices.
- Page-first mental model: users work on pages inside a larger infinite canvas.
- Chrome (AppHeader, TopToolbar, Control Strip, PageIndicator) stays stable while the page stays visually centered.
- Pen-first input with a pen/finger toggle: pen draws, finger pans and zooms.
- Text and shapes are extensible and future-proof for ESL teaching tools.

**Success criteria**

- 1200 × 2200 page renders pixel-crisp at any DPR and scale.
- Horizontal and vertical centering under the PageIndicator at all zoom levels.
- No drift when the mouse/pen enters or leaves the viewport.
- Undo/redo is deterministic across actions and sessions.
- Export to PNG/PDF is accurate to page bounds.

---

## 1) Top-level Architecture

### 1.1 Layers and Boundaries

- **App Chrome**: AppHeader, TopToolbar, OptionsToolbar, Control Strip, PageIndicator, Modals.
- **Workspace Shell**: WorkspaceRoot → WorkspaceViewport → WorkspaceTranslator → WorkspaceScaler → CanvasMount.
- **Canvas Core**: TLDraw headless (store, runtime, commands, shapes, camera).
- **Adapters (Glue)**: `useCanvasAdapter()` and small hooks that map TL state and events into our app stores and chrome.
- **Services**: Persistence, Sync, Export, Telemetry, Input Manager.

### 1.2 Data Flow (unidirectional)

- UI intent → Adapter → TL commands → TL store updates → Adapter projections → App stores → Chrome.
- Persistence/Sync subscribe to TL store changes and write to storage or network.

---

## 2) DOM and Coordinate System

### 2.1 DOM Tree (simplified)

```html
<WorkspaceRoot>
  <AppHeader />
  <TopToolbar />
  <ControlStrip />
  <WorkspaceViewport>
    <!-- scroll container -->
    <WorkspaceTranslator
      style="transform: translate3d(offsetX+panX, offsetY+panY, 0)"
    >
      <WorkspaceScaler style="transform: scale(zoom)">
        <CanvasMount>
          <!-- TLDraw mounts here -->
          <PageBackground class="tl-background" />
          <canvas />
        </CanvasMount>
      </WorkspaceScaler>
    </WorkspaceTranslator>
  </WorkspaceViewport>
  <PageIndicator />
</WorkspaceRoot>
```

2.2 Coordinate Spaces

Viewport: CSS pixels inside WorkspaceViewport.

World: TL world units before zoom and pan.

Page: Page-local coordinates with origin at page top-left.

2.3 Camera Contract

zoom (float), panX, panY live in TL camera.

offsetX, offsetY are adapter-computed base offsets that center the page under the viewport midpoints.

Target pan is computed to make page midpoint match viewport midpoint.

3. Page Model

Page size: PAGE_W = 1200, PAGE_H = 2200 world units.

Page origin stored in TL document as a frame or guide so it is editable later.

The page background element draws guides and margins.

Page-only exports clip to [0, 0, PAGE_W, PAGE_H] in page space.

4. Input Model and Tools
   4.1 Pen/Finger Toggle

InputManager reads Pointer Events and hardware capability if available.

When Pen Mode is on: pen creates strokes, finger and mouse pan/zoom.

When Pen Mode is off: all pointers follow the current tool.

Chrome exposes a clear toggle and a quick-hold gesture (press-and-hold to temporarily pan).

4.2 Tools We Need Now

Select, Hand (pan), Eraser, Highlighter, Pen, Rectangle, Ellipse, Line/Arrow, Text, Image.

Later: Sticky, Callout, Polygon, Connector, Table, Custom TextBox.

4.3 Text Editing

Use TipTap for rich text inside Text and TextBox shapes.

Adapter bridges focus, selection range, and commit to TL transactions.

5. State and Stores
   5.1 TL Store

Source of truth for shapes, bindings, assets, camera, pages, selection, history.

5.2 App Stores (Zustand)

useViewportStore – viewport size, scroll, dpr, base offsets, derived camera targets.

useUiStore – tool mode, pen mode, active color, stroke width, snapping flags.

usePageStore – current page id, page list, page metadata.

useSessionStore – user id, role (teacher or student), presence.

5.3 Projections

Adapter projects TL state into app stores for chrome display, never the other way around.

6. Adapter Design
   6.1 Hook API
   useCanvasAdapter() => {
   camera, commands, ui, page, export, persistence, events
   }
   camera: read-only camera snapshot.

commands: draw, erase, transform, group, lock, duplicate, nudge, flip, align, distribute.

ui: setTool, setColor, setStroke, setPenMode.

page: create, duplicate, reorder, delete, setActive.

export: toPNG, toPDF, toSVG, copyToClipboard.

persistence: save, load, autosave control.

events: onCameraChange, onSelectionChange, onHistoryChange, onPointerModeChange.

6.2 Event Wiring

TL onAfterChange → recompute targetPan and base offsets → write to TL camera when needed.

Resize observer on WorkspaceViewport → update viewport size → recompute center.

Scroll listener on WorkspaceViewport → feed scroll.x and scroll.y to centering math.

7. Centering, Drift, and Zoom Rules
   7.1 Centering

Keep the page midpoint at the viewport midpoint in both axes.

PageIndicator sits at viewport midpoint and should always align to true page midpoint.

7.2 Zoom

Zoom around pointer for natural feel.

Clamp zoom to safe range (0.1–8) and use smooth stepping.

On zoom, recompute target panning so same page point stays under the pointer.

7.3 Drift Prevention

All translations computed from explicit state, not incremental deltas from CSS transforms.

Mouse enter/leave does not change camera state.

8. Performance

Use TLDraw runtime batch updates for high-frequency input.

Only re-render chrome on projected changes.

Use will-change: transform on translator/scaler containers.

Lazy-load TipTap for text editing.

Debounce autosave and export.

9. Persistence and Sync

Local: IndexedDB with versioned schema and gzip compression.

Remote: room-based sync for classroom sessions (teacher is host).

Save format: TL JSON plus app metadata (page settings, UI prefs).

Autosave every 3 seconds after inactivity or on blur.

10. Export

PNG/SVG with pixel-perfect page bounds.

PDF with vector text when possible.

Support transparent or paper-like backgrounds.

11. Accessibility and Keyboard

All tools have keyboard shortcuts (single-letter where possible).

Tab order moves across chrome; focus styles visible.

Screen reader labels for toolbar buttons.

12. File Structure (proposed)
    apps/write-on-app/
    app/
    canvas/page.tsx
    workspace/
    WorkspaceRoot.tsx
    WorkspaceViewport.tsx
    WorkspaceTranslator.tsx
    WorkspaceScaler.tsx
    CanvasMount.tsx
    components/chrome/
    AppHeader.tsx
    TopToolbar.tsx
    OptionsToolbar.tsx
    ControlStrip.tsx
    PageIndicator.tsx
    lib/canvas/
    adapter/
    useCanvasAdapter.ts
    events.ts
    input/
    InputManager.ts
    PenModeGate.ts
    math/
    camera.ts
    centering.ts
    coords.ts
    stores/
    useViewportStore.ts
    useUiStore.ts
    usePageStore.ts
    useSessionStore.ts
    text/
    TipTapBridge.tsx
    export/
    exportPNG.ts
    exportPDF.ts
    exportSVG.ts
    persistence/
    indexdb.ts
    autosave.ts
    telemetry/
    metrics.ts
    logger.ts

13) Shape Set v1

TextBox – rich text with TipTap, padding, background fill, border radius.

Highlighter – blend mode multiply, pressure support.

Image – drag & drop, resize handles, object fit.

Each custom shape includes: schema, renderer, indicators, handles, and hit-testing.

14. Chrome Integration

TopToolbar → useUiStore for tool, color, stroke width.

PageIndicator → reads from usePageStore, emits page change to adapter.

ControlStrip → hosts zoom controls + pen/finger toggle.

15. Testing Plan
    15.1 Manual Test Checklist

Load /canvas → page centered under pill at 100% zoom.

Zoom in/out → pointer position stays fixed.

Toggle pen mode → pen draws, finger pans.

Create/Edit TextBox → clipboard retains formatting.

Export PNG → size 1200×2200.

Resize window → page stays centered.

Undo/redo 100 actions → no divergence.

15.2 Unit and Integration Targets

centering.ts: viewport/page offsets.

camera.ts: zoom-around-point math.

useViewportStore: resize/scroll recompute.

InputManager: pointer role logic.

16. Rollout Plan

Seed canvas route, centering, pen mode, basic tools.

Add TextBox, export, autosave.

Multi-page + PageIndicator.

Sync/presence for classrooms.

Advanced shapes + teacher tools.

17. Open Questions

Margins/bleed for print? → default 24px guides.

Lock student edits in teacher mode? → per-layer permissions.

Autosave cadence for large classes? → start at 3s idle.

18. Acceptance Criteria

Page visually centered at all times.

Pen mode works + discoverable.

Exports match bounds + print crisp.

Adapter API stable + chrome-friendly.

19. Appendix: Centering Math
    pageMidX = px + pw / 2
    pageMidY = py + ph / 2

viewMidX = vw / 2
viewMidY = vh / 2

panX = viewMidX + sx - z _ pageMidX
panY = viewMidY + sy - z _ pageMidY

Translator transform: translate3d(offsetX + panX, offsetY + panY, 0)
Rule: Keep transforms pure and computed from state on every frame.

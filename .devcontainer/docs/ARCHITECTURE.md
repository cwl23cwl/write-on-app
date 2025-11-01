# Write-On-App Architecture Overview

> **Updated:** 2025-11-01
> **Version:** vNext (TLDraw Integration)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Core Application Layers](#3-core-application-layers)
4. [Canvas Architecture](#4-canvas-architecture)
5. [Adapter and Store Design](#5-adapter-and-store-design)
6. [Chrome Integration](#6-chrome-integration)
7. [Persistence and Sync](#7-persistence-and-sync)
8. [Performance and Rendering](#8-performance-and-rendering)
9. [Testing and Validation](#9-testing-and-validation)
10. [File Tree Reference](#10-file-tree-reference)
11. [Phase Rollout Roadmap](#11-phase-rollout-roadmap)
12. [Appendices](#12-appendices)

---

## 1. Introduction

- **Goal:** Describe the overall system architecture for Write-On-App, emphasizing the TLDraw canvas and classroom UX.
- **Scope:** Covers the frontend structure (`apps/write-on-app`) and its supporting libraries.
- **Principles:**

  - Page-first design
  - Clean modular boundaries
  - Stable chrome independent of canvas
  - Deterministic state and exports

---

## 2. System Overview

```
apps/
  write-on-app/       → Next.js front-end
  api/                → (future) backend API
  shared/             → shared types, utilities
packages/
  tldraw/             → TLDraw headless + custom shapes
  ui/                 → shadcn/ui components, Tailwind config
```

- **Monorepo Tooling:** PNPM, TurboRepo, VS Code DevContainer
- **Frameworks:** Next.js 16 (Turbopack), TLDraw v4, Zustand
- **UI Toolkit:** TailwindCSS + shadcn/ui + lucide-react

---

## 3. Core Application Layers

| Layer           | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| Chrome          | Persistent layout elements (AppHeader, TopToolbar, ControlStrip, etc.) |
| Workspace Shell | DOM + transforms wrapping the TLDraw mount                             |
| Canvas Core     | TLDraw runtime and shape definitions                                   |
| Adapters        | Bridge between TLDraw state/events and app stores                      |
| Services        | Persistence, export, sync, and telemetry                               |

---

## 4. Canvas Architecture

Detailed in [`/docs/canvas-architecture.md`](./canvas-architecture.md)

Includes:

- DOM hierarchy and coordinate systems
- Camera contract and centering math
- Page model and sizing
- Input model (pen/finger toggle, gestures)
- Shape system v1
- Testing and acceptance criteria

---

## 5. Adapter and Store Design

### Stores

- `useViewportStore`: viewport size, DPR, scroll, base offsets
- `useUiStore`: tool state, pen mode, color, stroke width
- `usePageStore`: active page, metadata, ordering
- `useSessionStore`: user role (teacher/student), presence

### Adapter

- `useCanvasAdapter()` exposes:

  - camera, commands, ui, page, export, persistence, events

- Ensures TLDraw is headless, app drives chrome/UI.

---

## 6. Chrome Integration

| Component     | Connected Store    | Purpose                |
| ------------- | ------------------ | ---------------------- |
| TopToolbar    | `useUiStore`       | Tools, stroke, color   |
| ControlStrip  | `useViewportStore` | Zoom, pen toggle       |
| PageIndicator | `usePageStore`     | Page switching         |
| AppHeader     | static             | Branding, mode toggles |

---

## 7. Persistence and Sync

- **Local:** IndexedDB + autosave (3s idle)
- **Remote:** Real-time sync (planned for classroom mode)
- **Format:** TL JSON + metadata
- **Export:** PNG, SVG, PDF

---

## 8. Performance and Rendering

- Batch TLDraw updates
- Pure transforms (no cumulative CSS drift)
- Debounced autosave/export
- Lazy TipTap module
- DPI-independent zoom and page centering

---

## 9. Testing and Validation

- Manual test plan (centering, zoom, pen toggle, export)
- Unit tests for `centering.ts`, `camera.ts`, and input handling
- Integration snapshots for adapter behavior

---

## 10. File Tree Reference

Mirrors `/lib/canvas`, `/components/chrome`, `/app/workspace`, etc.
Full structure documented in [`canvas-architecture.md`](./canvas-architecture.md#12-file-structure-proposed)

---

## 11. Phase Rollout Roadmap

| Phase | Focus                                    | Deliverable                  |
| ----- | ---------------------------------------- | ---------------------------- |
| 1     | Core centering, pen mode                 | Working canvas at `/canvas`  |
| 2     | TextBox + export + autosave              | Teacher/students basic tools |
| 3     | Multi-page + indicator                   | Page navigation              |
| 4     | Sync/presence                            | Real-time sessions           |
| 5     | Advanced shapes + teacher layer controls | Full classroom edition       |

---

## 12. Appendices

- **Appendix A:** Centering math reference
- **Appendix B:** TLDraw runtime glossary
- **Appendix C:** Shape extension guide

---

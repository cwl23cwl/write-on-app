# @write-on-app/excalidraw-island

A Web Component island that renders Excalidraw (React 18) inside Shadow DOM, allowing it to be embedded in any host framework (including React 19).

## Overview

This package provides `<excalidraw-island>`, a custom element that:

- ✅ Isolates React 18 + Excalidraw in Shadow DOM
- ✅ Provides typed attribute-based API
- ✅ Dispatches typed CustomEvents
- ✅ Supports multi-instance usage
- ✅ Handles HMR in development
- ✅ Builds to single IIFE bundle for production

## Usage

### Basic Usage

```html
<excalidraw-island 
  scale="1.5" 
  readonly 
  initial-scene='{"elements":[],"appState":{}}'
></excalidraw-island>
```

### With TypeScript

```typescript
import '@write-on-app/excalidraw-island';

const island = document.createElement('excalidraw-island');
island.scale = 1.5;
island.readonly = true;

island.addEventListener('ready', (event) => {
  console.log('Island is ready');
});

island.addEventListener('scenechange', (event) => {
  console.log('Scene changed:', event.detail.scene);
});
```

## API

### Attributes

- `scale: number` - Host-controlled zoom level
- `readonly: boolean` - Disable editing
- `initial-scene: string` - JSON string of initial scene data

### Events

- `ready: CustomEvent` - Island mounted and interactive
- `scenechange: CustomEvent<{scene}>` - Scene data changed
- `export: CustomEvent<{type, blob?, dataURL?}>` - Export completed

### Methods

- `requestExport({type, dpi?})` - Request scene export
- `setScene(scene)` - Programmatically update scene

## Development

### Build Commands

```bash
# Install dependencies
pnpm install

# Development build (ESM with source maps)
pnpm build:dev

# Production build (single IIFE bundle, minified)
pnpm build:prod

# Development with watch mode
pnpm dev

# Development server with HMR (port 3001)
pnpm serve

# Type checking
pnpm typecheck
```

### Development Server

The `pnpm serve` command starts a development server at http://127.0.0.1:3001 with:

- 🏝️ **Test Page**: http://127.0.0.1:3001/index.html
- 📦 **Island Bundle**: http://127.0.0.1:3001/excalidraw-island.js  
- 🔄 **Hot Reload**: Automatic rebuild and reload on file changes
- 🛠️ **Interactive Controls**: Test scale, readonly mode, and export functions

### Build Outputs

**Development** (`pnpm build:dev`):
- Format: ESM module
- Output: `dist/dev/excalidraw-island.js`
- Source maps: External `.js.map` files
- Minification: Disabled

**Production** (`pnpm build:prod`):
- Format: IIFE (Immediately Invoked Function Expression)
- Output: `dist/excalidraw-island.js` (single file)
- Source maps: None
- Minification: Enabled
- Includes: React 18 + Excalidraw + all dependencies

## Architecture

- **Custom Element Shell**: Handles attributes, events, and lifecycle
- **React 18 Interior**: Functional components with hooks
- **Shadow DOM Isolation**: Prevents style conflicts with host
- **Event-Driven API**: Declarative attributes in, CustomEvents out
- **HMR Support**: Hot module reloading for development
- **Single Bundle**: Self-contained production build
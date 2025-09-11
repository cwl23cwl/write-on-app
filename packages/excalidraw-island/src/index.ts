/**
 * Excalidraw Island - Web Component Island
 * 
 * A custom element that renders Excalidraw (React 18) inside Shadow DOM
 * while the host app runs on React 19.
 */

export { ExcalidrawIsland } from './ExcalidrawIsland';
export type { 
  ExcalidrawIslandElement,
  IslandEventMap,
  SceneChangeEvent,
  ReadyEvent,
  ExportEvent 
} from './types';

// Auto-register the custom element
import './ExcalidrawIsland';
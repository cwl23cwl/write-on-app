/**
 * TypeScript definitions for Excalidraw Island custom element
 */

// Simple type definitions - will be replaced with proper Excalidraw types
export interface IslandScene {
  elements: readonly any[];
  appState: Record<string, any>;
}

/**
 * Internal props interface for React layer
 * This represents the parsed and normalized attribute values that will be passed to React components
 */
export interface IslandProps {
  /** Zoom/scale level for the canvas (1.0 = 100%) */
  scale: number;
  /** Whether the canvas is in read-only mode */
  readonly: boolean;
  /** Initial scene data to load */
  initialScene: IslandScene | null;
}

/**
 * Attribute parsing configuration
 * Defines how HTML attributes are parsed into typed props
 */
export interface AttributeConfig {
  /** HTML attribute name */
  attribute: string;
  /** Internal prop name */
  prop: keyof IslandProps;
  /** Parser function to convert string attribute to typed value */
  parser: (value: string | null) => any;
  /** Default value when attribute is not present or parsing fails */
  defaultValue: any;
  /** Validator function to check if parsed value is valid */
  validator?: (value: any) => boolean;
}

/**
 * Update policy for attribute changes
 */
export interface UpdatePolicy {
  /** Debounce delay in milliseconds */
  debounceMs: number;
  /** Whether to batch multiple simultaneous attribute changes */
  batchUpdates: boolean;
  /** Whether to deep compare objects before triggering updates */
  deepCompare: boolean;
}

// Custom event types
export interface SceneChangeEvent extends CustomEvent {
  type: 'scenechange';
  detail: {
    scene: IslandScene;
  };
}

export interface ReadyEvent extends CustomEvent {
  type: 'ready';
  detail: {};
}

export interface ExportEvent extends CustomEvent {
  type: 'export';
  detail: {
    type: 'png' | 'svg';
    blob?: Blob;
    dataURL?: string;
  };
}

// Event map for typed event listeners
export interface IslandEventMap {
  ready: ReadyEvent;
  scenechange: SceneChangeEvent;
  export: ExportEvent;
}

// Custom element interface
export interface ExcalidrawIslandElement extends HTMLElement {
  // Observed attributes
  scale: number;
  readonly: boolean;
  'initial-scene': string;
  
  // Imperative methods (minimal)
  requestExport(options: { type: 'png' | 'svg'; dpi?: number }): void;
  setScene(scene: IslandScene): void;
  
  // Typed event listeners
  addEventListener<K extends keyof IslandEventMap>(
    type: K,
    listener: (event: IslandEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof IslandEventMap>(
    type: K,
    listener: (event: IslandEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
}

// Declare the custom element for TypeScript DOM
declare global {
  interface HTMLElementTagNameMap {
    'excalidraw-island': ExcalidrawIslandElement;
  }
}
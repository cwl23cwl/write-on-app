/**
 * ExcalidrawIsland - Standards-Compliant Custom Element Shell
 * 
 * Tag: <excalidraw-island>
 * Shadow DOM: Open mode for style encapsulation
 * Attributes: scale, readonly, initial-scene
 * Events: ready, scenechange, export
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { 
  ExcalidrawIslandElement, 
  IslandScene, 
  SceneChangeEvent, 
  ReadyEvent, 
  ExportEvent,
  IslandProps 
} from './types';
import { createAttributeBridge, type AttributeBridge } from './AttributeBridge';
import { IslandPlaceholder } from './IslandPlaceholder';

export class ExcalidrawIsland extends HTMLElement implements ExcalidrawIslandElement {
  declare shadowRoot: ShadowRoot;
  private initialized = false;
  private rootContainer: HTMLDivElement | null = null;
  private attributeBridge: AttributeBridge;
  private currentProps: Readonly<IslandProps>;
  private reactRoot: Root | null = null;
  private reactContainer: HTMLDivElement | null = null;
  private readyEventFired = false;
  
  constructor() {
    super();
    this.shadowRoot = this.attachShadow({ mode: 'open' });
    
    // Initialize the attribute bridge
    this.attributeBridge = createAttributeBridge();
    this.currentProps = this.attributeBridge.getProps();
    
    // Set up prop update callback for React layer integration (to be implemented)
    this.attributeBridge.setUpdateCallback((newProps: IslandProps) => {
      this.handlePropsUpdate(newProps);
    });
  }
  
  // Observed attributes
  static get observedAttributes() {
    return ['scale', 'readonly', 'initial-scene'];
  }
  
  // Attribute getters/setters
  get scale(): number {
    return parseFloat(this.getAttribute('scale') || '1');
  }
  
  set scale(value: number) {
    this.setAttribute('scale', value.toString());
  }
  
  get readonly(): boolean {
    return this.hasAttribute('readonly');
  }
  
  set readonly(value: boolean) {
    if (value) {
      this.setAttribute('readonly', '');
    } else {
      this.removeAttribute('readonly');
    }
  }
  
  get 'initial-scene'(): string {
    return this.getAttribute('initial-scene') || '';
  }
  
  set 'initial-scene'(value: string) {
    this.setAttribute('initial-scene', value);
  }
  
  // Lifecycle methods
  connectedCallback() {
    this.initializeElement();
  }
  
  disconnectedCallback() {
    this.cleanupElement();
  }
  
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (this.initialized && oldValue !== newValue) {
      this.handleAttributeChange(name, oldValue, newValue);
    }
  }
  
  // Imperative API methods (minimal)
  requestExport(options: { type: 'png' | 'svg'; dpi?: number }): void {
    console.log('[ExcalidrawIsland] requestExport called:', options);
    // Will be implemented when React components are added
    
    // For now, dispatch a mock export event
    setTimeout(() => {
      this.dispatchExport({
        type: options.type,
        dataURL: `data:image/${options.type};base64,mock-export-data`
      });
    }, 100);
  }
  
  setScene(scene: IslandScene): void {
    console.log('[ExcalidrawIsland] setScene called:', scene);
    // Will be implemented when React components are added
  }
  
  // Props update handler for React layer integration
  private handlePropsUpdate(newProps: IslandProps): void {
    console.log('[ExcalidrawIsland] Props updated:', newProps);
    
    // Store current props
    this.currentProps = newProps;
    
    // Re-render React component with new props
    this.renderReactComponent();
  }

  // Internal methods
  private initializeElement(): void {
    if (this.initialized) return;
    
    console.log('[ExcalidrawIsland] Initializing element');
    
    // Process all initial attributes through the bridge
    this.attributeBridge.processAllAttributes(this);
    
    this.renderShadowDOM();
    this.setupEventListeners();
    this.mountReact();
    this.initialized = true;
  }
  
  private cleanupElement(): void {
    if (!this.initialized) return;
    
    console.log('[ExcalidrawIsland] Cleaning up element');
    
    // Clean up React root first
    this.unmountReact();
    
    // Clean up attribute bridge
    this.attributeBridge.destroy();
    
    this.removeEventListeners();
    this.shadowRoot.innerHTML = '';
    this.rootContainer = null;
    this.initialized = false;
    this.readyEventFired = false;
  }
  
  private handleAttributeChange(name: string, oldValue: string | null, newValue: string | null): void {
    console.log(`[ExcalidrawIsland] Attribute '${name}' changed:`, { oldValue, newValue });
    
    // Process attribute change through the bridge (debounced and batched)
    this.attributeBridge.processAttributeChange(name, this);
  }
  
  private renderShadowDOM(): void {
    // Create base styles for the island
    const styles = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
          box-sizing: border-box;
        }
        
        .island-root {
          width: 100%;
          height: 100%;
          position: relative;
          background: #fafafa;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .react-container {
          width: 100%;
          height: 100%;
          position: relative;
        }
      </style>
    `;
    
    // Create simpler structure for React mounting
    const content = `
      <div class="island-root">
        <div class="react-container"></div>
      </div>
    `;
    
    this.shadowRoot.innerHTML = styles + content;
    this.rootContainer = this.shadowRoot.querySelector('.island-root') as HTMLDivElement;
    this.reactContainer = this.shadowRoot.querySelector('.react-container') as HTMLDivElement;
  }
  
  private setupEventListeners(): void {
    // Add any internal event listeners here
    // For now, just log that setup occurred
    console.log('[ExcalidrawIsland] Event listeners set up');
  }
  
  private removeEventListeners(): void {
    // Remove any internal event listeners here
    console.log('[ExcalidrawIsland] Event listeners removed');
  }

  // React lifecycle methods
  private mountReact(): void {
    if (!this.reactContainer || this.reactRoot) return;
    
    console.log('[ExcalidrawIsland] Mounting React 18 root');
    
    // Create React 18 root
    this.reactRoot = createRoot(this.reactContainer);
    
    // Initial render
    this.renderReactComponent();
  }
  
  private unmountReact(): void {
    if (this.reactRoot) {
      console.log('[ExcalidrawIsland] Unmounting React root');
      this.reactRoot.unmount();
      this.reactRoot = null;
    }
    this.reactContainer = null;
  }
  
  private renderReactComponent(): void {
    if (!this.reactRoot) return;
    
    console.log('[ExcalidrawIsland] Rendering React component with props:', this.currentProps);
    
    // Render the placeholder component with current props
    const element = React.createElement(IslandPlaceholder, {
      props: this.currentProps
    });
    
    this.reactRoot.render(element);
    
    // Fire ready event after first render (only once)
    if (!this.readyEventFired) {
      this.readyEventFired = true;
      // Use a microtask to ensure React has completed rendering
      queueMicrotask(() => {
        this.dispatchReady();
      });
    }
  }
  
  
  // Event dispatch helpers
  protected dispatchReady(): void {
    console.log('[ExcalidrawIsland] Dispatching ready event');
    this.dispatchEvent(new CustomEvent('ready', { detail: {} }) as ReadyEvent);
  }
  
  protected dispatchSceneChange(scene: IslandScene): void {
    console.log('[ExcalidrawIsland] Dispatching scene change event');
    this.dispatchEvent(new CustomEvent('scenechange', { 
      detail: { scene } 
    }) as SceneChangeEvent);
  }
  
  protected dispatchExport(data: { type: 'png' | 'svg'; blob?: Blob; dataURL?: string }): void {
    console.log('[ExcalidrawIsland] Dispatching export event:', data.type);
    this.dispatchEvent(new CustomEvent('export', { 
      detail: data 
    }) as ExportEvent);
  }
}

// Register the custom element
customElements.define('excalidraw-island', ExcalidrawIsland);
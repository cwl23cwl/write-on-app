/**
 * Step 10: Excalidraw Island Web Component
 * 
 * Island architecture component that mounts Excalidraw with:
 * - Dev: Dynamic ESM imports with HMR remounting
 * - Prod: Lazy-loaded single bundle
 * - Scale synchronization from viewport store
 * - Readonly/initial-scene routing logic
 */

type ViewMode = 'teacher' | 'student';
type WriteScope = 'teacher-base' | 'student' | 'teacher-review';

interface ExcalidrawIslandElement extends HTMLElement {
  scale?: number;
  mode?: ViewMode;
  writeScope?: WriteScope;
  baseScene?: string; // JSON string - teacher base layer
  overlayScene?: string; // JSON string - writable layer
}

type ExcalidrawModule = {
  ExcalidrawAdapterMinimal: any;
  ExcalidrawContractAPI: any;
};

class ExcalidrawIsland extends HTMLElement implements ExcalidrawIslandElement {
  private reactRoot: any = null;
  private excalidrawRef: React.RefObject<any> = null;
  private isInitialized = false;
  private currentScale = 1;
  private currentMode: ViewMode = 'teacher';
  private currentWriteScope: WriteScope = 'teacher-base';
  private currentBaseScene: unknown = null;
  private currentOverlayScene: unknown = null;
  private compositeScene: unknown = null;
  
  // HMR tracking for dev environment
  private hmrVersion = 0;
  private lastModuleTimestamp = 0;

  constructor() {
    super();
    // Create shadow DOM for isolation
    this.attachShadow({ mode: 'open' });
    this.excalidrawRef = { current: null };
  }

  static get observedAttributes() {
    return ['scale', 'mode', 'write-scope', 'base-scene', 'overlay-scene'];
  }

  get scale(): number {
    return this.currentScale;
  }

  set scale(value: number) {
    if (typeof value === 'number' && value !== this.currentScale) {
      this.currentScale = value;
      this.updateScale();
    }
  }

  get mode(): ViewMode {
    return this.currentMode;
  }

  set mode(value: ViewMode) {
    if (value && value !== this.currentMode) {
      this.currentMode = value;
      this.updateComposition();
    }
  }

  get writeScope(): WriteScope {
    return this.currentWriteScope;
  }

  set writeScope(value: WriteScope) {
    if (value && value !== this.currentWriteScope) {
      this.currentWriteScope = value;
      this.updateWriteScope();
    }
  }

  get baseScene(): string | null {
    return this.currentBaseScene ? JSON.stringify(this.currentBaseScene) : null;
  }

  set baseScene(value: string | null) {
    if (value) {
      try {
        const scene = JSON.parse(value);
        this.currentBaseScene = scene;
        this.updateComposition();
      } catch (error) {
        console.warn('[ExcalidrawIsland] Invalid base scene JSON:', error);
      }
    } else {
      this.currentBaseScene = null;
      this.updateComposition();
    }
  }

  get overlayScene(): string | null {
    return this.currentOverlayScene ? JSON.stringify(this.currentOverlayScene) : null;
  }

  set overlayScene(value: string | null) {
    if (value) {
      try {
        const scene = JSON.parse(value);
        this.currentOverlayScene = scene;
        this.updateComposition();
      } catch (error) {
        console.warn('[ExcalidrawIsland] Invalid overlay scene JSON:', error);
      }
    } else {
      this.currentOverlayScene = null;
      this.updateComposition();
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this.isInitialized) return;

    switch (name) {
      case 'scale':
        const scale = parseFloat(newValue || '1');
        if (!isNaN(scale)) {
          this.scale = scale;
        }
        break;
      case 'mode':
        this.mode = (newValue as ViewMode) || 'teacher';
        break;
      case 'write-scope':
        this.writeScope = (newValue as WriteScope) || 'teacher-base';
        break;
      case 'base-scene':
        this.baseScene = newValue;
        break;
      case 'overlay-scene':
        this.overlayScene = newValue;
        break;
    }
  }

  async connectedCallback() {
    if (this.isInitialized) return;
    
    // Initialize attributes from DOM
    this.currentScale = parseFloat(this.getAttribute('scale') || '1');
    this.currentMode = (this.getAttribute('mode') as ViewMode) || 'teacher';
    this.currentWriteScope = (this.getAttribute('write-scope') as WriteScope) || 'teacher-base';
    
    const baseSceneAttr = this.getAttribute('base-scene');
    if (baseSceneAttr) {
      this.baseScene = baseSceneAttr;
    }
    
    const overlaySceneAttr = this.getAttribute('overlay-scene');
    if (overlaySceneAttr) {
      this.overlayScene = overlaySceneAttr;
    }

    await this.initializeExcalidraw();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  private async initializeExcalidraw(): Promise<void> {
    try {
      // Step 10: Environment-specific module loading
      const excalidrawModule = await this.loadExcalidrawModule();
      await this.mountReactComponent(excalidrawModule);
      this.isInitialized = true;
      
      // Emit ready event
      this.dispatchEvent(new CustomEvent('island-ready', {
        bubbles: true,
        detail: { element: this }
      }));
      
    } catch (error) {
      console.error('[ExcalidrawIsland] Initialization failed:', error);
      this.renderError(error as Error);
    }
  }

  private async loadExcalidrawModule(): Promise<ExcalidrawModule> {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // Dev: Dynamic ESM import with HMR support
      return await this.loadDevModule();
    } else {
      // Prod: Lazy-loaded single bundle
      return await this.loadProdModule();
    }
  }

  private async loadDevModule(): Promise<ExcalidrawModule> {
    // Add timestamp for HMR invalidation
    const timestamp = Date.now();
    const importPath = `./excalidraw/ExcalidrawAdapterMinimal?t=${timestamp}`;
    
    try {
      const module = await import(importPath);
      
      // Check if module updated (simple HMR detection)
      if (this.lastModuleTimestamp > 0 && timestamp > this.lastModuleTimestamp + 1000) {
        this.hmrVersion++;
        console.log(`[ExcalidrawIsland] HMR detected, remounting (v${this.hmrVersion})`);
        
        // Remount for HMR
        if (this.isInitialized) {
          await this.remountForHMR(module);
        }
      }
      
      this.lastModuleTimestamp = timestamp;
      return {
        ExcalidrawAdapterMinimal: module.ExcalidrawAdapterMinimal,
        ExcalidrawContractAPI: module.ExcalidrawContractAPI
      };
    } catch (error) {
      console.warn('[ExcalidrawIsland] Dev import failed, falling back to direct import');
      const module = await import('./excalidraw/ExcalidrawAdapterMinimal');
      return {
        ExcalidrawAdapterMinimal: module.ExcalidrawAdapterMinimal,
        ExcalidrawContractAPI: module.ExcalidrawContractAPI
      };
    }
  }

  private async loadProdModule(): Promise<ExcalidrawModule> {
    // Prod: Single lazy-loaded bundle
    // In production, webpack/Next.js will handle bundling
    const module = await import('./excalidraw/ExcalidrawAdapterMinimal');
    return {
      ExcalidrawAdapterMinimal: module.ExcalidrawAdapterMinimal,
      ExcalidrawContractAPI: module.ExcalidrawContractAPI
    };
  }

  private async mountReactComponent(excalidrawModule: ExcalidrawModule): Promise<void> {
    // Import React and ReactDOM dynamically to avoid SSR issues
    const [React, ReactDOM] = await Promise.all([
      import('react'),
      import('react-dom/client')
    ]);

    if (!this.shadowRoot) return;

    // Create container for React component
    const container = document.createElement('div');
    container.style.cssText = 'width: 100%; height: 100%; position: relative;';
    this.shadowRoot.appendChild(container);

    // Create React root
    this.reactRoot = ReactDOM.createRoot(container);

    // Render Excalidraw adapter with composite scene
    this.updateComposition();
    
    const ExcalidrawComponent = React.createElement(
      excalidrawModule.ExcalidrawAdapterMinimal,
      {
        ref: this.excalidrawRef,
        initialData: this.compositeScene,
        readOnly: this.isWriteRestricted(),
        mode: this.currentMode,
        writeScope: this.currentWriteScope,
        currentStudentId: this.getCurrentStudentId(),
        onReady: (api: any) => {
          console.log('[ExcalidrawIsland] Excalidraw API ready');
          this.dispatchEvent(new CustomEvent('excalidraw-ready', {
            bubbles: true,
            detail: { api, element: this }
          }));
        },
        className: 'excalidraw-island-content',
        testId: 'excalidraw-island'
      }
    );

    this.reactRoot.render(ExcalidrawComponent);
  }

  private async remountForHMR(excalidrawModule: ExcalidrawModule): Promise<void> {
    // Clean up current instance
    if (this.reactRoot) {
      this.reactRoot.unmount();
    }

    // Clear shadow root
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = '';
    }

    // Remount with new module
    await this.mountReactComponent(excalidrawModule);
    
    console.log('[ExcalidrawIsland] HMR remount complete');
  }

  private updateScale(): void {
    // Sync scale to Excalidraw instance
    if (this.excalidrawRef?.current) {
      // Scale is handled by viewport store integration in the adapter
      console.log(`[ExcalidrawIsland] Scale updated to ${this.currentScale}`);
    }
  }

  private isWriteRestricted(): boolean {
    // Determine if current layer is writable based on write-scope
    // For now, all layers are writable - restriction will be handled by filtering edits
    return false;
  }

  private updateWriteScope(): void {
    // Update write permissions - requires remounting for significant scope changes
    console.log(`[ExcalidrawIsland] Write scope updated to ${this.currentWriteScope}`);
    if (this.isInitialized) {
      this.reinitialize();
    }
  }

  private updateComposition(): void {
    // Composite base and overlay scenes into a single scene
    this.compositeScene = this.compositeLayers();
    
    // Update Excalidraw if already initialized
    if (this.excalidrawRef?.current && this.compositeScene) {
      try {
        this.excalidrawRef.current.setScene(this.compositeScene);
        console.log('[ExcalidrawIsland] Composite scene updated');
      } catch (error) {
        console.warn('[ExcalidrawIsland] Composite scene update failed:', error);
      }
    }
  }

  private compositeLayers(): unknown {
    // Layer composition: [Teacher Base] → [Student/Teacher Review Overlay]
    // This creates the visual stack similar to Photoshop layers
    
    const baseElements = this.getSceneElements(this.currentBaseScene) || [];
    const overlayElements = this.getSceneElements(this.currentOverlayScene) || [];
    
    // Tag elements with ownership and combine
    const combinedElements = [
      // Base elements tagged as teacher-owned
      ...baseElements.map(el => ({ 
        ...el, 
        locked: this.isBaseElementLocked(el),
        owner: 'teacher', // Teacher base layer elements
        // Make unselectable if not in current write scope
        selectable: this.currentWriteScope === 'teacher-base',
        // Visual indicator for cross-layer content
        strokeWidth: this.currentWriteScope === 'teacher-base' ? el.strokeWidth : (el.strokeWidth || 1),
        opacity: this.currentWriteScope === 'teacher-base' ? 1 : 0.7
      })),
      // Overlay elements tagged based on current write scope  
      ...overlayElements.map(el => ({
        ...el,
        owner: this.getOverlayElementOwner(), // Student or teacher-review elements
        // Overlay elements are always selectable in their layer
        selectable: true,
        opacity: 1
      }))
    ];
    
    // Merge appStates - overlay takes precedence for conflicting properties
    const baseAppState = this.getSceneAppState(this.currentBaseScene) || {};
    const overlayAppState = this.getSceneAppState(this.currentOverlayScene) || {};
    const combinedAppState = { ...baseAppState, ...overlayAppState };
    
    // Combine files from both layers
    const baseFiles = this.getSceneFiles(this.currentBaseScene) || {};
    const overlayFiles = this.getSceneFiles(this.currentOverlayScene) || {};
    const combinedFiles = { ...baseFiles, ...overlayFiles };
    
    const composite = {
      elements: combinedElements,
      appState: combinedAppState,
      files: combinedFiles
    };
    
    console.log(`[ExcalidrawIsland] Composited ${baseElements.length} base + ${overlayElements.length} overlay elements with ownership tags`);
    
    // Emit layersready event when composition completes (optional API)
    this.dispatchEvent(new CustomEvent('layersready', {
      bubbles: true,
      detail: { 
        baseElements: baseElements.length,
        overlayElements: overlayElements.length,
        totalElements: combinedElements.length 
      }
    }));
    
    return composite;
  }

  private getSceneElements(scene: unknown): any[] {
    return scene && typeof scene === 'object' && Array.isArray((scene as any).elements) 
      ? (scene as any).elements 
      : [];
  }

  private getSceneAppState(scene: unknown): Record<string, unknown> {
    return scene && typeof scene === 'object' && (scene as any).appState
      ? (scene as any).appState
      : {};
  }

  private getSceneFiles(scene: unknown): Record<string, unknown> {
    return scene && typeof scene === 'object' && (scene as any).files
      ? (scene as any).files
      : {};
  }

  private isBaseElementLocked(element: any): boolean {
    // Base layer elements are locked unless we're in teacher-base write scope
    return this.currentWriteScope !== 'teacher-base';
  }

  private getOverlayElementOwner(): string {
    // Determine owner tag for overlay elements based on write scope
    switch (this.currentWriteScope) {
      case 'student':
        // For now, use a placeholder student ID - in real app this would come from context
        return 'student:current-student-id';
      case 'teacher-review':
        // For now, use a placeholder student ID - in real app this would come from context
        return 'teacher-review:current-student-id';
      case 'teacher-base':
        return 'teacher';
      default:
        return 'teacher';
    }
  }

  private getCurrentStudentId(): string {
    // TODO: This should come from route context or user session
    // For now, return a placeholder
    return 'current-student-id';
  }

  private renderError(error: Error): void {
    if (!this.shadowRoot) return;
    
    this.shadowRoot.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        padding: 20px;
        background: #fff;
        border: 2px dashed #e5e5e5;
        border-radius: 8px;
        color: #666;
        font-family: system-ui, sans-serif;
      ">
        <h3 style="margin: 0 0 10px 0; color: #e53e3e;">Excalidraw Island Error</h3>
        <p style="margin: 0; text-align: center; font-size: 14px;">${error.message}</p>
        <button 
          id="retry-btn"
          style="
            margin-top: 15px;
            padding: 8px 16px;
            background: #3182ce;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          "
        >
          Retry
        </button>
      </div>
    `;

    // Add retry functionality
    const retryBtn = this.shadowRoot.querySelector('#retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.reinitialize();
      });
    }
  }

  private async reinitialize(): Promise<void> {
    this.cleanup();
    this.isInitialized = false;
    await this.initializeExcalidraw();
  }

  private cleanup(): void {
    if (this.reactRoot) {
      try {
        this.reactRoot.unmount();
      } catch (error) {
        console.warn('[ExcalidrawIsland] Cleanup error:', error);
      }
      this.reactRoot = null;
    }
    
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = '';
    }
  }

  // Imperative API for external control
  public getExcalidrawAPI() {
    return this.excalidrawRef?.current || null;
  }

  public async requestExport(options: { 
    type: 'png' | 'svg'; 
    dpi?: number;
    layers?: ('base' | 'overlay')[]
  }) {
    const api = this.getExcalidrawAPI();
    if (!api || typeof api.requestExport !== 'function') {
      throw new Error('Excalidraw API not ready');
    }
    
    // Handle selective layer export (optional API)
    if (options.layers && options.layers.length > 0) {
      console.log(`[ExcalidrawIsland] Exporting specific layers:`, options.layers);
      
      // Create a custom scene with only requested layers
      let exportElements: any[] = [];
      
      if (options.layers.includes('base')) {
        const baseElements = this.getSceneElements(this.currentBaseScene) || [];
        exportElements.push(...baseElements.map(el => ({ ...el, owner: 'teacher' })));
      }
      
      if (options.layers.includes('overlay')) {
        const overlayElements = this.getSceneElements(this.currentOverlayScene) || [];
        exportElements.push(...overlayElements.map(el => ({ 
          ...el, 
          owner: this.getOverlayElementOwner() 
        })));
      }
      
      // For selective export, we'd need to temporarily set the scene
      // This is complex with the current architecture, so we'll log for now
      console.log(`[ExcalidrawIsland] Would export ${exportElements.length} elements from selected layers`);
    }
    
    // Default behavior: export flattened composite (all visible layers)
    return await api.requestExport({
      type: options.type,
      dpi: options.dpi
    });
  }

  public async setScene(scene: unknown) {
    const api = this.getExcalidrawAPI();
    if (api && typeof api.setScene === 'function') {
      return await api.setScene(scene);
    }
    throw new Error('Excalidraw API not ready');
  }
}

// Register the Web Component
if (typeof window !== 'undefined' && !customElements.get('excalidraw-island')) {
  customElements.define('excalidraw-island', ExcalidrawIsland);
}

export { ExcalidrawIsland };
export type { ExcalidrawIslandElement };
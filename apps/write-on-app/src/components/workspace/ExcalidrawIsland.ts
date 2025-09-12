/**
 * Step 10: Excalidraw Island Web Component
 * 
 * Island architecture component that mounts Excalidraw with:
 * - Dev: Dynamic ESM imports with HMR remounting
 * - Prod: Lazy-loaded single bundle
 * - Scale synchronization from viewport store
 * - Readonly/initial-scene routing logic
 */

interface ExcalidrawIslandElement extends HTMLElement {
  scale?: number;
  readonly?: boolean;
  initialScene?: string; // JSON string
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
  private isReadonly = false;
  private currentScene: unknown = null;
  
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
    return ['scale', 'readonly', 'initial-scene'];
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

  get readonly(): boolean {
    return this.isReadonly;
  }

  set readonly(value: boolean) {
    if (typeof value === 'boolean' && value !== this.isReadonly) {
      this.isReadonly = value;
      this.updateReadonly();
    }
  }

  get initialScene(): string | null {
    return this.currentScene ? JSON.stringify(this.currentScene) : null;
  }

  set initialScene(value: string | null) {
    if (value) {
      try {
        const scene = JSON.parse(value);
        this.currentScene = scene;
        this.updateScene();
      } catch (error) {
        console.warn('[ExcalidrawIsland] Invalid initial scene JSON:', error);
      }
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
      case 'readonly':
        this.readonly = newValue === 'true';
        break;
      case 'initial-scene':
        this.initialScene = newValue;
        break;
    }
  }

  async connectedCallback() {
    if (this.isInitialized) return;
    
    // Initialize attributes from DOM
    this.currentScale = parseFloat(this.getAttribute('scale') || '1');
    this.isReadonly = this.getAttribute('readonly') === 'true';
    const initialSceneAttr = this.getAttribute('initial-scene');
    if (initialSceneAttr) {
      this.initialScene = initialSceneAttr;
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
    const importPath = `/src/components/workspace/excalidraw/ExcalidrawAdapterMinimal?t=${timestamp}`;
    
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
      const module = await import('@/components/workspace/excalidraw/ExcalidrawAdapterMinimal');
      return {
        ExcalidrawAdapterMinimal: module.ExcalidrawAdapterMinimal,
        ExcalidrawContractAPI: module.ExcalidrawContractAPI
      };
    }
  }

  private async loadProdModule(): Promise<ExcalidrawModule> {
    // Prod: Single lazy-loaded bundle
    // In production, webpack/Next.js will handle bundling
    const module = await import('@/components/workspace/excalidraw/ExcalidrawAdapterMinimal');
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

    // Render Excalidraw adapter
    const ExcalidrawComponent = React.createElement(
      excalidrawModule.ExcalidrawAdapterMinimal,
      {
        ref: this.excalidrawRef,
        initialData: this.currentScene,
        readOnly: this.isReadonly,
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

  private updateReadonly(): void {
    // Update readonly state - requires remounting for now
    console.log(`[ExcalidrawIsland] Readonly updated to ${this.isReadonly}`);
    if (this.isInitialized) {
      // For now, we'll need to remount to change readonly
      // This could be optimized to use the adapter's API directly
      this.reinitialize();
    }
  }

  private updateScene(): void {
    // Update scene via imperative API
    if (this.excalidrawRef?.current && this.currentScene) {
      try {
        this.excalidrawRef.current.setScene(this.currentScene);
        console.log('[ExcalidrawIsland] Scene updated');
      } catch (error) {
        console.warn('[ExcalidrawIsland] Scene update failed:', error);
      }
    }
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

  public async requestExport(options: { type: 'png' | 'svg'; dpi?: number }) {
    const api = this.getExcalidrawAPI();
    if (api && typeof api.requestExport === 'function') {
      return await api.requestExport(options);
    }
    throw new Error('Excalidraw API not ready');
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
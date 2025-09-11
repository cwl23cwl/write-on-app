"use strict";var ExcalidrawIsland=(()=>{var l=Object.defineProperty;var r=Object.getOwnPropertyDescriptor;var c=Object.getOwnPropertyNames;var p=Object.prototype.hasOwnProperty;var h=(a,n)=>{for(var e in n)l(a,e,{get:n[e],enumerable:!0})},g=(a,n,e,i)=>{if(n&&typeof n=="object"||typeof n=="function")for(let t of c(n))!p.call(a,t)&&t!==e&&l(a,t,{get:()=>n[t],enumerable:!(i=r(n,t))||i.enumerable});return a};var v=a=>g(l({},"__esModule",{value:!0}),a);var u={};h(u,{ExcalidrawIsland:()=>s});var s=class extends HTMLElement{constructor(){super();this.initialized=!1;this.rootContainer=null;this.shadowRoot=this.attachShadow({mode:"open"})}static get observedAttributes(){return["scale","readonly","initial-scene"]}get scale(){return parseFloat(this.getAttribute("scale")||"1")}set scale(e){this.setAttribute("scale",e.toString())}get readonly(){return this.hasAttribute("readonly")}set readonly(e){e?this.setAttribute("readonly",""):this.removeAttribute("readonly")}get"initial-scene"(){return this.getAttribute("initial-scene")||""}set"initial-scene"(e){this.setAttribute("initial-scene",e)}connectedCallback(){this.initializeElement()}disconnectedCallback(){this.cleanupElement()}attributeChangedCallback(e,i,t){this.initialized&&i!==t&&this.handleAttributeChange(e,i,t)}requestExport(e){console.log("[ExcalidrawIsland] requestExport called:",e),setTimeout(()=>{this.dispatchExport({type:e.type,dataURL:`data:image/${e.type};base64,mock-export-data`})},100)}setScene(e){console.log("[ExcalidrawIsland] setScene called:",e)}initializeElement(){this.initialized||(console.log("[ExcalidrawIsland] Initializing element"),this.renderShadowDOM(),this.setupEventListeners(),this.initialized=!0,setTimeout(()=>{this.dispatchReady()},100))}cleanupElement(){this.initialized&&(console.log("[ExcalidrawIsland] Cleaning up element"),this.removeEventListeners(),this.shadowRoot.innerHTML="",this.rootContainer=null,this.initialized=!1)}handleAttributeChange(e,i,t){switch(console.log(`[ExcalidrawIsland] Attribute '${e}' changed:`,{oldValue:i,newValue:t}),e){case"scale":this.updateScale();break;case"readonly":this.updateReadonly();break;case"initial-scene":this.updateInitialScene();break}}renderShadowDOM(){let e=`
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
        
        .loading-skeleton {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #6b7280;
          background: #fafafa;
        }
        
        .loading-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          opacity: 0.7;
        }
        
        .loading-text {
          font-size: 14px;
          font-weight: 500;
        }
        
        .loading-subtext {
          font-size: 12px;
          margin-top: 4px;
          opacity: 0.7;
        }
        
        .debug-info {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 10px;
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.8);
          padding: 4px 6px;
          border-radius: 4px;
          font-family: monospace;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        
        .loading-icon {
          animation: pulse 2s ease-in-out infinite;
        }
      </style>
    `,i=this.scale,t=this.readonly,o=this["initial-scene"].length>0,d=`
      <div class="island-root">
        <div class="debug-info">
          scale: ${i} | readonly: ${t} | scene: ${o?"provided":"none"}
        </div>
        <div class="loading-skeleton">
          <svg class="loading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <div class="loading-text">Excalidraw Island</div>
          <div class="loading-subtext">Custom element shell initialized</div>
        </div>
      </div>
    `;this.shadowRoot.innerHTML=e+d,this.rootContainer=this.shadowRoot.querySelector(".island-root")}setupEventListeners(){console.log("[ExcalidrawIsland] Event listeners set up")}removeEventListeners(){console.log("[ExcalidrawIsland] Event listeners removed")}updateScale(){console.log(`[ExcalidrawIsland] Scale updated to: ${this.scale}`);let e=this.shadowRoot.querySelector(".debug-info");if(e){let i=this.scale,t=this.readonly,o=this["initial-scene"].length>0;e.textContent=`scale: ${i} | readonly: ${t} | scene: ${o?"provided":"none"}`}}updateReadonly(){console.log(`[ExcalidrawIsland] Readonly updated to: ${this.readonly}`),this.updateScale()}updateInitialScene(){console.log(`[ExcalidrawIsland] Initial scene updated, length: ${this["initial-scene"].length}`),this.updateScale()}dispatchReady(){console.log("[ExcalidrawIsland] Dispatching ready event"),this.dispatchEvent(new CustomEvent("ready",{detail:{}}))}dispatchSceneChange(e){console.log("[ExcalidrawIsland] Dispatching scene change event"),this.dispatchEvent(new CustomEvent("scenechange",{detail:{scene:e}}))}dispatchExport(e){console.log("[ExcalidrawIsland] Dispatching export event:",e.type),this.dispatchEvent(new CustomEvent("export",{detail:e}))}};customElements.define("excalidraw-island",s);return v(u);})();

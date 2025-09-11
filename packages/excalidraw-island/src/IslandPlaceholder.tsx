/**
 * IslandPlaceholder - React component placeholder for development and testing
 * 
 * This component displays the current props to verify the attribute bridge
 * is working correctly and React is properly mounted inside the Shadow DOM.
 */

import React from 'react';
import type { IslandProps, IslandScene } from './types';

interface IslandPlaceholderProps {
  props: IslandProps;
}

export const IslandPlaceholder: React.FC<IslandPlaceholderProps> = ({ props }) => {
  const renderSceneInfo = (scene: IslandScene | null) => {
    if (!scene) return 'None';
    
    const elementCount = scene.elements?.length ?? 0;
    const appStateKeys = Object.keys(scene.appState || {}).length;
    
    return (
      <div className="scene-details">
        <div>Elements: {elementCount}</div>
        <div>AppState Keys: {appStateKeys}</div>
        {elementCount > 0 && (
          <div className="element-types">
            Types: {[...new Set(scene.elements.map(el => el.type))].join(', ')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="island-placeholder">
      <div className="island-header">
        <div className="island-title">
          <svg className="island-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <span>Excalidraw Island</span>
          <span className="react-badge">React 18</span>
        </div>
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>Island Ready</span>
        </div>
      </div>

      <div className="props-display">
        <h3>Current Props</h3>
        <div className="prop-grid">
          <div className="prop-item">
            <label>Scale:</label>
            <div className="prop-value">
              <span className="value">{props.scale}</span>
              <span className="percentage">({Math.round(props.scale * 100)}%)</span>
            </div>
          </div>

          <div className="prop-item">
            <label>Readonly:</label>
            <div className="prop-value">
              <span className={`boolean-value ${props.readonly}`}>
                {props.readonly ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          <div className="prop-item">
            <label>Initial Scene:</label>
            <div className="prop-value scene-value">
              {renderSceneInfo(props.initialScene)}
            </div>
          </div>
        </div>
      </div>

      <div className="debug-info">
        <h4>Debug Information</h4>
        <div className="debug-grid">
          <div className="debug-item">
            <span className="debug-label">React Version:</span>
            <span className="debug-value">{React.version}</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Shadow DOM:</span>
            <span className="debug-value">Active</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Props Updated:</span>
            <span className="debug-value">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <style>{`
        .island-placeholder {
          width: 100%;
          height: 100%;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          color: #334155;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
        }

        .island-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
        }

        .island-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
        }

        .island-icon {
          width: 24px;
          height: 24px;
          color: #3b82f6;
        }

        .react-badge {
          background: #61dafb;
          color: #1e293b;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 12px;
          border: 1px solid #0ea5e9;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #059669;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .props-display {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .props-display h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        .prop-grid {
          display: grid;
          gap: 16px;
        }

        .prop-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }

        .prop-item label {
          font-weight: 500;
          color: #475569;
          min-width: 100px;
        }

        .prop-value {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .value {
          font-weight: 600;
          color: #1e293b;
        }

        .percentage {
          font-size: 12px;
          color: #64748b;
        }

        .boolean-value {
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          text-transform: uppercase;
        }

        .boolean-value.true {
          background: #dcfce7;
          color: #166534;
        }

        .boolean-value.false {
          background: #fef2f2;
          color: #991b1b;
        }

        .scene-value {
          max-width: 200px;
        }

        .scene-details {
          font-size: 14px;
          line-height: 1.4;
        }

        .element-types {
          margin-top: 4px;
          font-size: 12px;
          color: #64748b;
        }

        .debug-info {
          background: #1e293b;
          color: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          font-size: 12px;
          margin-top: auto;
        }

        .debug-info h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #cbd5e1;
        }

        .debug-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
        }

        .debug-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #374151;
        }

        .debug-item:last-child {
          border-bottom: none;
        }

        .debug-label {
          color: #9ca3af;
        }

        .debug-value {
          color: #f3f4f6;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
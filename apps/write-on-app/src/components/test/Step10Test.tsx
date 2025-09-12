/**
 * Step 10: Host App Wiring Test Component
 * 
 * Tests:
 * - Island mounting in workspace
 * - Scale synchronization
 * - Readonly/initial-scene routing
 * - Toolbar positioning
 * - Page scroll functionality
 * - Zoom smoothness
 * - Island interactivity
 */

"use client";

import { useState } from 'react';
import { useViewportStore } from '@/state';

export function Step10Test() {
  const [testParams, setTestParams] = useState({
    mode: 'dev',
    scene: null as unknown,
  });

  const { scale, setScale, zoomIn, zoomOut } = useViewportStore((state) => ({
    scale: state.viewport.scale,
    setScale: state.setScale,
    zoomIn: state.zoomIn,
    zoomOut: state.zoomOut,
  }));

  const testScaleSync = (newScale: number) => {
    console.log(`[Step10Test] Setting scale to ${newScale}`);
    setScale(newScale);
  };

  const testReadonlyMode = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('mode', 'readonly');
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Switched to readonly mode');
  };

  const testTeacherMode = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('mode', 'teacher');
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Switched to teacher mode');
  };

  const testWithInitialScene = () => {
    const testScene = {
      elements: [
        {
          id: 'test-rect-' + Date.now(),
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 100,
          strokeColor: '#1971c2',
          backgroundColor: '#a5d8ff',
        }
      ],
      appState: {
        viewBackgroundColor: '#ffffff',
      }
    };

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('scene', encodeURIComponent(JSON.stringify(testScene)));
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Added initial scene to URL');
    window.location.reload(); // Reload to apply scene
  };

  const clearUrlParams = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('mode');
    currentUrl.searchParams.delete('scene');
    currentUrl.searchParams.delete('workspace');
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Cleared URL parameters');
    window.location.reload();
  };

  return (
    <div className="fixed top-4 left-4 z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-xs">
      <h3 className="text-lg font-bold mb-3 text-gray-800">🏝️ Step 10: Island Test</h3>
      
      {/* Scale Testing */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-gray-700 text-sm">Scale Sync Test</h4>
        <div className="text-xs text-gray-600">Current: {(scale * 100).toFixed(0)}%</div>
        <div className="flex gap-1">
          <button 
            onClick={() => testScaleSync(0.5)} 
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            50%
          </button>
          <button 
            onClick={() => testScaleSync(1)} 
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            100%
          </button>
          <button 
            onClick={() => testScaleSync(1.5)} 
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            150%
          </button>
          <button 
            onClick={() => testScaleSync(2)} 
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            200%
          </button>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={zoomIn}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            Zoom In
          </button>
          <button 
            onClick={zoomOut}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            Zoom Out
          </button>
        </div>
      </div>

      {/* Route Testing */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-gray-700 text-sm">Route Mode Test</h4>
        <div className="flex gap-1">
          <button 
            onClick={testReadonlyMode}
            className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Readonly
          </button>
          <button 
            onClick={testTeacherMode}
            className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Teacher
          </button>
        </div>
      </div>

      {/* Scene Testing */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-gray-700 text-sm">Scene Test</h4>
        <button 
          onClick={testWithInitialScene}
          className="w-full px-2 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          Load Test Scene
        </button>
      </div>

      {/* Reset */}
      <div className="space-y-2">
        <button 
          onClick={clearUrlParams}
          className="w-full px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear & Reset
        </button>
      </div>

      {/* Status */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Server: http://localhost:3003
        </div>
        <div className="text-xs text-gray-500">
          Mode: Dev Environment
        </div>
      </div>
    </div>
  );
}
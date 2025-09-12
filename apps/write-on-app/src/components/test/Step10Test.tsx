/**
 * Step 10: Host App Wiring Test Component
 * 
 * Tests:
 * - Island mounting in workspace
 * - Scale synchronization
 * - Write-scope model (teacher-base, student, teacher-review)
 * - Layer composition (base + overlay scenes)
 * - Mode switching (teacher vs student view)
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

  const testStudentMode = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('mode', 'student');
    currentUrl.searchParams.set('write-scope', 'student');
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Switched to student mode (write-scope: student)');
  };

  const testTeacherMode = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('mode', 'teacher');
    currentUrl.searchParams.set('write-scope', 'teacher-base');
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Switched to teacher mode (write-scope: teacher-base)');
  };

  const testTeacherReviewMode = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('mode', 'teacher');
    currentUrl.searchParams.set('write-scope', 'teacher-review');
    currentUrl.searchParams.set('student', 'student123'); // Mock student ID
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Switched to teacher review mode (write-scope: teacher-review)');
  };

  const testWithBaseScene = () => {
    const baseScene = {
      elements: [
        {
          id: 'base-rect-' + Date.now(),
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
    currentUrl.searchParams.set('base-scene', encodeURIComponent(JSON.stringify(baseScene)));
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Added base scene to URL');
    window.location.reload();
  };

  const testWithOverlayScene = () => {
    const overlayScene = {
      elements: [
        {
          id: 'overlay-circle-' + Date.now(),
          type: 'ellipse',
          x: 250,
          y: 150,
          width: 100,
          height: 100,
          strokeColor: '#c2410c',
          backgroundColor: '#fed7aa',
        }
      ],
      appState: {}
    };

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('overlay-scene', encodeURIComponent(JSON.stringify(overlayScene)));
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Added overlay scene to URL');
    window.location.reload();
  };

  const testWithLayeredScenes = () => {
    const baseScene = {
      elements: [
        {
          id: 'base-rect-' + Date.now(),
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 100,
          strokeColor: '#1971c2',
          backgroundColor: '#a5d8ff',
        }
      ],
      appState: { viewBackgroundColor: '#ffffff' }
    };

    const overlayScene = {
      elements: [
        {
          id: 'overlay-circle-' + Date.now(),
          type: 'ellipse',
          x: 250,
          y: 150,
          width: 100,
          height: 100,
          strokeColor: '#c2410c',
          backgroundColor: '#fed7aa',
        }
      ],
      appState: {}
    };

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('base-scene', encodeURIComponent(JSON.stringify(baseScene)));
    currentUrl.searchParams.set('overlay-scene', encodeURIComponent(JSON.stringify(overlayScene)));
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Added layered scenes to URL');
    window.location.reload();
  };

  // Assignment-based testing
  const testStudentAssignment = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('assignment', 'test-assignment-1');
    currentUrl.searchParams.set('user', 'student-alice');
    currentUrl.searchParams.set('mode', 'student');
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Loading student assignment view');
    window.location.reload();
  };

  const testTeacherReview = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('assignment', 'test-assignment-1');
    currentUrl.searchParams.set('user', 'teacher-bob');
    currentUrl.searchParams.set('student', 'student-alice');
    currentUrl.searchParams.set('mode', 'teacher');
    currentUrl.searchParams.set('write-scope', 'teacher-review');
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Loading teacher review mode');
    window.location.reload();
  };

  const testTeacherBase = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('assignment', 'test-assignment-1');
    currentUrl.searchParams.set('user', 'teacher-bob');
    currentUrl.searchParams.set('mode', 'teacher');
    currentUrl.searchParams.set('write-scope', 'teacher-base');
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Loading teacher base editing mode');
    window.location.reload();
  };

  // DOM API test
  const testDOMAPI = () => {
    // Demonstrate the minimal DOM-native API
    const currentUrl = new URL(window.location.href);
    // Use the new DOM attributes
    currentUrl.searchParams.set('mode', 'student');
    currentUrl.searchParams.set('write-scope', 'student'); 
    currentUrl.searchParams.set('base-scene', encodeURIComponent(JSON.stringify({
      elements: [{
        id: 'teacher-demo-' + Date.now(),
        type: 'rectangle', x: 100, y: 100, width: 120, height: 80,
        strokeColor: '#1971c2', backgroundColor: '#e7f5ff',
        owner: 'teacher'
      }]
    })));
    currentUrl.searchParams.set('overlay-scene', encodeURIComponent(JSON.stringify({
      elements: [{
        id: 'student-demo-' + Date.now(),
        type: 'ellipse', x: 180, y: 140, width: 60, height: 60,
        strokeColor: '#c2410c', backgroundColor: '#fed7aa',
        owner: 'student:alice'
      }]
    })));
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] DOM API Demo: mode="student", write-scope="student", base-scene + overlay-scene');
    console.log('[Step10Test] Watch console for scenechange and layersready events!');
    window.location.reload();
  };

  // Cross-layer interaction test
  const testCrossLayerInteraction = () => {
    // Create a scene with teacher base + student overlay to test selection blocking
    const teacherBase = {
      elements: [
        {
          id: 'teacher-rect-' + Date.now(),
          type: 'rectangle',
          x: 50,
          y: 50,
          width: 150,
          height: 100,
          strokeColor: '#1971c2',
          backgroundColor: '#e7f5ff',
          owner: 'teacher'
        }
      ],
      appState: { viewBackgroundColor: '#ffffff' }
    };

    const studentOverlay = {
      elements: [
        {
          id: 'student-circle-' + Date.now(),
          type: 'ellipse',
          x: 150,
          y: 100,
          width: 80,
          height: 80,
          strokeColor: '#c2410c',
          backgroundColor: '#fed7aa',
          owner: 'student:student-alice'
        }
      ],
      appState: {}
    };

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('base-scene', encodeURIComponent(JSON.stringify(teacherBase)));
    currentUrl.searchParams.set('overlay-scene', encodeURIComponent(JSON.stringify(studentOverlay)));
    currentUrl.searchParams.set('mode', 'student');
    currentUrl.searchParams.set('write-scope', 'student');
    currentUrl.searchParams.set('user', 'student-alice');
    window.history.pushState({}, '', currentUrl.toString());
    console.log('[Step10Test] Created cross-layer test scene (student view)');
    console.log('[Step10Test] Try to select the blue rectangle - it should be unselectable!');
    window.location.reload();
  };

  const clearUrlParams = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('mode');
    currentUrl.searchParams.delete('write-scope');
    currentUrl.searchParams.delete('scene'); // Legacy
    currentUrl.searchParams.delete('base-scene');
    currentUrl.searchParams.delete('overlay-scene');
    currentUrl.searchParams.delete('workspace');
    currentUrl.searchParams.delete('student');
    currentUrl.searchParams.delete('assignment');
    currentUrl.searchParams.delete('user');
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

      {/* Write-Scope Testing */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-gray-700 text-sm">Write-Scope Test</h4>
        <div className="space-y-1">
          <button 
            onClick={testStudentMode}
            className="w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Student Mode
          </button>
          <button 
            onClick={testTeacherMode}
            className="w-full px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            Teacher Base
          </button>
          <button 
            onClick={testTeacherReviewMode}
            className="w-full px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Teacher Review
          </button>
        </div>
      </div>

      {/* Layer Testing */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-gray-700 text-sm">Layer Test</h4>
        <div className="space-y-1">
          <button 
            onClick={testWithBaseScene}
            className="w-full px-2 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Base Layer
          </button>
          <button 
            onClick={testWithOverlayScene}
            className="w-full px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Overlay Layer
          </button>
          <button 
            onClick={testWithLayeredScenes}
            className="w-full px-2 py-1 text-xs bg-pink-500 text-white rounded hover:bg-pink-600"
          >
            Both Layers
          </button>
        </div>
      </div>

      {/* Assignment Testing */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-gray-700 text-sm">Assignment Test</h4>
        <div className="space-y-1">
          <button 
            onClick={testStudentAssignment}
            className="w-full px-2 py-1 text-xs bg-cyan-500 text-white rounded hover:bg-cyan-600"
          >
            Student View
          </button>
          <button 
            onClick={testTeacherBase}
            className="w-full px-2 py-1 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600"
          >
            Teacher Base
          </button>
          <button 
            onClick={testTeacherReview}
            className="w-full px-2 py-1 text-xs bg-violet-500 text-white rounded hover:bg-violet-600"
          >
            Teacher Review
          </button>
        </div>
      </div>

      {/* DOM API Testing */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-gray-700 text-sm">DOM API Test</h4>
        <button 
          onClick={testDOMAPI}
          className="w-full px-2 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          📡 DOM-Native API
        </button>
        <div className="text-xs text-gray-500 mt-1">
          Tests mode, write-scope, base-scene, overlay-scene attributes + events
        </div>
      </div>

      {/* Interaction Testing */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-gray-700 text-sm">Interaction Test</h4>
        <button 
          onClick={testCrossLayerInteraction}
          className="w-full px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
        >
          🚫 Cross-Layer Block
        </button>
        <div className="text-xs text-gray-500 mt-1">
          Creates teacher + student layers. Try selecting teacher content as student!
        </div>
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
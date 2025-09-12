"use client";

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ExcalidrawContractAPI } from '@/components/workspace/excalidraw/ExcalidrawAdapter';

// Dynamically import ExcalidrawAdapter to prevent SSR issues
const ExcalidrawAdapter = dynamic(
  () => import('@/components/workspace/excalidraw/ExcalidrawAdapter').then(mod => ({ default: mod.ExcalidrawAdapter })),
  { 
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center text-gray-500">Loading Excalidraw...</div>
  }
);

export function ExcalidrawContractTest() {
  const adapterRef = useRef<ExcalidrawContractAPI>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [scale, setScale] = useState(1);
  const [readonly, setReadonly] = useState(false);
  const [sceneData, setSceneData] = useState<any>(null);

  const addEvent = (event: string) => {
    setEvents(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${event}`]);
  };

  useEffect(() => {
    const handleReady = (e: CustomEvent) => {
      addEvent('✅ Ready event received');
      console.log('Ready event:', e.detail);
    };

    const handleSceneChange = (e: CustomEvent) => {
      addEvent('🔄 Scene change event received');
      console.log('Scene change:', e.detail);
      setSceneData(e.detail);
    };

    const handleExport = (e: CustomEvent) => {
      addEvent(`📤 Export event (${e.detail.type}) received`);
      console.log('Export event:', e.detail);
    };

    const handleError = (e: CustomEvent) => {
      addEvent(`❌ Error: ${e.detail.message}`);
      console.error('Error event:', e.detail);
    };

    const handleExportStart = (e: CustomEvent) => {
      addEvent(`🔄 Export starting (${e.detail.type})`);
    };

    const handleExportEnd = (e: CustomEvent) => {
      addEvent(`✅ Export finished (${e.detail.type})`);
    };

    // Listen for events on document since they bubble
    document.addEventListener('ready', handleReady as EventListener);
    document.addEventListener('scenechange', handleSceneChange as EventListener);
    document.addEventListener('export', handleExport as EventListener);
    document.addEventListener('error', handleError as EventListener);
    document.addEventListener('exportstart', handleExportStart as EventListener);
    document.addEventListener('exportend', handleExportEnd as EventListener);

    return () => {
      document.removeEventListener('ready', handleReady as EventListener);
      document.removeEventListener('scenechange', handleSceneChange as EventListener);
      document.removeEventListener('export', handleExport as EventListener);
      document.removeEventListener('error', handleError as EventListener);
      document.removeEventListener('exportstart', handleExportStart as EventListener);
      document.removeEventListener('exportend', handleExportEnd as EventListener);
    };
  }, []);

  const testExportPNG = async () => {
    if (adapterRef.current) {
      addEvent('🔧 Requesting PNG export...');
      await adapterRef.current.requestExport({ type: 'png', dpi: 2 });
    }
  };

  const testExportSVG = async () => {
    if (adapterRef.current) {
      addEvent('🔧 Requesting SVG export...');
      await adapterRef.current.requestExport({ type: 'svg' });
    }
  };

  const testSetScene = async () => {
    const testScene = {
      elements: [
        {
          id: 'test-rect',
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
    
    if (adapterRef.current) {
      addEvent('🔧 Setting test scene...');
      await adapterRef.current.setScene(testScene);
    }
  };

  const testInvalidScene = async () => {
    const invalidScene = {
      // Missing required 'elements' field
      appState: { viewBackgroundColor: '#ffffff' }
    };
    
    if (adapterRef.current) {
      addEvent('🔧 Testing invalid scene...');
      await adapterRef.current.setScene(invalidScene);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Excalidraw Contract Test</h2>
      
      {/* Controls */}
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2">
          Scale: 
          <input 
            type="range" 
            min="0.1" 
            max="3" 
            step="0.1" 
            value={scale} 
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-20"
          />
          {scale}x
        </label>
        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={readonly} 
            onChange={(e) => setReadonly(e.target.checked)} 
          />
          Read-only
        </label>
      </div>

      {/* Test Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={testExportPNG}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Export PNG (2x DPI)
        </button>
        <button 
          onClick={testExportSVG}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Export SVG
        </button>
        <button 
          onClick={testSetScene}
          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Set Test Scene
        </button>
        <button 
          onClick={testInvalidScene}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Test Invalid Scene
        </button>
        <button 
          onClick={() => setEvents([])}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear Events
        </button>
      </div>

      {/* Event Log */}
      <div className="bg-gray-50 p-3 rounded">
        <h3 className="font-semibold mb-2">Event Log:</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-gray-500">No events yet...</div>
          ) : (
            events.map((event, index) => (
              <div key={index} className="text-sm font-mono">
                {event}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Excalidraw Component */}
      <div className="border border-gray-300 rounded" style={{ height: '400px' }}>
        <ExcalidrawAdapter
          ref={adapterRef}
          initialData={null}
          readOnly={readonly}
          scale={scale}
          onReady={() => addEvent('⚡ onReady callback fired')}
          className="h-full"
          testId="contract-test"
        />
      </div>
      
      {/* Scene Data Debug */}
      {sceneData && (
        <details className="bg-gray-50 p-3 rounded">
          <summary className="font-semibold cursor-pointer">Last Scene Data</summary>
          <pre className="mt-2 text-xs overflow-auto max-h-40">
            {JSON.stringify(sceneData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
"use client";

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ExcalidrawContractAPI } from '@/components/workspace/excalidraw/ExcalidrawAdapterMinimal';
import { useViewportStore } from '@/state';

// Use the working minimal version for now
const ExcalidrawAdapter = dynamic(
  () => import('@/components/workspace/excalidraw/ExcalidrawAdapterMinimal').then(mod => ({ default: mod.ExcalidrawAdapterMinimal })),
  { 
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center text-gray-500">Loading Excalidraw...</div>
  }
);

export function SimpleContractTest() {
  const adapterRef = useRef<ExcalidrawContractAPI>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [testZoom, setTestZoom] = useState(1);
  
  // Step 8: Sync with viewport store for proper DPI handling
  const setScale = useViewportStore((s) => s.setScale);
  const currentScale = useViewportStore((s) => s.viewport.scale);
  
  useEffect(() => {
    setScale(testZoom);
  }, [testZoom, setScale]);
  
  // Listen for export events to verify DPI functionality
  useEffect(() => {
    const handleExport = (event: any) => {
      if (event.detail.type === 'png' && event.detail.blob) {
        const sizeKB = Math.round(event.detail.blob.size / 1024);
        addLog(`✅ PNG exported (${sizeKB}KB)`);
      } else if (event.detail.type === 'svg' && event.detail.dataURL) {
        const sizeKB = Math.round(event.detail.dataURL.length / 1024);
        addLog(`✅ SVG exported (${sizeKB}KB)`);
      }
    };
    
    const handleExportError = (event: any) => {
      addLog(`❌ Export failed: ${event.detail.message}`);
    };
    
    document.addEventListener('export', handleExport);
    document.addEventListener('error', handleExportError);
    
    return () => {
      document.removeEventListener('export', handleExport);
      document.removeEventListener('error', handleExportError);
    };
  }, []);

  const addLog = (message: string) => {
    console.log('[ContractTest]', message);
    setLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testExportPNG = () => {
    const deviceDPR = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const effectiveDPR = deviceDPR * currentScale;
    addLog(`Testing PNG export... (DPR: ${deviceDPR}, Scale: ${currentScale.toFixed(2)}, Effective: ${effectiveDPR.toFixed(2)})`);
    adapterRef.current?.requestExport({ type: 'png' });
  };

  const testExportSVG = () => {
    const deviceDPR = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const effectiveDPR = deviceDPR * currentScale;
    addLog(`Testing SVG export... (DPR: ${deviceDPR}, Scale: ${currentScale.toFixed(2)}, Effective: ${effectiveDPR.toFixed(2)})`);
    adapterRef.current?.requestExport({ type: 'svg' });
  };

  const testSetScene = () => {
    addLog('Testing scene update...');
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
    adapterRef.current?.setScene(testScene);
  };

  const testInvalidScene = () => {
    addLog('Testing invalid scene (missing elements)...');
    const invalidScene = { invalid: true }; // Missing elements array
    adapterRef.current?.setScene(invalidScene);
  };
  
  // Step 9: Additional error scenario tests
  const testNullScene = () => {
    addLog('Testing null scene...');
    adapterRef.current?.setScene(null);
  };
  
  const testEmptyElementsScene = () => {
    addLog('Testing scene with non-array elements...');
    const badScene = { elements: "not an array" };
    adapterRef.current?.setScene(badScene);
  };
  
  const testExportBeforeReady = () => {
    addLog('Testing export before ready (will simulate)...');
    // This will demonstrate the error - we can't actually test it since API is ready
    // But the error message will show in logs when tried before ready
    addLog('Note: In real usage, calling before ready would emit API_ERROR event');
  };

  const testDetailedScene = () => {
    addLog('Setting detailed test scene...');
    const detailedScene = {
      elements: [
        {
          id: 'rect-1',
          type: 'rectangle',
          x: 50,
          y: 50,
          width: 200,
          height: 100,
          strokeColor: '#1971c2',
          backgroundColor: '#a5d8ff',
          strokeWidth: 2,
        },
        {
          id: 'text-1',
          type: 'text',
          x: 70,
          y: 80,
          width: 160,
          height: 40,
          text: 'Crisp Text Test\nMultiple Lines',
          strokeColor: '#1971c2',
          fontSize: 16,
          fontFamily: 1,
        },
        {
          id: 'arrow-1',
          type: 'arrow',
          x: 300,
          y: 100,
          width: 150,
          height: 80,
          strokeColor: '#e03131',
          strokeWidth: 3,
          points: [[0, 0], [150, 80]],
        },
        {
          id: 'ellipse-1',
          type: 'ellipse',
          x: 100,
          y: 200,
          width: 120,
          height: 80,
          strokeColor: '#2f9e44',
          backgroundColor: '#c3fae8',
          strokeWidth: 2,
        }
      ],
      appState: {
        viewBackgroundColor: '#ffffff',
        currentItemStrokeColor: '#1971c2',
        currentItemBackgroundColor: '#a5d8ff',
      }
    };
    adapterRef.current?.setScene(detailedScene);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Step 8: DPI/Crisp Ink Test</h2>
      
      {/* Step 8: Zoom Controls for DPI Testing */}
      <div className="bg-blue-50 p-3 rounded border">
        <h3 className="font-semibold mb-2">🔍 Zoom Level Test (Step 8)</h3>
        <div className="flex items-center gap-4">
          <label className="text-sm">Page Zoom: {(testZoom * 100).toFixed(0)}%</label>
          <input 
            type="range" 
            min="0.5" 
            max="3" 
            step="0.1" 
            value={testZoom} 
            onChange={(e) => setTestZoom(parseFloat(e.target.value))}
            className="flex-1 max-w-xs"
          />
          <div className="flex gap-1">
            <button onClick={() => setTestZoom(0.5)} className="px-2 py-1 text-xs bg-gray-200 rounded">50%</button>
            <button onClick={() => setTestZoom(1)} className="px-2 py-1 text-xs bg-gray-200 rounded">100%</button>
            <button onClick={() => setTestZoom(1.5)} className="px-2 py-1 text-xs bg-gray-200 rounded">150%</button>
            <button onClick={() => setTestZoom(2)} className="px-2 py-1 text-xs bg-gray-200 rounded">200%</button>
            <button onClick={() => setTestZoom(3)} className="px-2 py-1 text-xs bg-gray-200 rounded">300%</button>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          effectiveDPR = devicePixelRatio ({typeof window !== 'undefined' ? window.devicePixelRatio : 1}) × scale ({currentScale.toFixed(1)}) = {typeof window !== 'undefined' ? (window.devicePixelRatio * currentScale).toFixed(2) : 'N/A'}
        </p>
      </div>
      
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={testExportPNG}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Export PNG
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
          Invalid Scene
        </button>
        <button 
          onClick={testDetailedScene}
          className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Detailed Scene
        </button>
      </div>
      
      {/* Step 9: Error Testing Section */}
      <div className="bg-red-50 p-3 rounded border border-red-200">
        <h3 className="font-semibold text-red-800 mb-2">🚨 Step 9: Error Testing</h3>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={testNullScene}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Null Scene
          </button>
          <button 
            onClick={testEmptyElementsScene}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Bad Elements
          </button>
          <button 
            onClick={testExportBeforeReady}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Export Before Ready
          </button>
        </div>
      </div>

      <div className="bg-gray-100 p-3 rounded">
        <h3 className="font-semibold mb-2">Logs:</h3>
        {logs.length === 0 ? (
          <div className="text-gray-500">No logs yet...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="text-sm">
              {log}
            </div>
          ))
        )}
      </div>

      <div className="border border-gray-300 rounded" style={{ height: '400px' }}>
        <ExcalidrawAdapter
          ref={adapterRef}
          initialData={null}
          readOnly={false}
          onReady={() => addLog('✅ Excalidraw ready')}
          className="h-full"
        />
      </div>
      
      {/* Step 8 & 9: Testing Instructions */}
      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">🧪 Testing Instructions</h3>
        <div className="text-sm text-yellow-700 space-y-2">
          <div>
            <strong>Step 8 (DPI/Crisp Ink):</strong>
            <ol className="ml-4 space-y-1">
              <li>1. Click "Detailed Scene" to load test graphics</li>
              <li>2. Use Excalidraw's native zoom (not slider) to test crispness</li>
              <li>3. Export PNG/SVG at different zoom slider levels</li>
              <li>4. Verify exports are crisp at high DPI values</li>
            </ol>
          </div>
          <div>
            <strong>Step 9 (API Error Handling):</strong>
            <ol className="ml-4 space-y-1">
              <li>1. Test "Null Scene" → should show detailed error message</li>
              <li>2. Test "Bad Elements" → should explain elements must be array</li>
              <li>3. Check console for enhanced error details with examples</li>
              <li>4. Verify all errors emit proper CustomEvents</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
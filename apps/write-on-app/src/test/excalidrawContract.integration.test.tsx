import React, { useRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExcalidrawAdapter, type ExcalidrawContractAPI } from '@/components/workspace/excalidraw/ExcalidrawAdapter';

// Mock the Excalidraw component to avoid actual rendering complexities in tests
jest.mock('@/components/excalidraw/ExcalidrawRef', () => {
  const React = require('react');
  return React.forwardRef(function MockExcalidrawRef(props: any, ref: any) {
    React.useEffect(() => {
      // Simulate API ready after mount
      setTimeout(() => {
        if (ref) {
          const mockApi = {
            getSceneElements: () => [],
            getAppState: () => ({}),
            getFiles: () => ({}),
            updateScene: jest.fn(),
          };
          ref(mockApi);
        }
      }, 100);
    }, [ref]);
    
    return React.createElement('div', { 'data-testid': 'mock-excalidraw' }, 'Mock Excalidraw');
  });
});

// Mock export functions
jest.mock('@excalidraw/excalidraw', () => ({
  exportToSvg: jest.fn().mockResolvedValue('<svg>mock svg</svg>'),
  exportToBlob: jest.fn().mockResolvedValue(new Blob(['mock png'], { type: 'image/png' })),
}));

function TestComponent() {
  const adapterRef = useRef<ExcalidrawContractAPI>(null);
  const eventsRef = useRef<CustomEvent[]>([]);

  // Capture events
  React.useEffect(() => {
    const handleEvent = (e: CustomEvent) => {
      eventsRef.current.push(e);
    };

    ['ready', 'scenechange', 'export', 'error', 'exportstart', 'exportend'].forEach(eventName => {
      document.addEventListener(eventName, handleEvent as EventListener);
    });

    return () => {
      ['ready', 'scenechange', 'export', 'error', 'exportstart', 'exportend'].forEach(eventName => {
        document.removeEventListener(eventName, handleEvent as EventListener);
      });
    };
  }, []);

  return (
    <div>
      <button
        onClick={() => adapterRef.current?.requestExport({ type: 'png' })}
        data-testid="export-png"
      >
        Export PNG
      </button>
      <button
        onClick={() => adapterRef.current?.requestExport({ type: 'svg' })}
        data-testid="export-svg" 
      >
        Export SVG
      </button>
      <button
        onClick={() => adapterRef.current?.setScene({ elements: [], appState: {} })}
        data-testid="set-scene"
      >
        Set Scene
      </button>
      <button
        onClick={() => adapterRef.current?.setScene({ invalid: true })} // Missing elements
        data-testid="set-invalid-scene"
      >
        Set Invalid Scene
      </button>
      <div data-testid="events-count">{eventsRef.current.length}</div>
      <ExcalidrawAdapter
        ref={adapterRef}
        initialData={null}
        readOnly={false}
        onReady={() => {}}
        testId="contract-adapter"
      />
    </div>
  );
}

describe('ExcalidrawAdapter Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('emits ready event when API is initialized', async () => {
    render(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('mock-excalidraw')).toBeInTheDocument();
    });

    // Wait for ready event
    await waitFor(() => {
      const eventsCount = screen.getByTestId('events-count');
      expect(parseInt(eventsCount.textContent || '0')).toBeGreaterThan(0);
    });
  });

  test('requestExport method triggers export events', async () => {
    render(<TestComponent />);
    
    // Wait for component to be ready
    await waitFor(() => {
      expect(screen.getByTestId('mock-excalidraw')).toBeInTheDocument();
    });

    // Click export PNG button
    fireEvent.click(screen.getByTestId('export-png'));

    // Should trigger exportstart, export, and exportend events
    await waitFor(() => {
      const eventsCount = screen.getByTestId('events-count');
      expect(parseInt(eventsCount.textContent || '0')).toBeGreaterThanOrEqual(3);
    });
  });

  test('setScene method validates scene data', async () => {
    render(<TestComponent />);
    
    // Wait for component to be ready  
    await waitFor(() => {
      expect(screen.getByTestId('mock-excalidraw')).toBeInTheDocument();
    });

    // Click set invalid scene - should trigger error event
    fireEvent.click(screen.getByTestId('set-invalid-scene'));

    await waitFor(() => {
      const adapter = screen.getByTestId('contract-adapter').parentElement;
      expect(adapter).toHaveAttribute('data-state', 'invalid-scene');
    });
  });

  test('attribute-based inputs work correctly', () => {
    const { rerender } = render(
      <ExcalidrawAdapter
        initialData={null}
        readOnly={false}
        scale={1.5}
        onReady={() => {}}
        testId="scale-test"
      />
    );

    // Component should handle scale prop
    expect(screen.getByTestId('scale-test')).toBeInTheDocument();

    // Test readonly mode
    rerender(
      <ExcalidrawAdapter
        initialData={null}
        readOnly={true}
        scale={2}
        onReady={() => {}}
        testId="readonly-test"
      />
    );

    expect(screen.getByTestId('readonly-test')).toBeInTheDocument();
  });

  test('data-state attribute updates correctly', async () => {
    render(<TestComponent />);
    
    const container = await waitFor(() => 
      screen.getByTestId('contract-adapter').parentElement
    );

    // Should start with loading state
    await waitFor(() => {
      expect(container).toHaveAttribute('data-state');
    });
  });
});
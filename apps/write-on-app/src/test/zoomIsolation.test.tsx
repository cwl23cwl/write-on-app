import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceRoot } from '@/components/workspace/WorkspaceRoot';

// Mock viewport store
const mockZoomAction = vi.fn();
const mockSetScale = vi.fn();
const mockSetViewState = vi.fn();

vi.mock('@/state', () => ({
  useViewportStore: (selector: any) => {
    const mockState = {
      viewport: {
        scale: 1,
        scrollX: 0,
        scrollY: 0,
        viewportSize: { w: 800, h: 600 },
        pageSize: { w: 1200, h: 2200 },
        virtualSize: { w: 1280, h: 2280 },
        fitMode: 'fit-width',
        step: 0.1,
      },
      constraints: {
        minScale: 0.5,
        maxScale: 3.0,
        enablePan: true,
        enableZoom: true,
      },
      setScale: mockSetScale,
      setViewState: mockSetViewState,
      setViewportSize: vi.fn(),
      setPageSize: vi.fn(),
      setFitMode: vi.fn(),
      fitWidth: vi.fn(),
      zoomIn: mockZoomAction,
      zoomOut: mockZoomAction,
    };
    
    return selector(mockState);
  },
  useCanvasStore: () => ({
    tools: { activeTool: 'select' }
  }),
  usePageStore: () => ({
    currentPage: 1,
    totalPages: 1,
    nextPage: vi.fn(),
    prevPage: vi.fn(),
  }),
}));

// Mock other dependencies
vi.mock('@/components/workspace/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {},
}));

vi.mock('@/components/workspace/hooks/useContainerSizeObserver', () => ({
  useContainerSizeObserver: () => {},
}));

vi.mock('@/components/workspace/CanvasMount', () => ({
  CanvasMount: () => <div data-testid="canvas-mount">Canvas</div>,
}));

describe('Zoom Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup document structure for the tests
    document.body.innerHTML = '';
  });

  it('should not trigger workspace zoom when wheel event originates from control strip', async () => {
    render(<WorkspaceRoot />);
    
    // Find the control strip and workspace viewport
    const controlStrip = document.querySelector('.control-strip');
    const workspaceViewport = document.querySelector('#workspace-viewport');
    
    expect(controlStrip).toBeTruthy();
    expect(workspaceViewport).toBeTruthy();
    
    // Create a wheel event that would normally trigger zoom
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100, // negative = zoom in
      ctrlKey: true, // zoom intent
      bubbles: true,
      cancelable: true,
    });
    
    // Define the target element within control strip
    Object.defineProperty(wheelEvent, 'target', {
      value: controlStrip!.firstElementChild,
      enumerable: true,
    });
    
    // Dispatch the event on the control strip element
    controlStrip!.dispatchEvent(wheelEvent);
    
    // Workspace zoom should NOT be triggered
    expect(mockSetViewState).not.toHaveBeenCalled();
    expect(mockSetScale).not.toHaveBeenCalled();
  });

  it('should trigger workspace zoom when wheel event originates from workspace', async () => {
    render(<WorkspaceRoot />);
    
    const workspaceViewport = document.querySelector('#workspace-viewport');
    expect(workspaceViewport).toBeTruthy();
    
    // Create a wheel event that should trigger zoom
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100, // negative = zoom in
      ctrlKey: true, // zoom intent
      bubbles: true,
      cancelable: true,
    });
    
    // Mock the event target as being from workspace
    Object.defineProperty(wheelEvent, 'target', {
      value: workspaceViewport,
      enumerable: true,
    });
    
    // Dispatch the event on the workspace
    workspaceViewport!.dispatchEvent(wheelEvent);
    
    // Wait a tick for event processing
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Workspace zoom SHOULD be triggered
    expect(mockSetViewState).toHaveBeenCalled();
  });

  it('should not trigger keyboard zoom when focus is on control strip', () => {
    render(<WorkspaceRoot />);
    
    const controlStrip = document.querySelector('.control-strip');
    expect(controlStrip).toBeTruthy();
    
    // Create a keyboard event for zoom
    const keyEvent = new KeyboardEvent('keydown', {
      key: '+',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    
    // Set target to control strip element
    Object.defineProperty(keyEvent, 'target', {
      value: controlStrip!.firstElementChild,
      enumerable: true,
    });
    
    // Dispatch keyboard event
    window.dispatchEvent(keyEvent);
    
    // Workspace zoom should NOT be triggered
    expect(mockSetViewState).not.toHaveBeenCalled();
  });

  it('should trigger keyboard zoom when focus is on workspace', () => {
    render(<WorkspaceRoot />);
    
    const workspaceViewport = document.querySelector('#workspace-viewport');
    expect(workspaceViewport).toBeTruthy();
    
    // Create a keyboard event for zoom
    const keyEvent = new KeyboardEvent('keydown', {
      key: '+',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    
    // Set target to workspace element
    Object.defineProperty(keyEvent, 'target', {
      value: workspaceViewport,
      enumerable: true,
    });
    
    // Dispatch keyboard event
    window.dispatchEvent(keyEvent);
    
    // Workspace zoom SHOULD be triggered
    expect(mockSetViewState).toHaveBeenCalled();
  });
});
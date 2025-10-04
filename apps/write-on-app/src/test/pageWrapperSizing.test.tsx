import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.mock('@/components/workspace/hooks/useExcalidrawIsland', () => {
  const noop = vi.fn();
  return {
    useExcalidrawIsland: () => ({
      mount: noop,
      unmount: noop,
      remount: noop,
      requestExport: noop,
      setScene: noop,
      islandRef: { current: null },
      island: null,
      excalidrawAPI: null,
      isReady: false,
    }),
  };
});

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';
import { CanvasMount } from '@/components/workspace/CanvasMount';

describe('Canvas mount sizing', () => {
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeAll(() => {
    originalResizeObserver = global.ResizeObserver;
    // Minimal ResizeObserver stub for jsdom
    class StubResizeObserver {
      observe() {}
      disconnect() {}
    }
    // @ts-expect-error jsdom stub
    global.ResizeObserver = StubResizeObserver;
  });

  afterAll(() => {
    // @ts-expect-error restoring stub
    global.ResizeObserver = originalResizeObserver;
  });

  it('CanvasMount hosts a 1200�2200 canvas page', () => {
    function TestHarness() {
      const containerRef = React.useRef<HTMLDivElement | null>(null);
      return (
        <WorkspaceProvider value={{ containerRef }}>
          <ChromeLayout />
          <div ref={containerRef} className="workspace-root">
            <WorkspaceViewport>
              <WorkspaceScaler>
                <CanvasMount />
              </WorkspaceScaler>
            </WorkspaceViewport>
          </div>
        </WorkspaceProvider>
      );
    }

    const { container, unmount } = render(<TestHarness />);
    const mount = container.querySelector('.workspace-canvas-mount') as HTMLElement | null;
    const page = container.querySelector('.canvas-page') as HTMLElement | null;

    expect(mount).toBeTruthy();
    expect(page).toBeTruthy();
    expect(page?.style.width).toBe('1200px');
    expect(page?.style.height).toBe('2200px');

    unmount();
    cleanup();
  });
});
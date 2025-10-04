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
import { render, cleanup, waitFor } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';
import { CanvasMount } from '@/components/workspace/CanvasMount';
import { useViewportStore } from '@/state';

describe('Fixed logical size under zoom', () => {
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeAll(() => {
    originalResizeObserver = global.ResizeObserver;
    class StubResizeObserver {
      observe() {}
      disconnect() {}
    }
    // @ts-expect-error jsdom stub
    global.ResizeObserver = StubResizeObserver;
  });

  afterAll(() => {
    // @ts-expect-error restore stub
    global.ResizeObserver = originalResizeObserver;
  });

  it('canvas page stays 1200�2200 CSS pixels even when zoom changes', async () => {
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

    useViewportStore.getState().setScale(1.75);

    await waitFor(() => {
      const page = container.querySelector('.canvas-page') as HTMLElement | null;
      expect(page).toBeTruthy();
      expect(page!.style.width).toBe('1200px');
      expect(page!.style.height).toBe('2200px');
    });

    useViewportStore.getState().setScale(0.5);

    await waitFor(() => {
      const page = container.querySelector('.canvas-page') as HTMLElement | null;
      expect(page).toBeTruthy();
      expect(page!.style.width).toBe('1200px');
      expect(page!.style.height).toBe('2200px');
    });

    unmount();
    cleanup();
  });
});
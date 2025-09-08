import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, cleanup, waitFor } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';
import { CanvasMount } from '@/components/workspace/CanvasMount';
import { useViewportStore } from '@/state';

describe('Fixed logical size under zoom', () => {
  it('phase2 page stays 1200x2200 CSS pixels even when zoom changes', async () => {
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

    // change zoom
    useViewportStore.getState().setScale(1.75);

    await waitFor(() => {
      const page = container.querySelector('.phase2-page') as HTMLElement | null;
      expect(page).toBeTruthy();
      expect(page!.style.width).toBe('1200px');
      expect(page!.style.height).toBe('2200px');
    });

    // another zoom change
    useViewportStore.getState().setScale(0.5);

    await waitFor(() => {
      const page = container.querySelector('.phase2-page') as HTMLElement | null;
      expect(page).toBeTruthy();
      expect(page!.style.width).toBe('1200px');
      expect(page!.style.height).toBe('2200px');
    });

    unmount();
    cleanup();
  });
});


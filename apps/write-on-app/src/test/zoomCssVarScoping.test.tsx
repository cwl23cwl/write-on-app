import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, cleanup, waitFor } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';
import { useViewportStore } from '@/state';

describe('Zoom CSS var scoped to #workspace-scale-layer', () => {
  it('sets --workspace-zoom only on the scale layer, not toolbars', async () => {
    function TestHarness() {
      const containerRef = React.useRef<HTMLDivElement | null>(null);
      return (
        <WorkspaceProvider value={{ containerRef }}>
          <ChromeLayout />
          <div ref={containerRef} className="workspace-root">
            <WorkspaceViewport>
              <WorkspaceScaler>
                <div>content</div>
              </WorkspaceScaler>
            </WorkspaceViewport>
          </div>
        </WorkspaceProvider>
      );
    }

    const { container, unmount } = render(<TestHarness />);
    // Change zoom via store
    useViewportStore.getState().setScale(1.42);

    await waitFor(() => {
      const scaleLayer = container.querySelector('#workspace-scale-layer') as HTMLElement | null;
      expect(scaleLayer).toBeTruthy();
      expect(scaleLayer!.style.getPropertyValue('--workspace-zoom')).toBe('1.42');
    });

    const strip = container.querySelector('.control-strip') as HTMLElement | null;
    const header = container.querySelector('.app-header') as HTMLElement | null;
    const top = container.querySelector('.top-toolbar') as HTMLElement | null;
    const opts = container.querySelector('.options-toolbar') as HTMLElement | null;
    [strip, header, top, opts].forEach((el) => {
      expect(el?.style.getPropertyValue('--workspace-zoom') ?? '').toBe('');
    });

    unmount();
    cleanup();
  });
});


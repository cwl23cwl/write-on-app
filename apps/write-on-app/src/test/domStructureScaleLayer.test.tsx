import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';

describe('Viewport/Scale structure', () => {
  it('keeps sticky chrome outside scaler and nests mount beneath the viewport', () => {
    function TestHarness() {
      const containerRef = React.useRef<HTMLDivElement | null>(null);
      return (
        <WorkspaceProvider value={{ containerRef }}>
          <ChromeLayout />
          <div ref={containerRef} className="workspace-root">
            <WorkspaceViewport>
              <WorkspaceScaler>
                <div className="workspace-canvas-mount">
                  <div className="canvas-page" />
                </div>
              </WorkspaceScaler>
            </WorkspaceViewport>
          </div>
        </WorkspaceProvider>
      );
    }

    const { container, unmount } = render(<TestHarness />);
    const viewport = container.querySelector('#workspace-viewport');
    const scaler = container.querySelector('.workspace-scaler');
    const mount = container.querySelector('.workspace-canvas-mount');
    const page = container.querySelector('.canvas-page');
    const controlStrip = container.querySelector('.control-strip');
    const indicator = container.querySelector('.page-indicator');

    expect(viewport).toBeTruthy();
    expect(scaler).toBeTruthy();
    expect(mount).toBeTruthy();
    expect(page).toBeTruthy();

    expect(scaler?.closest('#workspace-viewport')).toBe(viewport);
    expect(mount?.closest('.workspace-scaler')).toBe(scaler);
    expect(page?.closest('.workspace-canvas-mount')).toBe(mount);

    expect(controlStrip?.closest('.workspace-scaler')).toBeNull();
    if (indicator) {
      expect(indicator.closest('.workspace-scaler')).toBeNull();
    }

    unmount();
    cleanup();
  });
});
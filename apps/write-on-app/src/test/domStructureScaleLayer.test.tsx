import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';

describe('Viewport/Scale layer structure', () => {
  it('uses #workspace-viewport > #workspace-scale-layer > .page-wrapper and keeps chrome outside', () => {
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
    const viewport = container.querySelector('#workspace-viewport');
    const scale = container.querySelector('#workspace-scale-layer');
    const page = container.querySelector('.page-wrapper');
    const host = container.querySelector('.excal-host');
    const strip = container.querySelector('.control-strip');
    const indicator = container.querySelector('.page-indicator');
    expect(viewport).toBeTruthy();
    expect(scale).toBeTruthy();
    expect(page).toBeTruthy();
    expect(host).toBeTruthy();
    expect(page?.closest('#workspace-scale-layer')).toBe(scale);
    expect(host?.closest('.page-wrapper')).toBe(page);
    expect(scale?.closest('#workspace-viewport')).toBe(viewport);
    expect(strip?.closest('#workspace-scale-layer')).toBeNull();
    expect(indicator?.closest('#workspace-scale-layer')).toBeNull();
    unmount();
    cleanup();
  });
});



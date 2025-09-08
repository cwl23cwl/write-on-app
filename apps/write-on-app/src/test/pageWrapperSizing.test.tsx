import { describe, it, expect, vi } from 'vitest';
vi.mock('@/components/excalidraw/ExcalidrawRef', () => {
  const React = require('react');
  const Mock = React.forwardRef((props: any) => React.createElement('div', { 'data-mock-excalidraw': true, style: props.style }));
  (Mock as any).displayName = 'MockExcalidraw';
  return { default: Mock };
});
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';
import { CanvasMount } from '@/components/workspace/CanvasMount';

describe('Page wrapper sizing and canvas fill', () => {
  it('CanvasMount and Excalidraw container fill .page-wrapper (100%/100%)', () => {
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
    const page = container.querySelector('.phase2-page') as HTMLElement | null;
    const mount = container.querySelector('.workspace-canvas-mount') as HTMLElement | null;
    expect(mount).toBeTruthy();
    expect(page).toBeTruthy();
    expect((page as HTMLElement).style.width).toBe('1200px');
    expect((page as HTMLElement).style.height).toBe('2200px');
    unmount();
    cleanup();
  });
});

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
    const wrapper = container.querySelector('.page-wrapper') as HTMLElement | null;
    const mount = container.querySelector('.workspace-canvas-mount') as HTMLElement | null;
    const exca = container.querySelector('[data-excalidraw-adapter]') as HTMLElement | null;
    expect(wrapper).toBeTruthy();
    expect(mount?.style.width).toBe('100%');
    expect(mount?.style.height).toBe('100%');
    expect(exca?.style.width).toBe('100%');
    expect(exca?.style.height).toBe('100%');
    unmount();
    cleanup();
  });
});


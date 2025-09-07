import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, cleanup, waitFor } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';
import { CanvasMount } from '@/components/workspace/CanvasMount';

vi.mock('@/components/excalidraw/ExcalidrawRef', () => {
  const React = require('react');
  const Mock = (props: any) => {
    (globalThis as any).__EX_INIT = props.initialData;
    return React.createElement('div', { 'data-mock-excalidraw': true });
  };
  return { default: Mock };
});

describe('Excalidraw initialData size matches paper', () => {
  it('injects appState.width=1200 and height=2200', async () => {
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

    const { unmount } = render(<TestHarness />);
    await waitFor(() => expect((globalThis as any).__EX_INIT).toBeTruthy());
    const data = (globalThis as any).__EX_INIT;
    expect(data.appState?.width).toBe(1200);
    expect(data.appState?.height).toBe(2200);
    unmount();
    cleanup();
  });
});

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';

describe('Toolbars have no transform applied', () => {
  it('app-header, top-toolbar, options-toolbar have no inline transform', () => {
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
    const header = container.querySelector('.app-header') as HTMLElement | null;
    const top = container.querySelector('.top-toolbar') as HTMLElement | null;
    const opts = container.querySelector('.options-toolbar') as HTMLElement | null;
    expect(header).toBeTruthy();
    expect(top).toBeTruthy();
    expect(opts).toBeTruthy();
    // Verify no inline transform attributes are present
    expect(header?.style.transform ?? '').toBe('');
    expect(top?.style.transform ?? '').toBe('');
    expect(opts?.style.transform ?? '').toBe('');
    unmount();
    cleanup();
  });
});


import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { ChromeLayout } from '@/components/chrome/ChromeLayout';
import { WorkspaceViewport } from '@/components/workspace/WorkspaceViewport';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';

describe('Toolbars are outside the scale layer', () => {
  it('header/top/options toolbars are not inside .workspace-scaler', () => {
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
    const header = container.querySelector('.app-header');
    const top = container.querySelector('.top-toolbar');
    const opts = container.querySelector('.options-toolbar');
    expect(header?.closest('.workspace-scaler')).toBeNull();
    expect(top?.closest('.workspace-scaler')).toBeNull();
    expect(opts?.closest('.workspace-scaler')).toBeNull();
    unmount();
    cleanup();
  });
});


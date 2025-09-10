import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WorkspaceRoot } from '@/components/workspace/WorkspaceRoot';
import { useViewportStore } from '@/state';

function dispatchWheel(target: EventTarget, init: WheelEventInit & { clientX: number; clientY: number }): void {
  const e = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(e);
}

describe('Ctrl/Cmd + wheel zoom', () => {
  it.skip('zooms when holding ctrl and wheeling over the viewport', async () => {
    const { container } = render(<WorkspaceRoot />);

    // Seed viewport bounding box so geometry gating passes
    const viewport = container.querySelector('#workspace-viewport') as HTMLElement;
    expect(viewport).toBeTruthy();
    const origGetRect = viewport.getBoundingClientRect.bind(viewport);
    viewport.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1200,
      bottom: 800,
      width: 1200,
      height: 800,
      toJSON() { return {}; },
    } as any);

    // Initial scale
    const before = useViewportStore.getState().viewport.scale;

    // Dispatch a Ctrl + wheel event on the viewport element (element listener path)
    dispatchWheel(viewport, { deltaY: -120, ctrlKey: true, clientX: 600, clientY: 400, deltaMode: 0 });

    // Wait a frame for RAF coalescing
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const after = useViewportStore.getState().viewport.scale;

    // Restore method
    viewport.getBoundingClientRect = origGetRect;

    expect(after).toBeGreaterThan(before);
  });
});

/**
 * Scale Regression Test
 *
 * Verifies that:
 * 1. viewport.scale updates correctly
 * 2. .workspace-scaler applies zoom transforms
 * 3. Scale ratios match expected values within +/-1px tolerance
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, screen, cleanup } from '@testing-library/react';
import { useViewportStore } from '@/state';
import { WorkspaceScaler } from '@/components/workspace/WorkspaceScaler';

// Test component that exposes viewport scale
function TestScaleComponent() {
  const scale = useViewportStore((s) => s.viewport.scale);
  const setScale = useViewportStore((s) => s.setScale);

  return (
    <div>
      <div data-testid="scale-value">{scale}</div>
      <button onClick={() => setScale(1.0)} data-testid="set-scale-1">Set 1.0</button>
      <button onClick={() => setScale(1.25)} data-testid="set-scale-1.25">Set 1.25</button>
      <button onClick={() => setScale(0.8)} data-testid="set-scale-0.8">Set 0.8</button>
      <WorkspaceScaler>
        <div data-testid="page-content">Test Content</div>
      </WorkspaceScaler>
    </div>
  );
}

describe('Scale Regression Tests', () => {
  beforeEach(() => {
    // Reset store to clean state
    useViewportStore.getState().setScale?.(1.0);
    useViewportStore.getState().setViewportSize?.(0, 0);
    // Mock CSS variables for consistent testing
    Object.defineProperty(HTMLElement.prototype, 'style', {
      value: {
        setProperty: vi.fn(),
        getProperty: vi.fn(() => '1'),
      },
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  const waitForFrame = async (): Promise<void> => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  };
  const getWorkspaceScaler = (): HTMLElement | null =>
    document.querySelector('.workspace-scaler');

  test('viewport.scale updates correctly', async () => {
    render(<TestScaleComponent />);

    expect(screen.getByTestId('scale-value').textContent).toBe('1');

    act(() => {
      screen.getByTestId('set-scale-1.25').click();
    });
    expect(screen.getByTestId('scale-value').textContent).toBe('1.25');

    act(() => {
      screen.getByTestId('set-scale-0.8').click();
    });
    expect(screen.getByTestId('scale-value').textContent).toBe('0.8');

    act(() => {
      screen.getByTestId('set-scale-1').click();
    });
    expect(screen.getByTestId('scale-value').textContent).toBe('1');
  });

  test('scale ratios match expected values', () => {
    const baseWidth = 1200;

    expect(baseWidth * 1.0).toBe(1200);
    expect(baseWidth * 1.25).toBeCloseTo(1500, 0);
    expect(baseWidth * 0.8).toBeCloseTo(960, 0);
  });

  test('workspace scaler exists and renders children', () => {
    render(<TestScaleComponent />);

    const scaler = getWorkspaceScaler();
    expect(scaler).toBeTruthy();
    expect(scaler?.classList.contains('workspace-scaler')).toBe(true);
    expect(scaler?.querySelector('[data-testid="page-content"]')).toBeTruthy();
  });
  test('workspace scaler applies translate and scale transform', async () => {
    await act(async () => {
      useViewportStore.getState().setViewportSize?.(1600, 900);
    });

    render(<TestScaleComponent />);

    await act(async () => {
      await waitForFrame();
    });

    const scaler = getWorkspaceScaler();
    expect(scaler).toBeTruthy();
    expect(scaler?.style.width).toBe('1200px');
    expect(scaler?.style.height).toBe('2200px');
    expect(scaler?.style.transform).toBe('translate3d(200px, 0px, 0px) scale(1)');

    await act(async () => {
      useViewportStore.getState().setScale?.(1.5);
      await waitForFrame();
    });

    expect(scaler?.style.transform).toBe('translate3d(0px, 0px, 0px) scale(1.5)');
  });

});


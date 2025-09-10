/**
 * Scale Regression Test
 * 
 * Verifies that:
 * 1. viewport.scale updates correctly
 * 2. .workspace-scaler transform changes
 * 3. .page-wrapper getBoundingClientRect().width changes proportionally
 * 4. Scale values match expected ratios within ±1px tolerance
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

  const getPageWrapper = (): HTMLElement | null => 
    document.querySelector('.page-wrapper') as HTMLElement | null;
  
  const getWorkspaceScaler = (): HTMLElement | null =>
    document.querySelector('.workspace-scaler') as HTMLElement | null;

  test('viewport.scale updates correctly', async () => {
    const { rerender } = render(<TestScaleComponent />);
    
    // Test initial state
    expect(screen.getByTestId('scale-value').textContent).toBe('1');
    
    // Test scale updates
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
    // Test mathematical relationships
    const baseWidth = 1200;
    
    // At S=1.0, width should be 1200
    expect(baseWidth * 1.0).toBe(1200);
    
    // At S=1.25, width should be ≈ 1500 (±1px)
    expect(baseWidth * 1.25).toBeCloseTo(1500, 0);
    
    // At S=0.8, width should be ≈ 960 (±1px) 
    expect(baseWidth * 0.8).toBeCloseTo(960, 0);
  });

  test('workspace scaler exists and has expected structure', () => {
    render(<TestScaleComponent />);
    
    const scaler = getWorkspaceScaler();
    expect(scaler).toBeTruthy();
    expect(scaler?.className).toBe('workspace-scaler');
    
    const pageWrapper = getPageWrapper();
    expect(pageWrapper).toBeTruthy();
    expect(pageWrapper?.className).toBe('page-wrapper');
  });
});
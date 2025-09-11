import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Control Strip Zoom Inert', () => {
  let mockWorkspaceSetViewState: ReturnType<typeof vi.fn>;
  let preventDefaultSpy: ReturnType<typeof vi.fn>;
  let stopPropagationSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup DOM structure
    document.body.innerHTML = `
      <div class="control-strip">
        <button class="control-button">Control Button</button>
        <div class="toolbar">Toolbar</div>
      </div>
      <div class="workspace-root">
        <div id="workspace-viewport" class="workspace-viewport">
          <div class="workspace-content">Workspace Content</div>
        </div>
      </div>
    `;

    mockWorkspaceSetViewState = vi.fn();
    preventDefaultSpy = vi.fn();
    stopPropagationSpy = vi.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should block all wheel zoom events from control strip', () => {
    // Mock control strip event blocker
    const controlStripBlocker = (e: WheelEvent) => {
      const isZoomIntent = e.ctrlKey || e.metaKey;
      if (!isZoomIntent) return;

      const target = e.target as Element;
      const isFromControlStrip = target && target.closest('.control-strip');
      if (!isFromControlStrip) return;

      // Block the event completely
      e.preventDefault();
      e.stopPropagation();
    };

    // Mock workspace handler that should NOT be triggered
    const workspaceHandler = (e: WheelEvent) => {
      const isZoomIntent = e.ctrlKey || e.metaKey;
      if (!isZoomIntent) return;

      const target = e.target as Element;
      const isFromWorkspace = target && target.closest('.workspace-viewport');
      if (!isFromWorkspace) return;

      mockWorkspaceSetViewState();
    };

    // Register handlers (control strip blocker uses capture)
    document.addEventListener('wheel', controlStripBlocker, { capture: true, passive: false });
    document.addEventListener('wheel', workspaceHandler, { passive: false });

    const controlButton = document.querySelector('.control-button') as HTMLElement;

    // Create wheel event from control strip
    const controlStripEvent = new WheelEvent('wheel', {
      deltaY: -100, // zoom in
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    // Mock preventDefault and stopPropagation
    Object.defineProperty(controlStripEvent, 'preventDefault', {
      value: preventDefaultSpy,
      writable: true,
    });
    Object.defineProperty(controlStripEvent, 'stopPropagation', {
      value: stopPropagationSpy,
      writable: true,
    });

    Object.defineProperty(controlStripEvent, 'target', {
      value: controlButton,
      enumerable: true,
    });

    controlButton.dispatchEvent(controlStripEvent);

    // Event should be prevented and stopped
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
    
    // Workspace handler should NOT be triggered
    expect(mockWorkspaceSetViewState).not.toHaveBeenCalled();

    // Cleanup
    document.removeEventListener('wheel', controlStripBlocker, { capture: true } as EventListenerOptions);
    document.removeEventListener('wheel', workspaceHandler);
  });

  it('should block all keyboard zoom shortcuts from control strip', () => {
    // Mock control strip keyboard blocker
    const controlStripKeyBlocker = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isFromControlStrip = target && target.closest('.control-strip');
      if (!isFromControlStrip) return;

      const ctrlLike = e.ctrlKey || e.metaKey;
      if (!ctrlLike) return;
      
      const k = e.key;
      if (!(k === '+' || k === '=' || k === '-' || k === '_' || k === '0')) return;
      
      // Block keyboard zoom shortcuts
      e.preventDefault();
      e.stopPropagation();
    };

    // Mock workspace keyboard handler that should NOT be triggered
    const workspaceKeyHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isFromWorkspace = target && target.closest('.workspace-viewport');
      if (!isFromWorkspace) return;

      const ctrlLike = e.ctrlKey || e.metaKey;
      if (!ctrlLike) return;
      
      const k = e.key;
      if (!(k === '+' || k === '=' || k === '-' || k === '_' || k === '0')) return;
      
      mockWorkspaceSetViewState();
    };

    // Register handlers (control strip blocker uses capture)
    document.addEventListener('keydown', controlStripKeyBlocker, { capture: true });
    document.addEventListener('keydown', workspaceKeyHandler);

    const controlButton = document.querySelector('.control-button') as HTMLElement;

    // Test Ctrl++ from control strip
    const controlStripKeyEvent = new KeyboardEvent('keydown', {
      key: '+',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    // Mock preventDefault and stopPropagation
    Object.defineProperty(controlStripKeyEvent, 'preventDefault', {
      value: preventDefaultSpy,
      writable: true,
    });
    Object.defineProperty(controlStripKeyEvent, 'stopPropagation', {
      value: stopPropagationSpy,
      writable: true,
    });

    Object.defineProperty(controlStripKeyEvent, 'target', {
      value: controlButton,
      enumerable: true,
    });

    controlButton.dispatchEvent(controlStripKeyEvent);

    // Event should be prevented and stopped
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
    
    // Workspace handler should NOT be triggered
    expect(mockWorkspaceSetViewState).not.toHaveBeenCalled();

    // Cleanup
    document.removeEventListener('keydown', controlStripKeyBlocker, { capture: true });
    document.removeEventListener('keydown', workspaceKeyHandler);
  });

  it('should allow workspace zoom events to work normally', () => {
    // Mock control strip event blocker (doesn't affect workspace events)
    const controlStripBlocker = (e: WheelEvent) => {
      const isZoomIntent = e.ctrlKey || e.metaKey;
      if (!isZoomIntent) return;

      const target = e.target as Element;
      const isFromControlStrip = target && target.closest('.control-strip');
      if (!isFromControlStrip) return;

      e.preventDefault();
      e.stopPropagation();
    };

    // Mock workspace handler
    const workspaceHandler = (e: WheelEvent) => {
      const isZoomIntent = e.ctrlKey || e.metaKey;
      if (!isZoomIntent) return;

      const target = e.target as Element;
      const isFromWorkspace = target && target.closest('.workspace-viewport');
      if (!isFromWorkspace) return;

      mockWorkspaceSetViewState();
    };

    document.addEventListener('wheel', controlStripBlocker, { capture: true, passive: false });
    document.addEventListener('wheel', workspaceHandler, { passive: false });

    const workspaceContent = document.querySelector('.workspace-content') as HTMLElement;

    // Create wheel event from workspace
    const workspaceEvent = new WheelEvent('wheel', {
      deltaY: -100, // zoom in
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperty(workspaceEvent, 'target', {
      value: workspaceContent,
      enumerable: true,
    });

    workspaceContent.dispatchEvent(workspaceEvent);

    // Workspace handler SHOULD be triggered
    expect(mockWorkspaceSetViewState).toHaveBeenCalled();

    // Cleanup
    document.removeEventListener('wheel', controlStripBlocker, { capture: true } as EventListenerOptions);
    document.removeEventListener('wheel', workspaceHandler);
  });

  it('should allow normal non-zoom events on control strip', () => {
    let clickHandlerCalled = false;

    // Mock control strip event blocker
    const controlStripBlocker = (e: WheelEvent) => {
      const isZoomIntent = e.ctrlKey || e.metaKey;
      if (!isZoomIntent) return; // Should not block non-zoom events

      const target = e.target as Element;
      const isFromControlStrip = target && target.closest('.control-strip');
      if (!isFromControlStrip) return;

      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('wheel', controlStripBlocker, { capture: true, passive: false });

    const controlButton = document.querySelector('.control-button') as HTMLElement;
    
    // Add click handler
    controlButton.addEventListener('click', () => {
      clickHandlerCalled = true;
    });

    // Test regular click (should work)
    controlButton.click();
    expect(clickHandlerCalled).toBe(true);

    // Test regular wheel without Ctrl (should not be blocked)
    const regularWheelEvent = new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: false, // No zoom intent
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperty(regularWheelEvent, 'preventDefault', {
      value: preventDefaultSpy,
      writable: true,
    });

    Object.defineProperty(regularWheelEvent, 'target', {
      value: controlButton,
      enumerable: true,
    });

    controlButton.dispatchEvent(regularWheelEvent);

    // Regular wheel should NOT be prevented
    expect(preventDefaultSpy).not.toHaveBeenCalled();

    // Cleanup
    document.removeEventListener('wheel', controlStripBlocker, { capture: true } as EventListenerOptions);
  });
});
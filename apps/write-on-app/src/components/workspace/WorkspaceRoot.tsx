"use client";

import { useEffect, useRef } from "react";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceViewport } from "@/components/workspace/WorkspaceViewport";
import { WorkspaceScaler } from "@/components/workspace/WorkspaceScaler";
import { PageWrapper } from "@/components/workspace/PageWrapper";
import { Page } from "@/components/workspace/Page";
import { CanvasMount } from "@/components/workspace/CanvasMount";
import { ChromeLayout } from "@/components/chrome/ChromeLayout";
import { WorkspaceErrorBoundary } from "@/components/workspace/WorkspaceErrorBoundary";
import { useKeyboardShortcuts } from "@/components/workspace/hooks/useKeyboardShortcuts";
import { useContainerSizeObserver } from "@/components/workspace/hooks/useContainerSizeObserver";
import { useWorkspaceRoute } from "@/components/workspace/hooks/useWorkspaceRoute";
import { useViewportStore } from "@/state";

export function WorkspaceRoot(): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setPageSize = useViewportStore((s) => s.setPageSize);
  const setScroll = useViewportStore((s) => s.setScroll);
  const setViewportReady = useViewportStore((s) => (s as any).setViewportReady ?? (() => {}));
  const { mode, writeScope, baseScene, overlayScene, routeType, workspaceId, isReadonly, initialScene } = useWorkspaceRoute();
  
  useKeyboardShortcuts();
  useContainerSizeObserver(rootRef);

  // Phase 3: Register page size with viewport store on mount
  useEffect(() => {
    setPageSize(1200, 2200);
  }, [setPageSize]);

  // Initialize scroll on the WorkspaceRoot and hydrate store; then mark viewport ready
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    try {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    } catch {}
    setScroll(0, 0);
    try { setViewportReady(true); } catch {}
  }, [setScroll, setViewportReady]);

  // Guardrail: ensure the fixed control strip never ends up inside the scaler
  useEffect(() => {
    const ctrl = document.querySelector('.control-strip') as HTMLElement | null;
    if (ctrl && ctrl.closest('.workspace-scaler')) {
      console.warn("Control strip is inside a scaler — move it out!", ctrl);
    }
  }, []);

  // One-way dependency: control strip height -> workspace padding
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctrl = document.querySelector('.control-strip') as HTMLElement | null;
    if (!ctrl) return;
    const apply = () => {
      const h = ctrl.offsetHeight;
      if (h > 0) root.style.setProperty('--control-strip-height', `${h}px`);
    };
    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(ctrl);
    window.addEventListener('resize', apply, { passive: true });
    return () => {
      try { ro.disconnect(); } catch {}
      window.removeEventListener('resize', apply);
    };
  }, []);

  return (
    <WorkspaceProvider value={{ containerRef: rootRef }}>
      <WorkspaceErrorBoundary>
        {/* Fixed control strip outside the scroll container for maximum robustness */}
        <ChromeLayout />
        {/* Unscaled root container: do not apply transforms here */}
        <div
          ref={rootRef}
          className="workspace-root debug-layout relative w-full h-screen overflow-auto flex flex-col"
          data-workspace-root
          style={{
            // Heights used by sticky chrome
            // Defaults: header 56px, top 48px, options 48px
            ['--h-header' as any]: '56px',
            ['--h-top' as any]: '48px',
            ['--h-opts' as any]: '48px',
            // Seed default for indicator row
            ['--h-indicator' as any]: '40px',
            // Gap tokens between rows
            ['--gap-header-top' as any]: '8px',
            ['--gap-top-opts' as any]: '8px',
            ['--gap-indicator-above' as any]: '8px',
            ['--gap-indicator-below' as any]: '0',
            // Workspace content sits directly below control strip
            // Composite stack heights (CSS calc on the same node as backdrop)
            ['--h-chrome' as any]: 'calc(var(--h-header) + var(--h-top) + var(--h-opts))',
            ['--h-stack' as any]: 'calc(var(--h-chrome) + var(--gap-header-top) + var(--gap-top-opts) + var(--gap-indicator-above) + var(--h-indicator) + var(--gap-indicator-below))',
            // Composite height vars are CSS-owned in globals.css
            // Spacing defaults
            ['--page-padding' as any]: '32px',
            // z-index tokens
            ['--z-header' as any]: '1000',
            ['--z-toolbar' as any]: '900',
            ['--z-indicator' as any]: '40',
            // Scroller behavior & containment
            overscrollBehavior: 'contain',
            contain: 'layout',
            isolation: 'isolate',
            // Opaque background to prevent transparency artifacts under sticky chrome
            backgroundColor: 'var(--workspace-bg, #ffffff)',
            // Page indicator tokens (solid surface)
            ['--pill-bg' as any]: '#ffffff',
            ['--pill-fg' as any]: '#111111',
            ['--pill-border' as any]: '#e5e7eb',
            // Page size tokens (virtual page size for Phase 2)
            ['--page-width' as any]: '1200px',
            ['--page-height' as any]: '2200px',
          }}
        >
          <WorkspaceViewport>
            <WorkspaceScaler>
              <PageWrapper>
                <Page>
                  {/* Page content goes here */}
                </Page>
                <CanvasMount 
                  mode={mode}
                  writeScope={writeScope}
                  baseScene={baseScene}
                  overlayScene={overlayScene}
                />
              </PageWrapper>
            </WorkspaceScaler>
          </WorkspaceViewport>
        </div>
      </WorkspaceErrorBoundary>
    </WorkspaceProvider>
  );
}

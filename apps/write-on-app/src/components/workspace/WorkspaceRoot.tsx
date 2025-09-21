"use client";

import { useEffect, useRef, type JSX } from "react";
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
    if (!ctrl) return;

    const hasForbiddenAncestor = (el: HTMLElement): { node: Element; prop: string; value: string } | null => {
      let cur: Element | null = el.parentElement;
      while (cur) {
        const cs = window.getComputedStyle(cur);
        if (cs.transform && cs.transform !== 'none') return { node: cur, prop: 'transform', value: cs.transform };
        // backdrop-filter may be returned as 'none' when unsupported; check both
        const backdrop = (cs as any).backdropFilter ?? cs.getPropertyValue('backdrop-filter');
        if (backdrop && backdrop !== 'none') return { node: cur, prop: 'backdrop-filter', value: String(backdrop) };
        if (cs.filter && cs.filter !== 'none') return { node: cur, prop: 'filter', value: cs.filter };
        cur = cur.parentElement;
      }
      return null;
    };

    const check = () => {
      // Specific guard: never inside scaler
      if (ctrl.closest('.workspace-scaler')) {
        console.warn('Control strip is inside a scaler — move it out!', ctrl);
      }
      // General guard: no transform/filter/backdrop-filter on ancestors
      const offender = hasForbiddenAncestor(ctrl);
      if (offender) {
        console.warn(
          `Control strip has a transformed/filtered ancestor; this breaks guardrails: ${offender.prop}=${offender.value}`,
          offender.node,
        );
      }
    };

    check();
    window.addEventListener('resize', check, { passive: true });
    return () => {
      window.removeEventListener('resize', check);
    };
  }, []);

  // One-way dependency: control strip height -> workspace padding (composed spacer)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctrl = document.querySelector('.control-strip') as HTMLElement | null;
    if (!ctrl) return;
    let rafId = 0 as number | undefined as unknown as number;
    const apply = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const h = ctrl.offsetHeight;
        if (h > 0) {
          // control strip stack (header + top + opts)
          root.style.setProperty('--control-strip-height', `${h}px`);
          // compute composed workspace padding
          const getPxVar = (name: string, fallback = 0): number => {
            const v = getComputedStyle(root).getPropertyValue(name).trim();
            if (!v) return fallback;
            const m = v.match(/(-?\d+(?:\.\d+)?)px/);
            return m ? parseFloat(m[1]) : fallback;
          };
          const gapAbove = getPxVar('--gap-indicator-above', 0);
          const pillH = getPxVar('--h-indicator', 40);
          const bottomOffset = gapAbove + pillH + 15; // 15px clearance below pill
          root.style.setProperty('--pageindicator-bottom-offset', `${bottomOffset}px`);
          root.style.setProperty('--workspace-top-pad', `${h + bottomOffset}px`);
        }
      });
    };
    // Initial compute
    apply();
    // Recompute on control strip box-size changes
    const ro = new ResizeObserver(() => apply());
    ro.observe(ctrl);
    // Recompute on subtree mutations (show/hide rows, zoom% label updates)
    const mo = new MutationObserver(() => apply());
    mo.observe(ctrl, { attributes: true, childList: true, characterData: true, subtree: true });
    // Window resize
    const onResize = () => apply();
    window.addEventListener('resize', onResize, { passive: true });
    // Custom app events for explicit recalculation hooks
    const onRecompute = () => apply();
    window.addEventListener('control-strip:recompute', onRecompute as EventListener);
    // Font load events can change header/toolbars height
    const fonts = (document as any).fonts as FontFaceSet | undefined;
    const onFontsDone = () => apply();
    if (fonts) {
      try { fonts.addEventListener?.('loadingdone', onFontsDone as EventListener); } catch {}
      // Also run once fonts are ready
      fonts?.ready?.then(onFontsDone).catch(() => {});
    }
    return () => {
      try { ro.disconnect(); } catch {}
      try { mo.disconnect(); } catch {}
      window.removeEventListener('resize', onResize);
      window.removeEventListener('control-strip:recompute', onRecompute as EventListener);
      if (fonts) {
        try { fonts.removeEventListener?.('loadingdone', onFontsDone as EventListener); } catch {}
      }
      if (rafId) cancelAnimationFrame(rafId);
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
            ['--control-strip-gap' as any]: '15px',
            ['--pageindicator-bottom-offset' as any]: 'calc(var(--gap-indicator-above) + var(--h-indicator, 40px) + 15px)',
            // Workspace content sits below the control strip with configured clearance
            // Composite stack heights (CSS calc on the same node as backdrop)
            ['--h-chrome' as any]: 'calc(var(--h-header) + var(--h-top) + var(--h-opts))',
            ['--h-stack' as any]: 'calc(var(--h-chrome) + var(--gap-header-top) + var(--gap-top-opts) + var(--gap-indicator-above) + var(--h-indicator) + var(--gap-indicator-below))',
            // Composite height vars are CSS-owned in globals.css
            // Spacing defaults
            ['--page-padding-x' as any]: '40px',
            ['--page-padding-top' as any]: '40px',
            ['--page-padding-bottom' as any]: '40px',
            // z-index tokens
            ['--z-control-strip' as any]: '3200',
            ['--z-header' as any]: '3100',
            ['--z-toolbar' as any]: '3000',
            ['--z-indicator' as any]: '2900',
            // Scroller behavior & containment
            overscrollBehavior: 'contain',
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
                <Page>{null}</Page>
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

"use client";

import { useEffect, useRef, type JSX } from "react";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceViewport } from "@/components/workspace/WorkspaceViewport";
import { WorkspaceScaler } from "@/components/workspace/WorkspaceScaler";
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
  const {
    mode,
    writeScope,
    baseScene,
    overlayScene,
    isReadonly,
    initialScene,
  } = useWorkspaceRoute();

  useKeyboardShortcuts();
  useContainerSizeObserver(rootRef);

  useEffect(() => {
    setPageSize(1200, 2200);
  }, [setPageSize]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
    setScroll(0, 0);
    try {
      setViewportReady(true);
    } catch {}
  }, [setScroll, setViewportReady]);

  useEffect(() => {
    const controlStrip = document.querySelector<HTMLElement>(".control-strip");
    const rootEl = rootRef.current;
    if (!controlStrip || !rootEl) return;

    const updateLayoutVars = () => {
      const height = controlStrip.offsetHeight;
      if (height > 0) {
        rootEl.style.setProperty("--control-strip-height", `${height}px`);
      }
    };

    updateLayoutVars();

    const resizeObserver = new ResizeObserver(updateLayoutVars);
    resizeObserver.observe(controlStrip);
    window.addEventListener("resize", updateLayoutVars, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateLayoutVars);
    };
  }, []);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    if (typeof window === "undefined") return;

    const passive: AddEventListenerOptions = { passive: true };
    const idleDelay = 1300;
    const pointerLeaveDelay = 450;
    let hideTimer: number | null = null;

    const scheduleHide = (delay: number = idleDelay) => {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
      }
      hideTimer = window.setTimeout(() => {
        rootEl.classList.remove("show-scrollbars");
        hideTimer = null;
      }, delay);
    };

    const reveal = () => {
      rootEl.classList.add("show-scrollbars");
      scheduleHide();
    };

    const handlePointerLeave = () => {
      scheduleHide(pointerLeaveDelay);
    };

    rootEl.addEventListener("scroll", reveal, passive);
    rootEl.addEventListener("wheel", reveal, passive);
    rootEl.addEventListener("touchstart", reveal, passive);
    rootEl.addEventListener("pointerenter", reveal);
    rootEl.addEventListener("pointerdown", reveal);
    rootEl.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("keydown", reveal);

    return () => {
      rootEl.removeEventListener("scroll", reveal, passive);
      rootEl.removeEventListener("wheel", reveal, passive);
      rootEl.removeEventListener("touchstart", reveal, passive);
      rootEl.removeEventListener("pointerenter", reveal);
      rootEl.removeEventListener("pointerdown", reveal);
      rootEl.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("keydown", reveal);
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
      }
      rootEl.classList.remove("show-scrollbars");
    };
  }, []);

  useEffect(() => {
    const controlStrip = document.querySelector<HTMLElement>(".control-strip");
    if (!controlStrip) return;

    const warnIfTransformed = () => {
      let node: HTMLElement | null = controlStrip.parentElement;
      while (node && node !== document.body) {
        const styles = getComputedStyle(node);
        if (styles.transform && styles.transform !== "none") {
          console.warn(
            "Control strip has a transformed ancestor; this breaks sticky chrome guardrails.",
            node,
          );
          break;
        }
        node = node.parentElement;
      }
    };

    warnIfTransformed();
    window.addEventListener("resize", warnIfTransformed, { passive: true });
    return () => {
      window.removeEventListener("resize", warnIfTransformed);
    };
  }, []);

  return (
    <WorkspaceProvider value={{ containerRef: rootRef }}>
      <WorkspaceErrorBoundary>
        <ChromeLayout />
        <div ref={rootRef} className="workspace-root" data-workspace-root>
          <WorkspaceViewport>
            <WorkspaceScaler>
              <CanvasMount
                mode={mode}
                writeScope={writeScope}
                baseScene={baseScene}
                overlayScene={overlayScene}
                readonly={isReadonly}
                initialScene={initialScene}
              />
            </WorkspaceScaler>
          </WorkspaceViewport>
        </div>
      </WorkspaceErrorBoundary>
    </WorkspaceProvider>
  );
}
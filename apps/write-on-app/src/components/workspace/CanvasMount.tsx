"use client";

import { useEffect, useRef, type JSX, type ReactNode } from "react";
import { useExcalidrawIsland } from "@/components/workspace/hooks/useExcalidrawIsland";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useCanvasStore } from "@/state";

type Props = {
  className?: string;
  children?: ReactNode;
  mode?: "teacher" | "student";
  writeScope?: "teacher-base" | "student" | "teacher-review";
  baseScene?: unknown;
  overlayScene?: unknown;
  /** @deprecated - use mode and writeScope */
  readonly?: boolean;
  /** @deprecated - use baseScene */
  initialScene?: unknown;
};

// CanvasMount anchors the Excalidraw island to a fixed-size logical page.
// The mount only initializes once the wrapper reports a non-zero layout size.
export function CanvasMount(props: Props): JSX.Element {
  const {
    className,
    children,
    mode = "teacher",
    writeScope = "teacher-base",
    baseScene,
    overlayScene,
    readonly = false,
    initialScene,
  } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const DEBUG_EXCALIDRAW = process.env.NEXT_PUBLIC_EXCALIDRAW_DEBUG === "1";
  const loggedReadyRef = useRef<boolean>(false);
  const loggedApiRef = useRef<boolean>(false);

  const { mount, unmount, isReady, excalidrawAPI } = useExcalidrawIsland({
    containerRef,
    mode,
    writeScope,
    baseScene: baseScene || initialScene, // Legacy support
    overlayScene,
    onReady: () => {
      if (DEBUG_EXCALIDRAW && !loggedReadyRef.current) {
        console.log("[CanvasMount] Excalidraw Island ready");
        loggedReadyRef.current = true;
      }
    },
    onExcalidrawReady: () => {
      if (DEBUG_EXCALIDRAW && !loggedApiRef.current) {
        console.log("[CanvasMount] Excalidraw API ready");
        loggedApiRef.current = true;
      }
    },
  });

  const setWorkspaceApi = useWorkspaceStore((s) => s.setExcalidrawAPI);
  const setCanvasContainer = useCanvasStore((s) => s.setContainerRef);

  useEffect(() => {
    setWorkspaceApi(excalidrawAPI ?? null);
    return () => {
      setWorkspaceApi(null);
    };
  }, [excalidrawAPI, setWorkspaceApi]);

  useEffect(() => {
    const hostEl = hostRef.current;
    if (!hostEl) return;
    const win = typeof window !== "undefined" ? (window as any) : undefined;

    if (win?.__WRITEON_CANVAS_HOST_MOUNTED__) {
      if (DEBUG_EXCALIDRAW) {
        console.warn("[CanvasMount] Another interactive host is already mounted; skipping mount");
      }
      return () => {};
    }

    if (win) {
      win.__WRITEON_CANVAS_HOST_MOUNTED__ = true;
      try {
        const hosts = document.querySelectorAll("excalidraw-island");
        if (hosts.length > 1 && DEBUG_EXCALIDRAW) {
          console.warn("[CanvasMount] Detected multiple excalidraw-island elements in DOM:", hosts.length);
        }
      } catch {}
    }

    let mounted = false;
    let rafId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const resolveContainer = (): boolean => {
      const pageElement = hostRef.current?.querySelector<HTMLElement>(".canvas-page") ?? null;
      if (!pageElement) {
        if (DEBUG_EXCALIDRAW) {
          console.warn("[CanvasMount] Could not locate .canvas-page for mounting");
        }
        return false;
      }
      containerRef.current = pageElement;
      setCanvasContainer?.(pageElement);
      return true;
    };

    const hasUsableBounds = (): boolean => {
      const node = hostRef.current;
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return rect.width >= 2 && rect.height >= 2;
    };

    const attemptMount = (): boolean => {
      if (mounted) return true;
      if (!resolveContainer()) return false;
      if (!hasUsableBounds()) return false;
      mount();
      mounted = true;
      return true;
    };

    const scheduleAttempt = () => {
      if (mounted) return;
      rafId = requestAnimationFrame(() => {
        if (!attemptMount()) {
          scheduleAttempt();
        }
      });
    };

    if (!attemptMount()) {
      scheduleAttempt();
      if (typeof ResizeObserver !== "undefined" && hostRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (!mounted) {
            attemptMount();
          }
        });
        try {
          resizeObserver.observe(hostRef.current);
        } catch {}
      }
    }

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      if (mounted) {
        unmount();
      }
      if (win) {
        try {
          win.__WRITEON_CANVAS_HOST_MOUNTED__ = false;
        } catch {}
      }
      setCanvasContainer?.(null);
    };
  }, [mount, setCanvasContainer, unmount]);

  const combinedClassName = ["workspace-canvas-mount", className ?? ""].filter(Boolean).join(" ");

  return (
    <div ref={hostRef} className={combinedClassName} data-role="canvas-mount" data-readonly={readonly}>
      {children}
      {!isReady && (
        <div
          className="excalidraw-loading"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#666",
            fontSize: "14px",
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          Loading Excalidraw Island...
        </div>
      )}

      {process.env.NODE_ENV === "development" && isReady && (
        <div
          className="excalidraw-ready-indicator"
          style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            padding: "4px 8px",
            background: "rgba(34, 197, 94, 0.1)",
            color: "#16a34a",
            fontSize: "12px",
            borderRadius: "4px",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          Island Ready
        </div>
      )}
    </div>
  );
}


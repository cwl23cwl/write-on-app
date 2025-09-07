"use client";

import { useRef } from "react";
import { useCanvasLifecycle } from "@/components/workspace/hooks/useCanvasLifecycle";
import { ExcalidrawAdapter } from "@/components/workspace/excalidraw/ExcalidrawAdapter";
import { useWorkspaceContext } from "@/components/workspace/WorkspaceProvider";
// import { useCanvasStore } from "@/state";
import { useResolutionSync } from "@/components/workspace/hooks/useResolutionSync";

type Props = {
  className?: string;
};

export function CanvasMount({ className }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { setExApi } = useWorkspaceContext();
  const registeredRef = useRef(false);

  useCanvasLifecycle({ containerRef, canvasRef });
  useResolutionSync();

  // Adapter will set API via bridge; keep no-op callback for compatibility if needed
  // Adapter manages API wiring; no local callback needed.

  return (
    <div
      ref={containerRef}
      className={`workspace-canvas-mount ${className ?? ""}`.trim()}
      style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}
    >
      {/* The internal canvas helps resolution management; Excalidraw renders in its own subtree */}
      <canvas ref={canvasRef} className="workspace-canvas absolute inset-0 pointer-events-none" aria-hidden />
      <ExcalidrawAdapter
        initialData={null}
        readOnly={false}
        onReady={(api) => {
          if (registeredRef.current) return;
          registeredRef.current = true;
          if (process.env.NODE_ENV === 'development') {
            try { console.info('[CanvasMount] Excalidraw API registered'); } catch {}
          }
          setExApi(api);
        }}
      />
    </div>
  );
}

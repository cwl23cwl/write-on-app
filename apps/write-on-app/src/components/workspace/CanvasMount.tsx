"use client";

type Props = { className?: string };

// Phase 2 placeholder: centered white page with shadow (no engine wired yet)
export function CanvasMount({ className }: Props): JSX.Element {
  return (
    <div className={`workspace-canvas-mount ${className ?? ""}`.trim()} style={{ width: '100%', height: '100%' }}>
      <div
        className="phase2-page"
        style={{
          width: 'var(--page-width)',
          height: 'var(--page-height)',
          background: '#ffffff',
          boxShadow: '0 0 6px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}

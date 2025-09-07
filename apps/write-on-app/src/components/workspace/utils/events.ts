export function normalizedDeltaY(e: WheelEvent): number {
  // Firefox often reports delta in lines (1) or pages (2)
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
  return e.deltaY * unit;
}


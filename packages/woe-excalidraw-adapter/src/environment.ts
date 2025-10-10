export function hasWindow(): boolean {
  return typeof window !== "undefined" && window !== null;
}

export function hasDocument(): boolean {
  return typeof document !== "undefined" && document !== null;
}

export function getSafeDPR(): number {
  if (hasWindow() && typeof window.devicePixelRatio === "number") {
    const dpr = window.devicePixelRatio;
    if (Number.isFinite(dpr) && dpr > 0) {
      return dpr;
    }
  }
  return 1;
}

export function requestAnimationFrameSafe(callback: FrameRequestCallback): number {
  if (hasWindow() && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16) as unknown as number;
}

export function cancelAnimationFrameSafe(handle: number): void {
  if (hasWindow() && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  }
}

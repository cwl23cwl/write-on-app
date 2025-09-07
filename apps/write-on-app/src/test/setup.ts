// Minimal JSDOM setup and polyfills for tests

// ResizeObserver polyfill (very light)
class RO {
  private _cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) { this._cb = cb; }
  observe(): void { /* no-op */ }
  unobserve(): void { /* no-op */ }
  disconnect(): void { /* no-op */ }
}
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || RO;

// Stub getComputedStyle for transform checks defaulting to 'none'
const _gcs = globalThis.getComputedStyle;
globalThis.getComputedStyle = ((elt: Element) => {
  const s = _gcs ? _gcs(elt as Element) : ({} as any);
  if (!('transform' in s)) {
    (s as any).transform = 'none';
  }
  return s;
}) as typeof getComputedStyle;


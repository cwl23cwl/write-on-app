export type ViewState = { scale: number; scrollX: number; scrollY: number };

export function getWorldPoint(
  evt: { clientX: number; clientY: number },
  hostEl: HTMLElement,
  view: ViewState,
): { x: number; y: number } {
  const rect = hostEl.getBoundingClientRect();
  const scale = Number.isFinite(view.scale) && view.scale !== 0 ? view.scale : 1;
  const scrollX = Number.isFinite(view.scrollX) ? view.scrollX : 0;
  const scrollY = Number.isFinite(view.scrollY) ? view.scrollY : 0;
  const localX = evt.clientX - rect.left;
  const localY = evt.clientY - rect.top;
  return {
    x: scrollX + localX / scale,
    y: scrollY + localY / scale,
  };
}

/**
 * Clamps scroll position during zoom with edge dead-zones to prevent jitter
 */
const EDGE_GUTTER = 0; // set to small positive value to allow tiny negative slack

export function clampScrollPosition(
  scrollX: number,
  scrollY: number,
  scale: number,
  viewportSize: { w: number; h: number },
  contentSize: { w: number; h: number },
  gutter: number = EDGE_GUTTER,
): { scrollX: number; scrollY: number } {
  const scaledContentW = contentSize.w * scale;
  const scaledContentH = contentSize.h * scale;

  const maxScrollX = Math.max(0, scaledContentW - viewportSize.w);
  const maxScrollY = Math.max(0, scaledContentH - viewportSize.h);

  const minX = -gutter;
  const minY = -gutter;
  const maxX = maxScrollX + gutter;
  const maxY = maxScrollY + gutter;

  let clampedX = Math.max(minX, Math.min(scrollX, maxX));
  let clampedY = Math.max(minY, Math.min(scrollY, maxY));

  if (Math.abs(clampedX) < 0.5) clampedX = 0;
  if (Math.abs(clampedY) < 0.5) clampedY = 0;

  return { scrollX: clampedX, scrollY: clampedY };
}

/**
 * Implements pointer-centered zoom: calculates new scroll position so the point
 * under the cursor remains anchored when scale changes. Includes edge clamping.
 */
export function zoomAtClientPoint(
  clientX: number,
  clientY: number,
  newScale: number,
  currentView: ViewState,
  hostEl: HTMLElement,
  contentSize?: { w: number; h: number },
): { scale: number; scrollX: number; scrollY: number } {
  const rect = hostEl.getBoundingClientRect();
  const safeOldScale = Number.isFinite(currentView.scale) && currentView.scale !== 0 ? currentView.scale : 1;
  const safeNewScale = Number.isFinite(newScale) && newScale !== 0 ? newScale : 1;
  const prevScrollX = Number.isFinite(currentView.scrollX) ? currentView.scrollX : 0;
  const prevScrollY = Number.isFinite(currentView.scrollY) ? currentView.scrollY : 0;
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;

  const worldX = prevScrollX + localX / safeOldScale;
  const worldY = prevScrollY + localY / safeOldScale;

  let nextScrollX = worldX - localX / safeNewScale;
  let nextScrollY = worldY - localY / safeNewScale;

  if (contentSize) {
    const viewportSize = { w: rect.width, h: rect.height };
    const clamped = clampScrollPosition(nextScrollX, nextScrollY, safeNewScale, viewportSize, contentSize);
    nextScrollX = clamped.scrollX;
    nextScrollY = clamped.scrollY;
  }

  return {
    scale: safeNewScale,
    scrollX: nextScrollX,
    scrollY: nextScrollY,
  };
}

/**
 * Checks if scale has deviated from fit-width by epsilon threshold
 */
export function hasDeviatedFromFitWidth(currentScale: number, fitWidthScale: number, epsilon: number = 0.02): boolean {
  return Math.abs(currentScale - fitWidthScale) > epsilon;
}

/**
 * Calculates deviation percentage from fit-width scale
 */
export function calculateFitWidthDeviation(currentScale: number, fitWidthScale: number): number {
  if (fitWidthScale <= 0) return 0;
  return Math.abs(currentScale - fitWidthScale) / fitWidthScale;
}

/**
 * Calculates adaptive zoom sensitivity factor for multiplicative zoom
 * Returns sensitivity multiplier for smooth, scale-aware zooming
 */
export function getAdaptiveZoomSensitivity(currentScale: number): number {
  const baseSensitivity = 0.0005;

  if (currentScale < 0.25) {
    return baseSensitivity * 1.8;
  } else if (currentScale < 0.5) {
    return baseSensitivity * 1.4;
  } else if (currentScale < 2.0) {
    return baseSensitivity;
  } else if (currentScale < 4.0) {
    return baseSensitivity * 0.7;
  }
  return baseSensitivity * 0.5;
}

/**
 * Calculates adaptive zoom step size based on current scale
 * For discrete keyboard-style zoom operations
 */
export function getAdaptiveZoomStep(currentScale: number): number {
  const baseStep = 0.08;

  if (currentScale < 0.25) {
    return baseStep * 1.25;
  } else if (currentScale < 0.5) {
    return baseStep * 1.1;
  } else if (currentScale < 2.0) {
    return baseStep;
  } else if (currentScale < 4.0) {
    return baseStep * 0.75;
  }
  return baseStep * 0.5;
}

/**
 * Processes accumulated trackpad deltas and applies zoom ticks when threshold crossed
 */
export function processZoomDelta(
  rawDelta: number,
  accumulator: number,
  currentScale: number,
  minThreshold: number = 0.5,
): { newAccumulator: number; zoomTicks: number } {
  const newAccumulator = accumulator + Math.abs(rawDelta);
  const ticks = Math.min(1, Math.floor(newAccumulator / minThreshold));
  const remainingAccumulator = ticks > 0 ? newAccumulator % minThreshold : newAccumulator;

  return {
    newAccumulator: remainingAccumulator,
    zoomTicks: ticks * (rawDelta >= 0 ? 1 : -1),
  };
}

/**
 * Applies zoom ticks with adaptive step size
 */
export function applyZoomTicks(
  currentScale: number,
  ticks: number,
  minScale: number,
  maxScale: number,
): number {
  if (ticks === 0) return currentScale;

  const step = getAdaptiveZoomStep(currentScale);

  let newScale = currentScale;
  for (let i = 0; i < Math.abs(ticks); i++) {
    if (ticks > 0) {
      newScale = newScale * (1 + step);
    } else {
      newScale = newScale / (1 + step);
    }
  }

  return Math.max(minScale, Math.min(newScale, maxScale));
}

/**
 * Checks if scale change is significant enough to process (epsilon filter)
 */
export function isSignificantScaleChange(oldScale: number, newScale: number, epsilon: number = 0.002): boolean {
  return Math.abs(newScale - oldScale) >= epsilon;
}

export type ViewState = { scale: number; scrollX: number; scrollY: number };

export function getWorldPoint(evt: { clientX: number; clientY: number }, hostEl: HTMLElement, view: ViewState): { x: number; y: number } {
  const rect = hostEl.getBoundingClientRect();
  const x = (evt.clientX - rect.left) / (view.scale ?? 1) + (view.scrollX ?? 0);
  const y = (evt.clientY - rect.top) / (view.scale ?? 1) + (view.scrollY ?? 0);
  return { x, y };
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
  gutter: number = EDGE_GUTTER
): { scrollX: number; scrollY: number } {
  // Scaled content dimensions based on base page size and current scale
  const scaledContentW = contentSize.w * scale;
  const scaledContentH = contentSize.h * scale;

  // Real bounds: content may be smaller than viewport -> no scroll
  const maxScrollX = Math.max(0, scaledContentW - viewportSize.w);
  const maxScrollY = Math.max(0, scaledContentH - viewportSize.h);

  const minX = 0 - gutter;
  const minY = 0 - gutter;
  const maxX = maxScrollX + gutter;
  const maxY = maxScrollY + gutter;

  let clampedX = Math.max(minX, Math.min(scrollX, maxX));
  let clampedY = Math.max(minY, Math.min(scrollY, maxY));

  // Quantize away near-zero floating point drift
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
  contentSize?: { w: number; h: number }
): { scale: number; scrollX: number; scrollY: number } {
  const rect = hostEl.getBoundingClientRect();
  const oldScale = currentView.scale ?? 1;
  
  console.log(`[zoomAtClientPoint] Element: ${hostEl.id || hostEl.className}`);
  console.log(`[zoomAtClientPoint] Client mouse: ${clientX}, ${clientY}`);
  console.log(`[zoomAtClientPoint] Element rect: ${rect.left}, ${rect.top}, ${rect.width}x${rect.height}`);
  console.log(`[zoomAtClientPoint] Scales: ${oldScale} → ${newScale}`);
  
  // Mouse position relative to the viewport element
  const mouseX = clientX - rect.left;
  const mouseY = clientY - rect.top;
  
  console.log(`[zoomAtClientPoint] Mouse in viewport: ${mouseX}, ${mouseY}`);
  console.log(`[zoomAtClientPoint] Current scroll: ${currentView.scrollX}, ${currentView.scrollY}`);
  
  // For CSS transform-based zoom, the formula is different:
  // We want the world point under the cursor to stay in the same place
  // newScroll = (oldScroll + mousePos) * (newScale/oldScale) - mousePos
  const scaleRatio = newScale / oldScale;
  let newScrollX = ((currentView.scrollX ?? 0) + mouseX) * scaleRatio - mouseX;
  let newScrollY = ((currentView.scrollY ?? 0) + mouseY) * scaleRatio - mouseY;
  
  console.log(`[zoomAtClientPoint] Scale ratio: ${scaleRatio}`);
  console.log(`[zoomAtClientPoint] Calculated scroll: ${newScrollX}, ${newScrollY}`);
  
  // Apply clamping if content size is provided
  if (contentSize) {
    console.log(`[zoomAtClientPoint] Base content size: ${contentSize.w}x${contentSize.h}`);
    console.log(`[zoomAtClientPoint] Before clamping: ${newScrollX}, ${newScrollY}`);
    
    const viewportSize = { w: rect.width, h: rect.height };
    
    // clampScrollPosition will scale the content size internally, so pass base size
    const clamped = clampScrollPosition(newScrollX, newScrollY, newScale, viewportSize, contentSize);
    
    console.log(`[zoomAtClientPoint] After clamping: ${clamped.scrollX}, ${clamped.scrollY}`);
    
    newScrollX = clamped.scrollX;
    newScrollY = clamped.scrollY;
  }
  
  return {
    scale: newScale,
    scrollX: newScrollX,
    scrollY: newScrollY
  };
}

/**
 * Rounds zoom percentage to stable display values
 */
export function roundZoomPercent(scale: number): number {
  const percent = scale * 100;
  
  // Round to whole numbers for stable display
  if (percent < 10) {
    return Math.round(percent * 10) / 10; // 1 decimal place for very small
  } else if (percent < 100) {
    return Math.round(percent); // Whole numbers
  } else {
    return Math.round(percent / 5) * 5; // Round to nearest 5 for large values
  }
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
  // Base sensitivity factor
  const baseSensitivity = 0.0005;
  
  if (currentScale < 0.25) {
    // Very zoomed out: higher sensitivity for easier zoom-in
    return baseSensitivity * 1.8; // ~0.0009
  } else if (currentScale < 0.5) {
    // Moderately zoomed out: slightly higher sensitivity
    return baseSensitivity * 1.4; // ~0.0007
  } else if (currentScale < 2.0) {
    // Normal range: default sensitivity
    return baseSensitivity; // 0.0005
  } else if (currentScale < 4.0) {
    // Zoomed in: lower sensitivity for finer control
    return baseSensitivity * 0.7; // ~0.00035
  } else {
    // Very zoomed in: much lower sensitivity for precision
    return baseSensitivity * 0.5; // ~0.00025
  }
}

/**
 * Calculates adaptive zoom step size based on current scale
 * For discrete keyboard-style zoom operations
 */
export function getAdaptiveZoomStep(currentScale: number): number {
  // Conservative step sizes for keyboard zoom
  const baseStep = 0.08; // 8% base step
  
  if (currentScale < 0.25) {
    // Very zoomed out: larger steps to get to usable range quickly
    return baseStep * 1.25; // ~10%
  } else if (currentScale < 0.5) {
    // Moderately zoomed out: slightly larger steps
    return baseStep * 1.1; // ~8.8%
  } else if (currentScale < 2.0) {
    // Normal range: default step size
    return baseStep; // 8%
  } else if (currentScale < 4.0) {
    // Zoomed in: smaller steps for precision
    return baseStep * 0.75; // ~6%
  } else {
    // Very zoomed in: much smaller steps
    return baseStep * 0.5; // ~4%
  }
}

/**
 * Processes accumulated trackpad deltas and applies zoom ticks when threshold crossed
 */
export function processZoomDelta(
  rawDelta: number, 
  accumulator: number, 
  currentScale: number, 
  minThreshold: number = 0.5
): { newAccumulator: number; zoomTicks: number } {
  // Add raw delta to accumulator
  const newAccumulator = accumulator + Math.abs(rawDelta);
  
  // Calculate how many ticks we've crossed - but limit to max 1 tick per call
  const ticks = Math.min(1, Math.floor(newAccumulator / minThreshold));
  
  // Calculate remaining accumulator after applying ticks
  const remainingAccumulator = ticks > 0 ? (newAccumulator % minThreshold) : newAccumulator;
  
  return {
    newAccumulator: remainingAccumulator,
    zoomTicks: ticks * (rawDelta >= 0 ? 1 : -1) // Preserve direction
  };
}

/**
 * Applies zoom ticks with adaptive step size
 */
export function applyZoomTicks(
  currentScale: number, 
  ticks: number, 
  minScale: number, 
  maxScale: number
): number {
  if (ticks === 0) return currentScale;
  
  const step = getAdaptiveZoomStep(currentScale);
  
  let newScale = currentScale;
  for (let i = 0; i < Math.abs(ticks); i++) {
    if (ticks > 0) {
      // Zoom in
      newScale = newScale * (1 + step);
    } else {
      // Zoom out  
      newScale = newScale / (1 + step);
    }
  }
  
  // Clamp to bounds
  return Math.max(minScale, Math.min(newScale, maxScale));
}

/**
 * Checks if scale change is significant enough to process (epsilon filter)
 */
export function isSignificantScaleChange(oldScale: number, newScale: number, epsilon: number = 0.002): boolean {
  return Math.abs(newScale - oldScale) >= epsilon;
}


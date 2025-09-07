export type ViewState = { scale: number; scrollX: number; scrollY: number };

export function getWorldPoint(evt: { clientX: number; clientY: number }, hostEl: HTMLElement, view: ViewState): { x: number; y: number } {
  const rect = hostEl.getBoundingClientRect();
  const x = (evt.clientX - rect.left) / (view.scale || 1) + (view.scrollX || 0);
  const y = (evt.clientY - rect.top) / (view.scale || 1) + (view.scrollY || 0);
  return { x, y };
}


"use client";

import { useCallback } from "react";
import { usePageStore } from "@/state";

export function PageIndicator(): JSX.Element {
  const current = usePageStore((s) => s.current);
  const total = usePageStore((s) => s.total);
  const next = usePageStore((s) => s.next);
  const prev = usePageStore((s) => s.prev);
  const dropdownOpen = usePageStore((s) => s.dropdownOpen);
  const openDropdown = usePageStore((s) => s.openDropdown);
  const closeDropdown = usePageStore((s) => s.closeDropdown);
  const toggleDropdown = usePageStore((s) => s.toggleDropdown);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); return; }
    if (e.key === "Enter") { e.preventDefault(); openDropdown(); return; }
    if (e.key === "Escape") { e.preventDefault(); closeDropdown(); return; }
  }, [next, prev, openDropdown, closeDropdown]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Page ${current} of ${total}`}
      aria-expanded={dropdownOpen || undefined}
      onKeyDown={onKeyDown}
      className="chrome-page-indicator inline-flex items-center justify-center gap-2 font-medium text-sm w-auto min-w-[120px] max-w-[70vw] rounded-full border select-none"
      style={{
        minHeight: '36px',
        paddingInline: '16px',
        backgroundColor: 'var(--pill-bg, #ffffff)',
        color: 'var(--pill-fg, #111111)',
        borderColor: 'var(--pill-border, #e5e7eb)',
        marginTop: 'var(--gap-indicator-above, 8px)',
        marginBottom: 'var(--gap-indicator-below, 12px)',
        zIndex: 'var(--z-indicator)' as unknown as number,
      }}
    >
      <button
        type="button"
        onClick={prev}
        aria-label="Previous page"
        className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
      >
        <span aria-hidden>◀</span>
      </button>
      <span className="px-1 whitespace-nowrap">Page {current}{total > 0 ? ` / ${total}` : ''}</span>
      <button
        type="button"
        onClick={toggleDropdown}
        aria-label={dropdownOpen ? "Close page menu" : "Open page menu"}
        className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
      >
        <span aria-hidden>▾</span>
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next page"
        className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
      >
        <span aria-hidden>▶</span>
      </button>
    </div>
  );
}

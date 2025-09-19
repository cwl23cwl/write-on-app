"use client";

import { useCallback, useEffect, useRef, type JSX } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { usePageStore } from "@/state";

export function PageIndicator(): JSX.Element {
  const current = usePageStore((s) => s.current);
  const total = usePageStore((s) => s.total);
  const next = usePageStore((s) => s.next);
  const prev = usePageStore((s) => s.prev);
  const dropdownOpen = usePageStore((s) => s.dropdownOpen);
  const toggleDropdown = usePageStore((s) => s.toggleDropdown);
  const closeDropdown = usePageStore((s) => s.closeDropdown);
  const setCurrent = usePageStore((s) => s.setCurrent);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const safeTotal = Math.max(1, Math.floor(total));
  const safeCurrent = Math.min(Math.max(1, Math.floor(current)), safeTotal);
  const activeIndex = safeCurrent - 1;
  const hasMultiplePages = safeTotal > 1;
  const canGoPrevious = safeCurrent > 1;
  const canGoNext = safeCurrent < safeTotal;

  const handlePrevious = useCallback((): void => {
    if (!canGoPrevious) return;
    prev();
  }, [canGoPrevious, prev]);

  const handleNext = useCallback((): void => {
    if (!canGoNext) return;
    next();
  }, [canGoNext, next]);

  const handleToggleDropdown = useCallback((): void => {
    if (!hasMultiplePages) return;
    toggleDropdown();
  }, [hasMultiplePages, toggleDropdown]);

  const handleSelectPage = useCallback((pageNumber: number): void => {
    setCurrent(pageNumber);
    closeDropdown();
  }, [setCurrent, closeDropdown]);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current && containerRef.current.contains(target)) return;
      closeDropdown();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return (): void => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, closeDropdown]);

  useEffect(() => {
    if (!hasMultiplePages && dropdownOpen) {
      closeDropdown();
    }
  }, [hasMultiplePages, dropdownOpen, closeDropdown]);

  return (
    <div className="chrome-page-indicator relative z-50" ref={containerRef}>
      <div className="flex items-center bg-white border border-gray-300 rounded-full shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className={`flex items-center justify-center w-10 h-10 transition-all duration-200 ${canGoPrevious ? "text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" : "text-gray-300 cursor-not-allowed"}`}
          title={canGoPrevious ? "Previous page" : "No previous page"}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} aria-hidden />
        </button>

        <button
          type="button"
          onClick={handleToggleDropdown}
          className={`flex items-center justify-center px-4 h-10 min-w-[80px] text-sm font-semibold text-gray-800 transition-all duration-200 ${hasMultiplePages ? "hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" : "cursor-default"}`}
          aria-haspopup={hasMultiplePages ? "listbox" : undefined}
          aria-expanded={hasMultiplePages ? dropdownOpen : undefined}
          aria-label={hasMultiplePages ? "Select page" : "Page number"}
          disabled={!hasMultiplePages}
        >
          <span className="tabular-nums">
            {safeCurrent} / {safeTotal}
          </span>

          {hasMultiplePages && (
            <ChevronDown
              className={`ml-2 w-3 h-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              strokeWidth={2.5}
              aria-hidden
            />
          )}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className={`flex items-center justify-center w-10 h-10 transition-all duration-200 ${canGoNext ? "text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" : "text-gray-300 cursor-not-allowed"}`}
          title={canGoNext ? "Next page" : "No next page"}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      {dropdownOpen && hasMultiplePages && (
        <div
          className="absolute left-1/2 top-full z-50 mt-2 min-w-[160px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white shadow-lg"
          role="listbox"
          aria-label="Pages"
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {Array.from({ length: safeTotal }, (_, index) => {
              const pageNumber = index + 1;
              const isActive = index === activeIndex;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelectPage(pageNumber)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-150 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${isActive ? "bg-blue-50 font-semibold text-blue-700 border-r-2 border-blue-500" : "text-gray-700"}`}
                >
                  <div className="flex items-center justify-between">
                    <span>Page {pageNumber}</span>
                    {isActive && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

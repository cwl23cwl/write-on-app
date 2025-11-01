export function AppHeader() {
  return (
    <header className="chrome-header">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold" style={{ color: "var(--chrome-fg-strong)" }}>
          Write on English
        </span>
      </div>
      <div className="flex-1 text-center text-sm font-medium" style={{ color: "var(--chrome-fg-muted)" }}>
        {/* Page title placeholder */}
      </div>
      <div className="flex items-center gap-2">
        <button className="tool-btn" type="button" disabled aria-disabled="true">
          Placeholder
        </button>
      </div>
    </header>
  )
}

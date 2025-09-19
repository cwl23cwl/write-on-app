"use client";

import { createPortal } from "react-dom";
import { useCallback, useMemo, useRef, useState, type JSX } from "react";
import {
  Bold,
  Italic,
  Underline,
  Minus,
  Plus,
  Palette,
  ChevronDown,
  RectangleHorizontal as BorderAll,
} from "lucide-react";

import { SimplifiedColorPicker } from "@/components/workspace/SimplifiedColorPicker";
import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

// -----------------------------------------------------------------------------
// Types & constants
// -----------------------------------------------------------------------------
interface ListItem<T> {
  label: string;
  value: T;
  preview?: string | null;
}

type PickerKind = "text" | "background" | "border";

const FONT_FAMILIES: Array<ListItem<string>> = [
  { label: "Open Sans", value: "Open Sans, sans-serif" },
  { label: "Comic Sans", value: '"Comic Sans MS", cursive' },
  { label: "Calibri", value: "Calibri, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: '"Times New Roman", serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier", value: '"Courier New", monospace' },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Helvetica", value: "Helvetica, sans-serif" },
];

const FONT_SIZES: Array<ListItem<number>> = [
  { label: "10 pt", value: 10 },
  { label: "12 pt", value: 12 },
  { label: "14 pt", value: 14 },
  { label: "16 pt", value: 16 },
  { label: "18 pt", value: 18 },
  { label: "20 pt", value: 20 },
  { label: "24 pt", value: 24 },
  { label: "28 pt", value: 28 },
  { label: "32 pt", value: 32 },
  { label: "36 pt", value: 36 },
  { label: "48 pt", value: 48 },
  { label: "60 pt", value: 60 },
  { label: "72 pt", value: 72 },
];

const TEXT_SWATCHES: Array<ListItem<string>> = [
  { label: "#000000", value: "#000000" },
  { label: "#2563eb", value: "#2563eb" },
  { label: "#dc2626", value: "#dc2626" },
  { label: "#16a34a", value: "#16a34a" },
  { label: "#ec5d3a", value: "#ec5d3a" },
  { label: "#7c3aed", value: "#7c3aed" },
  { label: "#78716c", value: "#78716c" },
];

const TEXT_BACKGROUND_COLORS: Array<ListItem<string | null>> = [
  { label: "Transparent", value: null, preview: null },
  { label: "#000000", value: "#000000", preview: "#000000" },
  { label: "#ffffff", value: "#ffffff", preview: "#ffffff" },
];

const BORDER_COLORS: Array<ListItem<string>> = [
  { label: "#000000", value: "#000000", preview: "#000000" },
  { label: "#ec5d3a", value: "#ec5d3a", preview: "#ec5d3a" },
  { label: "#0891b2", value: "#0891b2", preview: "#0891b2" },
  { label: "#9333ea", value: "#9333ea", preview: "#9333ea" },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function extractFontName(uiFontFamily: string): string {
  const fontName = uiFontFamily.split(",")[0].replace(/['"]/g, "").trim();
  if (uiFontFamily.includes("Comic Sans")) return "Comic Sans MS";
  if (uiFontFamily.includes("Courier") || uiFontFamily.includes("monospace")) return "Courier New";
  return fontName;
}

function applyColorDirectlyToSelectedText(api: any, color: string): boolean {
  if (!api) return false;
  try {
    const elements = api.getSceneElements?.() || [];
    const appState = api.getAppState?.() || {};
    const selectedIds = Object.keys(appState.selectedElementIds || {});
    if (!selectedIds.length) {
      api.updateScene?.({ appState: { currentItemStrokeColor: color } } as any);
      return false;
    }
    const updated = elements.map((el: any) =>
      selectedIds.includes(el.id) && el.type === "text" ? { ...el, strokeColor: color } : el,
    );
    api.updateScene?.({
      elements: updated,
      appState: { currentItemStrokeColor: color, selectedElementIds: appState.selectedElementIds },
      commitToHistory: true,
    } as any);
    return true;
  } catch (e) {
    console.error("applyColorDirectlyToSelectedText", e);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Component – full‑row, three zones, persistent spacer, taller height
// -----------------------------------------------------------------------------
const OptionsToolbar = (): JSX.Element => {
  const ref = useRef<HTMLElement | null>(null);
  useMeasureCssVar(ref, "--h-opts");

  const {
    toolPrefs,
    updateToolPref,
    excalidrawAPI,
    activeTool,
    setActiveTool,
    applyTextStyleToSelection,
    debugShowTextOptions,
  } =
    useWorkspaceStore();

  const activeToolId = typeof activeTool === "object" && activeTool !== null
    ? activeTool.type ?? activeTool.name ?? ""
    : typeof activeTool === "string"
      ? activeTool
      : "";
  const isText = debugShowTextOptions || activeToolId === "text";

  // UI state
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  // text settings
  const [fontFamily, setFontFamily] = useState<ListItem<string>>({
    label: "Open Sans",
    value: toolPrefs?.textFamily || "Open Sans, sans-serif",
  });
  const [fontSize, setFontSize] = useState<ListItem<number>>({
    label: `${toolPrefs?.textSize ?? 24} pt`,
    value: toolPrefs?.textSize ?? 24,
  });
  const [isBold, setBold] = useState<boolean>(!!toolPrefs?.textBold);
  const [isItalic, setItalic] = useState<boolean>(!!toolPrefs?.textItalic);
  const [isUnderline, setUnderline] = useState<boolean>(!!toolPrefs?.textUnderline);
  const [textColor, setTextColor] = useState<string>(toolPrefs?.textColor || "#111827");
  const [backgroundEnabled, setBackgroundEnabled] = useState<boolean>(!!toolPrefs?.textBackground);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(
    toolPrefs?.textBackgroundColor ?? null,
  );
  const [borderEnabled, setBorderEnabled] = useState<boolean>(!!toolPrefs?.textBorder);
  const [borderColor, setBorderColor] = useState<string>(
    toolPrefs?.textBorderColor || BORDER_COLORS[0].value,
  );

  // picker
  const [pickerType, setPickerType] = useState<PickerKind | null>(null);
  const [pickerColor, setPickerColor] = useState<string>(textColor);
  const [pickerAnchor, setPickerAnchor] = useState<{ x: number; y: number } | null>(null);
  const anchorBtnRef = useRef<HTMLButtonElement>(null);

  const fontSizeLabel = useMemo(() => `${fontSize.value} pt`, [fontSize]);

  // === behaviors ===
  const handleTextColorChange = useCallback(
    (hex: string) => {
      updateToolPref?.("textColor", hex);
      const applied = applyColorDirectlyToSelectedText(excalidrawAPI, hex);
      if (!isText && !applied) {
        try {
          const store = useWorkspaceStore.getState();
          if (typeof store.selectTool === "function") store.selectTool("text");
          else {
            setActiveTool("text");
            (excalidrawAPI as any)?.setActiveTool?.({ type: "text" });
          }
          (excalidrawAPI as any)?.updateScene?.({
            appState: {
              activeTool: { type: "text" },
              currentItemStrokeColor: hex,
              currentItemFontSize: fontSize.value,
            },
          } as any);
        } catch (e) {
          console.error("auto text switch", e);
        }
      } else if (!applied) {
        (excalidrawAPI as any)?.updateScene?.({ appState: { currentItemStrokeColor: hex } } as any);
      }
      setTextColor(hex);
    },
    [excalidrawAPI, fontSize.value, isText, setActiveTool, updateToolPref],
  );

  const handleFontFamilySelect = (family: (typeof FONT_FAMILIES)[number]) => {
    setFontFamily(family);
    setFontMenuOpen(false);
    const fontName = extractFontName(family.value);
    document.documentElement.style.setProperty("--selected-font-family", `"${fontName}"`);
    (excalidrawAPI as any)?.updateScene?.({ appState: { currentItemFontFamily: fontName } } as any);
    applyTextStyleToSelection?.({ fontFamily: fontName });
    updateToolPref?.("textFamily", family.value);
  };

  const handleFontSizeSelect = (size: (typeof FONT_SIZES)[number]) => {
    setFontSize(size);
    setSizeMenuOpen(false);
    (excalidrawAPI as any)?.updateScene?.({ appState: { currentItemFontSize: size.value } } as any);
    applyTextStyleToSelection?.({ fontSize: size.value });
    updateToolPref?.("textSize", size.value);
  };

  const adjustFontSize = (direction: "up" | "down") => {
    const index = FONT_SIZES.findIndex((item) => item.value === fontSize.value);
    const nextIndex =
      direction === "up" ? Math.min(FONT_SIZES.length - 1, index + 1) : Math.max(0, index - 1);
    const next = FONT_SIZES[nextIndex];
    if (next.value !== fontSize.value) handleFontSizeSelect(next);
  };

  const toggleBold = () => {
    const n = !isBold;
    setBold(n);
    applyTextStyleToSelection?.({ fontWeight: n ? "bold" : "normal" });
    updateToolPref?.("textBold", n);
  };
  const toggleItalic = () => {
    const n = !isItalic;
    setItalic(n);
    applyTextStyleToSelection?.({ fontStyle: n ? "italic" : "normal" });
    updateToolPref?.("textItalic", n);
  };
  const toggleUnderline = () => {
    const n = !isUnderline;
    setUnderline(n);
    applyTextStyleToSelection?.({ textDecoration: n ? "underline" : "none" });
    updateToolPref?.("textUnderline", n);
  };

  const toggleBackground = () => {
    const next = !backgroundEnabled;
    setBackgroundEnabled(next);
    updateToolPref?.("textBackground", next);
    applyTextStyleToSelection?.({ backgroundColor: next ? backgroundColor ?? "#ffffff" : "transparent" });
  };
  const setBackgroundSwatch = (value: string | null) => {
    setBackgroundColor(value);
    updateToolPref?.("textBackgroundColor", value ?? "transparent");
    if (value == null) {
      setBackgroundEnabled(false);
      applyTextStyleToSelection?.({ backgroundColor: "transparent" });
    } else {
      setBackgroundEnabled(true);
      applyTextStyleToSelection?.({ backgroundColor: value });
    }
  };

  const toggleBorder = () => {
    const next = !borderEnabled;
    setBorderEnabled(next);
    updateToolPref?.("textBorder", next);
    applyTextStyleToSelection?.({ borderEnabled: next, borderColor });
  };
  const setBorderSwatch = (value: string) => {
    setBorderColor(value);
    updateToolPref?.("textBorderColor", value);
    applyTextStyleToSelection?.({ borderColor: value });
  };

  const openPicker = (type: PickerKind) => {
    setPickerType(type);
    const color = type === "text" ? textColor : type === "background" ? backgroundColor ?? "#ffffff" : borderColor;
    setPickerColor(color);
    if (anchorBtnRef.current) {
      const r = anchorBtnRef.current.getBoundingClientRect();
      setPickerAnchor({ x: r.left, y: r.bottom + 8 });
    }
  };
  const closePicker = () => {
    if (!pickerType) return;
    if (pickerType === "text") handleTextColorChange(pickerColor);
    if (pickerType === "background") setBackgroundSwatch(pickerColor);
    if (pickerType === "border") setBorderSwatch(pickerColor);
    setPickerType(null);
    setPickerAnchor(null);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // Always mounted: keep a spacer row so the canvas doesn't jump. Height matches
  // TopToolbar if the CSS var is present, else ~56px.
  // ---------------------------------------------------------------------------
  return (
    <aside
      ref={ref}
      className="chrome-options-toolbar options-toolbar w-full px-3"
      style={{
        backgroundColor: "transparent",
        marginTop: "var(--gap-top-opts)",
        marginBottom: 0,
        minHeight: "var(--h-top, 56px)",
        display: "flex",
        alignItems: "center",
        position: "relative",
        zIndex: "var(--z-toolbar, 1900)",
      }}
    >
      {!isText ? (
        // Spacer only
        <div className="w-full" />
      ) : (
        <div className="flex w-full items-center justify-between gap-3">
          {/* LEFT: font family, size, B/I/U */}
          <div className="flex items-center gap-2">
            {/* Font family chip */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFontMenuOpen((p) => !p)}
                className="min-w-[5rem] max-w-[5rem] truncate rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium shadow-sm hover:border-blue-300"
                aria-haspopup="listbox"
                aria-expanded={fontMenuOpen}
                title="Font family"
                style={{ fontFamily: fontFamily.value }}
              >
                {extractFontName(fontFamily.value)} <ChevronDown className="ml-1 inline h-3 w-3" />
              </button>
              {fontMenuOpen && (
                <div className="absolute z-20 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                  <ul className="py-2" role="listbox">
                    {FONT_FAMILIES.map((family) => (
                      <li key={family.label}>
                        <button
                          type="button"
                          onClick={() => handleFontFamilySelect(family)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-blue-50 ${
                            family.value === fontFamily.value ? "text-blue-600" : "text-gray-700"
                          }`}
                          role="option"
                          aria-selected={family.value === fontFamily.value}
                          style={{ fontFamily: family.value }}
                        >
                          {family.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Size controls */}
            <button
              aria-label="Decrease font size"
              onClick={() => adjustFontSize("down")}
              className="h-9 w-9 rounded-lg border border-gray-200 bg-white shadow-sm hover:border-blue-300"
            >
              <Minus className="mx-auto h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSizeMenuOpen((p) => !p)}
                className="min-w-[4.5rem] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium shadow-sm hover:border-blue-300"
                aria-haspopup="listbox"
                aria-expanded={sizeMenuOpen}
                title="Font size"
              >
                {fontSizeLabel} <ChevronDown className="ml-1 inline h-3 w-3" />
              </button>
              {sizeMenuOpen && (
                <div className="absolute z-20 mt-2 max-h-60 w-28 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                  <ul className="py-2" role="listbox">
                    {FONT_SIZES.map((size) => (
                      <li key={size.value}>
                        <button
                          type="button"
                          onClick={() => handleFontSizeSelect(size)}
                          className={`flex w-full items-center justify-between px-3 py-1.5 text-sm transition hover:bg-blue-50 ${
                            size.value === fontSize.value ? "text-blue-600" : "text-gray-700"
                          }`}
                          role="option"
                          aria-selected={size.value === fontSize.value}
                        >
                          {size.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              aria-label="Increase font size"
              onClick={() => adjustFontSize("up")}
              className="h-9 w-9 rounded-lg border border-gray-200 bg-white shadow-sm hover:border-blue-300"
            >
              <Plus className="mx-auto h-4 w-4" />
            </button>

            {/* B I U */}
            <button
              aria-label="Bold"
              onClick={toggleBold}
              className={`h-9 w-9 rounded-lg border ${
                isBold ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white"
              } shadow-sm`}
            >
              <Bold className="mx-auto h-4 w-4" />
            </button>
            <button
              aria-label="Italic"
              onClick={toggleItalic}
              className={`h-9 w-9 rounded-lg border ${
                isItalic ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white"
              } shadow-sm`}
            >
              <Italic className="mx-auto h-4 w-4" />
            </button>
            <button
              aria-label="Underline"
              onClick={toggleUnderline}
              className={`h-9 w-9 rounded-lg border ${
                isUnderline ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white"
              } shadow-sm`}
            >
              <Underline className="mx-auto h-4 w-4" />
            </button>
          </div>

          {/* CENTER: text colors */}
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-7 gap-2">
              {TEXT_SWATCHES.map((c) => (
                <button
                  key={c.value}
                  title={`Text ${c.label}`}
                  aria-label={`Text color ${c.label}`}
                  onClick={() => handleTextColorChange(c.value)}
                  className={`h-6 w-6 rounded-full border-2 ${
                    c.value === textColor ? "border-blue-500" : "border-gray-200"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <button
              ref={anchorBtnRef}
              onClick={() => openPicker("text")}
              aria-label="Custom text color"
              className="ml-1 h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-sm"
            >
              <Palette className="inline h-3.5 w-3.5" /> Custom
            </button>
          </div>

          {/* RIGHT: background & border */}
          <div className="flex items-center justify-end gap-2">
            {/* Background */}
            <button
              aria-label="Toggle text background"
              onClick={toggleBackground}
              className={`h-9 w-9 rounded-lg border shadow-sm ${
                backgroundEnabled ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white"
              }`}
            >
              <Palette className="mx-auto h-4 w-4" />
            </button>
            {backgroundEnabled && (
              <div className="flex items-center gap-2">
                {TEXT_BACKGROUND_COLORS.map((item) => (
                  <button
                    key={item.label}
                    title={item.label || "Transparent"}
                    aria-label={`Background ${item.label || "Transparent"}`}
                    onClick={() => setBackgroundSwatch(item.value)}
                    className={`h-8 w-8 rounded-md border-2 ${
                      item.value === backgroundColor ? "border-blue-500" : "border-gray-200"
                    }`}
                    style={{ backgroundColor: item.preview ?? "transparent" }}
                  />
                ))}
                <button
                  ref={anchorBtnRef}
                  onClick={() => openPicker("background")}
                  aria-label="Custom background color"
                  className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-sm"
                >
                  <Palette className="inline h-3.5 w-3.5" /> Custom
                </button>
              </div>
            )}

            {/* Border */}
            <button
              aria-label="Toggle border"
              onClick={toggleBorder}
              className={`ml-4 h-9 w-9 rounded-lg border shadow-sm ${
                borderEnabled ? "border-orange-500 bg-orange-50 text-orange-600" : "border-gray-200 bg-white"
              }`}
            >
              <BorderAll className="mx-auto h-4 w-4" />
            </button>
            {borderEnabled && (
              <div className="flex items-center gap-2">
                {BORDER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    title={`Border ${c.label}`}
                    aria-label={`Border ${c.label}`}
                    onClick={() => setBorderSwatch(c.value)}
                    className={`h-8 w-8 rounded-md border-2 ${
                      c.value === borderColor ? "border-orange-500" : "border-gray-200"
                    }`}
                    style={{ backgroundColor: c.preview ?? c.value }}
                  />
                ))}
                <button
                  ref={anchorBtnRef}
                  onClick={() => openPicker("border")}
                  aria-label="Custom border color"
                  className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-sm"
                >
                  <Palette className="inline h-3.5 w-3.5" /> Custom
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Color picker portal */}
      {pickerType && pickerAnchor && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9999] bg-black/10" onClick={closePicker} />
            <div
              className="fixed z-[10000]"
              style={{ left: pickerAnchor.x, top: pickerAnchor.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <SimplifiedColorPicker value={pickerColor} onChange={setPickerColor} onClose={closePicker} />
            </div>
          </>,
          document.body,
        )}
    </aside>
  );
};

export default OptionsToolbar;
export { OptionsToolbar };

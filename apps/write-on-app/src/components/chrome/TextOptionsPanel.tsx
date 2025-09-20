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
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useToolbarStore, type ToolId } from "@/state/useToolbarStore";

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

type TextOptionsPanelProps = {
  activeTool: ToolId;
};

export function TextOptionsPanel({ activeTool }: TextOptionsPanelProps): JSX.Element {
  const {
    toolPrefs,
    updateToolPref,
    excalidrawAPI,
    setActiveTool: setWorkspaceActiveTool,
    applyTextStyleToSelection,
  } = useWorkspaceStore((state) => ({
    toolPrefs: state.toolPrefs,
    updateToolPref: state.updateToolPref,
    excalidrawAPI: state.excalidrawAPI,
    setActiveTool: state.setActiveTool,
    applyTextStyleToSelection: state.applyTextStyleToSelection,
  }));

  const setToolbarActiveTool = useToolbarStore((state) => state.setActiveTool);

  const isText = activeTool === "text";

  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

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

  const [pickerType, setPickerType] = useState<PickerKind | null>(null);
  const [pickerColor, setPickerColor] = useState<string>(textColor);
  const [pickerAnchor, setPickerAnchor] = useState<{ x: number; y: number } | null>(null);
  const anchorBtnRef = useRef<HTMLButtonElement>(null);

  const fontSizeLabel = useMemo(() => `${fontSize.value} pt`, [fontSize]);

  const handleTextColorChange = useCallback(
    (hex: string) => {
      updateToolPref?.("textColor", hex);
      const applied = applyColorDirectlyToSelectedText(excalidrawAPI, hex);
      if (!isText && !applied) {
        try {
          const store = useWorkspaceStore.getState();
          if (typeof store.selectTool === "function") store.selectTool("text");
          else {
            setWorkspaceActiveTool?.("text");
            setToolbarActiveTool("text");
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
    [excalidrawAPI, fontSize.value, isText, setToolbarActiveTool, setWorkspaceActiveTool, updateToolPref],
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
    const next = !isBold;
    setBold(next);
    applyTextStyleToSelection?.({ fontWeight: next ? "bold" : "normal" });
    updateToolPref?.("textBold", next);
  };

  const toggleItalic = () => {
    const next = !isItalic;
    setItalic(next);
    applyTextStyleToSelection?.({ fontStyle: next ? "italic" : "normal" });
    updateToolPref?.("textItalic", next);
  };

  const toggleUnderline = () => {
    const next = !isUnderline;
    setUnderline(next);
    applyTextStyleToSelection?.({ textDecoration: next ? "underline" : "none" });
    updateToolPref?.("textUnderline", next);
  };

  const toggleBackground = () => {
    const next = !backgroundEnabled;
    setBackgroundEnabled(next);
    applyTextStyleToSelection?.({ backgroundColor: next ? backgroundColor : null });
    updateToolPref?.("textBackground", next);
  };

  const setBackgroundSwatch = (hex: string | null) => {
    setBackgroundColor(hex);
    applyTextStyleToSelection?.({ backgroundColor: hex });
    updateToolPref?.("textBackgroundColor", hex);
  };

  const toggleBorder = () => {
    const next = !borderEnabled;
    setBorderEnabled(next);
    applyTextStyleToSelection?.({ strokeColor: next ? borderColor : undefined, strokeWidth: next ? 1 : 0 });
    updateToolPref?.("textBorder", next);
  };

  const setBorderSwatch = (hex: string) => {
    setBorderColor(hex);
    applyTextStyleToSelection?.({ strokeColor: hex, strokeWidth: 1 });
    updateToolPref?.("textBorderColor", hex);
  };

  const openPicker = (kind: PickerKind) => {
    setPickerType(kind);
    const anchor = anchorBtnRef.current?.getBoundingClientRect();
    if (anchor) {
      setPickerAnchor({ x: anchor.left, y: anchor.bottom + 8 });
    }
    if (kind === "text") setPickerColor(textColor);
    if (kind === "background") setPickerColor(backgroundColor ?? "#ffffff");
    if (kind === "border") setPickerColor(borderColor);
  };

  const closePicker = () => {
    setPickerType(null);
    setPickerAnchor(null);
  };

  return (
    <div className="chrome-text-options-panel flex w-full items-center justify-between gap-3 px-6 py-3" role="toolbar" aria-label="Text options">
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
            onClick={() => setFontMenuOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={fontMenuOpen}
          >
            <span>{extractFontName(fontFamily.value)}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          {fontMenuOpen && (
            <div className="absolute left-0 z-20 mt-2 max-h-64 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              <ul role="listbox">
                {FONT_FAMILIES.map((family) => (
                  <li key={family.value}>
                    <button
                      type="button"
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-blue-50 ${
                        family.value === fontFamily.value ? "bg-blue-50 text-blue-600" : "text-gray-700"
                      }`}
                      onClick={() => handleFontFamilySelect(family)}
                    >
                      {family.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
            onClick={() => setSizeMenuOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={sizeMenuOpen}
          >
            <span>{fontSizeLabel}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          {sizeMenuOpen && (
            <div className="absolute left-0 z-20 mt-2 max-h-64 w-36 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              <ul role="listbox">
                {FONT_SIZES.map((size) => (
                  <li key={size.value}>
                    <button
                      type="button"
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-blue-50 ${
                        size.value === fontSize.value ? "bg-blue-50 text-blue-600" : "text-gray-700"
                      }`}
                      onClick={() => handleFontSizeSelect(size)}
                    >
                      {size.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Decrease font size"
            onClick={() => adjustFontSize("down")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            aria-label="Increase font size"
            onClick={() => adjustFontSize("up")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
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
      </div>

      <div className="flex items-center gap-2">
        <div className="grid grid-cols-7 gap-2">
          {TEXT_SWATCHES.map((swatch) => (
            <button
              key={swatch.value}
              title={`Text ${swatch.label}`}
              aria-label={`Text color ${swatch.label}`}
              onClick={() => handleTextColorChange(swatch.value)}
              className={`h-6 w-6 rounded-full border-2 ${
                swatch.value === textColor ? "border-blue-500" : "border-gray-200"
              }`}
              style={{ backgroundColor: swatch.value }}
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

      <div className="flex items-center justify-end gap-2">
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
            {BORDER_COLORS.map((swatch) => (
              <button
                key={swatch.value}
                title={`Border ${swatch.label}`}
                aria-label={`Border ${swatch.label}`}
                onClick={() => setBorderSwatch(swatch.value)}
                className={`h-8 w-8 rounded-md border-2 ${
                  swatch.value === borderColor ? "border-orange-500" : "border-gray-200"
                }`}
                style={{ backgroundColor: swatch.preview ?? swatch.value }}
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

      {pickerType && pickerAnchor && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9999] bg-black/10" onClick={closePicker} />
            <div
              className="fixed z-[10000]"
              style={{ left: pickerAnchor.x, top: pickerAnchor.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <SimplifiedColorPicker value={pickerColor} onChange={setPickerColor} onClose={closePicker} />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

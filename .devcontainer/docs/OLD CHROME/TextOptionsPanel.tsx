"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { Minus, Palette, Plus, ChevronDown } from "lucide-react";

import { SimplifiedColorPicker } from "@/components/workspace/SimplifiedColorPicker";
import { useCanvasAdapter } from "@/components/canvas/adapter/CanvasAdapter";
import { nextTlSize, tlSizeToPoints, pointsToTlSize } from "@/components/workspace/tldraw/utils";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { ToolId } from "@/state/useToolbarStore";

type PickerKind = "text";

interface ListItem<T> {
  label: string;
  value: T;
  preview?: string | null;
}

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

const TEXT_SWATCHES: Array<ListItem<string>> = [
  { label: "#000000", value: "#000000" },
  { label: "#2563eb", value: "#2563eb" },
  { label: "#dc2626", value: "#dc2626" },
  { label: "#16a34a", value: "#16a34a" },
  { label: "#ec5d3a", value: "#ec5d3a" },
  { label: "#7c3aed", value: "#7c3aed" },
  { label: "#78716c", value: "#78716c" },
];

const DEFAULT_TEXT_COLOR = "#111827";
const DEFAULT_TEXT_SIZE = 24;
const MIN_SIZE_ENUM = "s";
const MAX_SIZE_ENUM = "xl";

function extractFontName(uiFontFamily: string): string {
  const fontName = uiFontFamily.split(",")[0].replace(/['"]/g, "").trim();
  if (uiFontFamily.includes("Comic Sans")) return "Comic Sans MS";
  if (uiFontFamily.includes("Courier") || uiFontFamily.includes("monospace")) return "Courier New";
  return fontName;
}

function TLTextOptionsPanelContent(): JSX.Element {
  const { toolPrefs, updateToolPref } = useWorkspaceStore((state) => ({
    toolPrefs: state.toolPrefs,
    updateToolPref: state.updateToolPref,
  }));
  const { sharedStyles, setStroke, setTextFont, setTextSize, isReady } = useCanvasAdapter();

  const resolvedStroke = sharedStyles.stroke ?? toolPrefs?.textColor ?? DEFAULT_TEXT_COLOR;
  const currentFontFamily = sharedStyles.font ?? toolPrefs?.textFamily ?? FONT_FAMILIES[0].value;
  const sizeEnum = sharedStyles.size ?? pointsToTlSize(toolPrefs?.textSize ?? DEFAULT_TEXT_SIZE);
  const sizePoints = tlSizeToPoints(sizeEnum);

  const [pickerType, setPickerType] = useState<PickerKind | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{ x: number; y: number } | null>(null);
  const [pickerColor, setPickerColor] = useState<string>(resolvedStroke);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const anchorBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setPickerColor(resolvedStroke);
  }, [resolvedStroke]);

  const currentFont = useMemo(() => {
    const match = FONT_FAMILIES.find((item) => item.value === currentFontFamily);
    return match ?? FONT_FAMILIES[0];
  }, [currentFontFamily]);

  const handleTextColorChange = useCallback(
    (hex: string) => {
      if (!isReady) return;
      updateToolPref("textColor", hex);
      setStroke(hex);
      setPickerColor(hex);
    },
    [isReady, setStroke, updateToolPref],
  );

  const handleFontSelect = useCallback(
    (item: ListItem<string>) => {
      if (!isReady) return;
      updateToolPref("textFamily", item.value);
      setTextFont(item.value);
      setFontMenuOpen(false);
    },
    [isReady, setTextFont, updateToolPref],
  );

  const adjustSize = useCallback(
    (direction: 1 | -1) => {
      if (!isReady) return;
      const nextEnum = nextTlSize(sizeEnum, direction);
      updateToolPref("textSize", tlSizeToPoints(nextEnum));
      setTextSize(nextEnum);
    },
    [isReady, setTextSize, sizeEnum, updateToolPref],
  );

  const openPicker = useCallback(
    (kind: PickerKind) => {
      if (kind === "text") {
        setPickerColor(resolvedStroke);
      }
      setPickerType(kind);
      if (anchorBtnRef.current) {
        const rect = anchorBtnRef.current.getBoundingClientRect();
        setPickerAnchor({ x: rect.left, y: rect.bottom + 8 });
      }
    },
    [resolvedStroke],
  );

  const closePicker = useCallback(() => {
    setPickerType(null);
    setPickerAnchor(null);
  }, []);

  if (!isReady) {
    return (
      <div className="flex w-full items-center justify-center px-4 py-3 text-sm text-gray-500">
        Canvas initializing...
      </div>
    );
  }

  const disableDecrease = sizeEnum === MIN_SIZE_ENUM;
  const disableIncrease = sizeEnum === MAX_SIZE_ENUM;

  return (
    <div className="chrome-text-options-panel flex w-full flex-col gap-4 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {TEXT_SWATCHES.map((swatch) => (
          <button
            key={swatch.value}
            title={`Text ${swatch.label}`}
            aria-label={`Text color ${swatch.label}`}
            onClick={() => handleTextColorChange(swatch.value)}
            className={`h-7 w-7 rounded-full border-2 ${
              swatch.value === resolvedStroke ? "border-blue-500" : "border-gray-200"
            }`}
            style={{ backgroundColor: swatch.value }}
          />
        ))}
        <button
          ref={anchorBtnRef}
          onClick={() => openPicker("text")}
          aria-label="Custom text color"
          className="ml-1 h-8 rounded-md border border-gray-200 bg-white px-3 text-xs shadow-sm"
        >
          <Palette className="inline h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setFontMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <span>{extractFontName(currentFont.label ?? currentFont.value)}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          {fontMenuOpen && (
            <div className="absolute z-[1000] mt-2 w-52 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="max-h-64 overflow-y-auto py-1">
                {FONT_FAMILIES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleFontSelect(item)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      item.value === currentFont.value ? "font-semibold text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
          <button
            type="button"
            className="rounded-md border border-gray-200 p-1 text-gray-600 disabled:opacity-30"
            onClick={() => adjustSize(-1)}
            disabled={disableDecrease}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span>{`${sizePoints} pt`}</span>
          <button
            type="button"
            className="rounded-md border border-gray-200 p-1 text-gray-600 disabled:opacity-30"
            onClick={() => adjustSize(1)}
            disabled={disableIncrease}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {pickerType && pickerAnchor && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998] bg-black/10" onClick={closePicker} />
            <div
              className="fixed z-[9999]"
              style={{ left: pickerAnchor.x, top: pickerAnchor.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <SimplifiedColorPicker value={pickerColor} onChange={handleTextColorChange} onClose={closePicker} />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

type TextOptionsPanelProps = {
  activeTool: ToolId;
};

export function TextOptionsPanel({ activeTool }: TextOptionsPanelProps): JSX.Element {
  void activeTool;
  return <TLTextOptionsPanelContent />;
}

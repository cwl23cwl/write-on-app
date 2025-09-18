"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Eraser,
  Highlighter,
  MousePointer2,
  Pen,
  RotateCcw,
  RotateCw,
  Save,
  Shapes,
  Type as TypeIcon,
} from "lucide-react";
import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";

interface ToolConfig {
  id: ToolId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badgeClass: string;
  hasDropdown: boolean;
}

type ToolId = "select" | "draw" | "highlighter" | "text" | "erase" | "shapes";

type SaveState = "saved" | "saving" | "error";

const TOOL_CONFIG: ToolConfig[] = [
  {
    id: "select",
    label: "Select",
    description: "Select and move objects",
    icon: MousePointer2,
    badgeClass: "text-blue-600",
    hasDropdown: false,
  },
  {
    id: "draw",
    label: "Draw",
    description: "Draw with pencil",
    icon: Pen,
    badgeClass: "text-gray-700",
    hasDropdown: true,
  },
  {
    id: "highlighter",
    label: "Highlight",
    description: "Highlight key areas",
    icon: Highlighter,
    badgeClass: "text-yellow-600",
    hasDropdown: true,
  },
  {
    id: "text",
    label: "Text",
    description: "Add text to the board",
    icon: TypeIcon,
    badgeClass: "text-green-600",
    hasDropdown: true,
  },
  {
    id: "erase",
    label: "Erase",
    description: "Remove drawings",
    icon: Eraser,
    badgeClass: "text-red-600",
    hasDropdown: false,
  },
  {
    id: "shapes",
    label: "Shapes",
    description: "Insert shapes",
    icon: Shapes,
    badgeClass: "text-purple-600",
    hasDropdown: true,
  },
];

const QUICK_TEXT_COLORS = [
  { label: "Slate", value: "#111827" },
  { label: "Blue", value: "#2563eb" },
  { label: "Gold", value: "#facc15" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
];

const QUICK_HIGHLIGHT_COLORS = [
  { label: "Lemon", value: "#fef08a" },
  { label: "Mint", value: "#bbf7d0" },
  { label: "Sky", value: "#bae6fd" },
  { label: "Lavender", value: "#e9d5ff" },
];

export function TopToolbar(): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  useMeasureCssVar(ref, "--h-top");

  const [activeTool, setActiveTool] = useState<ToolId>("select");
  const [expandedTool, setExpandedTool] = useState<ToolId | null>(null);
  const [saveState] = useState<SaveState>("saved");

  const saveBadge = useMemo(() => {
    if (saveState === "saving") {
      return {
        message: "Saving...",
        className: "text-amber-700 bg-amber-50 border border-amber-200",
      };
    }
    if (saveState === "error") {
      return {
        message: "Save Error",
        className: "text-red-700 bg-red-50 border border-red-200",
      };
    }
    return {
      message: "Saved",
      className: "text-emerald-700 bg-emerald-50 border border-emerald-200",
    };
  }, [saveState]);

  const handleUndo = (): void => {
    console.log("TODO: undo action");
  };

  const handleRedo = (): void => {
    console.log("TODO: redo action");
  };

  const handleToolClick = (tool: ToolConfig): void => {
    console.log(`TODO: activate ${tool.id} tool`);
    setActiveTool(tool.id);
    setExpandedTool((prev) => {
      if (!tool.hasDropdown) {
        return null;
      }
      return prev === tool.id ? null : tool.id;
    });
  };

  const handleQuickColor = (context: "text" | "highlight", hex: string): void => {
    console.log(`TODO: apply ${context} color ${hex}`);
  };

  return (
    <div
      ref={ref}
      className="chrome-top-toolbar top-toolbar w-full"
      style={{
        contain: "layout paint",
        backgroundColor: "transparent",
        marginTop: "var(--gap-header-top)",
        marginBottom: 0,
      }}
    >
      <nav className="w-full border-b bg-white shadow-sm" data-toolbar="true">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2" role="group" aria-label="History actions">
            <button
              type="button"
              onClick={handleUndo}
              className="p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100"
              aria-label="Undo last action"
            >
              <RotateCcw className="h-6 w-6 text-gray-700" strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              className="p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100"
              aria-label="Redo last action"
            >
              <RotateCw className="h-6 w-6 text-gray-700" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-1" role="group" aria-label="Drawing tools">
              {TOOL_CONFIG.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                const isExpanded = expandedTool === tool.id;

                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolClick(tool)}
                    className={`group relative flex flex-col items-center justify-center rounded-lg px-4 py-3 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isActive
                        ? `bg-white shadow-sm ring-1 ring-gray-200 ${tool.badgeClass}`
                        : "text-gray-600 hover:bg-white hover:text-gray-700 hover:shadow-sm"
                    } ${isExpanded ? "ring-2 ring-blue-300 bg-blue-50" : ""}`}
                    aria-label={`${tool.label} tool`}
                    aria-pressed={isActive}
                    title={tool.description}
                  >
                    <div className="relative mb-1 flex items-center justify-center">
                      <Icon className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
                      {tool.hasDropdown && (
                        <ChevronDown
                          className={`absolute -bottom-1 -right-1 h-3 w-3 transition-transform ${
                            isExpanded ? "rotate-180 text-blue-600" : "text-gray-400"
                          }`}
                          strokeWidth={2}
                        />
                      )}
                    </div>
                    <span className="hidden sm:block">{tool.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Text</span>
                <div className="flex items-center gap-1">
                  {QUICK_TEXT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleQuickColor("text", color.value)}
                      className="h-7 w-7 rounded-full border border-gray-200 shadow-sm transition-transform hover:scale-110"
                      style={{ backgroundColor: color.value }}
                      title={`${color.label} text color`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Highlight</span>
                <div className="flex items-center gap-1">
                  {QUICK_HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleQuickColor("highlight", color.value)}
                      className="h-7 w-7 rounded-full border border-gray-200 shadow-sm transition-transform hover:scale-110"
                      style={{ backgroundColor: color.value }}
                      title={`${color.label} highlight color`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${saveBadge.className}`}
              role="status"
              aria-live="polite"
            >
              <Save className={`h-4 w-4 ${saveState === "saving" ? "animate-pulse" : ""}`} aria-hidden="true" />
              <span>{saveBadge.message}</span>
            </div>
          </div>
        </div>
      </nav>

      <style jsx>{`
        .chrome-top-toolbar {
          position: relative;
        }
      `}</style>
    </div>
  );
}

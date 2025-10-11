"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import {
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
import { useTLDraw, type TLDrawToolName } from "@/components/workspace/tldraw/TLDrawProvider";
import { useToolbarStore, type ToolId as GlobalToolId } from "@/state/useToolbarStore";

interface ToolConfig {
  id: GlobalToolId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badgeClass: string;
  hasDropdown: boolean;
}

type ToolId = GlobalToolId;

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

// Tool-colored outline mapping for active state (glow outline + colored icon)
const ACTIVE_RING_BY_TOOL: Record<ToolId, string> = {
  none: "ring-gray-300",
  select: "ring-blue-400",
  draw: "ring-gray-400",
  highlighter: "ring-yellow-400",
  text: "ring-green-400",
  erase: "ring-red-400",
  shapes: "ring-purple-400",
};

const TOOLBAR_TO_TL_TOOL: Partial<Record<ToolId, TLDrawToolName>> = {
  select: "select",
  draw: "draw",
  highlighter: "highlight",
  text: "text",
  erase: "eraser",
  shapes: "geo",
};


export function TopToolbar(): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  useMeasureCssVar(ref, "--h-top");

  const activeTool = useToolbarStore((s) => s.activeTool);
  const setActiveTool = useToolbarStore((s) => s.setActiveTool);
  const [expandedTool, setExpandedTool] = useState<ToolId | null>(null);
  const [saveState] = useState<SaveState>("saved");
  const { undo: tlUndo, redo: tlRedo, setTool: setTLTool, isReady: tlReady } = useTLDraw();
  const controlsDisabled = !tlReady;

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
    if (!tlReady) return;
    tlUndo();
  };

  const handleRedo = (): void => {
    if (!tlReady) return;
    tlRedo();
  };

  const handleToolClick = (tool: ToolConfig): void => {
    if (!tlReady) return;
    const nextIsToggleOff = activeTool === tool.id;

    if (nextIsToggleOff) {
      setActiveTool("select");
      setTLTool("select");
      setExpandedTool(null);
      return;
    }

    setActiveTool(tool.id);
    const target = TOOLBAR_TO_TL_TOOL[tool.id] ?? "select";
    setTLTool(target);
    setExpandedTool((prev): ToolId | null => {
      if (!tool.hasDropdown) return null; // no dropdown for this tool
      return prev === tool.id ? null : tool.id; // toggle dropdown for this tool
    });
  };

  // Global ESC clears active tool selection (sets to 'none')
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setActiveTool("none");
        setExpandedTool(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return (): void => window.removeEventListener("keydown", onKeyDown);
  }, [setActiveTool]);

  return (
    <div
      ref={ref}
      className="chrome-top-toolbar top-toolbar w-full"
      style={{
        backgroundColor: "transparent",
        marginTop: "var(--gap-header-top)",
        marginBottom: 0,
        position: "relative",
        zIndex: "var(--z-toolbar, 1900)",
      }}
    >
      <nav className="w-full border-b bg-white shadow-sm" data-toolbar="true">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2" role="group" aria-label="History actions">
            <button
              type="button"
              onClick={handleUndo}
              disabled={controlsDisabled}
              className="p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Undo last action"
            >
              <RotateCcw className="h-6 w-6 text-gray-700" strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={controlsDisabled}
              className="p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                    disabled={controlsDisabled}
                    className={`group relative flex flex-col items-center justify-center rounded-lg px-4 py-3 text-xs font-medium transition-all duration-200 focus:outline-none w-[65px] ${
                      // soft gray glow on hover/focus; neutral gray outline by default
                      isActive
                        ? `${tool.badgeClass} ring-2 ${ACTIVE_RING_BY_TOOL[tool.id] ?? "ring-gray-400"} shadow-sm border border-transparent bg-transparent`
                        : `text-gray-700 border border-gray-300 bg-transparent hover:-translate-y-px hover:shadow-sm hover:ring-1 hover:ring-gray-300 focus:ring-2 focus:ring-gray-300 focus:shadow-sm disabled:border-gray-300`
                    } ${isExpanded ? "ring-2 ring-blue-300" : ""} disabled:cursor-not-allowed disabled:opacity-40`}
                    aria-label={`${tool.label} tool`}
                    aria-pressed={isActive}
                    title={tool.description}
                  >
                    <div className="relative mb-1 flex items-center justify-center">
                      <Icon className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <span className="hidden sm:block">{tool.label}</span>
                  </button>
                );
              })}
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

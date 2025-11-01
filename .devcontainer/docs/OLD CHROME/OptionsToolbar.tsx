"use client";

import { useRef, type JSX } from "react";

import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";
import { TextOptionsPanel } from "@/components/chrome/TextOptionsPanel";
import { useToolbarStore } from "@/state/useToolbarStore";
// OptionsToolbar stays mounted as a full-width row and renders a single child panel
// depending on the currently active tool.

const OptionsToolbar = (): JSX.Element => {
  const ref = useRef<HTMLElement | null>(null);
  useMeasureCssVar(ref, "--h-opts");

  const activeTool = useToolbarStore((state) => state.activeTool);
  const showTextPanel = activeTool === "text";

  return (
    <aside
      ref={ref}
      className="chrome-options-toolbar options-toolbar w-full px-4"
      style={{
        backgroundColor: "transparent",
        marginTop: "var(--gap-top-opts)",
        marginBottom: 0,
        minHeight: "var(--options-toolbar-height, 64px)",
        width: "100%",
        display: "flex",
        alignItems: "center",
        position: "relative",
        zIndex: "var(--z-toolbar, 1900)",
      }}
    >
      <div
        className="options-toolbar-slot flex w-full items-center justify-center"
        aria-hidden={!showTextPanel}
        data-visible={showTextPanel ? "true" : "false"}
        style={{
          visibility: showTextPanel ? "visible" : "hidden",
          pointerEvents: showTextPanel ? "auto" : "none",
        }}
      >
        <TextOptionsPanel activeTool={activeTool} />
      </div>
    </aside>
  );
};

export default OptionsToolbar;
export { OptionsToolbar };

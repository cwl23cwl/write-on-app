"use client";

import { useRef, type JSX } from "react";

import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";
import { TextOptionsPanel } from "@/components/chrome/TextOptionsPanel";
import { useToolbarStore } from "@/state/useToolbarStore";

const PLACEHOLDER_MIN_HEIGHT = 72;

const OptionsToolbar = (): JSX.Element => {
  const ref = useRef<HTMLElement | null>(null);
  useMeasureCssVar(ref, "--h-opts");

  const activeTool = useToolbarStore((state) => state.activeTool);
  const showTextPanel = activeTool === "text";

  return (
    <aside
      ref={ref}
      className="chrome-options-toolbar options-toolbar w-full px-3"
      style={{
        backgroundColor: "transparent",
        marginTop: "var(--gap-top-opts)",
        marginBottom: 0,
        // Keep a stable reserved height so the workspace doesn't jump
        minHeight: `${PLACEHOLDER_MIN_HEIGHT}px`,
        // Three segment layout guaranteed even when empty
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        alignItems: "center",
        position: "relative",
        zIndex: "var(--z-toolbar, 1900)",
      }}
    >
      {showTextPanel ? (
        <TextOptionsPanel activeTool={activeTool} />
      ) : (
        // Visually blank placeholder: no borders, no focusables; reserve grid slots
        <>
          <div aria-hidden={true} />
          <div aria-hidden={true} />
          <div aria-hidden={true} />
        </>
      )}
    </aside>
  );
};

export default OptionsToolbar;
export { OptionsToolbar };

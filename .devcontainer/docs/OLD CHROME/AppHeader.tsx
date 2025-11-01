"use client";

import { useMemo, useRef, type JSX } from "react";
import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";
import { useWorkspaceRoute } from "@/components/workspace/hooks/useWorkspaceRoute";

export function AppHeader(): JSX.Element {
  const ref = useRef<HTMLElement | null>(null);
  useMeasureCssVar(ref, "--h-header");
  const { mode, targetStudentId, userId } = useWorkspaceRoute();
  const workspaceOwner = useMemo(() => {
    const fallback = "Student";
    const raw = targetStudentId ?? (mode === "student" ? userId : null);
    const source = typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : fallback;
    const titleCased = source
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
      .join(" ");
    const normalized = titleCased.length > 0 ? titleCased : fallback;
    const possessive = /s$/i.test(normalized) ? `${normalized}'` : `${normalized}'s`;
    return `'${possessive} Workspace'`;
  }, [mode, targetStudentId, userId]);
  return (
    <header
      ref={ref}
      className="chrome-header app-header w-full h-14 flex items-center justify-between px-4"
      style={{
        backgroundColor: "transparent",
        marginTop: 0,
        marginBottom: 0,
        position: "relative",
        zIndex: "var(--z-header, 2000)",
      }}
    >
      <div className="text-2xl font-semibold tracking-tight text-gray-900 pl-6">Write on English</div>
      <div className="text-base font-medium text-gray-600 pr-6" aria-live="polite">{workspaceOwner}</div>
    </header>
  );
}

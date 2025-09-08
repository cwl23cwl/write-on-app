"use client";

import { useRef } from "react";
import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";

export function AppHeader(): JSX.Element {
  const ref = useRef<HTMLElement | null>(null);
  useMeasureCssVar(ref, "--h-header");
  return (
    <header
      ref={ref}
      className="chrome-header app-header w-full h-12 flex items-center px-4"
      style={{ contain: 'layout paint', backgroundColor: 'transparent', marginTop: 0, marginBottom: 0 }}
    >
      <div className="font-medium">Write-On</div>
    </header>
  );
}

"use client";

import { useRef } from "react";
import { useMeasureCssVar } from "@/components/workspace/hooks/useMeasureCssVar";

export function OptionsToolbar(): JSX.Element {
  const ref = useRef<HTMLElement | null>(null);
  useMeasureCssVar(ref, "--h-opts");
  return (
    <aside
      ref={ref}
      className="chrome-options-toolbar ml-auto w-64 p-2 self-start"
      style={{ contain: 'layout paint', backgroundColor: 'transparent', marginTop: 'var(--gap-top-opts)', marginBottom: 0 }}
    >
      <div className="text-sm text-gray-600">Tool Options</div>
    </aside>
  );
}

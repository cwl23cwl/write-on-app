"use client";

import type { JSX } from "react";
import { AppHeader } from "@/components/chrome/AppHeader";
import { TopToolbar } from "@/components/chrome/TopToolbar";
import OptionsToolbar from "@/components/chrome/OptionsToolbar";
import { PageIndicator } from "@/components/chrome/PageIndicator";
import { PageIndicatorRow } from "@/components/chrome/PageIndicatorRow";
import { useControlStripEventBlock } from "@/components/chrome/hooks/useControlStripEventBlock";
import { useToolbarCanvasSync } from "@/components/chrome/hooks/useToolbarCanvasSync";

export function ChromeLayout(): JSX.Element {
  // Block all zoom events from the control strip
  useControlStripEventBlock();
  // Sync toolbar active tool to canvas (text mode on/off)
  useToolbarCanvasSync();
  return (
    <div className="control-strip chrome-control-strip">
      <AppHeader />
      <TopToolbar />
      <OptionsToolbar />
      <PageIndicatorRow>
        <PageIndicator />
      </PageIndicatorRow>
    </div>
  );
}



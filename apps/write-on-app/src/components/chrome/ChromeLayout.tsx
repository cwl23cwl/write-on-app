"use client";

import { AppHeader } from "@/components/chrome/AppHeader";
import { TopToolbar } from "@/components/chrome/TopToolbar";
import { OptionsToolbar } from "@/components/chrome/OptionsToolbar";
import { PageIndicator } from "@/components/chrome/PageIndicator";
import { PageIndicatorRow } from "@/components/chrome/PageIndicatorRow";

export function ChromeLayout(): JSX.Element {
  return (
    <div className="control-strip">
      <AppHeader />
      <TopToolbar />
      <OptionsToolbar />
      <PageIndicatorRow>
        <PageIndicator />
      </PageIndicatorRow>
    </div>
  );
}

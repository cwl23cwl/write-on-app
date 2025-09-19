"use client";

import type { JSX } from "react";
import { Suspense } from "react";
import { WorkspaceRoot } from "@/components/workspace/WorkspaceRoot";

export default function Home(): JSX.Element {
  return (
    <div className="w-full h-screen">
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Loading workspace...</div>}>
        <WorkspaceRoot />
      </Suspense>
    </div>
  );
}

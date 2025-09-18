"use client";

import { WorkspaceRoot } from "@/components/workspace/WorkspaceRoot";
import { Suspense } from "react";

export default function Home(): JSX.Element {
  return (
    <div className="w-full h-screen">
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Loading workspace...</div>}>
        <WorkspaceRoot />
      </Suspense>
    </div>
  );
}

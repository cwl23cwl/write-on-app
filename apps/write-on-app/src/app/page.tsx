"use client";

import { WorkspaceRoot } from "@/components/workspace/WorkspaceRoot";
import dynamic from "next/dynamic";
import { useState, Suspense } from "react";

// Dynamic import to avoid SSR issues
const SimpleContractTest = dynamic(
  () => import("@/components/test/SimpleContractTest").then(mod => ({ default: mod.SimpleContractTest })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-screen text-gray-500">Loading Contract Test...</div>
  }
);

const Step10Test = dynamic(
  () => import("@/components/test/Step10Test").then(mod => ({ default: mod.Step10Test })),
  { 
    ssr: false,
    loading: () => null
  }
);

export default function Home(): JSX.Element {
  const [showTest, setShowTest] = useState(false);

  return (
    <div className="relative">
      <div className="fixed top-4 right-4 z-[9999] bg-white border border-gray-300 rounded-lg shadow-lg">
        <button 
          onClick={() => setShowTest(!showTest)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
        >
          {showTest ? '← Show App' : '🧪 Show Contract Test'}
        </button>
      </div>
      <div className="w-full h-screen">
        {showTest ? <SimpleContractTest /> : (
          <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">Loading workspace...</div>}>
            <WorkspaceRoot />
          </Suspense>
        )}
        {!showTest && (
          <Suspense fallback={null}>
            <Step10Test />
          </Suspense>
        )}
      </div>
    </div>
  );
}

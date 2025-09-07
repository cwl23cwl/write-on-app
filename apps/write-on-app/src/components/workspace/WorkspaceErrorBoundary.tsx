"use client";

import React from "react";
import { useCanvasStore } from "@/state";

export class WorkspaceErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  static displayName = "WorkspaceErrorBoundary";

  state = { hasError: false };

  componentDidCatch(error: unknown): void {
    this.setState({ hasError: true });
    try {
      useCanvasStore.getState().setLastError(error as Error);
    } catch {}
    console.error("Workspace error:", error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="workspace-error p-4 text-red-600 text-sm border bg-red-50">
          Workspace encountered an error. Please reload the page.
        </div>
      );
    }
    return this.props.children;
  }
}

"use client";

import type { ReactNode, JSX } from "react";

import { TLDrawMount } from "@/components/workspace/CanvasMount/TLDrawMount";
import { Page } from "@/components/workspace/Page";

type Props = {
  className?: string;
  children?: ReactNode;
  mode?: "teacher" | "student";
  writeScope?: "teacher-base" | "student" | "teacher-review";
  baseScene?: unknown;
  overlayScene?: unknown;
  readonly?: boolean;
  initialScene?: unknown;
};

export function CanvasMount({ className, children, readonly = false }: Props): JSX.Element {
  const combinedClassName = ["workspace-canvas-mount", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={combinedClassName} data-role="canvas-mount" data-readonly={readonly}>
      <Page>
        <TLDrawMount readonly={readonly}>{children}</TLDrawMount>
      </Page>
    </div>
  );
}

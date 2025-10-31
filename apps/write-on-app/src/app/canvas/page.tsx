import type { JSX } from "react";
import TLHeadless from "@/components/canvas/TLHeadless";

export default function CanvasPage(): JSX.Element {
  return (
    <main style={{ height: "100dvh", width: "100vw" }}>
      <TLHeadless />
    </main>
  );
}

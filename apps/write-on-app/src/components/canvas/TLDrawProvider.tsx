"use client";

import { useMemo } from "react";
import type { JSX, PropsWithChildren } from "react";
import {
  TldrawEditor,
  DefaultCanvas,
  createTLStore,
  defaultShapeUtils,
  defaultBindingUtils,
} from "@tldraw/tldraw";
import { TLAdapterProvider } from "@/components/canvas/adapter/TLAdapter";

export function TLDrawRoot({ children }: PropsWithChildren): JSX.Element {
  const store = useMemo(
    () => createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
    [],
  );

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <TldrawEditor store={store}>
        <TLAdapterProvider>
          <DefaultCanvas />
          {children}
        </TLAdapterProvider>
      </TldrawEditor>
    </div>
  );
}

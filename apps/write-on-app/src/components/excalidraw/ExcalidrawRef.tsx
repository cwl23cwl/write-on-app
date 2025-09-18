"use client";

import dynamic from "next/dynamic";
import React, { forwardRef, memo, MutableRefObject } from "react";
import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

type ExcalidrawComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ExcalidrawProps> &
  React.RefAttributes<ExcalidrawImperativeAPI>
>;

const ExcalidrawC = dynamic(async () => {
  try {
    const excalidrawModule = await import("@excalidraw/excalidraw");
    return excalidrawModule.Excalidraw;
  } catch (error) {
    console.error("[ExcalidrawAdapter] Failed to import Excalidraw. Check vendor/excalidraw", error);
    const Fallback = React.forwardRef<ExcalidrawImperativeAPI, ExcalidrawProps>(function ExcalidrawFallback() {
      return null;
    }) as ExcalidrawComponent;
    return Fallback;
  }
}, { ssr: false }) as ExcalidrawComponent;

const DEBUG_EXCALIDRAW = process.env.NEXT_PUBLIC_EXCALIDRAW_DEBUG === "1";

const ExcalidrawRef = memo(
  forwardRef<ExcalidrawImperativeAPI, ExcalidrawProps>((props, ref) => {
    const { excalidrawAPI: excalidrawApiProp, ...rest } = props;

    const wrappedApiCallback = (api: ExcalidrawImperativeAPI | null): void => {
      if (DEBUG_EXCALIDRAW) {
        try {
          console.log("[ExcalidrawRef] excalidrawAPI callback invoked", { hasApi: Boolean(api) });
        } catch {
          // Ignore logging failures
        }
      }

      excalidrawApiProp?.(api);
    };

    const wrappedRef = (instance: ExcalidrawImperativeAPI | null): void => {
      if (DEBUG_EXCALIDRAW) {
        try {
          console.log("[ExcalidrawRef] ref set", { hasInstance: Boolean(instance) });
        } catch {
          // Ignore logging failures
        }
      }

      if (typeof ref === "function") {
        ref(instance);
      } else if (ref && typeof ref === "object") {
        (ref as MutableRefObject<ExcalidrawImperativeAPI | null>).current = instance;
      }

      wrappedApiCallback(instance);
    };

    return <ExcalidrawC ref={wrappedRef} excalidrawAPI={wrappedApiCallback} {...rest} />;
  }),
);

ExcalidrawRef.displayName = "ExcalidrawRef";
export default ExcalidrawRef;



'use client';

import dynamic from 'next/dynamic';
import React, { forwardRef, memo } from 'react';
import type {
  ExcalidrawProps,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';

type ExcalidrawComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ExcalidrawProps> &
  React.RefAttributes<ExcalidrawImperativeAPI>
>;

const ExcalidrawC = dynamic(async () => {
  try {
    const m = await import('@excalidraw/excalidraw');
    return m.Excalidraw;
  } catch (e) {
    console.error('[ExcalidrawAdapter] Failed to import Excalidraw. Check vendor/excalidraw', e);
    const Fallback = React.forwardRef(function ExcalidrawFallback() {
      return null;
    }) as unknown as ExcalidrawComponent;
    return Fallback;
  }
}, { ssr: false }) as ExcalidrawComponent;

const DEBUG_EXCALIDRAW = process.env.NEXT_PUBLIC_EXCALIDRAW_DEBUG === '1';

const ExcalidrawRef = memo(
  forwardRef<ExcalidrawImperativeAPI, ExcalidrawProps>((props, ref) => {
    const { excalidrawAPI, ...rest } = props as any;
    const wrappedApiCallback = (api: ExcalidrawImperativeAPI | null) => {
      if (DEBUG_EXCALIDRAW) {
        try { console.log('[ExcalidrawRef] excalidrawAPI callback invoked', { hasApi: !!api }); } catch {}
      }
      if (typeof excalidrawAPI === 'function') {
        excalidrawAPI(api);
      }
    };
    const wrappedRef = (instance: ExcalidrawImperativeAPI | null) => {
      if (DEBUG_EXCALIDRAW) {
        try { console.log('[ExcalidrawRef] ref set', { hasInstance: !!instance }); } catch {}
      }
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref && typeof (ref as any) === 'object') {
        (ref as any).current = instance;
      }
      // Also invoke the API callback to maximize compatibility
      wrappedApiCallback(instance);
    };
    return <ExcalidrawC ref={wrappedRef} excalidrawAPI={wrappedApiCallback as any} {...(rest as any)} />;
  }),
);

ExcalidrawRef.displayName = 'ExcalidrawRef';
export default ExcalidrawRef;

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

const ExcalidrawRef = memo(
  forwardRef<ExcalidrawImperativeAPI, ExcalidrawProps>((props, ref) => (
    <ExcalidrawC ref={ref} {...props} />
  )),
);

ExcalidrawRef.displayName = 'ExcalidrawRef';
export default ExcalidrawRef;

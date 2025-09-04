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

const ExcalidrawC = dynamic(
  () => import('@excalidraw/excalidraw').then(m => m.Excalidraw),
  { ssr: false }
) as ExcalidrawComponent;

const ExcalidrawRef = memo(
  forwardRef<ExcalidrawImperativeAPI, ExcalidrawProps>((props, ref) => (
    <ExcalidrawC ref={ref} {...props} />
  )),
);

ExcalidrawRef.displayName = 'ExcalidrawRef';
export default ExcalidrawRef;

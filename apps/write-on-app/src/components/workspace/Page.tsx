"use client";

import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function Page({ children }: Props): JSX.Element {
  return (
    <div 
      className="page"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#ffffff',
        // White paper surface
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  );
}
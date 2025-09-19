"use client";

import type { JSX, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function PageWrapper({ children }: Props): JSX.Element {
  return (
    <div
      className="page-wrapper"
      style={{
        position: 'absolute',
        left: 'var(--page-padding-x)',
        top: 'var(--page-padding-top)',
        width: 'var(--page-width)',
        height: 'var(--page-height)',
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  );
}

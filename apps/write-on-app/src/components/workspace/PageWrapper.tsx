"use client";

import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function PageWrapper({ children }: Props): JSX.Element {
  return (
    <div 
      className="page-wrapper"
      style={{
        width: 'var(--page-width)',
        height: 'var(--page-height)', 
        position: 'relative',  // Positioning context for absolute children
        // Page wrapper provides positioning context
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  );
}
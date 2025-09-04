'use client';

declare global {
  interface Window {
    EXCALIDRAW_EXPORT_SOURCE?: string;
    DEBUG_FRACTIONAL_INDICES?: boolean;
  }
}

export {};

'use client';

import { useRef } from 'react';
import ExcalidrawRef from '@/components/excalidraw/ExcalidrawRef';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

export default function Home() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="p-4 border-b">
        <h1 className="text-lg font-semibold">Write-On App (Excalidraw Fork)</h1>
      </header>

      {/* Ensure the editor fills remaining viewport height */}
      <section className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          <ExcalidrawRef
            ref={apiRef}
            initialData={{
              elements: [],
              appState: { theme: 'light' },
              scrollToContent: true,
            }}
            // Fill the available space in the section
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </section>
    </main>
  );
}

/*
  Dev-only guards to detect runaway canvas sizing writes.
  Intercepts canvas attribute setters and CSS style writes for width/height.
*/

export function installCanvasGuards(): void {
  if (typeof window === 'undefined') return;
  const enabled = process.env.NEXT_PUBLIC_EXCALIDRAW_DEBUG === '1' || process.env.NODE_ENV === 'development';
  if (!enabled) return;

  try {
    const LARGE_THRESHOLD = 100000; // 100k px

    // Intercept canvas attribute setters
    const canvasProto = (window as any).HTMLCanvasElement?.prototype as any;
    if (canvasProto) {
      const descH = Object.getOwnPropertyDescriptor(canvasProto, 'height');
      const descW = Object.getOwnPropertyDescriptor(canvasProto, 'width');
      if (descH && descH.set) {
        Object.defineProperty(canvasProto, 'height', {
          ...descH,
          set(value: number) {
            try {
              if (typeof value === 'number' && value > LARGE_THRESHOLD) {
                // eslint-disable-next-line no-console
                console.warn('[CanvasGuard] canvas.height set to', value, new Error('stack').stack);
              }
            } catch {}
            return descH.set!.call(this, value);
          },
        });
      }
      if (descW && descW.set) {
        Object.defineProperty(canvasProto, 'width', {
          ...descW,
          set(value: number) {
            try {
              if (typeof value === 'number' && value > LARGE_THRESHOLD) {
                // eslint-disable-next-line no-console
                console.warn('[CanvasGuard] canvas.width set to', value, new Error('stack').stack);
              }
            } catch {}
            return descW.set!.call(this, value);
          },
        });
      }
    }

    // Intercept setAttribute for height/width
    const elProto = (window as any).Element?.prototype as any;
    if (elProto && elProto.setAttribute) {
      const origSetAttr = elProto.setAttribute;
      elProto.setAttribute = function(name: string, value: any) {
        try {
          if (name === 'height' || name === 'width') {
            const n = typeof value === 'number' ? value : parseFloat(String(value));
            const isCanvas = this instanceof HTMLCanvasElement;
            const isInteractive = isCanvas && (this as Element).classList?.contains('excalidraw__canvas') && (this as Element).classList?.contains('interactive');
            const MAX_W = 16384;
            const MAX_H = 32768;
            if (typeof n === 'number' && n > LARGE_THRESHOLD) {
              // eslint-disable-next-line no-console
              console.warn('[CanvasGuard] setAttribute', name, value, this, new Error('stack').stack);
            }
            if (isInteractive) {
              if (name === 'height' && typeof n === 'number' && n > MAX_H) {
                value = MAX_H;
              }
              if (name === 'width' && typeof n === 'number' && n > MAX_W) {
                value = MAX_W;
              }
            }
          }
        } catch {}
        return origSetAttr.call(this, name, value);
      };
    }

    // Intercept CSS style writes for height/width
    const cssProto = (window as any).CSSStyleDeclaration?.prototype as any;
    if (cssProto && cssProto.setProperty) {
      const origSetProp = cssProto.setProperty;
      cssProto.setProperty = function(prop: string, value: any, priority?: string) {
        try {
          if ((prop === 'height' || prop === 'width') && typeof value === 'string') {
            const n = parseFloat(value);
            if (n > LARGE_THRESHOLD) {
              // eslint-disable-next-line no-console
              console.warn('[CanvasGuard] style.setProperty', prop, value, (this as any)?.cssText, new Error('stack').stack);
            }
          }
        } catch {}
        return origSetProp.call(this, prop, value, priority);
      };
    }

    // Intercept cssText wholesale assignments
    if (cssProto) {
      const descCssText = Object.getOwnPropertyDescriptor(cssProto, 'cssText');
      if (descCssText && descCssText.set) {
        Object.defineProperty(cssProto, 'cssText', {
          ...descCssText,
          set(value: string) {
            try {
              if (typeof value === 'string' && /height\s*:\s*\d/.test(value)) {
                const match = value.match(/height\s*:\s*(\d+(?:\.\d+)?)/);
                const n = match ? parseFloat(match[1]) : 0;
                if (n > LARGE_THRESHOLD) {
                  // eslint-disable-next-line no-console
                  console.warn('[CanvasGuard] cssText set with large height', value, new Error('stack').stack);
                }
              }
            } catch {}
            return descCssText.set!.call(this, value);
          },
        });
      }
    }
  } catch (e) {
    try { console.warn('[CanvasGuard] failed to install', e); } catch {}
  }
}

/**
 * Canvas Export Utilities for Phase 3 Step 3
 * Provides crisp export at custom DPIs without reusing screen canvas
 */

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'svg';
  quality?: number; // 0-1 for JPEG
  dpi?: number; // Target DPI (default: 150 for print quality)
  scale?: number; // Additional scale multiplier
  logicalWidth: number;
  logicalHeight: number;
}

export interface ExportResult {
  blob: Blob;
  dataURL: string;
  width: number;
  height: number;
  actualDPI: number;
}

/**
 * Creates a fresh offscreen canvas for export at specified DPI
 * Never reuses the screen canvas to avoid interfering with display
 */
export function createExportCanvas(options: ExportOptions): HTMLCanvasElement | null {
  const {
    dpi = 150, // Default print DPI
    scale = 1,
    logicalWidth,
    logicalHeight
  } = options;

  // Calculate export dimensions
  const exportDPI = Math.max(72, Math.min(dpi * scale, 600)); // Clamp between 72-600 DPI
  const exportScale = exportDPI / 72; // 72 DPI is web standard
  
  const exportWidth = Math.round(logicalWidth * exportScale);
  const exportHeight = Math.round(logicalHeight * exportScale);

  // GPU limits check for export
  const MAX_EXPORT_DIMENSION = 32768; // Higher limit for export
  const MAX_EXPORT_PIXELS = 268435456; // 256MP
  
  if (exportWidth > MAX_EXPORT_DIMENSION || 
      exportHeight > MAX_EXPORT_DIMENSION ||
      exportWidth * exportHeight > MAX_EXPORT_PIXELS) {
    
    console.warn(`[Export] Requested dimensions ${exportWidth}×${exportHeight} exceed GPU limits, scaling down`);
    
    // Scale down proportionally to fit limits
    const dimensionRatio = Math.min(
      MAX_EXPORT_DIMENSION / Math.max(exportWidth, exportHeight),
      Math.sqrt(MAX_EXPORT_PIXELS / (exportWidth * exportHeight))
    );
    
    const safeWidth = Math.round(exportWidth * dimensionRatio);
    const safeHeight = Math.round(exportHeight * dimensionRatio);
    
    return createCanvasWithDimensions(safeWidth, safeHeight, safeWidth / logicalWidth);
  }

  return createCanvasWithDimensions(exportWidth, exportHeight, exportScale);
}

function createCanvasWithDimensions(width: number, height: number, scale: number): HTMLCanvasElement | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    // Set up context for crisp rendering
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Configure for high-quality export
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true; // Enable for export (different from screen)
    ctx.imageSmoothingQuality = 'high';
    
    // White background for export
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width / scale, height / scale);
    
    return canvas;
    
  } catch (error) {
    console.error('[Export] Failed to create export canvas:', error);
    return null;
  }
}

/**
 * Exports the current scene to a blob at specified DPI
 * Uses Excalidraw's export API with custom canvas
 */
export async function exportScene(
  excalidrawAPI: any,
  options: ExportOptions
): Promise<ExportResult | null> {
  
  if (!excalidrawAPI) {
    console.error('[Export] ExcalidrawAPI not available');
    return null;
  }

  const exportCanvas = createExportCanvas(options);
  if (!exportCanvas) return null;

  try {
    // Get scene data
    const elements = excalidrawAPI.getSceneElements?.() || [];
    const appState = excalidrawAPI.getAppState?.() || {};
    const files = excalidrawAPI.getFiles?.() || {};

    // Calculate actual DPI achieved
    const actualDPI = (exportCanvas.width / options.logicalWidth) * 72;

    // Use Excalidraw's export utilities if available
    if (typeof excalidrawAPI.exportToCanvas === 'function') {
      const exportedCanvas = await excalidrawAPI.exportToCanvas({
        elements,
        appState: {
          ...appState,
          width: exportCanvas.width,
          height: exportCanvas.height,
          zoom: { value: exportCanvas.width / options.logicalWidth }
        },
        files,
        width: exportCanvas.width,
        height: exportCanvas.height,
        getDimensions: () => ({ width: exportCanvas.width, height: exportCanvas.height })
      });

      if (exportedCanvas) {
        // Copy to our export canvas for consistent format handling
        const ctx = exportCanvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for direct copy
          ctx.drawImage(exportedCanvas, 0, 0);
        }
      }
    } else {
      // Fallback: render scene manually (implementation would depend on available APIs)
      console.warn('[Export] Direct export API not available, using fallback');
    }

    // Convert to requested format
    const quality = options.format === 'jpeg' ? (options.quality || 0.92) : undefined;
    const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    
    return new Promise((resolve) => {
      exportCanvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        const dataURL = exportCanvas.toDataURL(mimeType, quality);
        
        resolve({
          blob,
          dataURL,
          width: exportCanvas.width,
          height: exportCanvas.height,
          actualDPI
        });
      }, mimeType, quality);
    });

  } catch (error) {
    console.error('[Export] Export failed:', error);
    return null;
  }
}

/**
 * Convenience function for common export scenarios
 */
export async function exportToPNG(
  excalidrawAPI: any,
  logicalWidth: number,
  logicalHeight: number,
  dpi: number = 150
): Promise<ExportResult | null> {
  return exportScene(excalidrawAPI, {
    format: 'png',
    dpi,
    logicalWidth,
    logicalHeight
  });
}

export async function exportToJPEG(
  excalidrawAPI: any,
  logicalWidth: number,
  logicalHeight: number,
  dpi: number = 150,
  quality: number = 0.92
): Promise<ExportResult | null> {
  return exportScene(excalidrawAPI, {
    format: 'jpeg',
    quality,
    dpi,
    logicalWidth,
    logicalHeight
  });
}
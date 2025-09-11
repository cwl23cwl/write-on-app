#!/usr/bin/env node

/**
 * Build script for Excalidraw Island package
 * 
 * Dev: ESM + HMR with dev server on known port
 * Prod: Single-file IIFE bundle (excalidraw-island.js) with React 18 + Excalidraw + styles
 */

import { build, context } from 'esbuild';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packageRoot = resolve(__dirname, '..');
const srcDir = resolve(packageRoot, 'src');
const distDir = resolve(packageRoot, 'dist');

const isDev = process.env.NODE_ENV === 'development';
const isWatch = process.argv.includes('--watch');
const isServe = process.argv.includes('--serve');
const DEV_PORT = 3001; // Known port for dev server

async function buildPackage() {
  console.log(`Building Excalidraw Island (${isDev ? 'development' : 'production'})...`);
  
  try {
    // Base configuration
    const baseConfig = {
      entryPoints: [resolve(srcDir, 'index.ts')],
      bundle: true,
      minify: !isDev,
      sourcemap: isDev ? 'inline' : true,
      target: ['es2020'],
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      },
      external: [], // Bundle everything for island isolation
      loader: {
        '.css': 'css',
        '.svg': 'text',
      },
    };
    
    if (isDev) {
      // Development: ESM format with consistent naming
      const devConfig = {
        ...baseConfig,
        outfile: resolve(distDir, 'dev/excalidraw-island.js'),
        format: 'esm',
        platform: 'browser',
        sourcemap: true, // External source maps for dev
      };
      
      if (isServe) {
        // Development server with HMR
        const ctx = await context(devConfig);
        
        // Initial build to ensure files exist
        await ctx.rebuild();
        
        const { host, port } = await ctx.serve({
          servedir: resolve(distDir, 'dev'),
          port: DEV_PORT,
          host: '127.0.0.1',
        });
        
        // Create a simple HTML test page for development
        const testPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Excalidraw Island Dev Server</title>
    <style>
        body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; }
        excalidraw-island { 
            display: block; 
            width: 100%; 
            height: 600px; 
            border: 1px solid #ddd; 
            border-radius: 8px; 
        }
        .controls { margin-bottom: 20px; }
        button { margin-right: 10px; padding: 8px 16px; }
        input { margin: 0 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏝️ Excalidraw Island Development Server</h1>
        <div class="controls">
            <button onclick="island.scale = parseFloat(document.getElementById('scale').value)">Set Scale</button>
            <input id="scale" type="number" value="1" step="0.1" min="0.1" max="3">
            <button onclick="island.readonly = !island.readonly">Toggle Readonly</button>
            <button onclick="island.requestExport({type: 'png'})">Export PNG</button>
        </div>
        <excalidraw-island id="island" scale="1"></excalidraw-island>
    </div>
    
    <script type="module" src="./excalidraw-island.js"></script>
    <script>
        const island = document.getElementById('island');
        island.addEventListener('ready', () => console.log('Island ready'));
        island.addEventListener('scenechange', (e) => console.log('Scene changed:', e.detail));
        island.addEventListener('export', (e) => console.log('Export:', e.detail));
    </script>
</body>
</html>`;
        
        // Ensure dev directory exists
        mkdirSync(resolve(distDir, 'dev'), { recursive: true });
        writeFileSync(resolve(distDir, 'dev/index.html'), testPage);
        
        console.log(`🚀 Dev server running at http://${host}:${port}`);
        console.log(`📝 Test page: http://${host}:${port}/index.html`);
        console.log(`📦 Island bundle: http://${host}:${port}/excalidraw-island.js`);
        
        await ctx.watch();
        console.log('👀 Watching for changes...');
        
      } else if (isWatch) {
        // Watch mode without server
        const ctx = await context(devConfig);
        await ctx.watch();
        console.log('Development build watching for changes...');
        
      } else {
        // One-time dev build
        await build(devConfig);
        console.log('Development build complete');
      }
      
    } else {
      // Production: Single IIFE file with consistent naming
      await build({
        ...baseConfig,
        outfile: resolve(distDir, 'excalidraw-island.js'),
        format: 'iife',
        globalName: 'ExcalidrawIsland',
        platform: 'browser',
        minify: true,
        sourcemap: false, // No source maps in production
      });
      
      console.log('✅ Production build complete');
      console.log(`📦 Single bundle: ${resolve(distDir, 'excalidraw-island.js')}`);
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

buildPackage();
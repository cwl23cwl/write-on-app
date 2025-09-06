import { promises as fs } from 'node:fs';
import path from 'node:path';

async function ensure(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    // Touch a keep file to avoid racey cleanups by watchers
    await fs.writeFile(path.join(dir, '.keep'), '', { flag: 'w' });
  } catch {}
}

async function main() {
  try {
    const cwd = process.cwd();
    const devStaticDir = path.join(cwd, '.next', 'static', 'development');
    await ensure(devStaticDir);
  } catch (err) {
    // Non-fatal: dev server will still try to create dirs
    try { console.warn('[predev] ensure-next-dev-dirs failed:', err?.message); } catch {}
  }
}

main();


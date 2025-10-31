import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const TLDRAW_PACKAGES = [
  "@tldraw/editor",
  "@tldraw/state",
  "@tldraw/state-react",
  "@tldraw/store",
  "@tldraw/tldraw",
  "@tldraw/tlschema",
  "@tldraw/utils",
  "@tldraw/validate",
  "tldraw",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Vendor workspace packages pull in TS sources; skip type errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Keep builds unblocked; lint can run separately in CI/dev
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias ||= {};

    for (const pkg of TLDRAW_PACKAGES) {
      const workspacePath = path.join(process.cwd(), "node_modules", pkg);
      if (fs.existsSync(workspacePath)) {
        config.resolve.alias[pkg] = workspacePath;
        config.resolve.alias[`${pkg}/`] = `${workspacePath}/`;
      } else {
        const resolved = require.resolve(pkg);
        const resolvedDir = path.dirname(resolved);
        config.resolve.alias[pkg] = resolvedDir;
        config.resolve.alias[`${pkg}/`] = `${resolvedDir}/`;
      }
    }

    return config;
  },
};

export default nextConfig;

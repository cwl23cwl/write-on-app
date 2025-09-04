import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Vendor workspace packages pull in TS sources; skip type errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Keep builds unblocked; lint can run separately in CI/dev
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

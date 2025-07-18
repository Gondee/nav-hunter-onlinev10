import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Ensure server components work properly
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Ensure server components work properly
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Exclude Node.js modules from Edge runtime bundling
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve these modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
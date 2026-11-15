import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  experimental: {
    // proxy.ts runs on every route, so Next buffers request bodies for it, 10 MB by default:
    // bigger uploads were cut and failed with a 422. Our limits are 15 MB photos, 100 MB videos.
    proxyClientMaxBodySize: "110mb",
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

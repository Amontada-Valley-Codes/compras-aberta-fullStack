import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pins the workspace root so Turbopack ignores unrelated lockfiles that may
  // exist in parent directories on a developer's machine.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

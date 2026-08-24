import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pins the workspace root so Turbopack ignores unrelated lockfiles in parent
  // directories.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

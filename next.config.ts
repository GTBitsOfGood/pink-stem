import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next generates AGENTS.md/CLAUDE.md for AI tooling by default. This repo
  // does not track them, so skip generating them at all.
  agentRules: false,
  // Pins the workspace root so Turbopack ignores unrelated lockfiles that may
  // exist in parent directories on a developer's machine.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

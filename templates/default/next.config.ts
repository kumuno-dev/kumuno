import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Project instructions are maintained in docs/ and AGENTS.md.
  agentRules: false,
  poweredByHeader: false,
  // Keep the template independent of the repository workspace.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;

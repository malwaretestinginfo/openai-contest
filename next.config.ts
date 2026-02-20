import type { NextConfig } from "next";

const nextConfig: NextConfig & { target?: "serverless" } = {
  typedRoutes: true
};

if (process.env.NOW_BUILDER === "1") {
  nextConfig.target = "serverless";
}

export default nextConfig;

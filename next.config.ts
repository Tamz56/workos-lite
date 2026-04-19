import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["app.greenfineness.com"],
  outputFileTracingRoot: __dirname,
  // experimental: {
  // },
  // turbopack: {
  //   root: __dirname,
  // },
};

export default nextConfig;

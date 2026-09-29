import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://arc-intent-engine-373439937684.europe-west1.run.app',
  },
};

export default nextConfig;

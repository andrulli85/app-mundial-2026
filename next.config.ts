import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sharp used server-side only for seed import script
  serverExternalPackages: ["sharp"],
  // Sticker seed images served as-is from public/
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

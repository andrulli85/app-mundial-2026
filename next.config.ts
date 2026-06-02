import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sharp used server-side only for seed import script
  serverExternalPackages: ["sharp"],
  // Sticker seed images served as-is from public/
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: "/trade", destination: "/market", permanent: true },
      { source: "/mercado", destination: "/market", permanent: true },
      { source: "/once", destination: "/squad", permanent: true },
      // Legacy invite path — 308 preserves the HTTP method (safe for GET links/QR codes)
      { source: "/invite", destination: "/login", permanent: true },
    ];
  },
};

export default nextConfig;

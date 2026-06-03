import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sharp used server-side only for seed import script
  serverExternalPackages: ["sharp"],
  // Sticker seed images served as-is from public/
  images: {
    unoptimized: true,
  },
  async headers() {
    // Firebase signInWithPopup needs the opener to inspect popup.closed and
    // call popup.close() on a cross-origin popup (albumix-577f4.firebaseapp.com).
    // Default COOP "same-origin" blocks that, breaking Google sign-in with
    // "PERMISSION_DENIED" / 403 on /api/auth/whitelist-check. "same-origin-allow-popups"
    // keeps the protection for non-popup nav but allows the popup interaction Firebase needs.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/trade", destination: "/market", permanent: true },
      { source: "/mercado", destination: "/market", permanent: true },
      { source: "/once", destination: "/squad", permanent: true },
      // Note: /invite is now a real page (self-serve access request), not a redirect.
    ];
  },
};

export default nextConfig;

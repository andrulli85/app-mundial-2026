/**
 * Albumix Email Whitelist Gate — middleware.ts
 *
 * The gate is ONLY active when ALBUMIX_INVITE_SECRET is set.
 * If the env var is absent, all requests pass through (open access).
 * This allows CI and local dev without secrets to work normally.
 *
 * When the secret IS set:
 *   - Every request is checked for a valid `albumix_invited` cookie (HMAC-SHA256).
 *   - Invalid or missing cookie → redirect to /invite.
 *
 * Routes that bypass the gate (no cookie needed):
 *   /invite          — the gate page itself
 *   /api/invite/*    — the server-side verification endpoint
 *   /_next/*         — Next.js static assets
 *   /sw.js           — PWA service worker
 *   /manifest.json   — PWA manifest
 *   /icons/*         — PWA icons
 *   /stickers/*      — sticker images (PWA install must work without login)
 *   /splash/*        — splash screen images
 *   /api/health      — health check if it ever exists
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCookieValue, COOKIE_NAME } from "@/lib/invite";

// Paths that are always public — no cookie required even when gate is active
const PUBLIC_PREFIXES = [
  "/invite",
  "/api/invite/",
  "/_next/",
  "/icons/",
  "/stickers/",
  "/splash/",
];

const PUBLIC_EXACT = new Set([
  "/sw.js",
  "/manifest.json",
  "/api/health",
  "/favicon.ico",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Gate is inactive when secret is not configured — pass through.
  // This keeps CI green and local dev working without secrets.
  const secret = process.env.ALBUMIX_INVITE_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  // Always allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check cookie
  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) {
    const url = req.nextUrl.clone();
    url.pathname = "/invite";
    return NextResponse.redirect(url);
  }

  // Verify HMAC — if tampered, treat as no cookie
  const email = await verifyCookieValue(cookieValue, secret);
  if (!email) {
    const url = req.nextUrl.clone();
    url.pathname = "/invite";
    const response = NextResponse.redirect(url);
    // Clear the tampered cookie
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Valid cookie — pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico  (browser default)
     * The middleware function itself applies the public-path exceptions above.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

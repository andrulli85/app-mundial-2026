/**
 * Albumix Email Whitelist Gate — middleware.ts
 *
 * Every incoming request is checked for the `albumix_invited` cookie.
 * If the cookie is missing or HMAC-invalid, the user is redirected to /invite.
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

// Paths that are always public — no cookie required
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

  // Always allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Configuration guard — if secret is absent, block access (fail closed)
  const secret = process.env.ALBUMIX_INVITE_SECRET;
  if (!secret) {
    // Redirect to /invite with an error hint; never expose internals
    const url = req.nextUrl.clone();
    url.pathname = "/invite";
    return NextResponse.redirect(url);
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

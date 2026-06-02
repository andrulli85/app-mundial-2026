/**
 * POST /api/auth/whitelist-check
 *
 * Validates a Firebase ID token and grants the albumix_invited cookie if the
 * token's email is in the whitelist.
 *
 * Body: { idToken: string }
 *
 * 200 + Set-Cookie    → token valid, email whitelisted; cookie granted
 * 401                 → idToken invalid or unverifiable
 * 403 not_invited     → email not in WHITELIST_EMAILS
 * 403 email_not_verified → Google account email is not verified
 * 429                 → rate-limit exceeded (5 attempts per IP per 5 min)
 * 500 server_misconfigured → ALBUMIX_INVITE_SECRET not set
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-id-token";
import {
  isWhitelisted,
  signCookieValue,
  COOKIE_NAME,
  MAX_AGE_SECONDS,
} from "@/lib/invite";

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Simple token bucket — same parameters as the old invite/verify route: 5 attempts / 5 min / IP.
// Resets on cold-start — acceptable for ~10 users.

const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 5;

interface BucketEntry {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, BucketEntry>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now();
  const entry = rateBuckets.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_MAX_ATTEMPTS) {
    return { allowed: false };
  }

  entry.count += 1;
  return { allowed: true };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Configuration guard — fail with a clear error if secret is missing
  const secret = process.env.ALBUMIX_INVITE_SECRET;
  if (!secret) {
    console.error("[whitelist-check] ALBUMIX_INVITE_SECRET is not set");
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  // Rate limit by IP
  const ip = getClientIp(req);
  if (!checkRateLimit(ip).allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá 5 minutos e intentá de nuevo." },
      {
        status: 429,
        headers: {
          "Retry-After": "300",
          "X-RateLimit-Limit": String(RATE_MAX_ATTEMPTS),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Parse body
  let idToken: string;
  try {
    const body = await req.json();
    idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!idToken) {
    return NextResponse.json({ error: "idToken requerido" }, { status: 400 });
  }

  // Verify Firebase ID token via JWKS (no firebase-admin needed)
  const tokenPayload = await verifyFirebaseIdToken(idToken);
  if (!tokenPayload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  // Email must be verified by Google before we accept it
  if (!tokenPayload.emailVerified) {
    return NextResponse.json(
      { error: "email_not_verified" },
      { status: 403 }
    );
  }

  // Whitelist check
  if (!isWhitelisted(tokenPayload.email)) {
    return NextResponse.json({ error: "not_invited" }, { status: 403 });
  }

  // All checks passed — sign the HMAC cookie
  const cookieValue = await signCookieValue(tokenPayload.email, secret);
  const isSecure = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}

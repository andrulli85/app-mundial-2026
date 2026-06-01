/**
 * POST /api/invite/verify
 *
 * Body: { email: string }
 *
 * 200 + Set-Cookie   → email is whitelisted; cookie granted
 * 403                → email not in whitelist
 * 429                → rate-limit exceeded (5 attempts per IP per 5 min)
 * 400                → malformed request
 * 500                → missing server configuration (ALBUMIX_INVITE_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isWhitelisted,
  signCookieValue,
  COOKIE_NAME,
  MAX_AGE_SECONDS,
} from "@/lib/invite";

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Simple token bucket — fine for ~10 users. Resets on cold-start, which is
// acceptable for this scale. Each IP gets 5 attempts per 5-minute window.

const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 min
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

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateBuckets.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= RATE_MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_MAX_ATTEMPTS - entry.count };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Configuration guard — fail closed if secret is missing
  const secret = process.env.ALBUMIX_INVITE_SECRET;
  if (!secret) {
    console.error("[invite/verify] ALBUMIX_INVITE_SECRET is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Rate limit check
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
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
  let email: string;
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json(
      { error: "Email requerido" },
      { status: 400 }
    );
  }

  // Whitelist check
  if (!isWhitelisted(email)) {
    return NextResponse.json(
      { error: "not_invited" },
      { status: 403 }
    );
  }

  // Sign cookie
  const cookieValue = await signCookieValue(email, secret);
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

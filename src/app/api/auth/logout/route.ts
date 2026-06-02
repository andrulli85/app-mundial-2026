/**
 * POST /api/auth/logout
 *
 * Deletes the `albumix_invited` HMAC cookie so the middleware gate no longer
 * lets the user past /login. Firebase signOut is the client's responsibility
 * (called from the same button in the UI). This endpoint only handles the
 * server-set cookie that the client can't delete on its own (HttpOnly).
 */

import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/invite";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

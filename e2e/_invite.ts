/**
 * Playwright test helper — Albumix invite whitelist gate.
 *
 * grantAccess(page, email?) sets a valid HMAC cookie directly,
 * bypassing the /invite UI flow. Use this in beforeEach for all
 * existing regression specs so they don't get blocked by the gate.
 *
 * The HMAC is computed the same way the server does it (Web Crypto HMAC-SHA256).
 * Secret is read from ALBUMIX_INVITE_SECRET env var; falls back to the
 * .env.test default so tests work locally without extra setup.
 */

import { Page, BrowserContext } from "@playwright/test";
import * as crypto from "crypto";

const COOKIE_NAME = "albumix_invited";
const DEFAULT_SECRET = "test-secret-32-bytes-long-padding"; // matches .env.test

function getSecret(): string {
  return process.env.ALBUMIX_INVITE_SECRET ?? DEFAULT_SECRET;
}

function getBaseUrl(): string {
  return process.env.BASE_URL ?? "https://albumix-app.vercel.app";
}

/**
 * Normalizes email exactly as src/lib/invite.ts does.
 */
function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const atIdx = trimmed.indexOf("@");
  if (atIdx === -1) return trimmed;

  let local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plusIdx = local.indexOf("+");
    if (plusIdx !== -1) {
      local = local.slice(0, plusIdx);
    }
  }

  return `${local}@${domain}`;
}

/**
 * Computes the cookie value: "<email>.<hex_hmac>"
 * Uses Node.js crypto (same algorithm as Web Crypto HMAC-SHA256).
 */
function computeCookieValue(email: string, secret: string): string {
  const normalized = normalizeEmail(email);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(normalized);
  const hex = hmac.digest("hex");
  return `${normalized}.${hex}`;
}

/**
 * Grants access by setting the albumix_invited cookie directly on the page.
 * Call this in beforeEach to unblock existing specs from the whitelist gate.
 *
 * @param page  Playwright Page object
 * @param email Email to grant; defaults to "test@example.com" (in test whitelist)
 */
export async function grantAccess(
  page: Page,
  email: string = "test@example.com"
): Promise<void> {
  const secret = getSecret();
  const cookieValue = computeCookieValue(email, secret);
  const baseUrl = getBaseUrl();
  const url = new URL(baseUrl);

  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: cookieValue,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "Lax",
      // 90 days from now
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90,
    },
  ]);
}

/**
 * Sets a deliberately tampered cookie (invalid HMAC) to simulate
 * a cookie tampering attack.
 */
export async function setTamperedCookie(page: Page): Promise<void> {
  const baseUrl = getBaseUrl();
  const url = new URL(baseUrl);

  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: "test@example.com.DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF",
      domain: url.hostname,
      path: "/",
      httpOnly: false, // needs to be settable by addCookies
      secure: url.protocol === "https:",
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90,
    },
  ]);
}

export { COOKIE_NAME, DEFAULT_SECRET };

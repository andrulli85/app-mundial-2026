import { test, expect } from "@playwright/test";
import { grantAccess } from "./_invite";

/**
 * whitelist-grant-access — a valid HMAC cookie grants access to gated routes.
 *
 * The cookie is injected directly (same as the server does after a successful
 * /api/auth/whitelist-check call). The form-based flow no longer exists — access
 * is granted only after Firebase Google SSO + server-side ID token verification.
 *
 * Requires ALBUMIX_INVITE_SECRET to match the deployed secret for cookie HMAC to verify.
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const WHITELISTED_EMAIL = "test@example.com";

test.use({ viewport: { width: 390, height: 844 } });

test("valid HMAC cookie grants access to gated route", async ({ page }) => {
  await page.context().clearCookies();

  // Inject the HMAC cookie directly (mirrors what /api/auth/whitelist-check sets)
  await grantAccess(page, WHITELISTED_EMAIL);

  // Navigate to a gated route
  await page.goto(`${BASE}/album`);

  // Should NOT redirect to /login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

  // The albumix_invited cookie must be present
  const cookies = await page.context().cookies();
  const inviteCookie = cookies.find((c) => c.name === "albumix_invited");
  expect(inviteCookie).toBeDefined();
  expect(inviteCookie?.value).toContain(WHITELISTED_EMAIL.toLowerCase());
});

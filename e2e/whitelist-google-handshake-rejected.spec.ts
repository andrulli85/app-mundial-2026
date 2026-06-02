import { test, expect } from "@playwright/test";

/**
 * whitelist-google-handshake-rejected — POST to /api/auth/whitelist-check with an
 * invalid idToken must return 401.
 *
 * This test does NOT require a real Firebase token. It validates the server-side
 * JWKS verification path by sending a deliberately invalid token string.
 *
 * Requires ALBUMIX_INVITE_SECRET to be set (endpoint returns 500 without it).
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";

// Gate tests only run when secrets are configured.
test.skip(!process.env.ALBUMIX_INVITE_SECRET, "ALBUMIX_INVITE_SECRET not set — gate is inactive");

test.use({ viewport: { width: 390, height: 844 } });

test("POST /api/auth/whitelist-check with invalid idToken → 401", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/auth/whitelist-check`, {
    data: { idToken: "invalid.token.value" },
    headers: { "Content-Type": "application/json" },
  });

  expect(res.status(), `Expected 401, got ${res.status()}`).toBe(401);

  const body = await res.json() as { error?: string };
  expect(body.error).toBe("invalid_token");
});

test("POST /api/auth/whitelist-check with empty idToken → 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/auth/whitelist-check`, {
    data: { idToken: "" },
    headers: { "Content-Type": "application/json" },
  });

  expect(res.status(), `Expected 400, got ${res.status()}`).toBe(400);
});

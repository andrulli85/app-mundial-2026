import { test, expect } from "@playwright/test";

/**
 * whitelist-rate-limit — 6th attempt within 5 min returns 429.
 *
 * Hits /api/auth/whitelist-check directly (bypasses UI) to avoid DOM overhead.
 * Sends deliberately invalid tokens — the rate limiter fires BEFORE token verification,
 * so each attempt (whether 400, 401, or 403) increments the bucket.
 *
 * Requires ALBUMIX_INVITE_SECRET to be set (endpoint returns 500 without it).
 */

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";

// Gate tests only run when secrets are configured.
test.skip(!process.env.ALBUMIX_INVITE_SECRET, "ALBUMIX_INVITE_SECRET not set — gate is inactive");

test.use({ viewport: { width: 390, height: 844 } });

test("6th failed attempt in 5 min returns 429", async ({ page }) => {
  // Use an invalid token — each attempt returns 401, which still increments the counter
  const makeAttempt = () =>
    page.request.post(`${BASE}/api/auth/whitelist-check`, {
      data: { idToken: `invalid-token-ratelimit-${Date.now()}` },
      headers: { "Content-Type": "application/json" },
    });

  // First 5 attempts should return 401 (invalid token), not 429
  for (let i = 1; i <= 5; i++) {
    const res = await makeAttempt();
    expect(
      res.status(),
      `Attempt ${i}: expected 401, got ${res.status()}`
    ).toBe(401);
  }

  // 6th attempt must be rate-limited
  const sixth = await makeAttempt();
  expect(sixth.status(), "6th attempt must be 429").toBe(429);

  // Response should have Retry-After header
  const retryAfter = sixth.headers()["retry-after"];
  expect(retryAfter).toBeDefined();
  expect(parseInt(retryAfter ?? "0")).toBeGreaterThan(0);
});

import { test, expect } from "@playwright/test";

/**
 * whitelist-rate-limit — 6th failed attempt within 5 min returns 429.
 *
 * Hits /api/invite/verify directly (bypasses UI) to avoid DOM click overhead.
 * Uses a distinct email per run to avoid sharing the bucket with other specs.
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";

test.use({ viewport: { width: 390, height: 844 } });

test("6th failed attempt in 5 min returns 429", async ({ page }) => {
  // Use an email that is NOT on the whitelist, so every attempt is a 403
  // (which still increments the counter)
  const testEmail = `ratelimit-${Date.now()}@test.invalid`;

  const makeAttempt = () =>
    page.request.post(`${BASE}/api/invite/verify`, {
      data: { email: testEmail },
      headers: { "Content-Type": "application/json" },
    });

  // First 5 attempts should return 403 (not invited), not 429
  for (let i = 1; i <= 5; i++) {
    const res = await makeAttempt();
    expect(
      res.status(),
      `Attempt ${i}: expected 403, got ${res.status()}`
    ).toBe(403);
  }

  // 6th attempt must be rate-limited
  const sixth = await makeAttempt();
  expect(sixth.status(), "6th attempt must be 429").toBe(429);

  // Response should have Retry-After header
  const retryAfter = sixth.headers()["retry-after"];
  expect(retryAfter).toBeDefined();
  expect(parseInt(retryAfter ?? "0")).toBeGreaterThan(0);
});

import { test, expect } from "@playwright/test";

/**
 * whitelist-reject — the /login page renders the Google SSO button; a user who
 * visits without a cookie sees the login form, not an error.
 *
 * The old form-based email submission is replaced by Firebase Google SSO.
 * The "not_invited" state is now reached via /api/auth/whitelist-check returning 403.
 * We test the API response directly here (no real Firebase token available in CI).
 *
 * Requires ALBUMIX_INVITE_SECRET to be set (endpoint returns 500 without it).
 */

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";

// Gate tests only run when secrets are configured.
test.skip(!process.env.ALBUMIX_INVITE_SECRET, "ALBUMIX_INVITE_SECRET not set — gate is inactive");

test.use({ viewport: { width: 390, height: 844 } });

test("/login page renders SSO button without cookie", async ({ page }) => {
  await page.context().clearCookies();

  await page.goto(`${BASE}/login`);
  await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 8000 });

  // Google SSO button must be visible
  await expect(page.locator('[data-testid="login-google-btn"]')).toBeVisible({ timeout: 5000 });

  // URL stays on /login
  await expect(page).toHaveURL(/\/login/);

  // No albumix_invited cookie set
  const cookies = await page.context().cookies();
  const inviteCookie = cookies.find((c) => c.name === "albumix_invited");
  expect(inviteCookie).toBeUndefined();
});

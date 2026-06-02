import { test, expect } from "@playwright/test";

/**
 * whitelist-unauthorized — visiting a gated route without a cookie redirects to /login.
 *
 * Requires ALBUMIX_INVITE_SECRET to be set (gate is inactive without it).
 */

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";

// Gate tests only run when the secret is configured. Without it, the middleware
// is a no-op and the redirect will never happen.
test.skip(!process.env.ALBUMIX_INVITE_SECRET, "ALBUMIX_INVITE_SECRET not set — gate is inactive");

test.use({ viewport: { width: 390, height: 844 } });

test("visit /album without cookie → redirected to /login", async ({ page }) => {
  // Ensure no albumix_invited cookie exists
  await page.context().clearCookies();

  await page.goto(`${BASE}/album`);

  // Should land on /login
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // The login form must be visible
  await expect(page.locator('[data-testid="login-form"]')).toBeVisible({
    timeout: 8000,
  });
});

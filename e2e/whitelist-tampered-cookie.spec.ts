import { test, expect } from "@playwright/test";
import { setTamperedCookie } from "./_invite";

/**
 * whitelist-tampered-cookie — a cookie with an invalid HMAC is rejected; user sent to /login.
 * Requires ALBUMIX_INVITE_SECRET to be set (gate is inactive without it).
 */

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";

// Gate tests only run when secrets are configured.
test.skip(!process.env.ALBUMIX_INVITE_SECRET, "ALBUMIX_INVITE_SECRET not set — gate is inactive");

test.use({ viewport: { width: 390, height: 844 } });

test("cookie with bad HMAC → redirected to /login", async ({ page }) => {
  // Set a cookie whose HMAC is garbage
  await setTamperedCookie(page);

  await page.goto(`${BASE}/album`);

  // Middleware must detect the bad HMAC and redirect
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // The login form must be visible (not some error page)
  await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 8000 });
});

import { test, expect } from "@playwright/test";
import { setTamperedCookie } from "./_invite";

/**
 * whitelist-tampered-cookie — a cookie with an invalid HMAC is rejected; user sent to /invite.
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";

test.use({ viewport: { width: 390, height: 844 } });

test("cookie with bad HMAC → redirected to /invite", async ({ page }) => {
  // Set a cookie whose HMAC is garbage
  await setTamperedCookie(page);

  await page.goto(`${BASE}/album`);

  // Middleware must detect the bad HMAC and redirect
  await expect(page).toHaveURL(/\/invite/, { timeout: 10000 });

  // The invite form must be visible (not some error page)
  await expect(page.locator('[data-testid="invite-form"]')).toBeVisible({ timeout: 8000 });
});

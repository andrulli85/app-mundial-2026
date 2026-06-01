import { test, expect } from "@playwright/test";

/**
 * whitelist-unauthorized — visiting a gated route without a cookie redirects to /invite.
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";

test.use({ viewport: { width: 390, height: 844 } });

test("visit /album without cookie → redirected to /invite", async ({ page }) => {
  // Ensure no albumix_invited cookie exists
  await page.context().clearCookies();

  await page.goto(`${BASE}/album`);

  // Should land on /invite
  await expect(page).toHaveURL(/\/invite/, { timeout: 10000 });

  // The invite form must be visible
  await expect(page.locator('[data-testid="invite-form"]')).toBeVisible({
    timeout: 8000,
  });
});

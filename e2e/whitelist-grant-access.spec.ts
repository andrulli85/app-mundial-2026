import { test, expect } from "@playwright/test";

/**
 * whitelist-grant-access — submitting a whitelisted email sets cookie + redirects to /.
 *
 * Uses WHITELIST_EMAILS=test@example.com,andy@test.com (set in playwright.config.ts env).
 * Requires ALBUMIX_INVITE_SECRET and WHITELIST_EMAILS to be set.
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const WHITELISTED_EMAIL = "test@example.com";

// Gate tests only run when secrets are configured.
test.skip(!process.env.ALBUMIX_INVITE_SECRET, "ALBUMIX_INVITE_SECRET not set — gate is inactive");

test.use({ viewport: { width: 390, height: 844 } });

test("submit whitelisted email → cookie set + redirect to /", async ({ page }) => {
  await page.context().clearCookies();

  await page.goto(`${BASE}/invite`);
  await expect(page.locator('[data-testid="invite-form"]')).toBeVisible({ timeout: 8000 });

  // Fill and submit the form
  await page.fill('[data-testid="invite-email-input"]', WHITELISTED_EMAIL);
  await page.click('[data-testid="invite-submit"]');

  // Should redirect away from /invite (to / or /album)
  await expect(page).not.toHaveURL(/\/invite/, { timeout: 10000 });

  // The albumix_invited cookie must now be present
  const cookies = await page.context().cookies();
  const inviteCookie = cookies.find((c) => c.name === "albumix_invited");
  expect(inviteCookie).toBeDefined();
  expect(inviteCookie?.value).toContain(WHITELISTED_EMAIL.toLowerCase());
});

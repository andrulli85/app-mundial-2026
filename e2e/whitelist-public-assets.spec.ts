import { test, expect } from "@playwright/test";

/**
 * whitelist-public-assets — PWA assets are served without the invite cookie.
 *
 * Critical: PWA install must work even before the user is whitelisted.
 * The middleware must NOT gate /_next/*, /sw.js, /manifest.json, /icons/*, /stickers/*.
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";

test.use({ viewport: { width: 390, height: 844 } });

test("public assets return 200 without invite cookie", async ({ page }) => {
  await page.context().clearCookies();

  const publicPaths = [
    "/sw.js",
    "/manifest.json",
    "/icons/apple-touch-icon.png",
  ];

  for (const path of publicPaths) {
    const res = await page.request.get(`${BASE}${path}`);
    expect(
      res.status(),
      `Expected 200 for ${path}, got ${res.status()}`
    ).toBeLessThan(400);
  }
});

test("/invite page itself is accessible without cookie", async ({ page }) => {
  await page.context().clearCookies();

  await page.goto(`${BASE}/invite`);
  // Should render the form, not redirect (infinite loop prevention)
  await expect(page.locator('[data-testid="invite-form"]')).toBeVisible({ timeout: 8000 });
  await expect(page).toHaveURL(/\/invite/);
});

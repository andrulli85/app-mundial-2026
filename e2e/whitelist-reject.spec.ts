import { test, expect } from "@playwright/test";

/**
 * whitelist-reject — non-whitelisted email shows "no estás invitado" + WhatsApp CTA.
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const NON_WHITELISTED_EMAIL = "random@example.com";

test.use({ viewport: { width: 390, height: 844 } });

test("non-whitelisted email → rejection screen + WhatsApp CTA visible", async ({ page }) => {
  await page.context().clearCookies();

  await page.goto(`${BASE}/invite`);
  await expect(page.locator('[data-testid="invite-form"]')).toBeVisible({ timeout: 8000 });

  // Submit non-whitelisted email
  await page.fill('[data-testid="invite-email-input"]', NON_WHITELISTED_EMAIL);
  await page.click('[data-testid="invite-submit"]');

  // Should show the not-invited screen
  await expect(page.locator('[data-testid="not-invited-screen"]')).toBeVisible({
    timeout: 10000,
  });

  // WhatsApp CTA must be visible
  const whatsappBtn = page.locator('[data-testid="whatsapp-cta"]');
  await expect(whatsappBtn).toBeVisible({ timeout: 5000 });

  // URL stays on /invite (no redirect)
  await expect(page).toHaveURL(/\/invite/);

  // No albumix_invited cookie set
  const cookies = await page.context().cookies();
  const inviteCookie = cookies.find((c) => c.name === "albumix_invited");
  expect(inviteCookie).toBeUndefined();
});

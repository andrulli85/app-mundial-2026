import { test, expect } from "@playwright/test";
import { grantAccess } from "./_invite";

/**
 * Smoke spec — /legal/* routes (2026-06-01).
 *
 * Verifies that all three legal pages:
 *  1. Return 200 and contain their key text
 *  2. Cross-nav tabs link correctly between pages
 *  3. The footer link on /perfil reaches /legal/disclaimer
 *
 * Viewport: iPhone 15 (390×844) to match PWA use-case.
 * Target:   BASE_URL env (defaults to https://albumix-app.vercel.app)
 */

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

// ---------------------------------------------------------------------------
// 1. /legal/disclaimer — 200 + key text
// ---------------------------------------------------------------------------
test("/legal/disclaimer — loads and contains disclaimer text", async ({ page }) => {
  const res = await page.goto(`${BASE}/legal/disclaimer`);
  expect(res?.status()).toBe(200);

  await page.waitForLoadState("networkidle");

  await expect(
    page.getByText("Albumix es una aplicación independiente")
  ).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// 2. /legal/terms — 200 + key text
// ---------------------------------------------------------------------------
test("/legal/terms — loads and contains terms text", async ({ page }) => {
  const res = await page.goto(`${BASE}/legal/terms`);
  expect(res?.status()).toBe(200);

  await page.waitForLoadState("networkidle");

  await expect(
    page.getByText("Términos de uso")
  ).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// 3. /legal/privacy — 200 + key text
// ---------------------------------------------------------------------------
test("/legal/privacy — loads and contains privacy text", async ({ page }) => {
  const res = await page.goto(`${BASE}/legal/privacy`);
  expect(res?.status()).toBe(200);

  await page.waitForLoadState("networkidle");

  await expect(
    page.getByText("no recopilamos nada sobre vos")
  ).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// 4. Footer link from /perfil reaches /legal/disclaimer
// ---------------------------------------------------------------------------
test("/perfil footer legal link — navigates to /legal/disclaimer", async ({ page }) => {
  // Need a nickname in IDB so /perfil doesn't redirect to onboarding.
  // Seed the nickname via IndexedDB before navigating.
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");

  // If the onboarding page is showing, set a nickname
  const onboardingInput = page.locator("input").first();
  const isOnboarding = await onboardingInput.isVisible({ timeout: 3000 }).catch(() => false);
  if (isOnboarding) {
    await onboardingInput.fill("legaltest");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`${BASE}/inicio`, { timeout: 10000 });
  }

  await page.goto(`${BASE}/perfil`);
  await page.waitForLoadState("networkidle");

  // Click the Legal footer link (case-insensitive match)
  const legalLink = page.getByRole("link", { name: /legal/i }).last();
  await expect(legalLink).toBeVisible({ timeout: 8000 });
  await legalLink.click();

  await page.waitForURL(`${BASE}/legal/disclaimer`, { timeout: 10000 });
  await expect(
    page.getByText("Albumix es una aplicación independiente")
  ).toBeVisible({ timeout: 8000 });
});

// ---------------------------------------------------------------------------
// 5. Cross-nav: disclaimer → terms → privacy → disclaimer
// ---------------------------------------------------------------------------
test("legal cross-nav tabs — cycle between all 3 pages", async ({ page }) => {
  await page.goto(`${BASE}/legal/disclaimer`);
  await page.waitForLoadState("networkidle");

  // disclaimer → terms
  await page.getByRole("link", { name: /términos/i }).click();
  await page.waitForURL(`${BASE}/legal/terms`, { timeout: 8000 });
  await expect(page.getByText("Términos de uso")).toBeVisible({ timeout: 8000 });

  // terms → privacy
  await page.getByRole("link", { name: /privacidad/i }).click();
  await page.waitForURL(`${BASE}/legal/privacy`, { timeout: 8000 });
  await expect(page.getByText("no recopilamos nada sobre vos")).toBeVisible({ timeout: 8000 });

  // privacy → disclaimer
  await page.getByRole("link", { name: /aviso legal/i }).click();
  await page.waitForURL(`${BASE}/legal/disclaimer`, { timeout: 8000 });
  await expect(
    page.getByText("Albumix es una aplicación independiente")
  ).toBeVisible({ timeout: 8000 });
});

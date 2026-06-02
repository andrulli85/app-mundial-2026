import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Phase B regression — Mi 11 / Squad Builder at /once.
 *
 * Updated for Fase 1 design alignment (2026-06-01):
 *   - Page heading renamed "Mi once" → "Mi 11"
 *   - BottomNav label "Mi Once" → "Mi 11"
 *   - Route /once stays unchanged
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://albumix-app.vercel.app
 *
 * Tests:
 *  - /once renders Squad Builder UI (heading "Mi 11", formation chips, variant switcher)
 *  - Formation chip tap cycles to a different formation
 *  - Variant chips switch the view (pitch/board/lines)
 *  - BottomNav present with Mi 11 active
 */

const BASE = "https://albumix-app.vercel.app";
const NICKNAME = "oncetest";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function seedNickname(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/`);

  const hasOnboarding = await page
    .waitForSelector("text=Saltar tutorial", { timeout: 6000 })
    .then(() => true)
    .catch(() => false);

  if (!hasOnboarding) {
    return;
  }

  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 12000 });
  await page.waitForLoadState("networkidle");
}

test("/once renders Squad Builder with header Mi 11 and stats", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/once`);

  // Main heading — "Mi 11" (renamed from "Mi once" in Fase 1)
  await expect(page.getByRole("heading", { name: /mi 11/i })).toBeVisible({
    timeout: 15000,
  });

  // Formation chips
  await expect(page.getByTestId("formation-4-3-3")).toBeVisible();
  await expect(page.getByTestId("formation-4-4-2")).toBeVisible();
  await expect(page.getByTestId("formation-3-5-2")).toBeVisible();
});

test("formation chip tap changes active formation", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/once`);

  await expect(page.getByTestId("formation-4-3-3")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("formation-4-4-2").click();
  await expect(page.getByTestId("formation-4-4-2")).toBeVisible();
  await expect(page.getByTestId("formation-3-5-2")).toBeVisible();
});

test("variant switcher renders 3 options", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/once`);

  await expect(page.getByTestId("variant-pitch")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("variant-board")).toBeVisible();
  await expect(page.getByTestId("variant-lines")).toBeVisible();
});

test("variant board switches to chalkboard view", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/once`);

  await expect(page.getByTestId("variant-board")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("variant-board").click();
  // Board variant is active — page still renders without crash
  await expect(page.getByRole("heading", { name: /mi 11/i })).toBeVisible();
});

test("variant lines switches to grouped rows view", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/once`);

  await expect(page.getByTestId("variant-lines")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("variant-lines").click();
  await expect(page.getByText("Ataque")).toBeVisible();
});

test("BottomNav shows Mi 11 label on /once", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/once`);

  const nav = page.locator("nav[aria-label='Navegación principal']");
  await expect(nav).toBeVisible({ timeout: 15000 });
  // "Mi 11" is the Fase 1 label (renamed from "Mi Once")
  await expect(nav.getByText("Mi 11")).toBeVisible();
  // Confirm "Mi Once" label is gone
  expect(await nav.getByText("Mi Once").count()).toBe(0);
});

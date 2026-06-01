/**
 * e2e/regression/doradas-vertical-slice.spec.ts
 *
 * Smoke test for the R1 doradas vertical slice.
 * Verifies: route renders, 27 cards present, superstar names visible,
 * gold CSS class applied, screenshot captured.
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://app-mundial-2026-lemon.vercel.app/album/doradas
 */

import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "dor-smoke";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test("doradas vertical slice — smoke", async ({ page }) => {
  // ── Onboarding (set nickname once) ─────────────────────────────────────────
  await page.goto(`${BASE}/`);
  const skipBtn = page.locator("text=Saltar tutorial");
  if (await skipBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
    await skipBtn.click();
    const input = page.locator("input");
    await input.waitFor({ timeout: 6000 });
    await input.fill(NICKNAME);
    await page.keyboard.press("Enter");
    // wait for redirect away from onboarding
    await page.waitForURL((u) => !u.pathname.startsWith("/") || u.pathname !== "/", {
      timeout: 8000,
    }).catch(() => {});
  }

  // ── Navigate to /album/doradas ──────────────────────────────────────────────
  await page.goto(`${BASE}/album/doradas`);

  // 1. Title contains "DORADAS"
  const title = page.locator("[data-testid='doradas-title']");
  await title.waitFor({ timeout: 15000 });
  await expect(title).toContainText("DORADAS");

  // 2. Exactly 27 cards with data-sticker-variant="extra-gold"
  const cards = page.locator("[data-sticker-variant='extra-gold']");
  await expect(cards).toHaveCount(27, { timeout: 10000 });

  // 3. At least 5 superstar display names visible in the grid
  // display_name stored as "NEYMAR JR — LEGEND" etc; we check truncated name
  const superstars = ["MESSI", "RONALDO", "MBAPPÉ", "NEYMAR", "HAALAND"];
  let found = 0;
  for (const name of superstars) {
    const loc = page.locator(`[data-testid='doradas-grid']`).getByText(name, { exact: false });
    const count = await loc.count();
    if (count > 0) found++;
  }
  // Allow for encoding differences in MBAPPÉ — require at least 4 of 5
  expect(found).toBeGreaterThanOrEqual(4);

  // 4. At least one card has .rarity-gold class
  const goldCards = page.locator(".rarity-gold");
  const goldCount = await goldCards.count();
  expect(goldCount).toBeGreaterThanOrEqual(1);

  // 5. Screenshot
  await page.screenshot({ path: "/tmp/albumix-doradas-smoke.png", fullPage: false });
  console.log("Screenshot saved: /tmp/albumix-doradas-smoke.png");
});

test("doradas — LEGEND filter shows only legend cards", async ({ page }) => {
  await page.goto(`${BASE}/album/doradas`);
  const title = page.locator("[data-testid='doradas-title']");
  await title.waitFor({ timeout: 15000 });

  // Click LEGEND pill
  await page.locator("button", { hasText: "LEGEND" }).click();

  // All visible cards should NOT have "ROOKIE" tag
  const rookieTags = page.locator("[data-testid='doradas-grid']").getByText("ROOKIE", { exact: true });
  await expect(rookieTags).toHaveCount(0, { timeout: 5000 });
});

test("doradas — ROOKIE filter shows only rookie cards", async ({ page }) => {
  await page.goto(`${BASE}/album/doradas`);
  const title = page.locator("[data-testid='doradas-title']");
  await title.waitFor({ timeout: 15000 });

  // Click ROOKIE pill
  await page.locator("button", { hasText: "ROOKIE" }).click();

  // All visible cards should NOT have "LEGEND" tag
  const legendTags = page.locator("[data-testid='doradas-grid']").getByText("LEGEND", { exact: true });
  await expect(legendTags).toHaveCount(0, { timeout: 5000 });
});

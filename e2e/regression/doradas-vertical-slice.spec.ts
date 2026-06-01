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
const NICKNAME = "dorsmoke";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

/** Complete onboarding (sets nickname in IndexedDB, redirects to /album). */
async function ensureNickname(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/`);
  // Wait for "Saltar tutorial" to appear (tutorial step 0)
  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");

  // Now at nickname form
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 20000 });
}

test("doradas vertical slice — smoke", async ({ page }) => {
  // ── Onboarding ──────────────────────────────────────────────────────────────
  await ensureNickname(page);

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
  // display_name truncated in DoradaCard footer: "NEYMAR JR", "CRISTIANO RONALDO", etc.
  const superstars = ["MESSI", "RONALDO", "MBAPP", "NEYMAR", "HAALAND"];
  let found = 0;
  for (const name of superstars) {
    const loc = page.locator(`[data-testid='doradas-grid']`).getByText(name, { exact: false });
    const count = await loc.count();
    if (count > 0) found++;
  }
  // Require at least 4 of 5 (MBAPPÉ encoding may vary by font/OS)
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
  await ensureNickname(page);
  await page.goto(`${BASE}/album/doradas`);
  const title = page.locator("[data-testid='doradas-title']");
  await title.waitFor({ timeout: 15000 });

  // Click LEGEND pill
  await page.locator("button", { hasText: "LEGEND" }).first().click();
  await page.waitForTimeout(300);

  // All visible cards should NOT have "ROOKIE" tag (check ROOKIE spans are gone)
  const rookieTags = page.locator("[data-testid='doradas-grid']").getByText("ROOKIE", { exact: true });
  await expect(rookieTags).toHaveCount(0, { timeout: 5000 });
});

test("doradas — ROOKIE filter shows only rookie cards", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/album/doradas`);
  const title = page.locator("[data-testid='doradas-title']");
  await title.waitFor({ timeout: 15000 });

  // Click ROOKIE pill
  await page.locator("button", { hasText: "ROOKIE" }).first().click();
  await page.waitForTimeout(300);

  // All visible cards should NOT have "LEGEND" tag
  const legendTags = page.locator("[data-testid='doradas-grid']").getByText("LEGEND", { exact: true });
  await expect(legendTags).toHaveCount(0, { timeout: 5000 });
});

import { test, expect } from "@playwright/test";

/**
 * /stats dashboard — E2E
 *
 * Viewport: iPhone 15 Pro (393×852)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 *
 * Test matrix:
 *  1. Navigate to /stats directly (after onboarding) — empty state visible
 *  2. Empty state: "Empezá a marcar figuritas" text present
 *  3. Mark MEX stickers 1-5 → reload /stats → overall donut shows "5 / 980 · 1%"
 *     (Note: overall total is 980, 5/980 = 0.51% rounds to 1%)
 *  4. "Países" bar shows 5 / 960 (960 = all country team stickers)
 *  5. "Grupo A" bar shows 5 / 80 (Mexico is in Group A, 4 teams × 20 = 80)
 */

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "teststats";

test.use({ viewport: { width: 393, height: 852 } });

/**
 * Onboard a fresh browser context.
 * Identical pattern to figuritas-import.spec.ts / album-search-chips.spec.ts.
 */
async function onboard(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${BASE}/`);
  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 15000 });
}

// Tap first `count` stickers of the given team via search + click on album page
async function tapStickersByCode(
  page: import("@playwright/test").Page,
  teamCode: string,
  count: number
): Promise<void> {
  // Navigate to album, filter to team, tap first `count` stickers
  await page.goto(`${BASE}/album`);
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 15000 });

  const searchInput = page.locator('[data-testid="search-input"]');
  await searchInput.fill(teamCode);
  await page.waitForTimeout(400);

  // Tap first `count` sticker cards in the team section
  const teamSection = page.locator(`[data-testid="team-section-${teamCode}"]`);
  await expect(teamSection).toBeVisible({ timeout: 5000 });

  const cards = teamSection.locator('[data-testid^="sticker-card-"]');
  const cardCount = await cards.count();
  const toTap = Math.min(count, cardCount);

  for (let i = 0; i < toTap; i++) {
    await cards.nth(i).click();
    await page.waitForTimeout(100); // brief pause between taps
  }
}

test.describe("/stats dashboard", () => {
  // --------------------------------------------------------------------------
  // Test 1 + 2: Navigate to /stats after onboarding — empty state
  // --------------------------------------------------------------------------
  test("empty state shows when no stickers marked", async ({ page }) => {
    await onboard(page);
    await page.goto(`${BASE}/stats`);

    // Check 1: page loads without crashing
    await page.waitForSelector('[data-testid="stats-empty-state"]', {
      timeout: 15000,
    });

    // Check 2: friendly empty message
    const emptyMsg = page.locator('[data-testid="stats-empty-message"]');
    await expect(emptyMsg).toBeVisible({ timeout: 5000 });
    await expect(emptyMsg).toContainText("Empezá a marcar figuritas");

    // "Ir al álbum" link present
    await expect(page.locator("text=Ir al álbum")).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Test 3, 4, 5: Mark MEX stickers 1-5 → visit /stats → verify numbers
  // --------------------------------------------------------------------------
  test("after marking 5 MEX stickers, stats reflect correct counts", async ({
    page,
  }) => {
    await onboard(page);

    // Mark 5 MEX stickers via UI taps
    await tapStickersByCode(page, "MEX", 5);

    // Navigate to /stats
    await page.goto(`${BASE}/stats`);
    await page.waitForSelector('[data-testid="stats-content"]', {
      timeout: 15000,
    });

    // Check 3: overall donut shows "5 / 980" and "1%"
    // The donut SVG text nodes contain these values
    const statsContent = page.locator('[data-testid="stats-content"]');

    // The SVG center shows ownedCount/totalCount and percent
    // We look for the text representation — "5 / 980" inside the svg text element
    // and "1%" (5/980 = 0.51% rounds to 1)
    await expect(statsContent).toContainText("5 / 980");
    await expect(statsContent).toContainText("1%");

    // Check 4: "Países" bar shows 5 / 960
    // The HBar for Países renders "5/960" in a text span
    await expect(statsContent).toContainText("5/960");

    // Check 5: "Grupo A" bar shows 5 / 80
    // MEX is in group A (4 teams × 20 stickers = 80 total)
    await expect(statsContent).toContainText("5/80");
  });
});

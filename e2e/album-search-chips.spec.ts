import { test, expect } from "@playwright/test";
import { grantAccess } from "./_invite";

/**
 * Album search bar + category chips — E2E
 *
 * Coverage:
 *  1. Type "MEX" → only Mexico section visible
 *  2. Clear search, tap "✨ Especiales" → only FWC/Panini stickers (no country team sections)
 *  3. Tap "🌍 Países" → FWC + Panini sections hidden
 *  4. Tap "🏆 Grupos" → group headers (A-L) visible above team headers
 *
 * Viewport: iPhone 15 Pro (393×852)
 * Target: https://albumix-app.vercel.app
 */

const BASE = "https://albumix-app.vercel.app";
const NICKNAME = "testchips";

test.use({ viewport: { width: 393, height: 852 } });

// Grant the whitelist cookie before each test so the gate doesn't block navigation.
test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

/**
 * Onboard a fresh browser context to /album.
 * Mirrors the working pattern in figuritas-import.spec.ts.
 */
async function onboardAndGoToAlbum(
  page: import("@playwright/test").Page
): Promise<void> {
  await page.goto(`${BASE}/`);
  // Tutorial slide has "Saltar tutorial" button
  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");

  // Nickname input appears after skipping tutorial
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 10000 });

  // Wait for the search bar to confirm the new UI is loaded
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 15000 });
}

test.describe("Album — search bar + category chips", () => {
  // --------------------------------------------------------------------------
  // Check 1: Type "MEX" → only Mexico section visible
  // --------------------------------------------------------------------------
  test("search MEX shows only México section", async ({ page }) => {
    await onboardAndGoToAlbum(page);

    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill("MEX");

    // Wait for filtering to settle
    await page.waitForTimeout(300);

    // México section should be visible
    const mexSection = page.locator('[data-testid="team-section-MEX"]');
    await expect(mexSection).toBeVisible({ timeout: 5000 });

    // Other country sections (e.g. BRA, ARG) should NOT be in the DOM
    const braSection = page.locator('[data-testid="team-section-BRA"]');
    await expect(braSection).toHaveCount(0);

    const argSection = page.locator('[data-testid="team-section-ARG"]');
    await expect(argSection).toHaveCount(0);
  });

  // --------------------------------------------------------------------------
  // Check 2: Tap "✨ Especiales" → only FWC/Panini stickers, no country teams
  // --------------------------------------------------------------------------
  test("Especiales chip shows only FWC + Panini stickers", async ({ page }) => {
    await onboardAndGoToAlbum(page);

    // Tap Especiales chip
    await page.locator('[data-testid="chip-especiales"]').click();
    await page.waitForTimeout(300);

    // FWC section should be present
    const fwcSection = page.locator('[data-testid="team-section-FWC"]');
    await expect(fwcSection).toBeVisible({ timeout: 5000 });

    // Country team sections (MEX, BRA) should NOT be in the DOM
    const mexSection = page.locator('[data-testid="team-section-MEX"]');
    await expect(mexSection).toHaveCount(0);

    const braSection = page.locator('[data-testid="team-section-BRA"]');
    await expect(braSection).toHaveCount(0);
  });

  // --------------------------------------------------------------------------
  // Check 3: Tap "🌍 Países" → FWC + Panini sections hidden
  // --------------------------------------------------------------------------
  test("Países chip hides FWC and Panini sections", async ({ page }) => {
    await onboardAndGoToAlbum(page);

    // Tap Países chip
    await page.locator('[data-testid="chip-paises"]').click();
    await page.waitForTimeout(300);

    // FWC section should NOT be in the DOM
    const fwcSection = page.locator('[data-testid="team-section-FWC"]');
    await expect(fwcSection).toHaveCount(0);

    // Panini section should NOT be in the DOM
    const paniniSection = page.locator('[data-testid="team-section-_PANINI"]');
    await expect(paniniSection).toHaveCount(0);

    // A real country team should be present
    const mexSection = page.locator('[data-testid="team-section-MEX"]');
    await expect(mexSection).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // Check 4: Tap "🏆 Grupos" → group headers (A-L) visible above team headers
  // --------------------------------------------------------------------------
  test("Grupos chip shows group headers A-L above team sections", async ({ page }) => {
    await onboardAndGoToAlbum(page);

    // Tap Grupos chip
    await page.locator('[data-testid="chip-grupos"]').click();
    await page.waitForTimeout(300);

    // Group header A should be visible
    const groupA = page.locator('[data-testid="group-header-A"]');
    await expect(groupA).toBeVisible({ timeout: 5000 });

    // Group header L should be visible
    const groupL = page.locator('[data-testid="group-header-L"]');
    await expect(groupL).toBeVisible({ timeout: 5000 });

    // Team header for MEX (in group A) should be present under the group header
    const mexSection = page.locator('[data-testid="team-section-MEX"]');
    await expect(mexSection).toBeVisible({ timeout: 5000 });

    // Group A should appear above Group L in the DOM
    const groupABox = await groupA.boundingBox();
    const groupLBox = await groupL.boundingBox();
    expect(groupABox!.y).toBeLessThan(groupLBox!.y);
  });
});

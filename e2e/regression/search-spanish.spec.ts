import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Search — Spanish team name matching regression.
 *
 * Verifies that the search filter resolves correctly for:
 *  1. 3-letter code "MEX"               → MEX section visible
 *  2. English team "United States"      → USA section visible
 *  3. Spanish name "Estados Unidos"     → USA section visible  ← the new fix
 *  4. Spanish name "Sudáfrica"          → RSA section visible  ← the new fix
 *  5. Player name "Modric"              → CRO section visible (Croatia player)
 *  6. Mixed-case "estados unidos"       → USA section visible (case-insensitive)
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://albumix-app.vercel.app
 */

const BASE = "https://albumix-app.vercel.app";
const NICKNAME = "regsearch";

test.use({ viewport: { width: 390, height: 844 } });

// Grant the whitelist cookie before each test so the gate doesn't block navigation.
test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function onboardAndGoToAlbum(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${BASE}/`);
  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 12000 });
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 15000 });
}

/** Type a query, wait for filter to settle, return. */
async function setSearch(page: import("@playwright/test").Page, query: string): Promise<void> {
  const searchInput = page.locator('[data-testid="search-input"]');
  await searchInput.fill(query);
  await page.waitForTimeout(400);
}

test.describe("Album search — Spanish team name matching", () => {
  // Check 1: 3-letter code
  test('search "MEX" → MEX section visible', async ({ page }) => {
    await onboardAndGoToAlbum(page);
    await setSearch(page, "MEX");
    await expect(page.locator('[data-testid="team-section-MEX"]')).toBeVisible({ timeout: 6000 });
    // Other sections must not render
    await expect(page.locator('[data-testid="team-section-BRA"]')).toHaveCount(0);
  });

  // Check 2: English team name
  test('search "United States" → USA section visible', async ({ page }) => {
    await onboardAndGoToAlbum(page);
    await setSearch(page, "United States");
    await expect(page.locator('[data-testid="team-section-USA"]')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('[data-testid="team-section-MEX"]')).toHaveCount(0);
  });

  // Check 3: Spanish name — primary regression target
  test('search "Estados Unidos" → USA section visible', async ({ page }) => {
    await onboardAndGoToAlbum(page);
    await setSearch(page, "Estados Unidos");
    await expect(page.locator('[data-testid="team-section-USA"]')).toBeVisible({ timeout: 6000 });
    // No unrelated country sections
    await expect(page.locator('[data-testid="team-section-MEX"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="team-section-BRA"]')).toHaveCount(0);
  });

  // Check 4: Spanish name with accent — secondary regression target
  test('search "Sudáfrica" → RSA section visible', async ({ page }) => {
    await onboardAndGoToAlbum(page);
    await setSearch(page, "Sudáfrica");
    await expect(page.locator('[data-testid="team-section-RSA"]')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('[data-testid="team-section-MEX"]')).toHaveCount(0);
  });

  // Check 5: Player name cross-team search
  test('search "Modric" → CRO section visible', async ({ page }) => {
    await onboardAndGoToAlbum(page);
    await setSearch(page, "Modric");
    await expect(page.locator('[data-testid="team-section-CRO"]')).toBeVisible({ timeout: 6000 });
    // Only CRO (or possibly other matching names) — MEX should not be there
    await expect(page.locator('[data-testid="team-section-MEX"]')).toHaveCount(0);
  });

  // Check 6: Case-insensitive match
  test('search "estados unidos" (lowercase) → USA section visible', async ({ page }) => {
    await onboardAndGoToAlbum(page);
    await setSearch(page, "estados unidos");
    await expect(page.locator('[data-testid="team-section-USA"]')).toBeVisible({ timeout: 6000 });
  });
});

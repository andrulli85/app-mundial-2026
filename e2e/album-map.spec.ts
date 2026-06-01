import { test, expect } from "@playwright/test";

/**
 * /album/map — World heatmap E2E tests
 *
 * Coverage:
 *  1. Navigate to /album/map after onboarding → page loads
 *  2. Empty state visible (no stickers yet)
 *  3. Map container and legend always rendered
 *  4. MEX country path present in DOM
 *  5. Navigate back to /album from back-arrow
 *
 * Viewport: iPhone 15 Pro (393×852)
 * Target: https://app-mundial-2026-lemon.vercel.app
 */

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "testmap2026";

test.use({ viewport: { width: 393, height: 852 } });

/**
 * Onboard a fresh browser context and return to a given path.
 */
async function onboardAndGoTo(
  page: import("@playwright/test").Page,
  path: string
): Promise<void> {
  await page.goto(`${BASE}/`);
  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
  if (path !== "/album") {
    await page.goto(`${BASE}${path}`);
  }
}

test.describe("/album/map — world heatmap", () => {
  // --------------------------------------------------------------------------
  // Test 1: Page loads and shows the map container
  // --------------------------------------------------------------------------
  test("map page loads and shows world-map-container", async ({ page }) => {
    await onboardAndGoTo(page, "/album/map");

    // Wait for map container
    await page.waitForSelector('[data-testid="world-map-container"]', {
      timeout: 15000,
    });

    const container = page.locator('[data-testid="world-map-container"]');
    await expect(container).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // Test 2: Empty state is visible when no stickers marked
  // --------------------------------------------------------------------------
  test("empty state visible when no stickers collected", async ({ page }) => {
    await onboardAndGoTo(page, "/album/map");

    // Empty state should be present (fresh context = 0 stickers)
    const emptyState = page.locator('[data-testid="map-empty-state"]');
    await expect(emptyState).toBeVisible({ timeout: 15000 });

    // The empty state should mention "países"
    await expect(emptyState).toContainText("países");
  });

  // --------------------------------------------------------------------------
  // Test 3: Legend is always rendered
  // --------------------------------------------------------------------------
  test("legend is rendered", async ({ page }) => {
    await onboardAndGoTo(page, "/album/map");

    await page.waitForSelector('[data-testid="map-legend"]', { timeout: 15000 });
    const legend = page.locator('[data-testid="map-legend"]');
    await expect(legend).toBeVisible({ timeout: 5000 });
    await expect(legend).toContainText("0%");
    await expect(legend).toContainText("100%");
  });

  // --------------------------------------------------------------------------
  // Test 4: MEX country path present in DOM
  // --------------------------------------------------------------------------
  test("MEX country path exists in SVG", async ({ page }) => {
    await onboardAndGoTo(page, "/album/map");

    await page.waitForSelector('[data-testid="world-map-container"]', {
      timeout: 15000,
    });

    const mexPath = page.locator('[data-testid="country-MEX"]');
    await expect(mexPath).toHaveCount(1);
  });

  // --------------------------------------------------------------------------
  // Test 5: All 48 country paths present
  // --------------------------------------------------------------------------
  test("at least 40 country paths rendered in SVG", async ({ page }) => {
    await onboardAndGoTo(page, "/album/map");

    await page.waitForSelector('[data-testid="world-map-container"]', {
      timeout: 15000,
    });

    const countryGroups = page.locator('[data-testid^="country-"]');
    const count = await countryGroups.count();
    // We have 48 countries + potentially England/Scotland as separate keys
    expect(count).toBeGreaterThanOrEqual(40);
  });

  // --------------------------------------------------------------------------
  // Test 6: Back-arrow navigates to /album
  // --------------------------------------------------------------------------
  test("back arrow navigates to /album", async ({ page }) => {
    await onboardAndGoTo(page, "/album/map");

    await page.waitForSelector('[data-testid="world-map-container"]', {
      timeout: 15000,
    });

    // Click back arrow
    await page.click('[aria-label="Volver al álbum"]');
    await page.waitForURL(`${BASE}/album`, { timeout: 8000 });
    expect(page.url()).toContain("/album");
    expect(page.url()).not.toContain("/album/map");
  });

  // --------------------------------------------------------------------------
  // Test 7: MEX path has correct fill when no stickers (gray)
  // --------------------------------------------------------------------------
  test("MEX has gray fill when 0 stickers collected", async ({ page }) => {
    await onboardAndGoTo(page, "/album/map");

    await page.waitForSelector('[data-testid="country-MEX"]', {
      timeout: 15000,
    });

    // data-pct should be 0
    const mexEl = page.locator('[data-testid="country-MEX"]');
    const pct = await mexEl.getAttribute("data-pct");
    expect(pct).toBe("0");
  });
});

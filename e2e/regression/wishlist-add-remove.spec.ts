/**
 * Playwright — wishlist add / remove / persistence
 *
 * Viewport: iPhone 15 Pro (393×852)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 *
 * Tests:
 *  1. /wishlist renders — header present
 *  2. Empty state visible when wishlist empty
 *  3. Add 3 items via localStorage injection → rows appear
 *  4. Remove 1 item → 2 rows remain
 *  5. Reload → persists across reload (2 rows still there)
 */

import { test, expect, type Page } from "@playwright/test";
import { grantAccess } from "../_invite";
import { ensureOnboarded } from "../_onboard";

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const WISHLIST_KEY = "albumix.wishlist";
const NICKNAME = "testwl";

test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

// Grant the whitelist cookie before each test so the gate doesn't block navigation.
test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function onboard(page: Page): Promise<void> {
  await ensureOnboarded(page, BASE, NICKNAME);
}

async function clearWishlist(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: "[]", storageArea: localStorage }));
  }, WISHLIST_KEY);
}

async function injectWishlist(page: Page, ids: string[]): Promise<void> {
  await page.evaluate(
    ({ key, ids }) => {
      const items = ids.map((sticker_id, idx) => ({
        sticker_id,
        added_at: Date.now() - idx * 1000,
        priority: idx + 1,
      }));
      localStorage.setItem(key, JSON.stringify(items));
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(items), storageArea: localStorage }));
    },
    { key: WISHLIST_KEY, ids }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("1. /wishlist header renders", async ({ page }) => {
  await onboard(page);
  await clearWishlist(page);
  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  const header = page.locator('[data-testid="wishlist-header"]');
  await expect(header).toBeVisible({ timeout: 8000 });
  await expect(header).toContainText("MI WISHLIST");
  await expect(header).toContainText("0/10");
});

test("2. Empty state visible when wishlist is empty", async ({ page }) => {
  await onboard(page);
  await clearWishlist(page);
  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  const empty = page.locator('[data-testid="wishlist-empty"]');
  await expect(empty).toBeVisible({ timeout: 8000 });
});

test("3. Add 3 items → 3 rows appear", async ({ page }) => {
  await onboard(page);
  await clearWishlist(page);

  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  await injectWishlist(page, ["mex-2-malagon", "arg-10-messi", "bra-9"]);

  const list = page.locator('[data-testid="wishlist-list"]');
  await expect(list).toBeVisible({ timeout: 8000 });

  const rows = page.locator('[data-testid^="wishlist-item-"]');
  await expect(rows).toHaveCount(3, { timeout: 6000 });

  const header = page.locator('[data-testid="wishlist-header"]');
  await expect(header).toContainText("3/10");
});

test("4. Remove 1 item → 2 rows remain", async ({ page }) => {
  await onboard(page);
  await clearWishlist(page);

  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  await injectWishlist(page, ["mex-2-malagon", "arg-10-messi", "bra-9"]);

  const list = page.locator('[data-testid="wishlist-list"]');
  await expect(list).toBeVisible({ timeout: 8000 });

  // Remove the first item
  const removeBtn = page.locator('[data-testid="wishlist-remove-btn-mex-2-malagon"]');
  await expect(removeBtn).toBeVisible({ timeout: 6000 });
  await removeBtn.click();

  const rows = page.locator('[data-testid^="wishlist-item-"]');
  await expect(rows).toHaveCount(2, { timeout: 6000 });
});

test("5. Wishlist persists across reload", async ({ page }) => {
  await onboard(page);
  await clearWishlist(page);

  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  await injectWishlist(page, ["mex-2-malagon", "arg-10-messi"]);

  const rows = page.locator('[data-testid^="wishlist-item-"]');
  await expect(rows).toHaveCount(2, { timeout: 6000 });

  // Reload
  await page.reload();
  await page.waitForLoadState("networkidle");

  const rowsAfter = page.locator('[data-testid^="wishlist-item-"]');
  await expect(rowsAfter).toHaveCount(2, { timeout: 8000 });
});

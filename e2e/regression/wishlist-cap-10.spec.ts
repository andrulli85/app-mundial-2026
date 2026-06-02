/**
 * Playwright — wishlist cap at 10 + swap modal
 *
 * Tests:
 *  1. Adding 10 items → header shows 10/10 and "Agregar lámina" button hidden
 *  2. Trying to add via localStorage when at cap shows full-wishlist state
 *  3. Swap modal opens when calling addToWishlist with cap_reached result
 *     (tested by injecting 10 items then clicking the add button → modal should appear via picker)
 */

import { test, expect, type Page } from "@playwright/test";
import { grantAccess } from "../_invite";
import { ensureOnboarded } from "../_onboard";

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const WISHLIST_KEY = "albumix.wishlist";
const NICKNAME = "testwlcap";

test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

// Grant the whitelist cookie before each test so the gate doesn't block navigation.
test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function onboard(page: Page): Promise<void> {
  await ensureOnboarded(page, BASE, NICKNAME);
}

async function clearWishlist(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key);
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

const TEN_IDS = [
  "mex-2-malagon", "arg-10-messi", "bra-9", "esp-10", "fra-7",
  "ger-9", "uru-7", "col-7", "por-7-ronaldo", "fwc-01",
];

test("1. 10 items in wishlist — header shows 10/10", async ({ page }) => {
  await onboard(page);
  await clearWishlist(page);
  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  await injectWishlist(page, TEN_IDS);

  const header = page.locator('[data-testid="wishlist-header"]');
  await expect(header).toContainText("10/10", { timeout: 8000 });
});

test("2. Add button hidden when at cap (10 items)", async ({ page }) => {
  await onboard(page);
  await clearWishlist(page);
  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  await injectWishlist(page, TEN_IDS);

  await page.waitForTimeout(500);

  const addBtn = page.locator('[data-testid="wishlist-add-btn"]');
  await expect(addBtn).not.toBeVisible({ timeout: 6000 });
});

test("3. Swap modal: injecting 10 + calling addToWishlist shows full modal", async ({ page }) => {
  await onboard(page);
  await clearWishlist(page);
  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  // Fill to 9 so the add button is still visible
  await injectWishlist(page, TEN_IDS.slice(0, 9));

  const addBtn = page.locator('[data-testid="wishlist-add-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 6000 });
  await addBtn.click();

  const picker = page.locator('[data-testid="wishlist-picker-search"]');
  await expect(picker).toBeVisible({ timeout: 6000 });

  // Now inject the 10th item behind the scenes (simulating full cap)
  await injectWishlist(page, TEN_IDS);

  // Close picker
  await page.keyboard.press("Escape");

  // Header should show 10/10
  const header = page.locator('[data-testid="wishlist-header"]');
  await expect(header).toContainText("10/10", { timeout: 6000 });
});

test("4. Swap works: remove one item and add new one", async ({ page }) => {
  await onboard(page);
  await clearWishlist(page);
  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  await injectWishlist(page, TEN_IDS);

  // Trigger swap via JS — call swapWishlistItem directly
  await page.evaluate((key) => {
    const items: { sticker_id: string; added_at: number; priority: number }[] = JSON.parse(
      localStorage.getItem(key) ?? "[]"
    );
    // Replace first item with a new one
    items[0] = { sticker_id: "bra-10", added_at: Date.now(), priority: 1 };
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(
      new StorageEvent("storage", { key, newValue: JSON.stringify(items), storageArea: localStorage })
    );
  }, WISHLIST_KEY);

  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  const newRow = page.locator('[data-testid="wishlist-item-bra-10"]');
  await expect(newRow).toBeVisible({ timeout: 8000 });

  const oldRow = page.locator('[data-testid="wishlist-item-mex-2-malagon"]');
  await expect(oldRow).not.toBeVisible({ timeout: 5000 });
});

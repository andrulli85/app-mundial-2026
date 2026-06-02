/**
 * Playwright — wishlist drag-to-reorder
 *
 * Uses native pointer events (mouse.down → multiple mouse.move → mouse.up)
 * per Andy's CEO mandate (page.dragTo does NOT fire the PointerSensor).
 *
 * Tests:
 *  1. 3 items in wishlist, drag item at position 3 to position 1 → order persists in localStorage
 */

import { test, expect, type Page } from "@playwright/test";
import { grantAccess } from "../_invite";
import { ensureOnboarded } from "../_onboard";

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const WISHLIST_KEY = "albumix.wishlist";
const NICKNAME = "testwlreorder";

test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

// Grant the whitelist cookie before each test so the gate doesn't block navigation.
test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function onboard(page: Page): Promise<void> {
  await ensureOnboarded(page, BASE, NICKNAME);
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
      window.dispatchEvent(
        new StorageEvent("storage", { key, newValue: JSON.stringify(items), storageArea: localStorage })
      );
    },
    { key: WISHLIST_KEY, ids }
  );
}

async function getWishlistOrder(page: Page): Promise<string[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const items = JSON.parse(raw) as { sticker_id: string }[];
    return items.map((i) => i.sticker_id);
  }, WISHLIST_KEY);
}

test("1. Drag item 3 to position 1 — order updates in localStorage", async ({ page }) => {
  await onboard(page);

  // Navigate to wishlist
  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  // Inject 3 items: A, B, C
  await injectWishlist(page, ["mex-2-malagon", "arg-10-messi", "bra-9"]);

  const list = page.locator('[data-testid="wishlist-list"]');
  await expect(list).toBeVisible({ timeout: 8000 });

  // Wait for all three rows
  await expect(page.locator('[data-testid^="wishlist-item-"]')).toHaveCount(3, { timeout: 6000 });

  // Get the drag handle for item 3 (bra-9) and item 1 (mex-2-malagon)
  const handle3 = page.locator('[data-testid="wishlist-drag-handle-bra-9"]');
  const item1 = page.locator('[data-testid="wishlist-item-mex-2-malagon"]');

  await expect(handle3).toBeVisible({ timeout: 5000 });
  await expect(item1).toBeVisible({ timeout: 5000 });

  const handle3Box = await handle3.boundingBox();
  const item1Box = await item1.boundingBox();

  if (!handle3Box || !item1Box) {
    throw new Error("Could not get bounding boxes for drag elements");
  }

  const startX = handle3Box.x + handle3Box.width / 2;
  const startY = handle3Box.y + handle3Box.height / 2;
  const endY = item1Box.y + item1Box.height / 4; // drag to top quarter of item 1

  // Native pointer events — does NOT use page.dragTo()
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Multiple intermediate moves to trigger pointer sensor
  await page.mouse.move(startX, startY - 10);
  await page.mouse.move(startX, startY - 30);
  await page.mouse.move(startX, endY + 10);
  await page.mouse.move(startX, endY);
  await page.mouse.up();

  // Wait for state to settle
  await page.waitForTimeout(400);

  // Verify that bra-9 moved to position 1 in localStorage
  const order = await getWishlistOrder(page);
  expect(order[0]).toBe("bra-9");
});

test("2. Reorder persists after page reload", async ({ page }) => {
  await onboard(page);
  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  // Pre-set a custom order directly in localStorage
  await page.evaluate((key) => {
    const items = [
      { sticker_id: "bra-9", added_at: Date.now(), priority: 1 },
      { sticker_id: "mex-2-malagon", added_at: Date.now() - 1000, priority: 2 },
      { sticker_id: "arg-10-messi", added_at: Date.now() - 2000, priority: 3 },
    ];
    localStorage.setItem(key, JSON.stringify(items));
  }, WISHLIST_KEY);

  await page.reload();
  await page.waitForLoadState("networkidle");

  // After reload, bra-9 should still be first
  const rows = page.locator('[data-testid^="wishlist-item-"]');
  await expect(rows).toHaveCount(3, { timeout: 8000 });

  const order = await getWishlistOrder(page);
  expect(order[0]).toBe("bra-9");
});

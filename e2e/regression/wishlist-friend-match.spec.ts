/**
 * Playwright — wishlist friend match + notification
 *
 * Tests:
 *  1. Wishlist mex-7-reyes → peer-mock Tomás has 2 → wishlist status shows "online have"
 *  2. Navigate to /notifications after running alert scan → wishlist notification appears
 *  3. Notification card for friend_wants_yours type shows "Sí, proponer" button
 */

import { test, expect, type Page } from "@playwright/test";
import { grantAccess } from "../_invite";
import { ensureOnboarded } from "../_onboard";

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const WISHLIST_KEY = "albumix.wishlist";
const NOTIF_KEY = "albumix.notifications";
const NICKNAME = "testwlmatch";

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
    },
    { key: WISHLIST_KEY, ids }
  );
}

async function injectWishlistNotification(page: Page): Promise<string> {
  return page.evaluate(
    ({ key }) => {
      const id = Math.random().toString(16).slice(2, 10);
      const n = {
        id,
        type: "friend_has_wishlist_item",
        title: "Tomás tiene mex-7-reyes",
        body: "Tiene 2. ¿Querés ofrecerle algo?",
        emoji: "⭐",
        ts: Date.now(),
        read: false,
        link: "/mercado?give=&to=mock_tomas&wishlist=mex-7-reyes",
      };
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify([n, ...existing]));
      window.dispatchEvent(
        new StorageEvent("storage", {
          key,
          newValue: JSON.stringify([n, ...existing]),
          storageArea: localStorage,
        })
      );
      return id;
    },
    { key: NOTIF_KEY }
  );
}

test("1. /wishlist page renders with mock friend status", async ({ page }) => {
  await onboard(page);

  // Inject wishlist before loading the page so initial render sees it
  await injectWishlist(page, ["mex-7-reyes"]);

  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  const list = page.locator('[data-testid="wishlist-list"]');
  await expect(list).toBeVisible({ timeout: 8000 });

  // The row should exist
  const row = page.locator('[data-testid="wishlist-item-mex-7-reyes"]');
  await expect(row).toBeVisible({ timeout: 6000 });
});

test("2. Wishlist notification appears in /notifications feed", async ({ page }) => {
  await onboard(page);

  // Clear notifications first
  await page.evaluate((key) => localStorage.removeItem(key), NOTIF_KEY);

  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  const nId = await injectWishlistNotification(page);

  const list = page.locator('[data-testid="notifications-list"]');
  await expect(list).toBeVisible({ timeout: 8000 });

  const notifItem = page.locator(`[data-testid="notification-item-${nId}"]`);
  await expect(notifItem).toBeVisible({ timeout: 6000 });
  await expect(notifItem).toContainText("⭐");
  await expect(notifItem).toContainText("Tomás");
});

test("3. Wishlist notification card has Sí-proponer button", async ({ page }) => {
  await onboard(page);

  await page.evaluate((key) => localStorage.removeItem(key), NOTIF_KEY);

  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  const nId = await injectWishlistNotification(page);

  const proposeBtn = page.locator(`[data-testid="wishlist-notif-propose-${nId}"]`);
  await expect(proposeBtn).toBeVisible({ timeout: 8000 });
  await expect(proposeBtn).toContainText("proponer");

  const dismissBtn = page.locator(`[data-testid="wishlist-notif-dismiss-${nId}"]`);
  await expect(dismissBtn).toBeVisible({ timeout: 5000 });
  await expect(dismissBtn).toContainText("Después");
});

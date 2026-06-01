/**
 * Playwright — wishlist bulk-offer on friend profile
 *
 * Tests:
 *  1. Navigate to /friends/mock_tomas — friend profile renders
 *  2. Friend wishlist list is visible
 *  3. If collection has ≥2 of items in mock_tomas wishlist → bulk button visible
 *  4. Click bulk button → navigates to /mercado with pre-selected items
 */

import { test, expect, type Page } from "@playwright/test";
import { grantAccess } from "../_invite";

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "testwlbulk";

test.use({ viewport: { width: 393, height: 852 }, hasTouch: true });

// Grant the whitelist cookie before each test so the gate doesn't block navigation.
test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

// Tomás's wishlist: ["esp-10", "fra-7", "ger-9", "arg-10-messi", "bra-10"]

async function onboard(page: Page): Promise<void> {
  await page.goto(`${BASE}/`);
  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
}

/**
 * Set a sticker count in IndexedDB using the raw Web IDB API
 * (no module imports — works in browser context).
 */
async function setCollectionEntryIDB(
  page: Page,
  stickerId: string,
  count: number
): Promise<void> {
  await page.evaluate(
    ({ stickerId, count }: { stickerId: string; count: number }) => {
      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("mundial-2026", 3);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("collection", "readwrite");
          tx.objectStore("collection").put({
            sticker_id: stickerId,
            count,
            acquired_at: Date.now(),
          });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    },
    { stickerId, count }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("1. Friend profile page renders for mock_tomas", async ({ page }) => {
  await onboard(page);
  await page.goto(`${BASE}/friends/mock_tomas`);
  await page.waitForLoadState("networkidle");

  // Page shows friend's name somewhere
  await expect(page.locator("main")).toContainText("Tomás", { timeout: 8000 });
});

test("2. Friend wishlist list is visible", async ({ page }) => {
  await onboard(page);
  await page.goto(`${BASE}/friends/mock_tomas`);
  await page.waitForLoadState("networkidle");

  const wishlistSection = page.locator('[data-testid="friend-wishlist-list"]');
  await expect(wishlistSection).toBeVisible({ timeout: 8000 });
});

test("3. Bulk offer button visible when collection has matching duplicates", async ({ page }) => {
  await onboard(page);

  // Set esp-10 count to 2 in IDB (matches Tomás's wishlist item "esp-10")
  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");

  await setCollectionEntryIDB(page, "esp-10", 2);

  await page.goto(`${BASE}/friends/mock_tomas`);
  await page.waitForLoadState("networkidle");

  const bulkBtn = page.locator('[data-testid="friend-bulk-offer-btn"]');
  await expect(bulkBtn).toBeVisible({ timeout: 8000 });
});

test("4. Bulk offer button click navigates to /mercado", async ({ page }) => {
  await onboard(page);

  // Set esp-10 = 2 (matches Tomás's wishlist)
  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");

  await setCollectionEntryIDB(page, "esp-10", 2);

  await page.goto(`${BASE}/friends/mock_tomas`);
  await page.waitForLoadState("networkidle");

  const bulkBtn = page.locator('[data-testid="friend-bulk-offer-btn"]');
  await expect(bulkBtn).toBeVisible({ timeout: 8000 });
  await bulkBtn.click();

  // Should navigate to /mercado with give params
  await expect(page).toHaveURL(/\/mercado/, { timeout: 8000 });
  await expect(page).toHaveURL(/give=esp-10/);
});

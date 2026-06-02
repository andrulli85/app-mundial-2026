import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Sticker toggle cycle — IndexedDB integrity test.
 *
 * Verifies that the 0→1→2→3→0 count cycle persists across a full page reload,
 * confirming IndexedDB writes are durable and the read-on-mount path is correct.
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://albumix-app.vercel.app
 */

const BASE = "https://albumix-app.vercel.app";
const NICKNAME = "regtoggle";
// A stable sticker ID: MEX 5 (Montes) — always present in the catalog.
const TARGET_STICKER_ID = "mex-5-montes";
const TARGET_TEAM = "MEX";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// Grant the whitelist cookie before each test so the gate doesn't block navigation.
test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

/**
 * Reads a sticker's count directly from IndexedDB in the page context.
 */
async function getCount(page: import("@playwright/test").Page, stickerId: string): Promise<number> {
  return page.evaluate((id: string) => {
    return new Promise<number>((resolve) => {
      // Version must match the app's DB version (currently 3 — squad store added in v3)
      const req = indexedDB.open("mundial-2026", 3);
      req.onupgradeneeded = () => { /* allow upgrade if needed */ };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("collection")) {
          db.close(); resolve(0); return;
        }
        const tx = db.transaction("collection", "readonly");
        const get = tx.objectStore("collection").get(id);
        get.onsuccess = () => { db.close(); resolve(get.result?.count ?? 0); };
        get.onerror = () => { db.close(); resolve(0); };
      };
      req.onerror = () => resolve(0);
    });
  }, stickerId);
}

/**
 * Taps the sticker card for TARGET_STICKER_ID using its data-testid attribute.
 * Uses search to ensure the section is visible and the sticker is in viewport.
 */
async function tapTargetSticker(page: import("@playwright/test").Page): Promise<void> {
  // Ensure we are on /album with the search-input visible
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 15000 });
  const searchInput = page.locator('[data-testid="search-input"]');
  await searchInput.fill(TARGET_TEAM);
  await page.waitForTimeout(400);

  // Wait for the team section to be visible so the sticker card is in the DOM
  const teamSection = page.locator(`[data-testid="team-section-${TARGET_TEAM}"]`);
  await expect(teamSection).toBeVisible({ timeout: 8000 });

  // Use the specific sticker testid (data-testid="sticker-<id>") for a reliable tap.
  const stickerCard = page.locator(`[data-testid="sticker-${TARGET_STICKER_ID}"]`);
  await stickerCard.scrollIntoViewIfNeeded();
  await stickerCard.click();
  await page.waitForTimeout(300);
}

test("sticker toggle 0→1→2→3→0 persists across reload", async ({ page }) => {
  // ── Onboarding ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/`);
  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 12000 });

  // ── Verify initial count = 0 ─────────────────────────────────────────────────
  let count = await getCount(page, TARGET_STICKER_ID);
  expect(count).toBe(0);

  // ── Tap 1 → count = 1, reload, verify ────────────────────────────────────────
  await tapTargetSticker(page);
  count = await getCount(page, TARGET_STICKER_ID);
  expect(count).toBe(1);

  await page.reload();
  await page.waitForLoadState("networkidle");
  count = await getCount(page, TARGET_STICKER_ID);
  expect(count).toBe(1);

  // ── Tap 2 → count = 2, reload, verify ────────────────────────────────────────
  await tapTargetSticker(page);
  count = await getCount(page, TARGET_STICKER_ID);
  expect(count).toBe(2);

  await page.reload();
  await page.waitForLoadState("networkidle");
  count = await getCount(page, TARGET_STICKER_ID);
  expect(count).toBe(2);

  // ── Tap 3 → count = 3, reload, verify ────────────────────────────────────────
  await tapTargetSticker(page);
  count = await getCount(page, TARGET_STICKER_ID);
  expect(count).toBe(3);

  await page.reload();
  await page.waitForLoadState("networkidle");
  count = await getCount(page, TARGET_STICKER_ID);
  expect(count).toBe(3);

  // ── Tap 4 → count wraps to 0, reload, verify ─────────────────────────────────
  await tapTargetSticker(page);
  count = await getCount(page, TARGET_STICKER_ID);
  expect(count).toBe(0);

  await page.reload();
  await page.waitForLoadState("networkidle");
  count = await getCount(page, TARGET_STICKER_ID);
  expect(count).toBe(0);
});

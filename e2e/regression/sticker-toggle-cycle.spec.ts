import { test, expect } from "@playwright/test";

/**
 * Sticker toggle cycle — IndexedDB integrity test.
 *
 * Verifies that the 0→1→2→3→0 count cycle persists across a full page reload,
 * confirming IndexedDB writes are durable and the read-on-mount path is correct.
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 */

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "regtoggle";
// A stable sticker ID: MEX 5 (Montes) — always present in the catalog.
const TARGET_STICKER_ID = "mex-5-montes";
const TARGET_TEAM = "MEX";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/**
 * Reads a sticker's count directly from IndexedDB in the page context.
 */
async function getCount(page: import("@playwright/test").Page, stickerId: string): Promise<number> {
  return page.evaluate((id: string) => {
    return new Promise<number>((resolve) => {
      const req = indexedDB.open("mundial-2026", 1);
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
 * Taps the sticker card for TARGET_STICKER_ID within its team section.
 * Uses search to isolate the team section first.
 */
async function tapTargetSticker(page: import("@playwright/test").Page): Promise<void> {
  // Ensure we are on /album with the search-input visible
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 15000 });
  const searchInput = page.locator('[data-testid="search-input"]');
  await searchInput.fill(TARGET_TEAM);
  await page.waitForTimeout(400);

  const teamSection = page.locator(`[data-testid="team-section-${TARGET_TEAM}"]`);
  await expect(teamSection).toBeVisible({ timeout: 8000 });

  // Cards are plain <button> elements inside the team section grid.
  // MEX 5 (Montes) is the 5th sticker in the MEX section (0-indexed → index 4).
  const cards = teamSection.locator("button");
  await cards.nth(4).click();
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

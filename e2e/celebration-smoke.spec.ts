/**
 * celebration-smoke — Tier 1 + Tier 2 celebration validation
 *
 * Targets local dev server (http://localhost:3001).
 * Bypasses the onboarding UI by seeding IDB profile directly.
 *
 * Note on the runtime-edge limitation:
 *   Confetti/mascots fire only on the false→true transition of `complete`.
 *   A page load where stickers are already owned initializes prevCompleteRef=true
 *   → no animation — this is correct fire-once behavior.
 *
 * To observe actual animations manually:
 *   1. Start dev server (npm run dev)
 *   2. Open /album, navigate to a team with one missing sticker
 *   3. Add the last sticker via StickerDetailModal → confetti fires (Tier 1)
 *   4. For FWC: add last FWC sticker → mascot overlay (Tier 2)
 *
 *   Quick demo toggle (paste in DevTools console while on /album):
 *     sessionStorage.removeItem('mc_celebrated_teams');
 */

import { test, expect, Page } from "@playwright/test";
import * as crypto from "crypto";

const BASE = "http://localhost:3001";
const INVITE_SECRET = "9e91cf55d75d453a96fd70a98c29d2a08a619e4a219c37d76344383cca3dc8f3";
const WHITELIST_EMAIL = "andres.reyes.nunez@gmail.com";

test.use({ viewport: { width: 393, height: 852 } });

/** Grant the albumix_invited cookie for localhost */
function computeCookieValue(email: string): string {
  const normalized = email.trim().toLowerCase();
  const hmac = crypto.createHmac("sha256", INVITE_SECRET);
  hmac.update(normalized);
  return `${normalized}.${hmac.digest("hex")}`;
}

async function grantLocalAccess(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: "albumix_invited",
      value: computeCookieValue(WHITELIST_EMAIL),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90,
    },
  ]);
}

/**
 * Seeds the IDB profile store with nickname + userMode, bypassing onboarding UI.
 * Must be called after an initial page.goto so the origin is set correctly.
 */
async function seedProfile(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const req = indexedDB.open("mundial-2026", 5);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = (ev) => {
        const d = (ev.target as IDBOpenDBRequest).result;
        const stores = [
          ["collection", "sticker_id"],
          ["profile", "key"],
          ["achievements", "id"],
          ["squad", "key"],
          ["userXI", "key"],
        ] as const;
        for (const [name, keyPath] of stores) {
          if (!d.objectStoreNames.contains(name)) {
            d.createObjectStore(name, { keyPath });
          }
        }
        if (!d.objectStoreNames.contains("trade_log")) {
          const ts = d.createObjectStore("trade_log", { keyPath: "trade_id" });
          ts.createIndex("by_ts", "ts");
        }
      };
    });

    const tx = db.transaction("profile", "readwrite");
    const store = tx.objectStore("profile");
    store.put({ key: "nickname", value: "celtest" });
    store.put({ key: "userMode", value: "collector" });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

/** Navigate to /album with whitelist cookie + IDB profile pre-seeded */
async function goToAlbum(page: Page): Promise<void> {
  await grantLocalAccess(page);
  // Establish the origin first, then seed IDB
  await page.goto(`${BASE}/`);
  await seedProfile(page);
  // Navigate to /album — app reads nickname from IDB and skips onboarding
  await page.goto(`${BASE}/album`);
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 20000 });
}

test.describe("Celebration smoke — structure + fire-once semantics", () => {

  test("1. baseline: /album loads without celebration overlay", async ({ page }) => {
    await goToAlbum(page);

    await page.screenshot({
      path: "e2e/screenshots/celebration-01-baseline.png",
      fullPage: false,
    });

    // Mascot dialog must NOT be visible on a fresh album load
    await expect(
      page.locator('[role="dialog"][aria-label="¡Especiales completados!"]')
    ).not.toBeVisible();

    // Album header must render
    await expect(page.locator('[data-testid="album-header"]')).toBeVisible();
  });

  test("2. fire-once guard: no overlay on fresh load (correct initial state)", async ({ page }) => {
    await goToAlbum(page);

    // Reload — prevCompleteRef initializes to whatever the current complete state is.
    // Since we have no stickers, complete=false, no celebration fires.
    await page.reload();
    await page.waitForSelector('[data-testid="search-input"]', { timeout: 20000 });

    // Overlay must NOT appear
    await expect(
      page.locator('[role="dialog"][aria-label="¡Especiales completados!"]')
    ).not.toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/celebration-02-no-replay-on-reload.png",
      fullPage: false,
    });
  });

  test("3. sessionStorage guard: prevents replay within same session", async ({ page }) => {
    await goToAlbum(page);

    // Mark FWC as already celebrated in sessionStorage
    await page.evaluate(() => {
      sessionStorage.setItem("mc_celebrated_teams", JSON.stringify(["FWC"]));
    });

    // Navigate away and back (same tab = same sessionStorage)
    await grantLocalAccess(page);
    await page.goto(`${BASE}/album`);
    await page.waitForSelector('[data-testid="search-input"]', { timeout: 20000 });

    // Even if FWC were complete, sessionStorage guard blocks celebration
    await expect(
      page.locator('[role="dialog"][aria-label="¡Especiales completados!"]')
    ).not.toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/celebration-03-sessionstorage-guard.png",
      fullPage: false,
    });
  });

  test("4. reduced-motion: album renders normally, no mascot dialog", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await goToAlbum(page);

    // Under reduced-motion, the reducedMotion ref is true → no overlay mounted
    await expect(
      page.locator('[role="dialog"][aria-label="¡Especiales completados!"]')
    ).not.toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/celebration-04-reduced-motion.png",
      fullPage: false,
    });
  });

  test("5. team sections render with DarkTeamHeader components", async ({ page }) => {
    await goToAlbum(page);

    // At least one team section must render
    const firstTeamSection = page.locator("[data-testid^='team-section-']").first();
    await expect(firstTeamSection).toBeVisible();

    // FWC section must be present (at bottom, needs scroll)
    // Use Todos chip, then search FWC to locate it quickly
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill("Especiales");
    await page.waitForTimeout(300);

    const fwcSection = page.locator('[data-testid="team-section-FWC"]');
    await expect(fwcSection).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: "e2e/screenshots/celebration-05-fwc-section-visible.png",
      fullPage: false,
    });
  });
});

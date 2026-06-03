/**
 * nav-fab-screenshots — Capture bottom nav FAB in both modes for design validation.
 *
 * Targets localhost:3001 with IDB profile seeding.
 * Run after `npm run dev` (port 3001).
 *
 * Produces:
 *   e2e/screenshots/nav-collector-album-fab.png   — collector mode, FAB active on /album
 *   e2e/screenshots/nav-fantasy-squad-fab.png     — fantasy mode, FAB active on /squad
 */

import { test, expect, Page } from "@playwright/test";
import * as crypto from "crypto";

const BASE = "http://localhost:3001";
const INVITE_SECRET = "9e91cf55d75d453a96fd70a98c29d2a08a619e4a219c37d76344383cca3dc8f3";
const WHITELIST_EMAIL = "andres.reyes.nunez@gmail.com";

test.use({ viewport: { width: 393, height: 852 } });

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

async function seedProfile(page: Page, userMode: "collector" | "fantasy"): Promise<void> {
  await page.evaluate(async (mode) => {
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
    store.put({ key: "nickname", value: "testuser" });
    store.put({ key: "userMode", value: mode });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }, userMode);
}

test("collector mode — FAB navigates to /album and highlights correctly", async ({ page }) => {
  await grantLocalAccess(page);
  await page.goto(`${BASE}/`);
  await seedProfile(page, "collector");

  // Navigate to /album (FAB target in collector mode)
  await page.goto(`${BASE}/album`);
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 20000 });

  // The bottom nav should show Álbum label on the FAB (gold, uppercase)
  const fabLink = page.locator('nav[aria-label="Navegación principal"] a[aria-label="Álbum"]');
  await expect(fabLink).toBeVisible({ timeout: 5000 });

  // aria-current="page" should be set on the FAB in collector mode on /album
  await expect(fabLink).toHaveAttribute("aria-current", "page");

  await page.screenshot({
    path: "e2e/screenshots/nav-collector-album-fab.png",
    fullPage: false,
  });
});

test("fantasy mode — FAB navigates to /squad and highlights correctly", async ({ page }) => {
  await grantLocalAccess(page);
  await page.goto(`${BASE}/`);
  await seedProfile(page, "fantasy");

  // Navigate to /squad (FAB target in fantasy mode)
  await page.goto(`${BASE}/squad`);
  // Squad page takes time to load — wait for a stable landmark
  await page.waitForSelector('nav[aria-label="Navegación principal"]', { timeout: 20000 });

  // In fantasy mode the FAB should show Mi 11 label
  const fabLink = page.locator('nav[aria-label="Navegación principal"] a[aria-label="Mi 11"]');
  await expect(fabLink).toBeVisible({ timeout: 5000 });

  // aria-current="page" should be set on the FAB in fantasy mode on /squad
  await expect(fabLink).toHaveAttribute("aria-current", "page");

  await page.screenshot({
    path: "e2e/screenshots/nav-fantasy-squad-fab.png",
    fullPage: false,
  });
});

import { test, expect } from "@playwright/test";

/**
 * Album search bar + category chips — E2E
 *
 * Coverage:
 *  1. Type "MEX" → only Mexico section visible
 *  2. Clear search, tap "✨ Especiales" → only FWC/Panini stickers (no country team sections)
 *  3. Tap "🌍 Países" → FWC + Panini sections hidden
 *  4. Tap "🏆 Grupos" → group headers (A-L) visible above team headers
 *
 * Viewport: iPhone 15 Pro (393×852)
 * Target: https://app-mundial-2026-lemon.vercel.app (same alias as other e2e)
 */

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "testchips";

/** Set a nickname directly in IndexedDB to skip the onboarding flow */
async function setNicknameIDB(
  page: import("@playwright/test").Page,
  nick: string
): Promise<void> {
  await page.evaluate((nickname: string) => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("mundial-2026", 1);
      req.onsuccess = () => {
        const db = req.result;
        // Try the "settings" object store (used by getNickname/setNickname)
        const storeNames = Array.from(db.objectStoreNames);
        const storeName = storeNames.includes("settings") ? "settings" : storeNames[0];
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put({ key: "nickname", value: nickname });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error("IDB write failed"));
      };
      req.onerror = () => reject(new Error("IDB open failed"));
    });
  }, nick);
}

test.use({ viewport: { width: 393, height: 852 } });

test.describe("Album — search bar + category chips", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage first to ensure IDB is initialized
    await page.goto(`${BASE}/`);
    // Wait for page to be interactive (tutorial or nickname form)
    await page.waitForLoadState("domcontentloaded");

    // If we land on the tutorial, skip it first
    const skipBtn = page.locator("text=Saltar tutorial");
    if (await skipBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await skipBtn.click();
    }

    // If a nickname input is shown, fill it
    const nicknameInput = page.locator("input").first();
    if (await nicknameInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await nicknameInput.fill(NICKNAME);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
    } else {
      // IDB is already populated — try to navigate directly
      await page.goto(`${BASE}/album`);
      await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
    }

    // At this point we should be at /album
    await page.waitForSelector('[data-testid="search-input"]', { timeout: 15000 });
  });

  // --------------------------------------------------------------------------
  // Check 1: Type "MEX" → only Mexico section visible
  // --------------------------------------------------------------------------
  test("search MEX shows only México section", async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill("MEX");

    // Wait for DOM to settle
    await page.waitForTimeout(300);

    // México section should be visible
    const mexSection = page.locator('[data-testid="team-section-MEX"]');
    await expect(mexSection).toBeVisible({ timeout: 5000 });

    // Other country sections (e.g. BRA, ARG) should NOT be present
    const braSection = page.locator('[data-testid="team-section-BRA"]');
    await expect(braSection).toHaveCount(0);

    const argSection = page.locator('[data-testid="team-section-ARG"]');
    await expect(argSection).toHaveCount(0);
  });

  // --------------------------------------------------------------------------
  // Check 2: Tap "✨ Especiales" → only FWC/Panini stickers, no country teams
  // --------------------------------------------------------------------------
  test("Especiales chip shows only FWC + Panini stickers", async ({ page }) => {
    // Clear any leftover search
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill("");

    // Tap Especiales chip
    await page.locator('[data-testid="chip-especiales"]').click();
    await page.waitForTimeout(300);

    // FWC section should be present
    const fwcSection = page.locator('[data-testid="team-section-FWC"]');
    await expect(fwcSection).toBeVisible({ timeout: 5000 });

    // Country team sections (MEX, BRA) should NOT be present
    const mexSection = page.locator('[data-testid="team-section-MEX"]');
    await expect(mexSection).toHaveCount(0);

    const braSection = page.locator('[data-testid="team-section-BRA"]');
    await expect(braSection).toHaveCount(0);
  });

  // --------------------------------------------------------------------------
  // Check 3: Tap "🌍 Países" → FWC + Panini sections hidden
  // --------------------------------------------------------------------------
  test("Países chip hides FWC and Panini sections", async ({ page }) => {
    // Tap Países chip
    await page.locator('[data-testid="chip-paises"]').click();
    await page.waitForTimeout(300);

    // FWC section should NOT be present
    const fwcSection = page.locator('[data-testid="team-section-FWC"]');
    await expect(fwcSection).toHaveCount(0);

    // Panini section should NOT be present
    const paniniSection = page.locator('[data-testid="team-section-_PANINI"]');
    await expect(paniniSection).toHaveCount(0);

    // But a real country team should be present
    const mexSection = page.locator('[data-testid="team-section-MEX"]');
    await expect(mexSection).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // Check 4: Tap "🏆 Grupos" → group headers (A-L) visible above team headers
  // --------------------------------------------------------------------------
  test("Grupos chip shows group headers A-L above team sections", async ({ page }) => {
    // Tap Grupos chip
    await page.locator('[data-testid="chip-grupos"]').click();
    await page.waitForTimeout(300);

    // Group header A should be visible
    const groupA = page.locator('[data-testid="group-header-A"]');
    await expect(groupA).toBeVisible({ timeout: 5000 });

    // Group header L should be visible
    const groupL = page.locator('[data-testid="group-header-L"]');
    await expect(groupL).toBeVisible({ timeout: 5000 });

    // Team header for MEX (group A) should also be present under the group header
    const mexSection = page.locator('[data-testid="team-section-MEX"]');
    await expect(mexSection).toBeVisible({ timeout: 5000 });

    // Group A should appear before Group L in the DOM
    const groupABox = await groupA.boundingBox();
    const groupLBox = await groupL.boundingBox();
    expect(groupABox!.y).toBeLessThan(groupLBox!.y);
  });
});

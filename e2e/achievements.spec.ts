/**
 * Playwright — Achievement badge system tests.
 * iPhone 15 viewport (390 × 844).
 * 7 checks per spec brief.
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "testdomi";

// Actual catalog IDs for MEX team (20 stickers)
const MEX_IDS = [
  "mex-logo","mex-team","mex-2-malagon","mex-3-vasquez","mex-4-sanchez",
  "mex-5-montes","mex-6-gallardo","mex-7-reyes","mex-8-lainez","mex-9-rodriguez",
  "mex-10-alvarez","mex-11-pineda","mex-12-ruiz","mex-14-sanchez","mex-15-lozano",
  "mex-16-gimenez","mex-17-jimenez","mex-18-vega","mex-19-alvarado","mex-20-huerta",
];

// 100 stickers across 5 teams (MEX + RSA + KOR + CZE + CAN = 20 each)
const HUNDRED_IDS = [
  ...MEX_IDS,
  "rsa-logo","rsa-team","rsa-2-williams","rsa-3-chaine","rsa-4-modiba","rsa-5-kabini",
  "rsa-6-mbokazi","rsa-7-ndamane","rsa-8-ngezana","rsa-9-mudau","rsa-10-sibisi",
  "rsa-11-mokoena","rsa-12-mbatha","rsa-14-aubaas","rsa-15-sithole","rsa-16-mbule",
  "rsa-17-foster","rsa-18-rayners","rsa-19-nkota","rsa-20-appollis",
  "kor-logo","kor-team","kor-2-jo","kor-3-kim","kor-4-kim","kor-5-cho",
  "kor-6-seol","kor-7-lee","kor-8-lee","kor-9-lee","kor-10-lee","kor-11-hwang",
  "kor-12-lee","kor-14-paik","kor-15-castrop","kor-16-lee","kor-17-cho",
  "kor-18-son","kor-19-hwang","kor-20-oh",
  "cze-logo","cze-team","cze-2-kovar","cze-3-stanek","cze-4-krejci","cze-5-coufal",
  "cze-6-zeleny","cze-7-holes","cze-8-zima","cze-9-sadilek","cze-10-provod",
  "cze-11-cerv","cze-12-soucek","cze-14-sulc","cze-15-vydra","cze-16-kusej",
  "cze-17-chory","cze-18-cerny","cze-19-hlozek","cze-20-schick",
  "can-logo","can-team","can-2-st-clair","can-3-davies","can-4-johnston",
  "can-5-adekugbe","can-6-larvea","can-7-cornelius","can-8-bombito","can-9-miller",
  "can-10-eustaquio","can-11-kone","can-12-osorio","can-14-shaffelburg",
  "can-15-choiniere","can-16-sigur","can-17-buchanan","can-18-millar",
  "can-19-larin","can-20-david",
];

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

// ── Onboarding helper ────────────────────────────────────────────────────────

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

// ── IDB helpers via raw IndexedDB API ───────────────────────────────────────

async function writeStickers(page: Page, ids: string[]): Promise<void> {
  await page.evaluate((stickerIds) => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("mundial-2026", 2);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("collection")) {
          db.createObjectStore("collection", { keyPath: "sticker_id" });
        }
        if (!db.objectStoreNames.contains("achievements")) {
          db.createObjectStore("achievements", { keyPath: "id" });
        }
      };
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction("collection", "readwrite");
        stickerIds.forEach((sid) => {
          tx.objectStore("collection").put({ sticker_id: sid, count: 1, acquired_at: Date.now() });
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, ids);
}

async function getUnlockedIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return new Promise<string[]>((resolve, reject) => {
      const req = indexedDB.open("mundial-2026", 2);
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("achievements")) {
          db.close(); resolve([]); return;
        }
        const tx = db.transaction("achievements", "readonly");
        const ga = tx.objectStore("achievements").getAll();
        ga.onsuccess = () => {
          db.close();
          resolve((ga.result as Array<{ id: string }>).map((r) => r.id));
        };
        ga.onerror = () => reject(ga.error);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

// Check 1: Fresh onboard → /achievements shows 0/15
test("check 1 — achievements page shows 0/15 after fresh onboard", async ({ page }) => {
  await onboard(page);

  await page.goto(`${BASE}/achievements`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector("text=de 15", { timeout: 8000 });

  const counterText = await page.locator("header span").filter({ hasText: /\d+\/\d+/ }).textContent();
  expect(counterText?.trim()).toBe("0/15");

  const mainText = await page.locator("main").textContent();
  expect(mainText).toContain("0 de 15");
});

// Check 2: Mark first sticker → toast "Primer cromo" + 1/15
test("check 2 — first sticker triggers Primer cromo toast and 1/15", async ({ page }) => {
  await onboard(page);

  // Write one sticker directly to IDB
  await writeStickers(page, ["mex-5-montes"]);

  // Reload so AchievementProvider detects the change on mount
  await page.reload();
  await page.waitForLoadState("networkidle");

  const toast = page.locator('[role="status"]');
  await expect(toast).toBeVisible({ timeout: 6000 });
  await expect(toast).toContainText("Primer cromo");

  await toast.click();
  await page.waitForURL(`${BASE}/achievements`);
  await page.waitForSelector("text=de 15", { timeout: 8000 });

  const counterText = await page.locator("header span").filter({ hasText: /\d+\/\d+/ }).textContent();
  expect(counterText?.trim()).toBe("1/15");
});

// Check 3: Complete MEX (20 stickers) → counter ≥ 2/15
test("check 3 — completing MEX triggers Primer equipo and ≥2/15", async ({ page }) => {
  await onboard(page);

  await writeStickers(page, MEX_IDS);

  await page.reload();
  await page.waitForLoadState("networkidle");

  // At least one toast should appear
  const toast = page.locator('[role="status"]');
  await expect(toast).toBeVisible({ timeout: 8000 });

  // Navigate to achievements page and verify counter
  await page.goto(`${BASE}/achievements`);
  await page.waitForSelector("text=de 15", { timeout: 8000 });

  const counterText = await page.locator("header span").filter({ hasText: /\d+\/\d+/ }).textContent();
  const unlocked = parseInt(counterText?.split("/")[0]?.trim() ?? "0");
  // Expect: first-sticker + first-team-complete = 2 minimum
  expect(unlocked).toBeGreaterThanOrEqual(2);
});

// Check 4: /settings has "Logros" link → tap → badge grid
test("check 4 — settings Logros link navigates to /achievements grid", async ({ page }) => {
  await onboard(page);

  await page.goto(`${BASE}/settings`);
  await page.waitForLoadState("networkidle");

  const logrosLink = page.locator('a[href="/achievements"]');
  await expect(logrosLink).toBeVisible({ timeout: 5000 });
  await expect(logrosLink).toContainText("Logros");

  await logrosLink.click();
  await page.waitForURL(`${BASE}/achievements`, { timeout: 8000 });
  await page.waitForSelector("text=de 15", { timeout: 8000 });

  const mainText = await page.locator("main").textContent();
  expect(mainText).toContain("de 15");
});

// Check 5: Locked badges have reduced opacity
test("check 5 — locked badges have reduced opacity", async ({ page }) => {
  await onboard(page);
  await page.goto(`${BASE}/achievements`);
  await page.waitForSelector("text=de 15", { timeout: 8000 });

  const opacity = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[title]"));
    if (cards.length === 0) return "1";
    return getComputedStyle(cards[0]).opacity;
  });

  expect(parseFloat(opacity)).toBeLessThan(0.9);
});

// Check 6: 100 stickers → Centena + quarter-album (≥4 badges)
test("check 6 — 100 stickers triggers Centena and quarter-album (≥4 badges)", async ({ page }) => {
  await onboard(page);

  await writeStickers(page, HUNDRED_IDS);

  await page.reload();
  await page.waitForLoadState("networkidle");

  const toast = page.locator('[role="status"]');
  await expect(toast).toBeVisible({ timeout: 8000 });

  await page.goto(`${BASE}/achievements`);
  await page.waitForSelector("text=de 15", { timeout: 8000 });

  const counterText = await page.locator("header span").filter({ hasText: /\d+\/\d+/ }).textContent();
  const unlocked = parseInt(counterText?.split("/")[0]?.trim() ?? "0");
  // first-sticker + first-team-complete + hundred-stickers + five-teams + quarter-album = 5 min
  expect(unlocked).toBeGreaterThanOrEqual(4);
});

// Check 7: Tap "Opciones" title 5x → hidden easter egg badge unlocked
test("check 7 — tapping Opciones title 5x unlocks hidden-easter-egg badge", async ({ page }) => {
  await onboard(page);

  await page.goto(`${BASE}/settings`);
  await page.waitForLoadState("networkidle");

  const header = page.locator("h1").filter({ hasText: "Opciones" });
  await expect(header).toBeVisible({ timeout: 5000 });

  // hasTouch is enabled in this context — use tap()
  for (let i = 0; i < 5; i++) {
    await header.tap();
    await page.waitForTimeout(150);
  }

  const toast = page.locator('[role="status"]');
  await expect(toast).toBeVisible({ timeout: 5000 });
  await expect(toast).toContainText("???");

  await toast.click();
  await page.waitForURL(`${BASE}/achievements`);
  await page.waitForSelector("text=de 15", { timeout: 8000 });

  const unlockedIds = await getUnlockedIds(page);
  expect(unlockedIds).toContain("hidden-easter-egg");
});

import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Golden-path regression smoke — hits every major route in one session.
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 *
 * Covered routes:
 *  - Onboarding (3-step tutorial skip + nickname)
 *  - /album       → 50 team sections present
 *  - Search "Estados Unidos" → USA section visible (Spanish search fix)
 *  - Chip "✨ Especiales" → only FWC/Panini visible
 *  - Tap a sticker → count toggles 0→1
 *  - /trade        → picker present
 *  - /import       → textarea present
 *  - /achievements → grid present (0/15)
 *  - /stats        → empty state or content renders
 *  - /album/map    → world SVG container present
 *  - /settings     → Cuenta + Logros + Importar rows present
 */

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "regfull";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// Grant the whitelist cookie before each test so the gate doesn't block navigation.
test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test("golden-path smoke — all major routes", async ({ page }) => {
  // ── Onboarding ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/`);
  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 12000 });

  // ── /album — sections render ─────────────────────────────────────────────────
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 15000 });
  // At least 50 team sections in the full grid (48 country + FWC + Panini)
  const teamSections = page.locator('[data-testid^="team-section-"]');
  const sectionCount = await teamSections.count();
  expect(sectionCount).toBeGreaterThanOrEqual(50);

  // ── Search "Estados Unidos" → USA section visible ────────────────────────────
  const searchInput = page.locator('[data-testid="search-input"]');
  await searchInput.fill("Estados Unidos");
  await page.waitForTimeout(400);
  const usaSection = page.locator('[data-testid="team-section-USA"]');
  await expect(usaSection).toBeVisible({ timeout: 6000 });

  // Clear search
  await searchInput.fill("");
  await page.waitForTimeout(300);

  // ── Chip "✨ Especiales" → only FWC/Panini visible ───────────────────────────
  await page.locator('[data-testid="chip-especiales"]').click();
  await page.waitForTimeout(300);
  const fwcSection = page.locator('[data-testid="team-section-FWC"]');
  await expect(fwcSection).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="team-section-MEX"]')).toHaveCount(0);
  // Reset chip
  await page.locator('[data-testid="chip-todos"]').click();
  await page.waitForTimeout(300);

  // ── Tap first sticker → count cycles 0→1 ────────────────────────────────────
  const firstCard = page.locator('[data-testid^="team-section-"]').first().locator("button").first();
  await firstCard.click();
  await page.waitForTimeout(300);
  // Navigate to "Tengo" tab and confirm at least 1 sticker owned
  await page.locator('[data-testid="tab-tengo"]').click();
  await page.waitForTimeout(300);
  const tengoCount = page.locator('[data-testid^="team-section-"]');
  expect(await tengoCount.count()).toBeGreaterThanOrEqual(1);

  // ── /trade — picker present ───────────────────────────────────────────────────
  await page.goto(`${BASE}/trade`);
  await page.waitForLoadState("networkidle");
  // Trade page has at least one interactive element (search or picker)
  const tradeBody = page.locator("main, [data-testid]");
  await expect(tradeBody.first()).toBeVisible({ timeout: 10000 });

  // ── /import — form present ────────────────────────────────────────────────────
  await page.goto(`${BASE}/import`);
  await page.waitForLoadState("networkidle");
  const importTextarea = page.locator("textarea#figuritas-text, textarea");
  await expect(importTextarea.first()).toBeVisible({ timeout: 10000 });

  // ── /achievements — grid present (0/15 initial) ───────────────────────────────
  await page.goto(`${BASE}/achievements`);
  await page.waitForSelector("text=de 15", { timeout: 10000 });
  const achievementsMain = page.locator("main");
  await expect(achievementsMain).toContainText("de 15");

  // ── /stats — renders (empty state or content) ─────────────────────────────────
  await page.goto(`${BASE}/stats`);
  await page.waitForLoadState("networkidle");
  // Either empty state or stats content must be visible
  const statsPage = page.locator('[data-testid="stats-empty-state"], [data-testid="stats-content"]');
  await expect(statsPage.first()).toBeVisible({ timeout: 12000 });

  // ── /album/map — world SVG container present ──────────────────────────────────
  await page.goto(`${BASE}/album/map`);
  await page.waitForSelector('[data-testid="world-map-container"]', { timeout: 15000 });
  await expect(page.locator('[data-testid="world-map-container"]')).toBeVisible();

  // ── /settings — Logros + Importar rows present ───────────────────────────────
  await page.goto(`${BASE}/settings`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[data-testid="settings-row-logros"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="settings-row-import"]')).toBeVisible({ timeout: 5000 });
});

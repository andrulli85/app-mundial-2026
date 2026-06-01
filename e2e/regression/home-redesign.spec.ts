import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Regression spec — FUT-style dark home redesign (2026-06-01).
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 *
 * Assertions:
 *  1. Post-onboarding lands on /inicio (not /album)
 *  2. Dark theme: root element has dark computed background
 *  3. "ABRIR SOBRE" CTA button exists
 *  4. Stat columns: Racha, Monedas, División
 *  5. "Arma tu once" card + "85 OVR" text
 *  6. "COMPLETA TU ÁLBUM" section + at least 1 country row with X/Y pattern
 *  7. Doradas chip NOT present on /album
 *  8. Screenshot → /tmp/albumix-home-redesign.png
 *
 * Mockup-parity assertions (2026-06-01 fixes):
 *  9. Coins pill in topbar: [data-testid="topbar-coins"] present, contains "1.240"
 * 10. Bell badge: [data-testid="bell-badge"] present, text = "3"
 * 11. Pack header chip contains ⚡ AND "SOBRE DIARIO GRATIS"
 * 12. Pack CTA button contains 🎁 AND "ABRIR SOBRE"
 */

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "futdesign1";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test("FUT-style home — dark theme + hero + stats + country progress", async ({ page }) => {
  // ── Onboarding → /inicio ──────────────────────────────────────────────────
  await page.goto(`${BASE}/`);

  // Handle both: returning user (already has nickname → redirect) or fresh user
  const result = await Promise.race([
    page
      .waitForSelector("text=Saltar tutorial", { timeout: 15000 })
      .then(() => "tutorial"),
    page.waitForURL(`${BASE}/inicio`, { timeout: 15000 }).then(() => "inicio"),
    page.waitForURL(`${BASE}/album`, { timeout: 15000 }).then(() => "album"),
  ]).catch(() => "tutorial");

  if (result === "tutorial") {
    await page.click("text=Saltar tutorial");
    await page.waitForSelector("input", { timeout: 8000 });
    await page.fill("input", NICKNAME);
    await page.click('button[type="submit"]');
  }

  // Assertion 1: lands on /inicio
  await page.waitForURL(`${BASE}/inicio`, { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // Assertion 2: dark theme — root wrapper has low-lightness background
  await page.waitForSelector('[data-testid="home-dark-root"]', { timeout: 10000 });
  const bgColor = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="home-dark-root"]');
    if (!el) return "";
    return window.getComputedStyle(el).background || window.getComputedStyle(el).backgroundColor;
  });
  // The home-dark CSS sets a dark gradient/color — confirm it's not the warm cream (#f9f5ee)
  // We check that it does NOT contain the light cream value
  expect(bgColor).not.toContain("249, 245, 238");  // rgb of #f9f5ee

  // Assertion 3: "ABRIR SOBRE" button exists
  const openPackBtn = page.getByTestId("open-pack-btn");
  await expect(openPackBtn).toBeVisible({ timeout: 8000 });
  expect(await openPackBtn.textContent()).toContain("ABRIR SOBRE");

  // Assertion 4: stat columns — Racha, Monedas, División
  await expect(page.getByTestId("stats-row")).toBeVisible();
  await expect(page.getByTestId("stat-col-racha")).toBeVisible();
  await expect(page.getByTestId("stat-col-monedas")).toBeVisible();
  await expect(page.getByTestId("stat-col-división")).toBeVisible();

  // Assertion 5: "Arma tu once" card + OVR text
  const onceCard = page.getByTestId("once-card");
  await expect(onceCard).toBeVisible();
  const ovrText = page.getByTestId("ovr-text");
  await expect(ovrText).toBeVisible();
  const ovrContent = await ovrText.textContent();
  expect(ovrContent).toContain("85 OVR");

  // Assertion 6: "COMPLETA TU ÁLBUM" section + at least 1 country row with X/Y pattern
  const albumSection = page.getByTestId("country-progress-section");
  await expect(albumSection).toBeVisible();
  // X/Y pattern: e.g. "0/20" or "3/18"
  const sectionText = await albumSection.textContent() ?? "";
  expect(sectionText).toMatch(/\d+\/\d+/);

  // Assertion 7: Doradas chip NOT on /album
  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('[data-testid="category-chips"]', { timeout: 12000 });
  // chip-doradas should no longer exist in the DOM
  const doradasCount = await page.locator('[data-testid="chip-doradas"]').count();
  expect(doradasCount).toBe(0);
  // Also check no visible text "Doradas" in the chip strip
  const chipStripText = await page.getByTestId("category-chips").textContent();
  expect(chipStripText ?? "").not.toContain("Doradas");

  // ── Mockup-parity assertions (2026-06-01 fixes) ──────────────────────────

  // Assertion 9: Coins pill in topbar
  const coinsPill = page.getByTestId("topbar-coins");
  await expect(coinsPill).toBeVisible({ timeout: 8000 });
  const coinsText = await coinsPill.textContent() ?? "";
  expect(coinsText).toContain("1.240");

  // Assertion 10: Bell badge shows "3"
  const bellBadge = page.getByTestId("bell-badge");
  await expect(bellBadge).toBeVisible({ timeout: 8000 });
  const badgeText = await bellBadge.textContent() ?? "";
  expect(badgeText.trim()).toBe("3");

  // Assertion 11: Pack header chip contains ⚡ and "SOBRE DIARIO GRATIS"
  const packHero = page.getByTestId("pack-hero");
  const packHeroText = await packHero.textContent() ?? "";
  expect(packHeroText).toContain("⚡");
  expect(packHeroText).toContain("SOBRE DIARIO GRATIS");

  // Assertion 12: Pack CTA button contains 🎁 and "ABRIR SOBRE"
  const openPackBtnText = await openPackBtn.textContent() ?? "";
  expect(openPackBtnText).toContain("🎁");
  expect(openPackBtnText).toContain("ABRIR SOBRE");

  // Assertion 8: Screenshot (moved to end after all assertions pass)
  await page.screenshot({ path: "/tmp/albumix-home-redesign.png", fullPage: false });
});

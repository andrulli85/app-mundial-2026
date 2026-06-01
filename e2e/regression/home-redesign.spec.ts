import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Regression spec — FUT-style dark home redesign (2026-06-01).
 *
 * Updated for Fase 1 design alignment (2026-06-01):
 *  - "ABRIR SOBRE" / "SOBRE LEGENDARIO" hero removed — "CARTA DE LA SEMANA" present instead
 *  - Coins pill removed from topbar
 *  - "Arma tu once" renamed to "Arma tu 11"
 *  - Doradas + Campeones + Hologramas chips removed from /album
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 *
 * Assertions:
 *  1. Post-onboarding lands on /inicio (not /album)
 *  2. Dark theme: root element has dark computed background
 *  3. "CARTA DE LA SEMANA" hero present (replaces SOBRE LEGENDARIO)
 *  4. Stat columns: Racha, Monedas, División
 *  5. "Arma tu 11" card + "85 OVR" text
 *  6. "COMPLETA TU ÁLBUM" section + at least 1 country row with X/Y pattern
 *  7. Doradas / Campeones / Hologramas chips NOT present on /album
 *  8. Screenshot → /tmp/albumix-home-redesign.png
 *  9. Coins pill NOT in topbar (removed Fase 1)
 * 10. Bell badge: [data-testid="bell-badge"] still present
 * 11. "SOBRE LEGENDARIO" / "ABRIR SOBRE" text NOT present
 */

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "futdesign1";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test("FUT-style home — dark theme + carta semana + stats + country progress", async ({ page }) => {
  // ── Onboarding → /inicio ──────────────────────────────────────────────────
  await page.goto(`${BASE}/`);

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

  // Assertion 2: dark theme
  await page.waitForSelector('[data-testid="home-dark-root"]', { timeout: 10000 });
  const bgColor = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="home-dark-root"]');
    if (!el) return "";
    return window.getComputedStyle(el).background || window.getComputedStyle(el).backgroundColor;
  });
  expect(bgColor).not.toContain("249, 245, 238");  // rgb of #f9f5ee

  // Assertion 3: "CARTA DE LA SEMANA" hero (replaces SOBRE LEGENDARIO)
  const cartaHero = page.getByTestId("carta-semana-hero");
  await expect(cartaHero).toBeVisible({ timeout: 8000 });
  const cartaText = await cartaHero.textContent() ?? "";
  expect(cartaText).toContain("CARTA DE LA SEMANA");

  // Assertion 11: "SOBRE LEGENDARIO" / "ABRIR SOBRE" NOT present
  const sobreCount = await page.getByText("SOBRE LEGENDARIO").count();
  expect(sobreCount).toBe(0);
  const abrirCount = await page.getByText("ABRIR SOBRE").count();
  expect(abrirCount).toBe(0);

  // Assertion 4: stat columns — Racha, Monedas, División
  await expect(page.getByTestId("stats-row")).toBeVisible();
  await expect(page.getByTestId("stat-col-racha")).toBeVisible();
  await expect(page.getByTestId("stat-col-monedas")).toBeVisible();
  await expect(page.getByTestId("stat-col-división")).toBeVisible();

  // Assertion 5: "Arma tu 11" card (renamed from "Arma tu once")
  const onceCard = page.getByTestId("once-card");
  await expect(onceCard).toBeVisible();
  const oncText = await onceCard.textContent() ?? "";
  expect(oncText).toContain("Arma tu 11");
  expect(oncText).not.toContain("Arma tu once");
  const ovrText = page.getByTestId("ovr-text");
  await expect(ovrText).toBeVisible();
  const ovrContent = await ovrText.textContent();
  expect(ovrContent).toContain("85 OVR");

  // Assertion 6: "COMPLETA TU ÁLBUM" section + at least 1 country row
  const albumSection = page.getByTestId("country-progress-section");
  await expect(albumSection).toBeVisible();
  const sectionText = await albumSection.textContent() ?? "";
  expect(sectionText).toMatch(/\d+\/\d+/);

  // Assertion 9: Coins pill NOT in topbar (removed Fase 1)
  const coinsCount = await page.locator('[data-testid="topbar-coins"]').count();
  expect(coinsCount).toBe(0);

  // Assertion 10: Bell badge still present
  const bellBadge = page.getByTestId("bell-badge");
  await expect(bellBadge).toBeVisible({ timeout: 8000 });

  // Assertion 7: Chips check on /album
  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('[data-testid="category-chips"]', { timeout: 12000 });
  const chipStripText = await page.getByTestId("category-chips").textContent() ?? "";
  expect(chipStripText).not.toContain("Doradas");
  expect(chipStripText).not.toContain("Hologramas");
  expect(chipStripText).not.toContain("Campeones");
  // "Favoritas" is now present
  expect(chipStripText).toContain("Favoritas");

  // Assertion 8: Screenshot
  await page.screenshot({ path: "/tmp/albumix-home-redesign.png", fullPage: false });
});

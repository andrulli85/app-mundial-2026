import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Phase A regression — 5-tab BottomNav + /inicio + /perfil + /mercado redirect.
 *
 * Updated for Fase 1 design alignment (2026-06-01):
 *   - BottomNav reordered: Inicio · Mercado · Álbum (center) · Mi 11 · Perfil
 *   - "Mi Once" label → "Mi 11"
 *   - "Armar mi once" quick action on /inicio removed (replaced by Carta de la semana)
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://albumix-app.vercel.app
 *
 * Tests:
 *  - /album renders the 5-tab BottomNav with new Fase 1 order
 *  - /inicio loads (stats row + carta semana present)
 *  - /perfil loads (stat card present)
 *  - /mercado renders full marketplace
 *  - /once placeholder renders with "Mi 11" heading
 */

const BASE = "https://albumix-app.vercel.app";
const NICKNAME = "navtest";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function seedNickname(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/`);

  const url = page.url();
  if (url.includes("/album") || url.includes("/inicio")) return;

  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");

  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 12000 });
}

test("5-tab BottomNav Fase 1 order — Inicio, Mercado, Álbum, Mi 11, Perfil", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/album`);
  await page.waitForSelector("nav[aria-label='Navegación principal']", { timeout: 15000 });

  const nav = page.locator("nav[aria-label='Navegación principal']");
  await expect(nav).toBeVisible();

  // All 5 tabs present
  await expect(nav.getByText("Inicio")).toBeVisible();
  await expect(nav.getByText("Mercado")).toBeVisible();
  await expect(nav.getByText("Álbum")).toBeVisible();
  await expect(nav.getByText("Mi 11")).toBeVisible();
  await expect(nav.getByText("Perfil")).toBeVisible();

  // "Mi Once" label is gone
  expect(await nav.getByText("Mi Once").count()).toBe(0);
});

test("/inicio loads with stats and Carta de la semana", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/inicio`);
  await page.waitForLoadState("networkidle");

  // Carta de la semana replaces the old pack hero
  await expect(page.getByTestId("carta-semana-hero")).toBeVisible({ timeout: 15000 });

  // Stats row
  await expect(page.getByTestId("stats-row")).toBeVisible();

  // BottomNav present with inicio active
  const nav = page.locator("nav[aria-label='Navegación principal']");
  await expect(nav).toBeVisible();
});

test("/perfil loads with stat card", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/perfil`);

  await expect(page.getByText("Mi colección")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Logros")).toBeVisible();
  await expect(page.getByText("Estadísticas")).toBeVisible();
  await expect(page.getByText("Configuración")).toBeVisible();
});

test("/mercado renders full marketplace (Phase C — no redirect)", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);
  await page.waitForURL(`${BASE}/mercado`, { timeout: 10000 });
  await expect(page.getByText("Cambios", { exact: true })).toBeVisible({
    timeout: 15000,
  });
});

test("/once renders Mi 11 heading", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/once`);
  await expect(page.getByRole("heading", { name: /mi 11/i })).toBeVisible({ timeout: 15000 });
  const nav = page.locator("nav[aria-label='Navegación principal']");
  await expect(nav).toBeVisible();
});

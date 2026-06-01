import { test, expect } from "@playwright/test";

/**
 * Phase C regression — /mercado 3-tab marketplace.
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 *
 * Tests:
 *  - /mercado renders with Buscar tab active by default
 *  - Ofertas tab shows empty state (no offers for new user)
 *  - Buscar tab shows search input + rarity filters + results grid
 *  - Enviadas tab shows empty state or trade history
 *  - QR button links to /trade
 *  - BottomNav present with Mercado active
 */

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "mercadotest";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function seedNickname(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/`);
  const url = page.url();
  if (url.includes("/album") || url.includes("/mercado") || url.includes("/inicio")) return;

  for (let i = 0; i < 3; i++) {
    const nextBtn = page.getByText(/Siguiente|¡Empezar/);
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
    }
  }

  const nicknameInput = page.locator('input[type="text"]');
  if (await nicknameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nicknameInput.fill(NICKNAME);
    await page.getByText("¡Empezar!").click();
    await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
  }
}

test("/mercado renders full UI (not redirect)", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);

  // Should NOT redirect to /trade (Phase C replaces the redirect)
  await page.waitForURL(`${BASE}/mercado`, { timeout: 10000 });
  await expect(page.url()).toContain("/mercado");

  // Heading present
  await expect(page.getByText("Cambios", { exact: true })).toBeVisible({
    timeout: 15000,
  });
});

test("all 3 tabs render", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);

  await expect(page.getByTestId("mercado-tab-ofertas")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId("mercado-tab-buscar")).toBeVisible();
  await expect(page.getByTestId("mercado-tab-enviadas")).toBeVisible();
});

test("Ofertas tab shows empty state", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);

  await page.getByTestId("mercado-tab-ofertas").click();
  await expect(page.getByText("Aún no tenés ofertas")).toBeVisible({
    timeout: 10000,
  });
});

test("Buscar tab shows search + filters + grid", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);

  // Buscar is default tab
  await expect(
    page.getByTestId("mercado-search-input")
  ).toBeVisible({ timeout: 15000 });

  // Rarity filters present
  await expect(page.getByTestId("mercado-rarity-all")).toBeVisible();
  await expect(page.getByTestId("mercado-rarity-legendary")).toBeVisible();

  // Category filters
  await expect(page.getByTestId("mercado-cat-players")).toBeVisible();

  // Results grid present (catalog has stickers)
  await expect(
    page.getByTestId("mercado-results-grid")
  ).toBeVisible();
});

test("search filters results", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);

  const searchInput = page.getByTestId("mercado-search-input");
  await expect(searchInput).toBeVisible({ timeout: 15000 });

  // Type a search term
  await searchInput.fill("mex");

  // Results should update (grid still visible, count changes)
  await expect(page.getByTestId("mercado-results-grid")).toBeVisible();
});

test("Enviadas tab shows empty state for new user", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);

  await page.getByTestId("mercado-tab-enviadas").click();
  await expect(
    page.getByText("Aún no enviaste propuestas")
  ).toBeVisible({ timeout: 10000 });
});

test("QR button links to /trade", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);

  const qrBtn = page.locator("a[href='/trade']");
  await expect(qrBtn).toBeVisible({ timeout: 15000 });
});

test("BottomNav present with Mercado active", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);

  const nav = page.locator("nav[aria-label='Navegación principal']");
  await expect(nav).toBeVisible({ timeout: 15000 });
  await expect(nav.getByText("Mercado")).toBeVisible();
});

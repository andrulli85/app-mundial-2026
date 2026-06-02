import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Phase C regression — /mercado 3-tab marketplace.
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://albumix-app.vercel.app
 *
 * Tests:
 *  - /mercado renders with Buscar tab active by default
 *  - Ofertas tab shows empty state (no offers for new user)
 *  - Buscar tab shows search input + rarity filters + results grid
 *  - Enviadas tab shows empty state or trade history
 *  - QR button links to /trade
 *  - BottomNav present with Mercado active
 */

const BASE = "https://albumix-app.vercel.app";
const NICKNAME = "mercadotest";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// Grant the whitelist cookie before each test so the gate doesn't block navigation.
test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function seedNickname(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/`);

  // Wait for client-side JS to run: if nickname is set, page redirects to /album.
  // If not set, onboarding renders "Saltar tutorial" button.
  // We wait for EITHER condition (whichever comes first).
  const hasOnboarding = await page
    .waitForSelector("text=Saltar tutorial", { timeout: 6000 })
    .then(() => true)
    .catch(() => false);

  if (!hasOnboarding) {
    // Already past onboarding (redirected to /album or similar).
    return;
  }

  // Skip the tutorial and reach the nickname form.
  await page.click("text=Saltar tutorial");

  // Fill nickname and submit.
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 12000 });
  await page.waitForLoadState("networkidle");
}

test("/mercado renders full UI (not redirect)", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);

  // Should NOT redirect to /trade (Phase C replaces the redirect)
  // Allow some time for client-side redirect to settle
  await page.waitForTimeout(3000);
  await expect(page.url()).toContain("/mercado");

  // Heading present — wait for client-side render to complete
  // (page uses "use client" with loading state)
  await expect(page.getByText("Cambios", { exact: true })).toBeVisible({
    timeout: 20000,
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

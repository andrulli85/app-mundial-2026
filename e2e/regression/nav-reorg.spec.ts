import { test, expect } from "@playwright/test";

/**
 * Phase A regression — 5-tab BottomNav + /inicio + /perfil + /mercado redirect.
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 *
 * Tests:
 *  - /album renders the 5-tab BottomNav (Inicio, Álbum, Mi Once, Mercado, Perfil)
 *  - /inicio loads (greeting + quick-action buttons present)
 *  - /perfil loads (stat card present)
 *  - /mercado redirects to /trade
 *  - /once placeholder renders
 */

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "navtest";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** Set nickname cookie/IndexedDB so onboarding is skipped */
async function seedNickname(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/`);
  // Wait for onboarding to render, then use the form
  const nicknameInput = page.locator('input[type="text"]');
  // If already set, redirect may happen — just wait
  const url = page.url();
  if (url.includes("/album") || url.includes("/inicio")) return;

  // Skip tutorial steps
  for (let i = 0; i < 3; i++) {
    const nextBtn = page.getByText(/Siguiente|¡Empezar/);
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
    }
  }

  // Fill nickname form if visible
  if (await nicknameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nicknameInput.fill(NICKNAME);
    await page.getByText("¡Empezar!").click();
    await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
  }
}

test("5-tab BottomNav is visible on /album", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/album`);
  await page.waitForSelector("nav[aria-label='Navegación principal']", { timeout: 15000 });

  const nav = page.locator("nav[aria-label='Navegación principal']");
  await expect(nav).toBeVisible();

  // All 5 tabs present
  await expect(nav.getByText("Inicio")).toBeVisible();
  await expect(nav.getByText("Álbum")).toBeVisible();
  await expect(nav.getByText("Mi Once")).toBeVisible();
  await expect(nav.getByText("Mercado")).toBeVisible();
  await expect(nav.getByText("Perfil")).toBeVisible();
});

test("/inicio loads with greeting and quick actions", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/inicio`);

  // Greeting heading
  await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

  // Quick action buttons
  await expect(page.getByText("Marcar stickers")).toBeVisible();
  await expect(page.getByText("Cambiar")).toBeVisible();
  await expect(page.getByText("Armar mi once")).toBeVisible();

  // BottomNav present with inicio active
  const nav = page.locator("nav[aria-label='Navegación principal']");
  await expect(nav).toBeVisible();
});

test("/perfil loads with stat card", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/perfil`);

  // Mi colección section
  await expect(page.getByText("Mi colección")).toBeVisible({ timeout: 15000 });

  // Nav tiles present
  await expect(page.getByText("Logros")).toBeVisible();
  await expect(page.getByText("Estadísticas")).toBeVisible();
  await expect(page.getByText("Configuración")).toBeVisible();
});

test("/mercado redirects to /trade", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/mercado`);
  // Should end up at /trade
  await page.waitForURL(/\/trade/, { timeout: 10000 });
  await expect(page.url()).toContain("/trade");
});

test("/once placeholder renders", async ({ page }) => {
  await seedNickname(page);
  await page.goto(`${BASE}/once`);
  await expect(page.getByText("Mi Once")).toBeVisible({ timeout: 15000 });
  // BottomNav present
  const nav = page.locator("nav[aria-label='Navegación principal']");
  await expect(nav).toBeVisible();
});

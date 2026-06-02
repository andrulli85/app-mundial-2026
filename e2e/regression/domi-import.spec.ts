/**
 * Domi inventory import — regression spec.
 *
 * Validates the 1-click import flow at /perfil/importar:
 *   1. Page renders with correct title + count text
 *   2. Per-country preview shows at least 10 rows
 *   3. CTA tap triggers import and reaches done state
 *   4. /inicio reflects non-zero progress for at least one country
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   prod (BASE_URL or default lemon alias)
 */

import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const NICKNAME = "DomiTest";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

/**
 * Inline onboarding — handles both /album and /inicio as post-onboard destination
 * (the app moved from /album to /inicio in a recent update).
 */
async function ensureNickname(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${BASE}/`);

  const destination = await Promise.race([
    page.waitForSelector("text=Saltar tutorial", { timeout: 14000 }).then(() => "tutorial"),
    page.waitForURL(`${BASE}/inicio`, { timeout: 14000 }).then(() => "inicio"),
    page.waitForURL(`${BASE}/album`, { timeout: 14000 }).then(() => "album"),
  ]).catch(() => "tutorial");

  if (destination === "tutorial") {
    await page.click("text=Saltar tutorial");
    await page.waitForSelector("input", { timeout: 8000 });
    await page.fill("input", NICKNAME);
    await page.click('button[type="submit"]');
    // Wait for either destination — app may route to /inicio or /album
    await Promise.race([
      page.waitForURL(`${BASE}/inicio`, { timeout: 12000 }),
      page.waitForURL(`${BASE}/album`, { timeout: 12000 }),
    ]);
  }

  await page.waitForLoadState("networkidle");
}

test("domi import flow: onboard → /perfil/importar → import → /inicio has progress", async ({ page }) => {
  // Step 1: Ensure onboarded with DomiTest nickname
  await ensureNickname(page);

  // Step 2: Navigate to /perfil/importar
  await page.goto(`${BASE}/perfil/importar`);
  await page.waitForLoadState("networkidle");

  // Step 3: Assert title + sticker count text
  await expect(
    page.locator("text=Importar inventario de Domi")
  ).toBeVisible({ timeout: 15000 });

  await expect(
    page.locator("text=480 figuritas").first()
  ).toBeVisible({ timeout: 10000 });

  // Step 4: Per-country preview shows at least 10 country rows
  // Each row has the team code next to a flag — count grid cells with a 2-3 char uppercase code
  const countryRows = page.locator(".grid > div");
  const rowCount = await countryRows.count();
  expect(rowCount).toBeGreaterThanOrEqual(10);

  // Step 5: Tap the import CTA
  const ctaButton = page.locator("button", { hasText: "Importar" }).first();
  await expect(ctaButton).toBeVisible({ timeout: 8000 });
  await ctaButton.tap();

  // Step 6: Wait for done state (checkmark visible) — up to 30s for batch write
  await expect(
    page.locator("text=figuritas importadas")
  ).toBeVisible({ timeout: 30000 });

  // Take screenshot at done state
  await page.screenshot({ path: "/tmp/albumix-import-done.png", fullPage: false });

  // Step 7: Navigate to /inicio
  const verAlbumLink = page.locator("text=Ver mi álbum");
  await expect(verAlbumLink).toBeVisible({ timeout: 5000 });
  await verAlbumLink.tap();

  await page.waitForURL(`${BASE}/inicio`, { timeout: 12000 });
  await page.waitForLoadState("networkidle");

  // Step 8: Assert at least one country shows non-zero progress.
  // /inicio renders CountryRow components with "{owned}/{total}" spans.
  // Wait for any span matching the pattern Nnn/Nnn where first N >= 1.
  // Give generous timeout since IDB reads are async client-side.
  await page.waitForFunction(
    () => {
      const allText = document.body.innerText;
      return /\b[1-9]\d*\/\d+\b/.test(allText);
    },
    { timeout: 20000 }
  );
});

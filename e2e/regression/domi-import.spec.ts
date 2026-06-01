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
import { ensureOnboarded } from "../_onboard";

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "DomiTest";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test("domi import flow: onboard → /perfil/importar → import → /inicio has progress", async ({ page }) => {
  // test timeout handled by playwright.config.ts (60000)
  // Step 1: Ensure onboarded with DomiTest nickname
  await ensureOnboarded(page, BASE, NICKNAME);

  // Step 2: Navigate to /perfil/importar
  await page.goto(`${BASE}/perfil/importar`);
  await page.waitForLoadState("networkidle");

  // Step 3: Assert title + sticker count text
  await expect(
    page.locator("text=Importar inventario de Domi")
  ).toBeVisible({ timeout: 15000 });

  await expect(
    page.locator("text=480")
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

  // Step 8: Assert at least one country shows non-zero progress (format: "X/20" where X > 0)
  // The /inicio page renders per-country rows with "N/20" text where N is owned count
  const progressText = page.locator("body");
  const bodyContent = await progressText.innerText();

  // Look for pattern like "10/20", "14/20", etc. (first number > 0)
  const progressMatch = bodyContent.match(/\b([1-9]\d*)\/\d+\b/);
  expect(progressMatch).not.toBeNull();
});

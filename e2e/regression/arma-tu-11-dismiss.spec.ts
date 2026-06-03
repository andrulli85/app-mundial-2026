import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";
import * as path from "path";
import * as fs from "fs";

/**
 * "Arma tu 11" dismiss button regression spec (2026-06-02).
 *
 * Validates the × dismiss button added to the "Arma tu 11" tile on /inicio:
 *  1. Tile is visible with correct test IDs and aria-label on the dismiss button.
 *  2. Tapping × hides the tile (transition → gone from DOM).
 *  3. Reloading the page keeps the tile hidden (localStorage persistence).
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://albumix-app.vercel.app
 */

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const SS_DIR = path.resolve(__dirname, "../../screenshots-arma-dismiss");

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page, "test@example.com");
});

function ensureDir() {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });
}

/**
 * Completes onboarding if needed so /inicio does not redirect to /.
 * Handles the multi-step flow: tutorial → nickname → mode selection.
 */
async function ensureNickname(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  // Check for tutorial skip button (step 0-2)
  const hasOnboarding = await page
    .waitForSelector("text=Saltar tutorial", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!hasOnboarding) return;

  // Step 1: skip tutorial carousel → lands on NicknameForm (step 3)
  await page.click("text=Saltar tutorial");
  await page.waitForSelector('input[aria-label="Ingresá tu nombre de jugador"]', { timeout: 8000 });

  // Step 2: fill nickname and click "Siguiente →"
  const input = page.locator('input[aria-label="Ingresá tu nombre de jugador"]');
  await input.click();
  await input.pressSequentially("pwarma11", { delay: 50 });

  // "Siguiente →" is the nickname submit button
  const siguienteBtn = page.getByRole("button", { name: /Siguiente/i });
  await siguienteBtn.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  const siguienteVisible = await siguienteBtn.isVisible().catch(() => false);
  if (siguienteVisible) {
    await siguienteBtn.click();
  }

  // Step 3: mode selection — wait for "¡Empezar!" button, pick first mode if visible
  const empezarBtn = page.getByRole("button", { name: /Empezar/i });
  const empezarVisible = await empezarBtn
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (empezarVisible) {
    // Select collector mode ("Tengo el álbum Panini") — first chip
    const collectorChip = page.getByText(/Tengo el álbum Panini/i).first();
    await collectorChip.click().catch(() => {});
    // Now click ¡Empezar!
    await empezarBtn.click().catch(() => {});
  }

  await page.waitForURL((url) => url.pathname !== "/", { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
}

async function dismissCoachmark(page: import("@playwright/test").Page, section: "inicio" | "album" | "once") {
  const btn = page.locator(`[data-testid="coachmark-dismiss-${section}"]`);
  if (await btn.count() > 0 && await btn.first().isVisible().catch(() => false)) {
    await btn.first().click();
    await page.waitForSelector(`[data-testid="coachmark-${section}"]`, { state: "hidden", timeout: 4000 }).catch(() => {});
  }
}

async function goToInicio(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/inicio`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="home-dark-root"]', { timeout: 20000 });
  await page.waitForSelector('[data-testid="carta-semana-hero"]', { timeout: 20000 });
  await dismissCoachmark(page, "inicio");
}

/** Clear the dismiss key before each test so the tile is always shown fresh. */
async function clearDismissKey(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    try { localStorage.removeItem("arma_tu_11_dismissed_v1"); } catch { /* ignore */ }
  });
}

test("1 — tile visible with correct testids and aria-label before dismiss", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await goToInicio(page);
  await clearDismissKey(page);
  // Reload after clearing key to get a fresh render
  await goToInicio(page);

  const tile = page.locator('[data-testid="arma-tu-11-tile"]');
  await expect(tile).toBeVisible({ timeout: 5000 });

  const dismissBtn = page.locator('[data-testid="arma-tu-11-dismiss"]');
  await expect(dismissBtn).toBeVisible();
  await expect(dismissBtn).toHaveAttribute("aria-label", "Ocultar");

  await page.screenshot({ path: path.join(SS_DIR, "arma-tile-before-dismiss.png") });
});

test("2 — clicking × hides the tile and 3 — reload keeps it hidden (localStorage)", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await goToInicio(page);
  await clearDismissKey(page);
  await goToInicio(page);

  const tile = page.locator('[data-testid="arma-tu-11-tile"]');
  await expect(tile).toBeVisible({ timeout: 5000 });

  // Click the × dismiss button
  const dismissBtn = page.locator('[data-testid="arma-tu-11-dismiss"]');
  await dismissBtn.click();

  // Tile should disappear (transition ~200ms + unmount at 210ms)
  await expect(tile).not.toBeVisible({ timeout: 2000 });

  await page.screenshot({ path: path.join(SS_DIR, "arma-tile-after-dismiss.png") });

  // --- Reload and verify persistence ---
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="home-dark-root"]', { timeout: 20000 });
  // Give hydration effect time to fire
  await page.waitForTimeout(500);

  const tileAfterReload = page.locator('[data-testid="arma-tu-11-tile"]');
  // Tile must NOT be in the DOM (or not visible) after reload
  const tileCount = await tileAfterReload.count();
  if (tileCount > 0) {
    await expect(tileAfterReload).not.toBeVisible({ timeout: 1000 });
  }
  // Either absent from DOM or hidden — both satisfy the spec
  const isGone = tileCount === 0 || !(await tileAfterReload.isVisible().catch(() => false));
  expect(isGone).toBe(true);
});

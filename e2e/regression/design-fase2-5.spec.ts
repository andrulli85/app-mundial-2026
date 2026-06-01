import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";
import * as path from "path";
import * as fs from "fs";

/**
 * Design Fase 2.5 regression spec (2026-06-01).
 *
 * Validates Fase 2.5 patch fixes against prod:
 *  1. /album header shows "MI ÁLBUM" title + X/Y counts + progress bar
 *  2. 3 stat tiles visible (Favoritas / Dobles / Triples)
 *  3. SeleccionFavoritaCard present on /album (with FIJA badge)
 *  4. /inicio does NOT show SeleccionFavoritaCard
 *  5. 4 chips: Todos / Favoritas / Chile / Repetidas
 *  6. A player sticker card has position-coded border color (data-sticker-pos-color)
 *  7. BottomNav has 5 tabs with SVG (Lucide) icons
 *  8. BottomNav hero "Álbum" button has svg element inside
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   albumix-app.vercel.app
 * Screenshots: screenshots-fase2-5/
 */

const BASE = "https://albumix-app.vercel.app";
const SS_DIR = path.resolve(__dirname, "../../screenshots-fase2-5");

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page, "test@example.com");
});

function ensureDir() {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });
}

/**
 * Completes onboarding (if needed) so /album doesn't redirect back.
 * Uses pressSequentially to reliably trigger React onChange events.
 */
async function ensureNickname(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  const hasOnboarding = await page
    .waitForSelector("text=Saltar tutorial", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!hasOnboarding) return; // Already has nickname — skip to /album directly

  // Step past tutorial slides to the nickname form
  await page.click("text=Saltar tutorial");
  await page.waitForSelector('input[aria-label="Ingresá tu nombre de jugador"]', { timeout: 8000 });

  const input = page.locator('input[aria-label="Ingresá tu nombre de jugador"]');
  await input.click();
  await input.pressSequentially("pwtest1", { delay: 50 });

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.waitFor({ state: "visible" });
  await submitBtn.click();

  await page.waitForURL((url) => url.pathname !== "/", { timeout: 12000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
}

/**
 * Navigates to /album and waits for the sticker grid to render.
 * The catalog load is async (dynamic import) so the page can be
 * "network idle" while still showing "Cargando álbum...".
 */
async function goToAlbum(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/album`, { waitUntil: "networkidle" });
  // Wait for the loading spinner to disappear (sticker-grid replaces it)
  await page.waitForSelector('[data-testid="sticker-grid"]', { timeout: 30000 });
}

test("1 — /album header: MI ÁLBUM title + count + progress bar", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await goToAlbum(page);

  // Title
  const title = page.locator('[data-testid="album-title"]');
  await expect(title).toContainText(/mi álbum/i);

  // Count displays X and /Y
  const owned = page.locator('[data-testid="album-owned-count"]');
  const total = page.locator('[data-testid="album-total-count"]');
  await expect(owned).toBeVisible();
  await expect(total).toBeVisible();

  // Progress bar exists
  const bar = page.locator('[data-testid="album-progress-bar"]');
  await expect(bar).toBeVisible();

  // Percentage shown
  const pct = page.locator('[data-testid="album-pct"]');
  await expect(pct).toBeVisible();

  await page.screenshot({ path: path.join(SS_DIR, "album-full.png"), fullPage: true });
});

test("2 — /album stat tiles: 3 tiles (Favoritas / Dobles / Triples)", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await goToAlbum(page);

  const tiles = page.locator('[data-testid="stat-tiles"] > div');
  await expect(tiles).toHaveCount(3);

  await expect(page.locator('[data-testid="stat-tile-favoritas"]')).toBeVisible();
  await expect(page.locator('[data-testid="stat-tile-dobles"]')).toBeVisible();
  await expect(page.locator('[data-testid="stat-tile-triples"]')).toBeVisible();
});

test("3 — /album shows Selección Favorita card with FIJA badge", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await goToAlbum(page);

  const card = page.locator('[data-testid="seleccion-favorita-card"]');
  await expect(card).toBeVisible();

  const badge = page.locator('[data-testid="fija-badge"]');
  await expect(badge).toBeVisible();
});

test("4 — /inicio does NOT show Selección Favorita card", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await page.goto(`${BASE}/inicio`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="home-dark-root"]', { timeout: 15000 });

  const card = page.locator('[data-testid="seleccion-favorita-card"]');
  await expect(card).toHaveCount(0);

  await page.screenshot({ path: path.join(SS_DIR, "inicio-no-favorita.png") });
});

test("5 — /album chip strip has 4 chips (Todos / Favoritas / Chile / Repetidas)", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await goToAlbum(page);

  await expect(page.locator('[data-testid="chip-todos"]')).toBeVisible();
  await expect(page.locator('[data-testid="chip-favoritas"]')).toBeVisible();
  await expect(page.locator('[data-testid="chip-chile"]')).toBeVisible();
  await expect(page.locator('[data-testid="chip-repetidas"]')).toBeVisible();

  // Ensure old chips are removed
  await expect(page.locator('[data-testid="chip-paises"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="chip-grupos"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="chip-especiales"]')).toHaveCount(0);
});

test("6 — sticker cards have position-coded border color (data attr)", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await goToAlbum(page);

  // Each sticker wrapper has data-sticker-pos-color set to a valid color
  const cardWrappers = page.locator('[data-sticker-pos-color]');
  const count = await cardWrappers.count();
  expect(count).toBeGreaterThan(0);

  const firstColor = await cardWrappers.first().getAttribute("data-sticker-pos-color");
  expect(firstColor).toBeTruthy();
  const validColors = ["#A06BFF", "#E4002B", "#F5852A", "#19B65A", "#C0A85E"];
  expect(validColors).toContain(firstColor);

  await page.screenshot({ path: path.join(SS_DIR, "album-cards-position-borders.png") });
});

test("7 — BottomNav has 5 tabs with Lucide SVG icons", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await goToAlbum(page);

  const nav = page.locator('[aria-label="Navegación principal"]');
  await expect(nav).toBeVisible();

  // 5 anchor links
  const links = nav.locator("a");
  await expect(links).toHaveCount(5);

  // Each link contains an SVG
  for (const link of await links.all()) {
    const svg = link.locator("svg");
    await expect(svg.first()).toBeVisible();
  }

  await page.screenshot({ path: path.join(SS_DIR, "bottom-nav.png") });
});

test("8 — BottomNav hero Álbum button contains SVG icon", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await goToAlbum(page);

  // The hero Álbum link has aria-label="Álbum"
  const albumLink = page.locator('[aria-label="Álbum"]');
  await expect(albumLink).toBeVisible();

  // Must contain an svg (Grid3x3 from Lucide)
  const svg = albumLink.locator("svg");
  await expect(svg).toBeVisible();
});

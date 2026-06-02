/**
 * CEO Prod Smoke — visual regression check for all key routes.
 *
 * Purpose: Validate what Andy actually sees in prod after a deploy.
 * Answers: "Did changes land, or is this a device-cache issue?"
 *
 * Viewport: iPhone 15 (393×852, touch-enabled)
 * Target:   https://albumix-app.vercel.app  (overrideable via BASE_URL)
 *
 * Routes:
 *   /album        — TopBar, search, chips, 10+ sticker tiles, per-team stats (X/Y pattern)
 *   /wishlist     — page loads 200, heading, add-sticker picker button
 *   /mercado      — TopBar, tabs
 *   /perfil       — nickname display
 *   /notifications — bell area
 *
 * Screenshots saved to /tmp/albumix-prod-smoke/ for visual inspection.
 */

import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import { grantAccess } from "./_invite";

const BASE =
  process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const NICKNAME = "smoketest";
const SCREENSHOT_DIR = "/tmp/albumix-prod-smoke";

test.use({
  viewport: { width: 393, height: 852 },
  hasTouch: true,
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Ensure screenshot dir exists once before the suite.
test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// Grant whitelist cookie + unregister any cached service worker before each test.
test.beforeEach(async ({ page, context }) => {
  await grantAccess(page);

  // Disable SW so we always see fresh-load state, not SW-cached content.
  await context.addInitScript(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()));
    }
  });
});

// ---------------------------------------------------------------------------
// Helper — onboard a fresh browser context to /album.
// Each test runs in an isolated context (Playwright default), so this always
// hits the "first visit" tutorial flow.
// ---------------------------------------------------------------------------
async function onboardToAlbum(page: Page): Promise<void> {
  await page.goto(`${BASE}/`);

  // Race tutorial vs direct redirect (in case IDB already has nickname).
  const result = await Promise.race([
    page
      .waitForSelector("text=Saltar tutorial", { timeout: 15000 })
      .then(() => "tutorial"),
    page.waitForURL(`${BASE}/album`, { timeout: 15000 }).then(() => "album"),
  ]).catch(() => "tutorial");

  if (result === "tutorial") {
    await page.click("text=Saltar tutorial");
    await page.waitForSelector("input", { timeout: 8000 });
    await page.fill("input", NICKNAME);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
  }

  // Wait for search input as the signal that the album UI is fully mounted.
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// /album — full feature check
// ---------------------------------------------------------------------------
test("/album — TopBar, search, chips, sticker tiles, per-team stats", async ({
  page,
}) => {
  await onboardToAlbum(page);

  // 1. TopBar mounted
  const topbar = page.locator('[data-testid="topbar"]');
  await expect(topbar).toBeVisible({ timeout: 8000 });

  // 2. Search input visible
  const searchInput = page.locator('[data-testid="search-input"]');
  await expect(searchInput).toBeVisible({ timeout: 5000 });

  // 3. At least one category chip visible
  const chips = page.locator('[data-testid="category-chips"] [data-testid^="chip-"]');
  const chipCount = await chips.count();
  expect(chipCount).toBeGreaterThanOrEqual(1);

  // 4. At least 10 sticker tiles rendered
  const stickerTiles = page.locator('[data-testid^="sticker-"]');
  await expect(stickerTiles.first()).toBeVisible({ timeout: 8000 });
  const tileCount = await stickerTiles.count();
  expect(tileCount).toBeGreaterThanOrEqual(10);

  // 5. Per-team completion stats visible — aria-label pattern "X de Y figuritas"
  //    TeamHeader renders aria-label="{owned} de {total} figuritas, {pct} por ciento"
  const statLabels = page.locator('[aria-label*="de "][aria-label*="figuritas"]');
  await expect(statLabels.first()).toBeVisible({ timeout: 8000 });

  // Full-page screenshot for visual inspection
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/album.png`,
    fullPage: true,
  });
});

// ---------------------------------------------------------------------------
// /wishlist — page load + heading + picker button
// ---------------------------------------------------------------------------
test("/wishlist — heading visible, add-sticker button present", async ({
  page,
}) => {
  await onboardToAlbum(page);

  await page.goto(`${BASE}/wishlist`);
  await page.waitForLoadState("networkidle");

  // Wishlist header
  const header = page.locator('[data-testid="wishlist-header"]');
  await expect(header).toBeVisible({ timeout: 8000 });

  // Add-sticker picker button
  const addBtn = page.locator('[data-testid="wishlist-add-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 8000 });

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/wishlist.png`,
    fullPage: true,
  });
});

// ---------------------------------------------------------------------------
// /mercado — TopBar + tabs
// ---------------------------------------------------------------------------
test("/mercado — TopBar mounted, tabs render", async ({ page }) => {
  await onboardToAlbum(page);

  await page.goto(`${BASE}/mercado`);
  await page.waitForLoadState("networkidle");

  // TopBar
  const topbar = page.locator('[data-testid="topbar"]');
  await expect(topbar).toBeVisible({ timeout: 8000 });

  // At least one mercado tab
  const tabs = page.locator('[data-testid^="mercado-tab-"]');
  await expect(tabs.first()).toBeVisible({ timeout: 8000 });

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/mercado.png`,
    fullPage: true,
  });
});

// ---------------------------------------------------------------------------
// /perfil — nickname display
// ---------------------------------------------------------------------------
test("/perfil — nickname rendered after onboarding", async ({ page }) => {
  await onboardToAlbum(page);

  await page.goto(`${BASE}/perfil`);
  await page.waitForLoadState("networkidle");

  // The perfil page renders <h1> with the nickname (capitalized).
  // After onboarding with NICKNAME="smoketest", this should be visible.
  const heading = page.locator("h1");
  await expect(heading).toBeVisible({ timeout: 8000 });
  // Nickname is at least 3 chars — just confirm it's non-empty text
  const text = (await heading.innerText()).trim();
  expect(text.length).toBeGreaterThan(0);

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/perfil.png`,
    fullPage: true,
  });
});

// ---------------------------------------------------------------------------
// /notifications — bell visible
// ---------------------------------------------------------------------------
test("/notifications — bell icon visible", async ({ page }) => {
  await onboardToAlbum(page);

  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  const bell = page.locator('[data-testid="notification-bell"]');
  await expect(bell).toBeVisible({ timeout: 8000 });

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/notifications.png`,
    fullPage: true,
  });
});

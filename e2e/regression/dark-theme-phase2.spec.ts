/**
 * Dark theme Phase 2 regression — /once + /mercado + /wishlist + /notifications + /trade/stats
 *
 * For each route:
 *   1. Navigate to the route
 *   2. Assert dark background: either `.home-dark` class OR computed backgroundColor
 *      with average RGB < 60 (dark check via computed style)
 *   3. Save screenshot to /tmp/albumix-phase2-<route>.png
 *
 * Viewport: iPhone 15 (390×844)
 * Target: https://albumix-app.vercel.app
 */

import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const NICKNAME = "TestPhase2";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function ensureNickname(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${BASE}/`);

  const hasOnboarding = await page
    .waitForSelector("text=Saltar tutorial", { timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (!hasOnboarding) {
    // Already onboarded — redirect was to /album or similar
    return;
  }

  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  // Post-onboarding may redirect to /album or /inicio depending on app version
  await page.waitForURL((url) => !url.pathname.startsWith("/#") && url.pathname !== "/", { timeout: 12000 });
  await page.waitForLoadState("networkidle");
}

/**
 * Returns average RGB of the root container's computed background-color.
 * Values < 60 per channel on average indicate a dark background.
 */
async function getRootBgAverageRGB(
  page: import("@playwright/test").Page
): Promise<number> {
  return page.evaluate(() => {
    const root =
      document.querySelector<HTMLElement>(".home-dark") ??
      document.querySelector<HTMLElement>("[style*='background']") ??
      document.body;
    const bg = window.getComputedStyle(root).backgroundColor;
    const m = bg.match(/\d+/g);
    if (!m || m.length < 3) return 255; // default to light if can't read
    const [r, g, b] = m.map(Number);
    return Math.round((r + g + b) / 3);
  });
}

const ROUTES: { path: string; slug: string; waitFor?: string }[] = [
  { path: "/once",           slug: "once",          waitFor: "Mi 11" },   // renamed Fase 1 2026-06-01
  { path: "/mercado",        slug: "mercado",        waitFor: "Cambios" },
  { path: "/wishlist",       slug: "wishlist",       waitFor: "WISHLIST" },
  { path: "/notifications",  slug: "notifications",  waitFor: "Notificaciones" },
  { path: "/trade/stats",    slug: "trade-stats",    waitFor: "Análisis de intercambios" },
];

for (const { path, slug, waitFor } of ROUTES) {
  test(`dark bg: ${path}`, async ({ page }) => {
    await ensureNickname(page);
    await page.goto(`${BASE}${path}`);

    // Wait for the page to render content
    if (waitFor) {
      await page.waitForSelector(`text=${waitFor}`, { timeout: 15000 });
    }
    await page.waitForLoadState("networkidle");

    // Dark check: either .home-dark class present OR average RGB < 60
    const hasDarkClass = await page.evaluate(() => {
      return !!document.querySelector(".home-dark");
    });

    const avgRGB = await getRootBgAverageRGB(page);

    // Accept dark if class is present OR computed bg is dark (avg < 60)
    const isDark = hasDarkClass || avgRGB < 60;

    if (!isDark) {
      // Capture diagnostic info
      const bodyBg = await page.evaluate(
        () => window.getComputedStyle(document.body).backgroundColor
      );
      console.error(
        `[${slug}] DARK CHECK FAILED — hasDarkClass=${hasDarkClass}, avgRGB=${avgRGB}, bodyBg=${bodyBg}`
      );
    }

    expect(isDark, `${path} should have dark background (avgRGB=${avgRGB})`).toBe(true);

    // Screenshot
    await page.screenshot({
      path: `/tmp/albumix-phase2-${slug}.png`,
      fullPage: false,
    });
  });
}

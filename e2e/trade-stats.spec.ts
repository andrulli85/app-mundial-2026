/**
 * Playwright — /trade/stats analytics dashboard.
 * iPhone 15 viewport (390 × 844).
 *
 * Scope:
 *   1. Empty state visible when trade_log is empty
 *   2. "Hacer mi primer trade" link present and points to /trade
 *   3. /trade page has the "Análisis" link pointing to /trade/stats
 *
 * Seeding real trade data via IndexedDB is possible but requires a complete
 * onboard flow; skipped per spec brief — analytics require an IDB trade_log
 * which cannot be pre-populated without the full trade confirm flow.
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "domitest";

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

// ── Onboarding helper ────────────────────────────────────────────────────────

async function onboard(page: Page): Promise<void> {
  await page.goto(`${BASE}/`);
  await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
}

// ── Test 1: /trade/stats — empty state ──────────────────────────────────────

test("trade stats — empty state visible after fresh onboard", async ({ page }) => {
  await onboard(page);

  await page.goto(`${BASE}/trade/stats`);
  await page.waitForLoadState("networkidle");

  // Wait for the loading spinner to go away and the empty state to render
  const emptyState = page.locator('[data-testid="trade-stats-empty"]');
  await expect(emptyState).toBeVisible({ timeout: 10000 });

  // Check the human-readable text
  await expect(page.locator("text=Aún no hiciste trades")).toBeVisible();
});

// ── Test 2: Empty state CTA button links to /trade ───────────────────────────

test("trade stats — empty state CTA links to /trade", async ({ page }) => {
  await onboard(page);

  await page.goto(`${BASE}/trade/stats`);
  await page.waitForLoadState("networkidle");

  const ctaLink = page.locator('a[href="/trade"]');
  await expect(ctaLink).toBeVisible({ timeout: 10000 });
  await expect(ctaLink).toContainText("Hacer mi primer trade");
});

// ── Test 3: /trade page has "Análisis" link to /trade/stats ─────────────────

test("trade page — Análisis link points to /trade/stats", async ({ page }) => {
  await onboard(page);

  await page.goto(`${BASE}/trade`);
  await page.waitForLoadState("networkidle");

  const analysisLink = page.locator('[data-testid="trade-stats-link"]');
  await expect(analysisLink).toBeVisible({ timeout: 8000 });
  await expect(analysisLink).toContainText("Análisis");

  // Navigate to /trade/stats via the link
  await analysisLink.click();
  await page.waitForURL(`${BASE}/trade/stats`, { timeout: 8000 });

  // Should land on the stats page — either empty state or stats loaded
  await page.waitForLoadState("networkidle");
  const heading = page.locator("h1");
  await expect(heading).toContainText("Análisis de intercambios");
});

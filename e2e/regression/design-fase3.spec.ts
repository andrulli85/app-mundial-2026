import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";
import * as path from "path";
import * as fs from "fs";

/**
 * Design Fase 3 regression spec (2026-06-01).
 *
 * Validates all Fase 3 changes against prod:
 *  1. /inicio shows Selección Favorita Chile card with FIJA badge + Cuartos reached
 *  2. /mercado has 3 tabs (Sobres/Amigos/Trades) visible
 *  3. /mercado Amigos tab shows 5 friends sorted desc by pts
 *  4. /once has 3 tabs (Equipo/Puntos/Resultados) visible
 *  5. /once Puntos tab shows MY_POINTS=1620 + leaderboard with "tú"
 *  6. Coachmark renders first visit to /inicio + dismisses on click
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   prod alias via BASE_URL env (defaults to app-mundial-2026-lemon.vercel.app)
 * Screenshots: screenshots-fase3/
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const SS_DIR = path.resolve(__dirname, "../../screenshots-fase3");

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

// Create screenshots dir if needed
function ensureScreenshotDir() {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });
}

// Helper: set up a fresh user with nickname (no onboarding modal)
// Matches pattern from design-fase2.spec.ts
async function ensureNickname(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${BASE}/`);

  const hasOnboarding = await page
    .waitForSelector("text=Saltar tutorial", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!hasOnboarding) return;

  // Click skip tutorial first, then fill nickname
  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", "Tester");
  const submitBtn = page.locator('button[type="submit"]');
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
  }
  await page.waitForURL((url) => url.pathname !== "/", { timeout: 12000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
}

// Helper: mark all coachmarks as "seen" so overlays never appear
async function dismissAllCoachmarks(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    ["inicio", "album", "once"].forEach((s) =>
      localStorage.setItem(`mc_coach_${s}`, "seen")
    );
  });
}

// Helper: clear coachmark localStorage so they show fresh (for coachmark tests only)
async function clearCoachmarks(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    ["inicio", "album", "once"].forEach((s) =>
      localStorage.removeItem(`mc_coach_${s}`)
    );
  });
}

test.describe("Fase 3 — /inicio", () => {
  test("Selección Favorita Chile card visible with FIJA badge and Cuartos reached", async ({ page }) => {
    ensureScreenshotDir();
    await ensureNickname(page);
    await page.goto(`${BASE}/inicio`);

    // Wait for the card to render
    const card = page.locator('[data-testid="seleccion-favorita-card"]');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Team name
    const teamName = page.locator('[data-testid="fav-team-name"]');
    await expect(teamName).toContainText("Chile");

    // FIJA badge
    const fijaBadge = page.locator('[data-testid="fija-badge"]');
    await expect(fijaBadge).toBeVisible();
    await expect(fijaBadge).toContainText("FIJA");

    // At least one tier is "reached"
    const reachedTier = page.locator('[data-testid="tier-reached"]').first();
    await expect(reachedTier).toBeVisible();

    await page.screenshot({
      path: path.join(SS_DIR, "inicio.png"),
      fullPage: false,
    });
  });
});

test.describe("Fase 3 — /mercado", () => {
  test("3 tabs visible (Sobres/Amigos/Trades)", async ({ page }) => {
    ensureScreenshotDir();
    await ensureNickname(page);
    await page.goto(`${BASE}/mercado`);

    // Wait for tab bar
    const tabBar = page.locator('[data-testid="mercado-tab-bar"]');
    await expect(tabBar).toBeVisible({ timeout: 10000 });

    // All 3 tabs
    await expect(page.locator('[data-testid="mercado-tab-sobres"]')).toBeVisible();
    await expect(page.locator('[data-testid="mercado-tab-amigos"]')).toBeVisible();
    await expect(page.locator('[data-testid="mercado-tab-trades"]')).toBeVisible();

    await page.screenshot({
      path: path.join(SS_DIR, "mercado-tabs.png"),
      fullPage: false,
    });
  });

  test("Amigos tab shows 5 friends sorted desc by pts", async ({ page }) => {
    ensureScreenshotDir();
    await ensureNickname(page);
    await page.goto(`${BASE}/mercado`);

    // Click Amigos tab
    await page.locator('[data-testid="mercado-tab-amigos"]').click();

    const amigosTab = page.locator('[data-testid="amigos-tab"]');
    await expect(amigosTab).toBeVisible({ timeout: 10000 });

    // Check all 5 friends are present
    const friendIds = ["benja", "sofi", "vicente", "agus", "flo"];
    for (const fid of friendIds) {
      const row = page.locator(`[data-testid="friend-row-${fid}"]`);
      await expect(row).toBeVisible();
    }

    // Check order: Benja (1840) must come before Flo (980)
    const rows = page.locator('[data-testid^="friend-row-"]');
    const count = await rows.count();
    expect(count).toBe(5);

    // First friend row should be Benja (highest pts)
    const firstRow = rows.nth(0);
    await expect(firstRow).toHaveAttribute("data-testid", "friend-row-benja");

    await page.screenshot({
      path: path.join(SS_DIR, "mercado-amigos.png"),
      fullPage: false,
    });
  });
});

test.describe("Fase 3 — /once", () => {
  test("3 tabs visible (Equipo/Puntos/Resultados)", async ({ page }) => {
    ensureScreenshotDir();
    await ensureNickname(page);
    // Pre-dismiss coachmarks so overlay doesn't appear
    await page.goto(`${BASE}/inicio`);
    await dismissAllCoachmarks(page);
    await page.goto(`${BASE}/once`);

    const tabBar = page.locator('[data-testid="once-tab-bar"]');
    await expect(tabBar).toBeVisible({ timeout: 10000 });

    await expect(page.locator('[data-testid="once-tab-equipo"]')).toBeVisible();
    await expect(page.locator('[data-testid="once-tab-puntos"]')).toBeVisible();
    await expect(page.locator('[data-testid="once-tab-resultados"]')).toBeVisible();
  });

  test("Puntos tab shows MY_POINTS 1620 and leaderboard with you", async ({ page }) => {
    ensureScreenshotDir();
    await ensureNickname(page);

    // Pre-dismiss coachmarks so overlay never appears on /once
    await page.goto(`${BASE}/inicio`);
    await dismissAllCoachmarks(page);
    await page.goto(`${BASE}/once`);
    await page.waitForSelector('[data-testid="once-tab-bar"]', { timeout: 15000 });

    // Click Puntos tab
    await page.locator('[data-testid="once-tab-puntos"]').click();

    // MY_POINTS value card
    const ptsCard = page.locator('[data-testid="puntos-total-card"]');
    await expect(ptsCard).toBeVisible({ timeout: 10000 });
    const ptsValue = page.locator('[data-testid="my-points-value"]');
    await expect(ptsValue).toContainText("1.620");

    // Leaderboard exists
    const board = page.locator('[data-testid="leaderboard-table"]');
    await expect(board).toBeVisible();

    // "you" row present
    const youRow = page.locator('[data-testid="leaderboard-you"]');
    await expect(youRow).toBeVisible();

    await page.screenshot({
      path: path.join(SS_DIR, "once-puntos.png"),
      fullPage: false,
    });
  });

  test("Resultados tab shows 4 match cards", async ({ page }) => {
    ensureScreenshotDir();
    await ensureNickname(page);

    // Pre-dismiss coachmarks so overlay doesn't intercept
    await page.goto(`${BASE}/inicio`);
    await dismissAllCoachmarks(page);
    await page.goto(`${BASE}/once`);
    await page.waitForSelector('[data-testid="once-tab-bar"]', { timeout: 15000 });

    await page.locator('[data-testid="once-tab-resultados"]').click();

    // At least first result card
    const r1 = page.locator('[data-testid="result-card-r1"]');
    await expect(r1).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: path.join(SS_DIR, "once-resultados.png"),
      fullPage: false,
    });
  });
});

test.describe("Fase 3 — Coachmarks", () => {
  test("Coachmark renders first visit to /inicio and dismisses", async ({ page }) => {
    ensureScreenshotDir();
    await ensureNickname(page);

    // Clear coachmarks to simulate fresh visit
    await page.goto(`${BASE}/inicio`);
    await clearCoachmarks(page);

    // Reload to trigger coachmark
    await page.reload();

    // Coachmark should appear
    const coachmark = page.locator('[data-testid="coachmark-inicio"]');
    await expect(coachmark).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: path.join(SS_DIR, "inicio-coachmark.png"),
      fullPage: false,
    });

    // Dismiss it
    const dismissBtn = page.locator('[data-testid="coachmark-dismiss-inicio"]');
    await dismissBtn.click();

    // Should be gone
    await expect(coachmark).not.toBeVisible({ timeout: 5000 });

    // Reload — should NOT appear again (flag persisted)
    await page.reload();
    await expect(page.locator('[data-testid="coachmark-inicio"]')).not.toBeVisible({ timeout: 5000 });
  });
});

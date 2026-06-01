import { test, expect, type Page } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Regression spec — Historical Champions /album/historia timeline (2026-06-01).
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 *
 * Assertions:
 *  1. /album has "🏆 Campeones" chip visible.
 *  2. Tapping the chip navigates to /album/historia.
 *  3. Page title contains "Campeones del Mundo".
 *  4. At least 8 [data-testid="champion-card"] elements render.
 *  5. "ARGENTINA 1986" text visible.
 *  6. "ARGENTINA 2022" text visible.
 *  7. Tap the Argentina 1986 card → reload → card shows owned state (full opacity).
 *  8. Screenshot saved to /tmp/albumix-historia.png.
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "TestChamp";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

/**
 * Navigates to /album, handling first-time onboarding if needed.
 */
async function ensureNickname(page: Page, nickname: string): Promise<void> {
  await page.goto(`${BASE}/`);

  const result = await Promise.race([
    page
      .waitForSelector("text=Saltar tutorial", { timeout: 15000 })
      .then(() => "tutorial"),
    page.waitForURL(`${BASE}/inicio`, { timeout: 15000 }).then(() => "inicio"),
    page.waitForURL(`${BASE}/album`, { timeout: 15000 }).then(() => "album"),
  ]).catch(() => "tutorial");

  if (result === "tutorial") {
    await page.click("text=Saltar tutorial");
    await page.waitForSelector("input", { timeout: 8000 });
    await page.fill("input", nickname);
    await page.click('button[type="submit"]');
  }
}

test(
  "champions-historia — chip visible + timeline renders + owned state persists",
  async ({ page }) => {
    // ── Step 1: Onboard ──────────────────────────────────────────────────────
    await ensureNickname(page, NICKNAME);

    // ── Step 2: Navigate to /album ────────────────────────────────────────────
    await page.goto(`${BASE}/album`);
    await page.waitForLoadState("networkidle");

    // ── Assertion 1: "Campeones" chip visible ────────────────────────────────
    const chipsBar = page.getByTestId("category-chips");
    await expect(chipsBar).toBeVisible({ timeout: 10000 });

    const campeoneChip = page.getByTestId("chip-campeones");
    await expect(campeoneChip).toBeVisible({ timeout: 8000 });

    // Chip text should contain "Campeones"
    const chipText = await campeoneChip.textContent() ?? "";
    expect(chipText.toLowerCase()).toContain("campeones");

    // ── Step 3: Tap chip → navigate to /album/historia ────────────────────────
    await campeoneChip.click();
    await page.waitForURL(`${BASE}/album/historia`, { timeout: 12000 });

    // ── Assertion 2: URL is /album/historia ──────────────────────────────────
    expect(page.url()).toContain("/album/historia");

    // ── Assertion 3: Page title "Campeones del Mundo" ────────────────────────
    await page.waitForSelector('[data-testid="historia-root"]', { timeout: 12000 });
    const titleText = await page.locator("h1").first().textContent() ?? "";
    expect(titleText.toLowerCase()).toContain("campeones del mundo");

    // ── Assertion 4: At least 8 champion cards ────────────────────────────────
    const cards = page.getByTestId("champion-card");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(8);

    // ── Assertion 5: ARGENTINA 1986 visible ──────────────────────────────────
    await expect(
      page.getByText("ARGENTINA 1986", { exact: false })
    ).toBeVisible({ timeout: 8000 });

    // ── Assertion 6: ARGENTINA 2022 visible ──────────────────────────────────
    await expect(
      page.getByText("ARGENTINA 2022", { exact: false })
    ).toBeVisible({ timeout: 8000 });

    // ── Assertion 7: Tap Argentina 1986 → reload → owned state ───────────────
    const arg1986Card = page
      .getByTestId("champion-card")
      .filter({ hasText: "ARGENTINA 1986" });
    await expect(arg1986Card).toBeVisible({ timeout: 8000 });

    // Get opacity before tap
    const opacityBefore = await arg1986Card.evaluate(
      (el) => parseFloat(window.getComputedStyle(el).opacity)
    );
    // Should start as not-owned (0.3) on a fresh test context
    // Tap to toggle owned
    await arg1986Card.click();

    // Wait for opacity to change to 1 (owned)
    await page.waitForFunction(
      () => {
        const card = document.querySelector('[data-champion-id="champ-arg-1986"]');
        if (!card) return false;
        return parseFloat(window.getComputedStyle(card as HTMLElement).opacity) > 0.9;
      },
      { timeout: 6000 }
    );

    // Reload and verify owned state persists
    await page.reload();
    await page.waitForSelector('[data-testid="historia-root"]', { timeout: 12000 });
    await page.waitForLoadState("networkidle");

    const arg1986After = page
      .getByTestId("champion-card")
      .filter({ hasText: "ARGENTINA 1986" });
    await expect(arg1986After).toBeVisible({ timeout: 8000 });

    const opacityAfter = await arg1986After.evaluate(
      (el) => parseFloat(window.getComputedStyle(el).opacity)
    );
    expect(opacityAfter).toBeGreaterThan(0.9);

    // ── Screenshot ────────────────────────────────────────────────────────────
    await page.screenshot({ path: "/tmp/albumix-historia.png", fullPage: false });

    // Suppress unused variable lint warning
    void opacityBefore;
  }
);

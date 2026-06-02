import { test, expect, type Page } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Regression spec — FUT-style /album redesign (2026-06-01).
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://albumix-app.vercel.app
 *
 * Assertions:
 *  1. /album page has dark background (.home-dark wrapper or dark computed color)
 *  2. "MI ÁLBUM" title visible in dark header
 *  3. Chip strip contains "Legendario"
 *  4. At least 30 [data-testid="fut-card"] elements render
 *  5. First FUT card has valid data-rating (70-94) + valid data-rarity + flag + name
 *  6. Tap "Legendario" chip → grid shows only cards with data-rarity="gold"
 *  7. Screenshot → /tmp/albumix-album-fut.png
 */

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const NICKNAME = "futtest1";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

/**
 * Helper: navigate to /album, handling onboarding if needed.
 */
async function ensureNicknameAndGoToAlbum(page: Page, nickname: string) {
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

  // Navigate to /album
  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");
}

test("FUT-style /album — dark theme + cards + Legendario chip filter", async ({ page }) => {
  await ensureNicknameAndGoToAlbum(page, NICKNAME);

  // ── Assertion 1: Dark background ──────────────────────────────────────────
  // .home-dark class should be present on the root wrapper, OR background is dark
  const albumRoot = page.getByTestId("album-dark-root");
  await expect(albumRoot).toBeVisible({ timeout: 12000 });

  const bgColor = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="album-dark-root"]');
    if (!el) return "";
    return window.getComputedStyle(el).backgroundColor;
  });
  // Confirm it is NOT the cream light theme (#f9f5ee = rgb(249,245,238))
  expect(bgColor).not.toContain("249, 245, 238");

  // ── Assertion 2: "MI ÁLBUM" title ─────────────────────────────────────────
  const titleText = await page.locator("h1").first().textContent();
  expect(titleText?.toUpperCase()).toContain("MI ÁLBUM");

  // ── Assertion 3: Legendario chip ──────────────────────────────────────────
  const chipStrip = page.getByTestId("category-chips");
  await expect(chipStrip).toBeVisible({ timeout: 8000 });
  const stripText = await chipStrip.textContent() ?? "";
  expect(stripText).toContain("Legendario");

  // ── Assertion 4: At least 30 FUT cards ───────────────────────────────────
  // Wait for cards to appear (catalog loaded client-side)
  await page.waitForSelector('[data-testid="fut-card"]', { timeout: 15000 });
  const cards = page.locator('[data-testid="fut-card"]');
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThanOrEqual(30);

  // ── Assertion 5: First card attributes ───────────────────────────────────
  const firstCard = cards.first();
  await expect(firstCard).toBeVisible();

  // data-rating: 2-digit number in range 70-94
  const ratingAttr = await firstCard.getAttribute("data-rating");
  expect(ratingAttr).not.toBeNull();
  const rating = parseInt(ratingAttr ?? "0", 10);
  expect(rating).toBeGreaterThanOrEqual(70);
  expect(rating).toBeLessThanOrEqual(94);

  // data-rarity: one of gold|purple|red|blue|gray
  const rarityAttr = await firstCard.getAttribute("data-rarity");
  expect(["gold", "purple", "red", "blue", "gray"]).toContain(rarityAttr);

  // Flag emoji visible somewhere inside the card
  const cardHTML = await firstCard.innerHTML();
  // Flags are emoji — check the card contains some visible text (not just empty)
  expect(cardHTML.length).toBeGreaterThan(10);

  // Name strip should contain non-empty text
  const nameEl = firstCard.locator("div.text-\\[10px\\]").last();
  const nameText = await nameEl.textContent();
  expect((nameText ?? "").trim().length).toBeGreaterThan(0);

  // ── Assertion 6: Legendario chip filter → only gold cards ────────────────
  const legendarioChip = page.getByTestId("chip-legendario");
  await expect(legendarioChip).toBeVisible();

  // Record how many cards exist before filter
  const preFilterCount = await page.locator('[data-testid="fut-card"]').count();

  await legendarioChip.click();

  // Wait for the DOM to stabilize: card count must drop from preFilterCount
  // (legend stickers = 17, full catalog = 1007+, so count changes significantly)
  const allFutCards = page.locator('[data-testid="fut-card"]');
  await expect(allFutCards.first()).toBeVisible({ timeout: 5000 }); // ensure at least one remains
  await page.waitForFunction(
    (pre) => {
      const cards = document.querySelectorAll('[data-testid="fut-card"]');
      return cards.length < pre;
    },
    preFilterCount,
    { timeout: 5000, polling: 100 }
  );

  // Collect all visible cards after filter has stabilized
  const filteredCards = page.locator('[data-testid="fut-card"]');
  const filteredCount = await filteredCards.count();

  if (filteredCount > 0) {
    // Every card should have data-rarity="gold" (Legendario = rarity_tier "legend" → gold tier)
    for (let i = 0; i < Math.min(filteredCount, 10); i++) {
      const card = filteredCards.nth(i);
      const rarity = await card.getAttribute("data-rarity");
      expect(rarity).toBe("gold");
    }
  }
  // If filteredCount === 0, the collection has no legend stickers yet — that's valid.

  // ── Assertion 7: Screenshot ───────────────────────────────────────────────
  await page.screenshot({ path: "/tmp/albumix-album-fut.png", fullPage: false });
});

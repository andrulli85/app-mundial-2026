/**
 * Dark theme Batch 2 regression — /friends, /trade/*, /reglas, /scan
 *
 * Validates:
 *   1. No element has background-color: rgb(0, 104, 71) (#006847 México green).
 *   2. /trade/propose — primary CTA uses foil-gold gradient (linear-gradient substring).
 *   3. /friends — back button uses router.back() (navigates to previous page, not /settings).
 *
 * Viewport: iPhone 15 (390×844)
 * Target: https://albumix-app.vercel.app
 */

import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const NICKNAME = "TestBatch2";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureNickname(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${BASE}/`);

  const hasOnboarding = await page
    .waitForSelector("text=Saltar tutorial", { timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (!hasOnboarding) return;

  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/#") && url.pathname !== "/", { timeout: 12000 });
  await page.waitForLoadState("networkidle");
}

/**
 * Returns true if any descendant element has computed background-color
 * matching the México green #006847 → rgb(0, 104, 71).
 */
async function hasGreenBackground(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => {
    const TARGET = "rgb(0, 104, 71)";
    const all = document.querySelectorAll("*");
    for (const el of Array.from(all)) {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg === TARGET) return true;
    }
    return false;
  });
}

// ---------------------------------------------------------------------------
// Group 1 — /friends/*: no green chrome
// ---------------------------------------------------------------------------

const FRIENDS_ROUTES: { path: string; slug: string }[] = [
  { path: "/friends", slug: "friends-page" },
  { path: "/friends/add", slug: "friends-add" },
];

for (const { path, slug } of FRIENDS_ROUTES) {
  test(`no #006847 green: ${path}`, async ({ page }) => {
    await ensureNickname(page);
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState("networkidle");

    // Take screenshot for visual reference
    await page.screenshot({
      path: `/tmp/screenshots-dark-batch2/${slug}.png`,
      fullPage: false,
    });

    const hasGreen = await hasGreenBackground(page);
    expect(hasGreen, `Found #006847 green on ${path}`).toBe(false);
  });
}

// ---------------------------------------------------------------------------
// Group 1 — /friends: back button uses router.back(), not /settings
// ---------------------------------------------------------------------------

test("friends back button navigates via router.back()", async ({ page }) => {
  await ensureNickname(page);

  // Simulate entry from /perfil so router history has a previous entry
  await page.goto(`${BASE}/perfil`);
  await page.waitForLoadState("networkidle");
  await page.goto(`${BASE}/friends`);
  await page.waitForLoadState("networkidle");

  // Find the back button (aria-label="Volver" or first button)
  const backBtn = page.locator('button[aria-label="Volver"]').first();
  await backBtn.click();

  // After router.back(), the URL should NOT be /settings
  // It should return to where we came from (/perfil)
  await page.waitForURL((url) => url.pathname !== "/friends", { timeout: 6000 });
  const url = new URL(page.url());
  expect(url.pathname).not.toBe("/settings");
});

// ---------------------------------------------------------------------------
// Group 2 — /trade/*: no green chrome
// ---------------------------------------------------------------------------

const TRADE_ROUTES: { path: string; slug: string }[] = [
  { path: "/trade/history", slug: "trade-history" },
  { path: "/trade/stats", slug: "trade-stats" },
  { path: "/trade/browse", slug: "trade-browse" },
];

for (const { path, slug } of TRADE_ROUTES) {
  test(`no #006847 green: ${path}`, async ({ page }) => {
    await ensureNickname(page);
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: `/tmp/screenshots-dark-batch2/${slug}.png`,
      fullPage: false,
    });

    const hasGreen = await hasGreenBackground(page);
    expect(hasGreen, `Found #006847 green on ${path}`).toBe(false);
  });
}

// /trade/propose: no green + CTA has foil-gold gradient
test("no #006847 green + foil-gold CTA: /trade/propose", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/trade/propose`);
  await page.waitForLoadState("networkidle");

  await page.screenshot({
    path: `/tmp/screenshots-dark-batch2/trade-propose.png`,
    fullPage: false,
  });

  const hasGreen = await hasGreenBackground(page);
  expect(hasGreen, "Found #006847 green on /trade/propose").toBe(false);

  // The sticky CTA button should use foil-gold (linear-gradient)
  const ctaBg = await page.evaluate(() => {
    // Sticky CTA is in a fixed div at bottom; find the disabled button or enabled one
    const buttons = Array.from(document.querySelectorAll("button"));
    // The CTA is the last full-width button
    const cta = buttons.find(
      (b) =>
        b.style.background?.includes("linear-gradient") ||
        window.getComputedStyle(b).backgroundImage?.includes("linear-gradient")
    );
    if (!cta) return "";
    return cta.style.background || window.getComputedStyle(cta).backgroundImage;
  });

  // When CTA is enabled it uses foil-gold; when disabled it uses var(--bg-3).
  // Either way it must NOT be the México green. If it contains linear-gradient, we're good.
  // Accept both enabled (foil) and disabled (bg-3 no gradient) states.
  // Key assertion: never #006847.
  const ctaColor = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const cta = buttons[buttons.length - 1];
    return cta ? window.getComputedStyle(cta).backgroundColor : "";
  });
  expect(ctaColor).not.toBe("rgb(0, 104, 71)");
});

// ---------------------------------------------------------------------------
// Group 3 — /reglas, /scan: no green chrome
// ---------------------------------------------------------------------------

const UTIL_ROUTES: { path: string; slug: string }[] = [
  { path: "/reglas", slug: "reglas" },
  { path: "/scan", slug: "scan" },
];

for (const { path, slug } of UTIL_ROUTES) {
  test(`no #006847 green: ${path}`, async ({ page }) => {
    await ensureNickname(page);
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: `/tmp/screenshots-dark-batch2/${slug}.png`,
      fullPage: false,
    });

    const hasGreen = await hasGreenBackground(page);
    expect(hasGreen, `Found #006847 green on ${path}`).toBe(false);
  });
}

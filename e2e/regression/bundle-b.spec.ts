import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";
import * as path from "path";
import * as fs from "fs";

/**
 * Bundle B regression spec (2026-06-02).
 *
 * Validates:
 *  1. StickerDetailModal — no standalone Anton 26px name header between card and table
 *  2. StickerDetailModal — CAMBIAR button has gold linear-gradient + active:scale-95
 *  3. StickerDetailModal — Sumar repetida button has gold linear-gradient (when count=1)
 *  4. /perfil — avatar renders: img[data-testid="avatar-photo"] or div[data-testid="avatar-initial"]
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://albumix-app.vercel.app
 */

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const SS_DIR = path.resolve(__dirname, "../../screenshots-bundle-b");

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page, "test@example.com");
});

function ensureDir() {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });
}

/**
 * Completes onboarding if needed so /album does not redirect back to /.
 * Same pattern as carta-semana-deeplink.spec.ts.
 */
async function ensureNickname(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  const hasOnboarding = await page
    .waitForSelector("text=Saltar tutorial", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!hasOnboarding) return;

  await page.click("text=Saltar tutorial");
  await page.waitForSelector('input[aria-label="Ingresá tu nombre de jugador"]', { timeout: 8000 });

  const input = page.locator('input[aria-label="Ingresá tu nombre de jugador"]');
  await input.click();
  await input.pressSequentially("pw-bundle-b", { delay: 50 });

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.waitFor({ state: "visible" });
  await submitBtn.click();

  await page.waitForURL((url) => url.pathname !== "/", { timeout: 12000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
}

/**
 * Opens /album, waits for the sticker grid, taps the first card to open modal.
 * Uses the same pattern as carta-semana-deeplink.spec.ts test 5.
 */
async function openFirstStickerModal(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/album`, { waitUntil: "domcontentloaded" });

  // Wait for either the sticker grid (success) or a redirect to / (nickname not set).
  // If redirected, go through onboarding again and retry.
  const url = await page.waitForURL(
    (u) => u.pathname === "/album" || u.pathname === "/",
    { timeout: 15000 }
  ).then(() => page.url()).catch(() => page.url());

  if (new URL(url).pathname !== "/album") {
    // Re-run ensureNickname inline and try again
    const hasOnboarding = await page
      .waitForSelector("text=Saltar tutorial", { timeout: 8000 })
      .then(() => true)
      .catch(() => false);

    if (hasOnboarding) {
      await page.click("text=Saltar tutorial");
      await page.waitForSelector('input[aria-label="Ingresá tu nombre de jugador"]', { timeout: 8000 });
      const input = page.locator('input[aria-label="Ingresá tu nombre de jugador"]');
      await input.click();
      await input.pressSequentially("pw-bundle-b2", { delay: 50 });
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.waitFor({ state: "visible" });
      await submitBtn.click();
      await page.waitForURL((u) => u.pathname !== "/", { timeout: 12000 }).catch(() => {});
      await page.waitForLoadState("networkidle");
    }

    await page.goto(`${BASE}/album`, { waitUntil: "domcontentloaded" });
  }

  await page.waitForSelector('[data-testid="sticker-grid"]', { timeout: 40000 });

  const firstCard = page.locator('[data-sticker-pos-color]').first();
  await firstCard.waitFor({ state: "visible", timeout: 10000 });
  await firstCard.click();

  await page.waitForSelector('[data-testid="sticker-detail-modal"]', { timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Test 1 — No standalone name/team·position header (Anton 26px) in modal
// ---------------------------------------------------------------------------
test("StickerDetailModal has no redundant name/team/position header", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await openFirstStickerModal(page);

  const modal = page.locator('[data-testid="sticker-detail-modal"]');
  await expect(modal).toBeVisible();

  // The removed header was a div with fontFamily Anton and fontSize 26px containing the player name,
  // with a sibling div showing "{teamName} · {position}".
  // Check: no element with text matching " · Delantero" / "· Arquero" / "· Defensa" / "· Mediocampo"
  // that has a computed fontSize of 13px (the sub-line was 13px in the old header).
  // We simply assert the header block (which had marginTop: 20 as a flex container) is gone.
  //
  // Practical approach: count elements that contain " · " with position words AND have fontSize ≤ 14px.
  // The stats TABLE has rows like "Delantero" as a value, but not " · Delantero" as text.
  const posPatterns = ["· Delantero", "· Arquero", "· Defensa", "· Mediocampo"];

  for (const pattern of posPatterns) {
    const matches = modal.getByText(pattern, { exact: false });
    const count = await matches.count();
    if (count > 0) {
      // Verify it's not a standalone header div (old header had width: 100%, gap: 10, marginTop: 20)
      // The stats table row with "Posición" contains "Delantero" WITHOUT the " · " prefix.
      // So any " · Posición" pattern being present means the old header is still there.
      const first = matches.first();
      const tagName = await first.evaluate((el) => el.tagName.toLowerCase());
      // Old header sub-text was a <div>, not a table cell. Either way, this pattern
      // should only appear in the modal's header section (which we deleted).
      // Assert the element is NOT at position between card and table
      const parentIsHeader = await first.evaluate((el) => {
        // The old header had a parent flex div with justifyContent: center
        const parent = el.parentElement;
        if (!parent) return false;
        return window.getComputedStyle(parent).justifyContent === "center" &&
               window.getComputedStyle(parent).flexDirection !== "column";
      });
      expect(parentIsHeader).toBe(false);
    }
  }

  await page.screenshot({ path: path.join(SS_DIR, "modal-redesigned.png"), fullPage: false });
});

// ---------------------------------------------------------------------------
// Test 2 — CAMBIAR button has gold gradient + active:scale-95
// ---------------------------------------------------------------------------
test("CAMBIAR button has gold linear-gradient background", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await openFirstStickerModal(page);

  const cambiarBtn = page.locator('[data-testid="btn-cambiar"]');
  await expect(cambiarBtn).toBeVisible();

  const bg = await cambiarBtn.evaluate((el) => {
    return window.getComputedStyle(el).backgroundImage;
  });

  // Must contain a linear-gradient (gold foil)
  expect(bg).toContain("linear-gradient");

  // active:scale-95 class must be present (Tailwind press effect)
  const classList = await cambiarBtn.getAttribute("class");
  expect(classList).toContain("active:scale-95");

  await page.screenshot({ path: path.join(SS_DIR, "modal-active-press.png"), fullPage: false });
});

// ---------------------------------------------------------------------------
// Test 3 — Sumar repetida button has gold gradient when visible (count=1)
// ---------------------------------------------------------------------------
test("Sumar repetida button — gold gradient when count=1", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);
  await openFirstStickerModal(page);

  const sumarBtn = page.locator('[data-testid="btn-sumar-repetida"]');
  const isVisible = await sumarBtn.isVisible().catch(() => false);

  if (isVisible) {
    const bg = await sumarBtn.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });
    expect(bg).toContain("linear-gradient");

    const classList = await sumarBtn.getAttribute("class");
    expect(classList).toContain("active:scale-95");

    // Text color should be dark (#111111) on gold background
    const color = await sumarBtn.evaluate((el) => window.getComputedStyle(el).color);
    // rgb(17, 17, 17) = #111111
    expect(color).toBe("rgb(17, 17, 17)");
  } else {
    // count != 1 (0 or >=2) — confirm CAMBIAR still has gold (already tested above)
    const cambiarBtn = page.locator('[data-testid="btn-cambiar"]');
    const bg = await cambiarBtn.evaluate((el) => window.getComputedStyle(el).backgroundImage);
    expect(bg).toContain("linear-gradient");
    console.log("btn-sumar-repetida not visible (count != 1) — CAMBIAR gradient verified as proxy");
  }
});

// ---------------------------------------------------------------------------
// Test 4 — /perfil avatar renders (photo or initial)
// ---------------------------------------------------------------------------
test("/perfil renders avatar — photo or initial fallback", async ({ page }) => {
  ensureDir();
  await ensureNickname(page);

  await page.goto(`${BASE}/perfil`, { waitUntil: "networkidle" });

  // One of these two must be visible
  const photoAvatar = page.locator('[data-testid="avatar-photo"]');
  const initialAvatar = page.locator('[data-testid="avatar-initial"]');

  const hasPhoto = await photoAvatar.isVisible().catch(() => false);
  const hasInitial = await initialAvatar.isVisible().catch(() => false);

  // At least one must be shown
  expect(hasPhoto || hasInitial).toBe(true);

  if (hasPhoto) {
    const src = await photoAvatar.getAttribute("src");
    expect(src).toBeTruthy();
    const alt = await photoAvatar.getAttribute("alt");
    expect(alt).toBe("Profile photo");
    console.log("Google profile photo rendered:", src?.substring(0, 60));
  } else {
    console.log("No Google photo — initial avatar rendered (expected for test user without Firebase auth)");
    await expect(initialAvatar).toBeVisible();
  }

  await page.screenshot({ path: path.join(SS_DIR, "perfil-google-photo.png"), fullPage: false });
});

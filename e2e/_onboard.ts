/**
 * Shared onboarding helper for wishlist + related specs.
 *
 * Handles both cases:
 *   - Fresh IDB (first visit) → goes through tutorial + nickname flow
 *   - Existing nickname in IDB → app redirects directly to /album (skip tutorial)
 */

import type { Page } from "@playwright/test";

const DEFAULT_NICKNAME = "testuser";

export async function ensureOnboarded(
  page: Page,
  base: string,
  nickname: string = DEFAULT_NICKNAME
): Promise<void> {
  await page.goto(`${base}/`);

  // Race between tutorial appearing vs direct redirect to /album
  const result = await Promise.race([
    page
      .waitForSelector("text=Saltar tutorial", { timeout: 12000 })
      .then(() => "tutorial"),
    page.waitForURL(`${base}/album`, { timeout: 12000 }).then(() => "album"),
  ]).catch(() => "tutorial"); // fallback to attempting tutorial

  if (result === "tutorial") {
    // First-time onboarding
    await page.click("text=Saltar tutorial");
    await page.waitForSelector("input", { timeout: 8000 });
    await page.fill("input", nickname);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${base}/album`, { timeout: 10000 });
  }

  await page.waitForLoadState("networkidle");
}

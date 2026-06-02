import { test, expect } from "@playwright/test";
import { grantAccess } from "./_invite";

/**
 * whitelist-persistence — access granted via cookie persists across reload and new tab.
 */

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";

test.use({ viewport: { width: 390, height: 844 } });

test("granted access persists across reload", async ({ page }) => {
  await grantAccess(page, "test@example.com");

  // First visit — should not redirect to /login
  await page.goto(`${BASE}/album`);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

  // Reload — cookie should still be valid
  await page.reload();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
});

test("granted access persists in new tab (same context)", async ({ context }) => {
  const page1 = await context.newPage();
  await grantAccess(page1, "test@example.com");

  // Open second tab in same context — cookies are shared
  const page2 = await context.newPage();
  await page2.goto(`${BASE}/album`);
  await expect(page2).not.toHaveURL(/\/login/, { timeout: 10000 });

  await page1.close();
  await page2.close();
});

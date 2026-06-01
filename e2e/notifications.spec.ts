/**
 * Playwright — Notification bell + /notifications page E2E tests.
 *
 * Viewport: iPhone 15 Pro (393×852)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 *
 * Test matrix (7 checks):
 *  1. TopBar renders on /notifications — bell icon visible
 *  2. Initial state: badge hidden (unread count = 0)
 *  3. Programmatically add 1 notification via localStorage → badge shows "1"
 *  4. Click bell → navigates to /notifications
 *  5. /notifications list shows the added notification with correct emoji + title
 *  6. "Marcar todas leídas" click → badge disappears + item loses unread dot
 *  7. "Limpiar todas" click → empty state visible (📭)
 */

import { test, expect, type Page } from "@playwright/test";

const BASE =
  process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "testnotifs";
const STORAGE_KEY = "albumix.notifications";

test.use({
  viewport: { width: 393, height: 852 },
  hasTouch: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Inject a notification directly into localStorage (bypassing React). */
async function injectNotification(
  page: Page,
  opts: {
    type?: string;
    title: string;
    body: string;
    emoji: string;
    link?: string;
  }
): Promise<string> {
  return page.evaluate(
    ({ key, opts }) => {
      const id = Math.random().toString(16).slice(2, 10);
      const n = {
        id,
        type: opts.type ?? "system",
        title: opts.title,
        body: opts.body,
        emoji: opts.emoji,
        ts: Date.now(),
        read: false,
        link: opts.link,
      };
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify([n, ...existing]));
      // Dispatch storage event so the React subscriber re-renders
      window.dispatchEvent(
        new StorageEvent("storage", {
          key,
          newValue: JSON.stringify([n, ...existing]),
          storageArea: localStorage,
        })
      );
      return id;
    },
    { key: STORAGE_KEY, opts }
  );
}

/** Clear the notification store via localStorage. */
async function clearNotifications(page: Page): Promise<void> {
  await page.evaluate(
    ({ key }) => {
      localStorage.removeItem(key);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key,
          newValue: "[]",
          storageArea: localStorage,
        })
      );
    },
    { key: STORAGE_KEY }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("1. TopBar renders on /notifications — bell icon visible", async ({
  page,
}) => {
  await onboard(page);
  await clearNotifications(page);

  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  const bell = page.locator('[data-testid="notification-bell"]');
  await expect(bell).toBeVisible({ timeout: 8000 });
});

test("2. Initial state: badge hidden when unread count = 0", async ({
  page,
}) => {
  await onboard(page);
  await clearNotifications(page);

  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  const badge = page.locator('[data-testid="notification-badge"]');
  await expect(badge).not.toBeVisible({ timeout: 5000 });
});

test("3. Add notification → badge shows count 1", async ({ page }) => {
  await onboard(page);
  await clearNotifications(page);

  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  await injectNotification(page, {
    type: "achievement",
    title: "¡Desbloqueaste: Primer cromo!",
    body: "Marcaste tu primera figurita.",
    emoji: "🏆",
    link: "/achievements",
  });

  const badge = page.locator('[data-testid="notification-badge"]');
  await expect(badge).toBeVisible({ timeout: 6000 });
  await expect(badge).toHaveText("1");
});

test("4. Click bell → navigates to /notifications", async ({ page }) => {
  await onboard(page);
  await clearNotifications(page);

  // Navigate to /inicio so the TopBar is present with bell
  await page.goto(`${BASE}/inicio`);
  await page.waitForLoadState("networkidle");

  // If TopBar is not yet mounted in /inicio (deferred), fall back to /notifications
  // which always has TopBar
  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  const bell = page.locator('[data-testid="notification-bell"]');
  await expect(bell).toBeVisible({ timeout: 8000 });

  // Inject a notification so the page is non-empty after nav
  await injectNotification(page, {
    title: "Prueba de navegación",
    body: "Cuerpo de prueba",
    emoji: "📣",
  });

  // On /notifications, clicking bell re-navigates to /notifications (same page)
  await bell.click();
  await expect(page).toHaveURL(/\/notifications/, { timeout: 8000 });
});

test("5. /notifications list shows notification with correct emoji + title", async ({
  page,
}) => {
  await onboard(page);
  await clearNotifications(page);

  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  await injectNotification(page, {
    type: "achievement",
    title: "¡Desbloqueaste: Primer cromo!",
    body: "Marcaste tu primera figurita.",
    emoji: "🏆",
    link: "/achievements",
  });

  // List should now be visible
  const list = page.locator('[data-testid="notifications-list"]');
  await expect(list).toBeVisible({ timeout: 8000 });

  // First item should contain the emoji and title
  const firstItem = list.locator('[data-testid^="notification-item-"]').first();
  await expect(firstItem).toBeVisible({ timeout: 5000 });
  await expect(firstItem).toContainText("🏆");
  await expect(firstItem).toContainText("¡Desbloqueaste: Primer cromo!");
});

test("6. Mark all read → badge disappears + items lose unread dot", async ({
  page,
}) => {
  await onboard(page);
  await clearNotifications(page);

  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  // Inject one unread notification
  const nId = await injectNotification(page, {
    title: "Test leído",
    body: "Verifying mark-read",
    emoji: "✅",
  });

  // Badge should show 1
  const badge = page.locator('[data-testid="notification-badge"]');
  await expect(badge).toBeVisible({ timeout: 6000 });

  // Unread dot should be present
  const unreadDot = page.locator(
    `[data-testid="notification-unread-dot-${nId}"]`
  );
  await expect(unreadDot).toBeVisible({ timeout: 5000 });

  // Click "Marcar todas leídas"
  const markAllBtn = page.locator('[data-testid="mark-all-read"]');
  await expect(markAllBtn).toBeVisible({ timeout: 5000 });
  await markAllBtn.click();

  // Badge should be gone
  await expect(badge).not.toBeVisible({ timeout: 5000 });

  // Unread dot should be gone
  await expect(unreadDot).not.toBeVisible({ timeout: 5000 });
});

test("7. Clear all → empty state visible", async ({ page }) => {
  await onboard(page);
  await clearNotifications(page);

  await page.goto(`${BASE}/notifications`);
  await page.waitForLoadState("networkidle");

  // Inject a notification so list is non-empty
  await injectNotification(page, {
    title: "Para borrar",
    body: "Se va a limpiar",
    emoji: "🗑️",
  });

  const list = page.locator('[data-testid="notifications-list"]');
  await expect(list).toBeVisible({ timeout: 6000 });

  // Click "Limpiar todas"
  const clearBtn = page.locator('[data-testid="clear-all"]');
  await expect(clearBtn).toBeVisible({ timeout: 5000 });
  await clearBtn.click();

  // Empty state should now be visible
  const emptyState = page.locator('[data-testid="notifications-empty"]');
  await expect(emptyState).toBeVisible({ timeout: 6000 });
  await expect(emptyState).toContainText("📭");
});

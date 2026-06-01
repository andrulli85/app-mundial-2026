/**
 * Smoke test — lock-state UI on /once (Epic 2 Phase B)
 *
 * Strategy:
 *   1. grantAccess() — set valid HMAC invite cookie.
 *   2. Visit /once to trigger IDB creation (gets redirected to /).
 *   3. page.evaluate() to write nickname directly into IDB "profile" store.
 *   4. addInitScript to freeze Date, navigate to /once again — page loads.
 *   5. Assert banner text and Confirmar 11 visibility, take screenshot.
 *
 * Runs against LOCAL dev server (http://localhost:3001).
 * Screenshots saved to /tmp/once-lock-<state>.png.
 */

import { test, expect } from "@playwright/test";
import { grantAccess } from "./_invite";

const LOCAL = process.env.BASE_URL ?? "http://localhost:3001";

/** Freezes Date via addInitScript — must be called BEFORE page.goto(). */
function freezeDate(page: import("@playwright/test").Page, isoString: string) {
  return page.addInitScript((iso: string) => {
    const frozen = new Date(iso).getTime();
    const OrigDate = globalThis.Date;
    // @ts-expect-error: overriding global Date for test
    globalThis.Date = class extends OrigDate {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(frozen);
        } else {
          // @ts-expect-error spread
          super(...args);
        }
      }
      static now() { return frozen; }
      static parse = OrigDate.parse;
      static UTC = OrigDate.UTC;
    } as DateConstructor;
  }, isoString);
}

/**
 * Seeds a nickname in IndexedDB after IDB has been created by a prior page visit.
 * Uses page.evaluate() so it runs inside the browser context with full IDB access.
 */
async function seedNicknameViaEvaluate(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      // Discover the current DB version first
      const probe = indexedDB.open("mundial-2026");
      probe.onsuccess = () => {
        const version = probe.result.version;
        probe.result.close();

        // Re-open at that version (no upgrade triggered)
        const req = indexedDB.open("mundial-2026", version);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("profile")) {
            db.close();
            resolve(); // store not created yet — page will handle it
            return;
          }
          const tx = db.transaction("profile", "readwrite");
          tx.objectStore("profile").put({ key: "nickname", value: "TestPlayer" });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      };
      probe.onerror = () => reject(probe.error);
    });
  });
}

/** Wait for /once to fully render (h1 "Mi 11" heading visible = past spinner). */
async function waitForOnce(page: import("@playwright/test").Page) {
  await page.locator("h1").filter({ hasText: "Mi 11" }).waitFor({ state: "visible", timeout: 20_000 });
}

/**
 * Full setup for each test:
 *   a. Grant invite cookie
 *   b. Visit the root to trigger IDB creation (with a wait)
 *   c. Seed the nickname
 */
async function setupPage(page: import("@playwright/test").Page) {
  await grantAccess(page, "test@example.com");
  // Visit root — this creates IDB even if it redirects
  await page.goto(`${LOCAL}/`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000); // let IDB init complete
  // Seed nickname
  await seedNicknameViaEvaluate(page);
}

test.describe("once — lock-state UI (Epic 2 Phase B)", () => {
  test.setTimeout(120_000);

  test("before_tournament: banner 'Faltan' + Confirmar 11 visible", async ({ page }) => {
    await setupPage(page);
    await freezeDate(page, "2026-06-10T12:00:00Z");
    await page.goto(`${LOCAL}/once`);
    await waitForOnce(page);

    await expect(page.locator("text=/Faltan/i").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("confirmar-11")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Guardar borrador").first()).toBeVisible({ timeout: 5_000 });

    await page.screenshot({ path: "/tmp/once-lock-before_tournament.png" });
    console.log("Screenshot: /tmp/once-lock-before_tournament.png");
  });

  test("md1_to_md2_lock: banner 'bloqueado' + Confirmar 11 hidden + lock indicator", async ({ page }) => {
    await setupPage(page);
    await freezeDate(page, "2026-06-15T12:00:00Z");
    await page.goto(`${LOCAL}/once`);
    await waitForOnce(page);

    await expect(page.locator("text=/bloqueado/i").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("confirmar-11")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=/11 bloqueado/i").first()).toBeVisible({ timeout: 5_000 });

    await page.screenshot({ path: "/tmp/once-lock-md1_to_md2_lock.png" });
    console.log("Screenshot: /tmp/once-lock-md1_to_md2_lock.png");
  });

  test("md2_unlock_window: banner 'Ventana' + Confirmar 11 visible", async ({ page }) => {
    await setupPage(page);
    await freezeDate(page, "2026-06-19T00:30:00Z");
    await page.goto(`${LOCAL}/once`);
    await waitForOnce(page);

    await expect(page.locator("text=/[Vv]entana/i").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("confirmar-11")).toBeVisible({ timeout: 5_000 });

    await page.screenshot({ path: "/tmp/once-lock-md2_unlock_window.png" });
    console.log("Screenshot: /tmp/once-lock-md2_unlock_window.png");
  });
});

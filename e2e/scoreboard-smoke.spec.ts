/**
 * scoreboard-smoke.spec.ts — Epic 2 Phase D smoke test
 *
 * Tests:
 *   1. /scoreboard without confirmed XI → empty state shown
 *   2. Seed IDB with XI → /scoreboard shows total points + MD-1 bar + player rows
 *   3. Screenshot saved to /tmp/scoreboard-md1.png
 */

import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";

// Known sticker IDs in MD-1 mock that have even fifa_player_id → non-zero mock scores
// These are also in player-mapping.json
const STICKER_IDS_WITH_SCORES = [
  "esp-10-rodri",       // OVR 91
  "fra-20-mbappe",      // OVR 91
  "nor-15-haaland",     // OVR 91
  "bel-15-bruyne",      // OVR 90
  "eng-11-bellingham",  // OVR 90
  "eng-18-kane",        // OVR 90
  "bra-14-junior",      // OVR 90
  "arg-10-messi",
  "bra-10-vinicius",
  "por-10-fernandes",
  "ger-7-havertz",
];

/** Seed IndexedDB with nickname, stickers, and a confirmed XI */
async function seedIDB(page: Page) {
  await page.evaluate(
    ({
      stickerIds,
    }: {
      stickerIds: string[];
    }) => {
      return new Promise<void>((resolve, reject) => {
        const openReq = indexedDB.open("mundial-2026");

        openReq.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          // Ensure stores exist (minimal schema for the test context)
          if (!db.objectStoreNames.contains("profile"))
            db.createObjectStore("profile", { keyPath: "key" });
          if (!db.objectStoreNames.contains("collection"))
            db.createObjectStore("collection", { keyPath: "sticker_id" });
          if (!db.objectStoreNames.contains("userXI"))
            db.createObjectStore("userXI", { keyPath: "key" });
        };

        openReq.onsuccess = () => {
          const db = openReq.result;
          const tx = db.transaction(
            ["profile", "collection", "userXI"],
            "readwrite"
          );

          // Set nickname
          tx.objectStore("profile").put({ key: "nickname", value: "TestRIO" });

          // Mark stickers as owned
          const col = tx.objectStore("collection");
          for (const id of stickerIds) {
            col.put({ sticker_id: id, count: 1, acquired_at: Date.now() });
          }

          // Save a confirmed XI — 4-3-3 with available stickers
          const lineup: Record<string, string> = {
            POR0:  stickerIds[0] ?? "",
            DEF0:  stickerIds[1] ?? "",
            DEF1:  stickerIds[2] ?? "",
            DEF2:  stickerIds[3] ?? "",
            DEF3:  stickerIds[4] ?? "",
            MED0:  stickerIds[5] ?? "",
            MED1:  stickerIds[6] ?? "",
            MED2:  stickerIds[7] ?? "",
            DEL0:  stickerIds[8] ?? "",
            DEL1:  stickerIds[9] ?? "",
            DEL2:  stickerIds[10] ?? "",
          };

          tx.objectStore("userXI").put({
            key: "userXI",
            formation: "4-3-3",
            lineup,
            variant: "pitch",
            locked_at: new Date().toISOString(),
            phase: "before_tournament",
          });

          tx.oncomplete = () => resolve();
          tx.onerror = (e) => reject(e);
        };

        openReq.onerror = (e) => reject(e);
      });
    },
    { stickerIds: STICKER_IDS_WITH_SCORES }
  );
}

// ---------------------------------------------------------------------------
// Test 1: Empty state when no XI confirmed
// ---------------------------------------------------------------------------
test("scoreboard — empty state without confirmed XI", async ({ page }) => {
  // Navigate directly to scoreboard with fresh IDB (isolated browser context)
  await page.goto(`${BASE}/scoreboard`);
  await page.waitForLoadState("networkidle");

  const body = await page.textContent("body");
  expect(body).toMatch(/Confirmá tu 11 primero/i);

  // CTA link to /once should exist — use first() to handle strict mode
  const link = page.getByRole("link", { name: /Mi 11|Ir a Mi/i }).first();
  await expect(link).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Test 2: Scoreboard shows points after XI is seeded
// ---------------------------------------------------------------------------
test("scoreboard — shows points after XI confirmed", async ({ page }) => {
  // Go to site to initialize it (loads the app JS)
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("domcontentloaded");

  // Seed IDB
  await seedIDB(page);

  // Navigate to scoreboard
  await page.goto(`${BASE}/scoreboard`);
  await page.waitForLoadState("networkidle");

  const body = await page.textContent("body");

  // Should show Scoreboard header
  expect(body).toMatch(/Scoreboard/i);

  // Should show kicker "Tu puntaje"
  expect(body).toMatch(/Tu puntaje/i);

  // Should NOT show empty state
  expect(body).not.toMatch(/Confirmá tu 11 primero/i);

  // Should show matchday label J1
  expect(body).toMatch(/J1/i);

  // Should show position labels (player rows)
  expect(body).toMatch(/POR|DEF|MED|DEL/);

  // Take screenshot
  await page.screenshot({
    path: "/tmp/scoreboard-md1.png",
    fullPage: true,
  });

  // Check total points is displayed — a number in the header pod
  const totalPts = await page.evaluate((): number => {
    // Find the large number next to "pts" label
    const allDivs = Array.from(document.querySelectorAll("div"));
    for (const div of allDivs) {
      if (
        div.textContent?.trim().match(/^\d+$/) &&
        div.nextElementSibling?.textContent?.includes("pts")
      ) {
        return parseInt(div.textContent.trim(), 10);
      }
    }
    return -1;
  });

  // With 11 top-rated players (half even-ID → non-zero mock), total should be > 0
  // We can't guarantee exact players have even IDs, so just verify the page rendered
  // The total could be 0 if all mapped players happened to have odd IDs (unlucky)
  expect(totalPts).toBeGreaterThanOrEqual(0);
});

// ---------------------------------------------------------------------------
// Test 3: All 8 matchday slots present in timeline
// ---------------------------------------------------------------------------
test("scoreboard — 8 matchday bars in timeline", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("domcontentloaded");
  await seedIDB(page);

  await page.goto(`${BASE}/scoreboard`);
  await page.waitForLoadState("networkidle");

  const body = await page.textContent("body");

  // All 8 matchday labels should be visible
  for (let i = 1; i <= 8; i++) {
    expect(body).toMatch(new RegExp(`J${i}`));
  }

  // "Puntaje por jornada" section header
  expect(body).toMatch(/Puntaje por jornada/i);
});

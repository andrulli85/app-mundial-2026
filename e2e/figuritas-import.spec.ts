import { test, expect } from "@playwright/test";

// Use the lemon alias which hosts the latest build with /import live
const BASE = "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "testimport";

const FIGURITAS_INPUT = `Figuritas App - Lista
Usa Méx Can 26
Me faltan
FWC 🏆: 1
FWC 🌎: 8
FWC 📜: 9, 10, 11, 14, 15, 17, 18
MEX 🇲🇽: 1, 2, 5, 6, 10, 12, 14, 17, 19, 20
RSA 🇿🇦: 2, 3, 6, 7, 9, 10, 11, 13, 14, 18
KOR 🇰🇷: 1, 4, 11, 14, 16, 20
CZE 🇨🇿: 1, 3, 6, 8, 9, 10, 12, 14, 15, 16, 17
CAN 🇨🇦: 1, 2, 4, 6, 8, 13, 14, 16, 17
BIH 🇧🇦: 1, 3, 4, 6, 7, 8, 10, 12, 13, 17, 19, 20
QAT 🇶🇦: 2, 4, 6, 8, 9, 12, 15, 17, 18
SUI 🇨🇭: 1, 2, 3, 4, 6, 7, 8, 9, 13, 14, 15, 20
BRA 🇧🇷: 3, 5, 6, 9, 10, 11, 12, 15, 17, 18, 19, 20
MAR 🇲🇦: 1, 2, 4, 6, 8, 9, 10, 11, 13, 17, 19
HAI 🇭🇹: 1, 3, 4, 7, 8, 11, 12, 13, 16, 17, 20
SCO 🏴󠁧󠁢󠁳󠁣󠁴󠁿: 1, 2, 4, 7, 8, 9, 11, 12, 16, 17, 20
USA 🇺🇸: 1, 2, 5, 6, 10, 11, 12, 13, 14, 15, 18
PAR 🇵🇾: 1, 2, 6, 7, 10, 14, 15, 19
AUS 🇦🇺: 3, 4, 7, 9, 11, 14
GER 🇩🇪: 2, 3, 4, 6, 7, 8, 10, 11, 13, 15, 17, 20
CUW 🇨🇼: 1, 3, 6, 12, 13, 15, 16, 17, 18, 19
CIV 🇨🇮: 2, 5, 9, 10, 12, 14, 15, 20
ECU 🇪🇨: 6, 8, 10, 12, 15, 17, 19
NED 🇳🇱: 4, 8, 12, 18
JPN 🇯🇵: 1, 13, 19
SWE 🇸🇪: 1, 5, 6, 8, 12, 14, 16, 18, 20
TUN 🇹🇳: 1, 2, 13, 14, 15, 18, 19, 20
BEL 🇧🇪: 1, 2, 3, 6, 8, 10, 13, 14, 16, 17, 18, 20
EGY 🇪🇬: 5, 9, 10, 15, 17, 19
IRN 🇮🇷: 1, 2, 5, 14, 18, 20
NZL 🇳🇿: 1, 3, 5, 7, 9, 11, 14, 16, 18, 20
ESP 🇪🇸: 4, 5, 8, 9, 10, 13, 14, 16, 18, 19
CPV 🇨🇻: 3, 4, 5, 6, 9, 12, 13, 14, 15, 16, 17, 18
KSA 🇸🇦: 1, 2, 4, 5, 6, 8, 9, 11, 12, 17, 18, 19
URU 🇺🇾: 1, 3, 4, 7, 8, 11, 15, 17
FRA 🇫🇷: 1, 2, 7, 8, 11, 12, 13, 15, 17, 18, 19
SEN 🇸🇳: 1, 2, 4, 5, 6, 8, 9, 11, 12, 14, 16, 17, 18, 20
IRQ 🇮🇶: 2, 3, 7, 8, 10, 11, 12, 15, 16, 17, 19, 20
ARG 🇦🇷: 1, 6, 8, 9, 10, 12, 14, 15, 17, 18, 19
ALG 🇩🇿: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 19, 20
AUT 🇦🇹: 2, 3, 4, 6, 7, 8, 10, 11, 12, 16, 17, 20
JOR 🇯🇴: 1, 2, 3, 4, 11
POR 🇵🇹: 6, 7, 8, 10, 11, 15, 16, 19, 20
COD 🇨🇩: 1, 2, 3, 4, 5, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20
UZB 🇺🇿: 3, 5, 7, 12, 13, 15
COL 🇨🇴: 3, 7, 8, 11, 17, 19
ENG 🏴󠁧󠁢󠁥󠁮󠁧󠁿: 2, 6, 8, 10, 15, 18
CRO 🇭🇷: 2, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 18, 19, 20
GHA 🇬🇭: 1, 2, 4, 6, 8, 9, 10, 12, 13, 14, 15, 17, 19
PAN 🇵🇦: 2, 3, 4, 6, 7, 8, 11, 12, 13, 16, 17, 20

Descarga la app
https://www.figuritas.app/es/descargar`;

/** Read a sticker entry from IndexedDB inside page context */
async function getIDBSticker(
  page: import("@playwright/test").Page,
  stickerId: string
): Promise<{ sticker_id: string; count: number; acquired_at: number } | null> {
  return page.evaluate((id: string) => {
    return new Promise<{ sticker_id: string; count: number; acquired_at: number } | null>((resolve) => {
      const req = indexedDB.open("mundial-2026", 1);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("collection", "readonly");
        const get = tx.objectStore("collection").get(id);
        get.onsuccess = () => resolve(get.result ?? null);
        get.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  }, stickerId);
}

/** Write a sticker entry directly to IndexedDB */
async function setIDBSticker(
  page: import("@playwright/test").Page,
  stickerId: string,
  count: number
): Promise<void> {
  await page.evaluate(
    ({ id, cnt }: { id: string; cnt: number }) => {
      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("mundial-2026", 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("collection", "readwrite");
          tx.objectStore("collection").put({
            sticker_id: id,
            count: cnt,
            acquired_at: Date.now(),
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(new Error("IDB write failed"));
        };
        req.onerror = () => reject(new Error("IDB open failed"));
      });
    },
    { id: stickerId, cnt: count }
  );
}

test.describe("Figuritas import — Overwrite Limpio E2E", () => {
  test(
    "full import flow: onboard → mark MEX-5 → import → verify overwrite",
    async ({ page }) => {
      // Step 1: Navigate to /, skip tutorial, enter nickname
      await page.goto(`${BASE}/`);
      // Wait for tutorial slide (has "Saltar tutorial" button)
      await page.waitForSelector("text=Saltar tutorial", { timeout: 15000 });
      await page.click("text=Saltar tutorial");

      // Nickname input form appears
      await page.waitForSelector("input", { timeout: 8000 });
      await page.fill("input", NICKNAME);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE}/album`, { timeout: 10000 });
      console.log("Step 1: Onboarded, at /album");

      // Step 2: Set MEX-5 count=1 (simulates prior manual mark before import)
      await setIDBSticker(page, "mex-5-montes", 1);
      const mex5Before = await getIDBSticker(page, "mex-5-montes");
      console.log("MEX-5 before import:", JSON.stringify(mex5Before));
      expect(mex5Before?.count).toBe(1);

      // Step 3: Navigate via settings → import link
      await page.goto(`${BASE}/settings`);
      await page.waitForSelector("text=Importar desde otra app", { timeout: 8000 });
      await page.click("text=Importar desde otra app");
      await page.waitForURL(`${BASE}/import`, { timeout: 8000 });
      console.log("Step 3: At /import via settings link");

      // Step 4: Paste Andy's full list
      await page.waitForSelector("textarea#figuritas-text", { timeout: 8000 });
      await page.fill("textarea#figuritas-text", FIGURITAS_INPUT);

      // Step 5: Tap Parsear lista — wait for preview
      await page.click("button:has-text('Parsear lista')");
      await page.waitForSelector("text=Resumen de la importación", { timeout: 15000 });
      console.log("Step 5: Preview shown");

      // Preview should contain our validated missing count (448)
      const previewText = await page.locator("text=Resumen de la importación").locator("../..").textContent();
      console.log("Preview text:", previewText?.trim().slice(0, 400));
      expect(previewText).toContain("448");

      // Step 6: Confirm import
      await page.click("button:has-text('Confirmar e importar')");
      await page.waitForURL(`${BASE}/album**`, { timeout: 20000 });
      console.log("Step 6: Confirmed — at /album");

      // Step 7: MEX-5 was in Andy's missing list → must now be count=0
      const mex5After = await getIDBSticker(page, "mex-5-montes");
      console.log("MEX-5 after import:", JSON.stringify(mex5After));
      expect(mex5After?.count).toBe(0);

      // Step 8: MEX-3 is NOT in Andy's missing list → must be count=1
      const mex3After = await getIDBSticker(page, "mex-3-vasquez");
      console.log("MEX-3 after import:", JSON.stringify(mex3After));
      expect(mex3After?.count).toBe(1);

      // Step 9: MEX-4 is NOT in Andy's missing list → must be count=1
      const mex4After = await getIDBSticker(page, "mex-4-sanchez");
      console.log("MEX-4 after import:", JSON.stringify(mex4After));
      expect(mex4After?.count).toBe(1);

      console.log("All E2E assertions passed — Overwrite Limpio verified.");
    }
  );
});

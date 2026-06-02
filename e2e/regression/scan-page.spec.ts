/**
 * CV Scan Page — regression spec.
 *
 * Validates the "📸 Escanear página" flow on /album:
 *   1. Scan button visible on /album
 *   2. Clicking button triggers file picker (modal opens via synthetic file injection)
 *   3. Mock /api/scan-page returns 5 filled ARG stickers out of 16
 *   4. Results modal shows correct count summary
 *   5. "Sí, marcarlas" CTA is visible and clickable
 *   6. Screenshot saved to /tmp/albumix-scan.png
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   prod (BASE_URL or default lemon alias)
 *
 * Note: actual file upload is skipped (no camera in CI headless).
 * The spec injects a minimal 1×1 JPEG blob via DataTransfer to simulate selection.
 */

import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

const BASE = process.env.BASE_URL ?? "https://albumix-app.vercel.app";
const NICKNAME = "TestScan";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureNickname(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${BASE}/`);

  const destination = await Promise.race([
    page.waitForSelector("text=Saltar tutorial", { timeout: 14000 }).then(() => "tutorial"),
    page.waitForURL(`${BASE}/inicio`, { timeout: 14000 }).then(() => "inicio"),
    page.waitForURL(`${BASE}/album`, { timeout: 14000 }).then(() => "album"),
  ]).catch(() => "tutorial");

  if (destination === "tutorial") {
    await page.click("text=Saltar tutorial");
    await page.waitForSelector("input", { timeout: 8000 });
    await page.fill("input", NICKNAME);
    await page.click('button[type="submit"]');
    await Promise.race([
      page.waitForURL(`${BASE}/inicio`, { timeout: 12000 }),
      page.waitForURL(`${BASE}/album`, { timeout: 12000 }),
    ]);
  }

  await page.waitForLoadState("networkidle");
}

// 16-slot mock response: first 5 filled (ARG), rest empty
const MOCK_SCAN_RESPONSE = {
  team_code: "ARG",
  grid: { cols: 4, rows: 4 },
  detections: Array.from({ length: 16 }, (_, i) => ({
    slot: i + 1,
    filled: i < 5,
    confidence: 0.9,
  })),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("scan-page: button visible on /album", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");

  const scanBtn = page.getByTestId("scan-page-btn");
  await expect(scanBtn).toBeVisible({ timeout: 10000 });
  await expect(scanBtn).toContainText("Escanear");
});

test("scan-page: modal opens and results show correct count", async ({ page }) => {
  await ensureNickname(page);

  // Intercept the API before navigating so the route is registered early
  await page.route("**/api/scan-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SCAN_RESPONSE),
    })
  );

  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");

  // 1. Scan button visible
  const scanBtn = page.getByTestId("scan-page-btn");
  await expect(scanBtn).toBeVisible({ timeout: 10000 });

  // 2. Click button — in headless we can't trigger native file picker.
  //    Instead we programmatically fire a synthetic change event on the hidden input
  //    after clicking the button (which shows the modal in preview state).
  //    We inject a minimal valid JPEG (1×1 pixel) as a Blob.
  await scanBtn.click();

  // Inject a synthetic 1×1 JPEG into the hidden file input
  const injected = await page.evaluate(async () => {
    // Minimal JPEG magic bytes — 1×1 white pixel
    const jpegBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
      0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
      0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
      0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
      0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
      0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
      0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
      0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
      0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
      0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
      0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
      0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
      0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
      0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
      0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
      0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd3, 0xff, 0xd9,
    ]);
    const blob = new Blob([jpegBytes], { type: "image/jpeg" });
    const file = new File([blob], "test-page.jpg", { type: "image/jpeg" });

    const input = document.querySelector('[data-testid="scan-file-input"]') as HTMLInputElement;
    if (!input) return "input_not_found";

    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, "files", { value: dt.files, configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return "ok";
  });

  expect(injected).toBe("ok");

  // 3. Preview modal should be open
  const modal = page.getByTestId("scan-modal");
  await expect(modal).toBeVisible({ timeout: 6000 });

  // 4. Submit scan
  const submitBtn = page.getByTestId("scan-submit-btn");
  await expect(submitBtn).toBeVisible({ timeout: 5000 });
  await submitBtn.click();

  // 5. Results should show — wait for confirm button
  const confirmBtn = page.getByTestId("scan-confirm-btn");
  await expect(confirmBtn).toBeVisible({ timeout: 15000 });

  // 6. Verify count text shows "5 figuritas"
  await expect(modal).toContainText("5 figuritas");

  // 7. Screenshot
  await page.screenshot({ path: "/tmp/albumix-scan.png", fullPage: false });
});

test("scan-page: confirm CTA applies stickers and shows done state", async ({ page }) => {
  await ensureNickname(page);

  await page.route("**/api/scan-page", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SCAN_RESPONSE),
    })
  );

  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");

  // Inject file
  await page.getByTestId("scan-page-btn").click();
  await page.evaluate(async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
    const file = new File([blob], "page.jpg", { type: "image/jpeg" });
    const input = document.querySelector('[data-testid="scan-file-input"]') as HTMLInputElement;
    if (!input) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, "files", { value: dt.files, configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await page.getByTestId("scan-submit-btn").click();
  await page.getByTestId("scan-confirm-btn").click({ timeout: 15000 });

  // Should reach done state — "Escanear otra página" visible
  const anotherBtn = page.getByTestId("scan-another-btn");
  await expect(anotherBtn).toBeVisible({ timeout: 8000 });
});

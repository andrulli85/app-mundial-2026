import { test, expect } from "@playwright/test";
import { grantAccess } from "../_invite";

/**
 * Design Fase 1 regression spec (2026-06-01).
 *
 * Validates all Fase 1 changes against prod:
 *  1. /inicio: "CARTA DE LA SEMANA" present; "SOBRE LEGENDARIO" + "ABRIR SOBRE" absent
 *  2. /inicio: No coins pill in topbar; bell badge still present
 *  3. /inicio: "Arma tu 11" present; "Arma tu once" absent
 *  4. /inicio: "ÚLTIMOS PUNTOS" section + "+214" + "R. Santos" + "+34"
 *  5. /album: chip strip = Todos / Países / Grupos / Especiales / Favoritas (5 chips)
 *  6. /album: Hologramas / Campeones / Doradas / Legendario chips NOT visible
 *  7. /album: "Escanear página" button NOT visible
 *  8. BottomNav order: Inicio · Mercado · Álbum · Mi 11 · Perfil; Álbum is center
 *  9. Screenshots → /tmp/albumix-fase1-inicio.png + /tmp/albumix-fase1-album.png
 *
 * Viewport: iPhone 15 (390×844)
 * Target:   https://app-mundial-2026-lemon.vercel.app
 */

const BASE = process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app";
const NICKNAME = "Fase1";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function ensureNickname(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${BASE}/`);

  const hasOnboarding = await page
    .waitForSelector("text=Saltar tutorial", { timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (!hasOnboarding) {
    return;
  }

  await page.click("text=Saltar tutorial");
  await page.waitForSelector("input", { timeout: 8000 });
  await page.fill("input", NICKNAME);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/#") && url.pathname !== "/", {
    timeout: 12000,
  });
  await page.waitForLoadState("networkidle");
}

// ── /inicio assertions ────────────────────────────────────────────────────────

test("/inicio — Carta de la semana hero + no sobres", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/inicio`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('[data-testid="home-dark-root"]', { timeout: 12000 });

  // "CARTA DE LA SEMANA" hero present
  await expect(page.getByText("CARTA DE LA SEMANA")).toBeVisible({ timeout: 8000 });

  // "SOBRE LEGENDARIO" / "ABRIR SOBRE" NOT present (count = 0)
  expect(await page.getByText("SOBRE LEGENDARIO").count()).toBe(0);
  expect(await page.getByText("ABRIR SOBRE").count()).toBe(0);

  // Screenshot
  await page.screenshot({ path: "/tmp/albumix-fase1-inicio.png", fullPage: false });
});

test("/inicio — no coins pill + bell badge stays", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/inicio`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('[data-testid="home-dark-root"]', { timeout: 12000 });

  // Coins pill gone
  expect(await page.locator('[data-testid="topbar-coins"]').count()).toBe(0);

  // Bell badge still present (mockCount = 3 on /inicio)
  await expect(page.locator('[data-testid="bell-badge"]')).toBeVisible({ timeout: 8000 });
});

test("/inicio — Arma tu 11 card (once→11 rename)", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/inicio`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('[data-testid="once-card"]', { timeout: 12000 });

  const onceCard = page.getByTestId("once-card");
  await expect(onceCard).toBeVisible();

  const cardText = await onceCard.textContent() ?? "";
  expect(cardText).toContain("Arma tu 11");
  expect(cardText).not.toContain("Arma tu once");
});

test("/inicio — Últimos puntos section with +214, R. Santos, +34", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/inicio`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('[data-testid="ultimos-puntos-section"]', { timeout: 12000 });

  const section = page.getByTestId("ultimos-puntos-section");
  await expect(section).toBeVisible();

  // +214 total
  await expect(page.getByTestId("ultimos-puntos-total")).toBeVisible();
  const totalText = await page.getByTestId("ultimos-puntos-total").textContent() ?? "";
  expect(totalText).toContain("214");

  // Top scorer R. Santos
  await expect(page.getByTestId("player-name-rs")).toBeVisible();
  const rsName = await page.getByTestId("player-name-rs").textContent() ?? "";
  expect(rsName).toContain("R. Santos");

  // Points +34
  await expect(page.getByTestId("player-pts-rs")).toBeVisible();
  const rsPts = await page.getByTestId("player-pts-rs").textContent() ?? "";
  expect(rsPts).toContain("34");
});

// ── /album assertions ─────────────────────────────────────────────────────────

test("/album — 5 chips: Todos, Países, Grupos, Especiales, Favoritas", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('[data-testid="category-chips"]', { timeout: 12000 });

  const chips = page.getByTestId("category-chips");
  await expect(chips).toBeVisible();

  const chipsText = await chips.textContent() ?? "";

  // Required chips
  expect(chipsText).toContain("Todos");
  expect(chipsText).toContain("Países");
  expect(chipsText).toContain("Grupos");
  expect(chipsText).toContain("Especiales");
  expect(chipsText).toContain("Favoritas");

  // Removed chips
  expect(chipsText).not.toContain("Hologramas");
  expect(chipsText).not.toContain("Campeones");
  expect(chipsText).not.toContain("Doradas");
  // "Legendario" text should not appear as a chip (renamed to Favoritas)
  expect(chipsText).not.toContain("Legendario");
});

test("/album — Escanear página button NOT visible", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/album`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector('[data-testid="category-chips"]', { timeout: 12000 });

  // "Escanear página" button should not be visible (feature-flagged behind env var)
  const scanBtnCount = await page.getByText("Escanear página").count();
  expect(scanBtnCount).toBe(0);

  // Screenshot
  await page.screenshot({ path: "/tmp/albumix-fase1-album.png", fullPage: false });
});

// ── BottomNav order assertion ─────────────────────────────────────────────────

test("BottomNav Fase 1 order: Inicio · Mercado · Álbum · Mi 11 · Perfil", async ({ page }) => {
  await ensureNickname(page);
  await page.goto(`${BASE}/album`);
  await page.waitForSelector("nav[aria-label='Navegación principal']", { timeout: 15000 });

  const nav = page.locator("nav[aria-label='Navegación principal']");
  await expect(nav).toBeVisible();

  // Verify all 5 tabs present
  await expect(nav.getByText("Inicio")).toBeVisible();
  await expect(nav.getByText("Mercado")).toBeVisible();
  await expect(nav.getByText("Álbum")).toBeVisible();
  await expect(nav.getByText("Mi 11")).toBeVisible();
  await expect(nav.getByText("Perfil")).toBeVisible();

  // Verify order by extracting text content of the entire nav
  // Tabs should appear in DOM order: Inicio, Mercado, Álbum, Mi 11, Perfil
  const navItems = await nav.locator("span.text-\\[0\\.6rem\\]").allTextContents();
  // Filter to visible labels (some spans are emojis, skip those)
  const labels = navItems.filter((t) => t.trim().length > 1);
  const inicioIdx = labels.findIndex((t) => t.includes("Inicio"));
  const mercadoIdx = labels.findIndex((t) => t.includes("Mercado"));
  const albumIdx = labels.findIndex((t) => t.includes("Álbum"));
  const mi11Idx = labels.findIndex((t) => t.includes("Mi 11"));
  const perfilIdx = labels.findIndex((t) => t.includes("Perfil"));

  expect(inicioIdx).toBeGreaterThanOrEqual(0);
  expect(mercadoIdx).toBeGreaterThan(inicioIdx);
  expect(albumIdx).toBeGreaterThan(mercadoIdx);
  expect(mi11Idx).toBeGreaterThan(albumIdx);
  expect(perfilIdx).toBeGreaterThan(mi11Idx);

  // "Mi Once" label is gone from nav
  expect(await nav.getByText("Mi Once").count()).toBe(0);
});

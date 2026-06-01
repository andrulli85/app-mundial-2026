import { defineConfig } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.test manually (no dotenv dep) so the _invite.ts helper can
// compute valid HMACs against the same secret that is deployed to Vercel.
const envTestPath = resolve(__dirname, ".env.test");
if (existsSync(envTestPath)) {
  for (const line of readFileSync(envTestPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    // Don't overwrite values already set in the environment (CI sets them explicitly)
    if (!process.env[key]) process.env[key] = val;
  }
}

export default defineConfig({
  /**
   * testDir is the root — Playwright discovers all *.spec.ts files recursively.
   * This covers:
   *   e2e/*.spec.ts            — existing feature smoke tests
   *   e2e/regression/*.spec.ts — regression suite (full-flow, toggle-cycle, search-spanish)
   */
  testDir: "./e2e",
  timeout: 60000,
  use: {
    baseURL: process.env.BASE_URL ?? "https://app-mundial-2026-lemon.vercel.app",
    headless: true,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
  // Inject whitelist test env vars so _invite.ts helper can compute valid HMACs.
  // ALBUMIX_INVITE_SECRET must match what is set in the test/CI environment.
  // The default "test-secret-32-bytes-long-padding" is used when the env is absent.
});

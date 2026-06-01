import { defineConfig } from "@playwright/test";

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
});

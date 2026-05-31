#!/usr/bin/env node
/**
 * inject-sw-version.mjs
 *
 * Reads public/sw.template.js, replaces the __CACHE_VERSION__ placeholder with
 * a build-specific token, and writes the result to public/sw.js.
 *
 * Version resolution order:
 *   1. VERCEL_GIT_COMMIT_SHA (first 8 chars) — set automatically by Vercel
 *   2. NEXT_PUBLIC_BUILD_ID — custom env var if you want manual control
 *   3. Date.now().toString(36) — local fallback
 *
 * public/sw.js is gitignored — only the template is committed.
 *
 * Usage: node scripts/inject-sw-version.mjs
 * Runs automatically as the "prebuild" npm script.
 */

import { readFile, writeFile } from "node:fs/promises";

// --- KNOWN_FLAGS whitelist (exit 2 on unknown flag per Andy's rule) ---
const KNOWN_FLAGS = new Set([]); // this script accepts no CLI flags
const unknownFlags = process.argv.slice(2).filter((a) => !KNOWN_FLAGS.has(a));
if (unknownFlags.length > 0) {
  console.error(
    `[inject-sw-version] FATAL: unknown flag(s): ${unknownFlags.join(", ")}`
  );
  process.exit(2);
}

const TEMPLATE_PATH = "public/sw.template.js";
const SW_PATH = "public/sw.js";

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  Date.now().toString(36);

const template = await readFile(TEMPLATE_PATH, "utf8");
const output = template.replace(/__CACHE_VERSION__/g, buildId);

if (template === output) {
  console.warn(
    `[inject-sw-version] WARNING: no __CACHE_VERSION__ marker found in ${TEMPLATE_PATH} — sw.js written unchanged`
  );
} else {
  console.log(`[inject-sw-version] CACHE_VERSION → ${buildId}`);
}

await writeFile(SW_PATH, output);
console.log(`[inject-sw-version] wrote ${SW_PATH}`);

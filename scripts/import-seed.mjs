/**
 * scripts/import-seed.mjs
 *
 * Reads seed-manifest.json (Stream B canonical output) and copies + Sharp-compresses
 * the cropped JPEGs from seed-cropped/ to public/stickers/seed/{sticker_id}.jpg,
 * then writes public/stickers/seed-manifest.json for the app to consume.
 *
 * Source:  /Users/Andy/Desktop/mission-control/tools/scripts/mundial-2026-visuals/seed-manifest.json
 * Cropped: /Users/Andy/Desktop/mission-control/tools/scripts/mundial-2026-visuals/seed-cropped/
 * Output:  public/stickers/seed/{sticker_id}.jpg
 *          public/stickers/seed-manifest.json  { sticker_id → filename }
 *
 * Only entries with crop_status="auto" and an existing cropped source file are processed.
 * Entries with crop_status="manual_pending" are written to seed-manifest.json with
 * crop_status="manual_pending" so incremental re-runs can pick them up later.
 *
 * Usage:
 *   node scripts/import-seed.mjs
 *   node scripts/import-seed.mjs --dry-run   # prints mapping without copying files
 *
 * Known flags: --dry-run, --help
 * Unknown flags: FATAL exit 2 (per Mission Control CLI convention)
 */

import { existsSync, mkdirSync, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// --- Flag validation (unknown flags = exit 2) ---
const KNOWN_FLAGS = new Set(["--dry-run", "--help"]);
const args = process.argv.slice(2);
for (const arg of args) {
  if (!KNOWN_FLAGS.has(arg)) {
    console.error(`ERROR: Unknown flag: ${arg}`);
    console.error(`Known flags: ${[...KNOWN_FLAGS].join(", ")}`);
    process.exit(2);
  }
}

const DRY_RUN = args.includes("--dry-run");
const HELP = args.includes("--help");

if (HELP) {
  console.log(`
import-seed.mjs — Copy and compress Panini seed sticker photos (Stream B manifest)

Usage:
  node scripts/import-seed.mjs [--dry-run]

Flags:
  --dry-run   Print mapping without copying files or generating manifest
  --help      Show this help

Source manifest: /Users/Andy/Desktop/mission-control/tools/scripts/mundial-2026-visuals/seed-manifest.json
Cropped source:  /Users/Andy/Desktop/mission-control/tools/scripts/mundial-2026-visuals/seed-cropped/
Output:          public/stickers/seed/{sticker_id}.jpg
                 public/stickers/seed-manifest.json
`);
  process.exit(0);
}

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("ERROR: sharp not installed. Run: npm install --save-dev sharp");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Stream B canonical outputs
const VISUALS_DIR = "/Users/Andy/Desktop/mission-control/tools/scripts/mundial-2026-visuals";
const SEED_MANIFEST_FILE = path.join(VISUALS_DIR, "seed-manifest.json");
const SEED_CROPPED_DIR = path.join(VISUALS_DIR, "seed-cropped");

const OUTPUT_DIR = path.join(ROOT, "public/stickers/seed");
const MANIFEST_FILE = path.join(ROOT, "public/stickers/seed-manifest.json");

// Target size per image: 300KB soft limit, 400KB hard
const TARGET_WIDTH = 400; // px
const JPEG_QUALITY = 78;

// --- Load seed-manifest.json ---
if (!existsSync(SEED_MANIFEST_FILE)) {
  console.error(`ERROR: Seed manifest not found at ${SEED_MANIFEST_FILE}`);
  process.exit(1);
}

const seedManifestData = JSON.parse(readFileSync(SEED_MANIFEST_FILE, "utf8"));
const entries = seedManifestData.entries;

console.log(`\nSeed manifest: v${seedManifestData.version} — ${seedManifestData.total} total entries`);
console.log(`  Auto-cropped:    ${seedManifestData.auto_cropped}`);
console.log(`  Manual pending:  ${seedManifestData.manual_pending}`);
console.log();

// --- Build processing list ---
// Only process auto entries that have a cropped source file.
// manual_pending entries are tracked but not copied (no source file yet).

const toProcess = []; // { stickerId, srcFile }
const manualPending = []; // { stickerId } — tracked for output manifest
const skipped = [];

for (const entry of entries) {
  const { sticker_id, crop_status, cropped_path } = entry;

  if (crop_status === "manual_pending") {
    manualPending.push(sticker_id);
    continue;
  }

  if (crop_status === "auto" && cropped_path) {
    const srcFile = path.join(VISUALS_DIR, cropped_path);
    if (existsSync(srcFile)) {
      toProcess.push({ stickerId: sticker_id, srcFile });
    } else {
      console.warn(`  MISSING CROPPED SOURCE: ${cropped_path} (sticker_id: ${sticker_id})`);
      skipped.push(sticker_id);
    }
  } else {
    skipped.push(sticker_id);
  }
}

// Deduplicate (seed-manifest may have duplicate sticker_ids from alternative shots)
const seen = new Set();
const deduplicated = [];
for (const item of toProcess) {
  if (!seen.has(item.stickerId)) {
    seen.add(item.stickerId);
    deduplicated.push(item);
  } else {
    console.warn(`  DUPLICATE sticker_id skipped: ${item.stickerId} (${item.srcFile})`);
  }
}

console.log(`To process (auto + source exists): ${deduplicated.length}`);
console.log(`Manual pending (no source yet):    ${manualPending.length}`);
if (skipped.length > 0) {
  console.log(`Skipped:                           ${skipped.length}`);
}
console.log();

if (DRY_RUN) {
  console.log("[DRY RUN] Would copy:");
  for (const { stickerId, srcFile } of deduplicated) {
    const dest = `public/stickers/seed/${stickerId}.jpg`;
    console.log(`  ${path.basename(srcFile)} → ${dest}`);
  }
  console.log();
  console.log("[DRY RUN] Manual pending (will remain as EmptySlot):");
  for (const sid of manualPending) {
    console.log(`  ${sid}`);
  }
  console.log("\n[DRY RUN] No files copied, no manifest written.");
  process.exit(0);
}

// --- Copy + compress ---
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

let copied = 0;
let errors = 0;

for (const { stickerId, srcFile } of deduplicated) {
  const destFile = path.join(OUTPUT_DIR, `${stickerId}.jpg`);

  try {
    await sharp(srcFile)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(destFile);

    copied++;
    process.stdout.write(`\r  Processed: ${copied}/${deduplicated.length}`);
  } catch (err) {
    console.error(`\n  ERROR processing ${stickerId} (${path.basename(srcFile)}):`, err.message);
    errors++;
  }
}

process.stdout.write("\n");

// --- Write app seed-manifest.json ---
// Format: { sticker_id → filename } for app consumption
// manual_pending entries get crop_status: "manual_pending" marker so future runs pick them up
const appManifest = {};

for (const { stickerId } of deduplicated) {
  appManifest[stickerId] = `${stickerId}.jpg`;
}

await writeFile(MANIFEST_FILE, JSON.stringify(appManifest, null, 2));

console.log(`\nDone.`);
console.log(`  Copied:          ${copied}`);
console.log(`  Errors:          ${errors}`);
console.log(`  Manual pending:  ${manualPending.length} (will show as EmptySlot)`);
console.log(`  Manifest written to: ${MANIFEST_FILE}`);
console.log(`  Manifest entries: ${Object.keys(appManifest).length}`);

// Enforce bundle size cap
const { execSync } = require("child_process");
const totalKB = parseInt(
  execSync(`du -sk "${OUTPUT_DIR}"`).toString().split("\t")[0]
);
const totalMB = totalKB / 1024;
console.log(`  Seed bundle size: ${totalMB.toFixed(1)} MB`);
if (totalMB > 20) {
  console.error(
    `\nFATAL: Seed bundle exceeds 20MB cap (${totalMB.toFixed(1)} MB). Reduce quality or count.`
  );
  process.exit(1);
}

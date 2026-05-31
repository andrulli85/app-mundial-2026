/**
 * scripts/import-seed.mjs
 *
 * Reads identifications.json from the mission-control visuals seed,
 * copies + Sharp-compresses the JPEGs to public/stickers/seed/,
 * and generates public/stickers/seed-manifest.json.
 *
 * Sticker ID mapping:
 *   - sticker_number from identifications.json → match against stickers.json by code
 *   - For entries with team_code + player_name, match by player name fuzzy match
 *
 * Usage:
 *   node scripts/import-seed.mjs
 *   node scripts/import-seed.mjs --dry-run   # prints mapping without copying files
 *
 * Known flags: --dry-run, --help
 * Unknown flags: FATAL exit 2 (per Mission Control CLI convention)
 */

import { createRequire } from "module";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { writeFile, copyFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

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
import-seed.mjs — Copy and compress Panini seed sticker photos

Usage:
  node scripts/import-seed.mjs [--dry-run]

Flags:
  --dry-run   Print mapping without copying files or generating manifest
  --help      Show this help

Source: tools/scripts/mundial-2026-visuals/seed/
Output: public/stickers/seed/{sticker_id}.jpg
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

const SEED_DIR = "/Users/Andy/Desktop/mission-control/tools/scripts/mundial-2026-visuals/seed";
const IDENT_FILE = path.join(SEED_DIR, "identifications.json");
const STICKERS_FILE = path.join(ROOT, "src/data/stickers.json");
const OUTPUT_DIR = path.join(ROOT, "public/stickers/seed");
const MANIFEST_FILE = path.join(ROOT, "public/stickers/seed-manifest.json");

// Target size per image: 300KB soft limit, 400KB hard
const TARGET_WIDTH = 400;  // px
const JPEG_QUALITY = 78;

// --- Load data ---
const identifications = JSON.parse(readFileSync(IDENT_FILE, "utf8"));
const stickers = JSON.parse(readFileSync(STICKERS_FILE, "utf8"));

// Build lookup maps from stickers.json
const byCode = new Map(); // "MEX 13" → sticker
const byId = new Map();   // "mex-13" → sticker
const byPlayerName = new Map(); // "santiago gimenez" → [sticker, ...]

for (const s of stickers) {
  byCode.set(s.code.toUpperCase(), s);
  byId.set(s.id, s);

  if (s.name && s.name !== "Team Logo" && s.name !== "Team Photo") {
    const key = s.name.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    if (!byPlayerName.has(key)) byPlayerName.set(key, []);
    byPlayerName.get(key).push(s);
  }
}

/** Fuzzy match player name — strips accents + special chars */
function normalizePlayerName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/** Find sticker_id for an identification entry */
function findStickerId(entry) {
  // 1. Exact sticker_number match (e.g. "FWC 1", "00")
  if (entry.sticker_number) {
    const code = entry.sticker_number.toUpperCase();
    const match = byCode.get(code);
    if (match) return match.id;
  }

  // 2. Player name fuzzy match within team
  if (entry.player_name && entry.team_code) {
    const normalized = normalizePlayerName(entry.player_name);
    // Try exact key
    const candidates = byPlayerName.get(normalized) || [];
    const teamMatch = candidates.find(
      (s) => s.team_code.toUpperCase() === entry.team_code.toUpperCase()
    );
    if (teamMatch) return teamMatch.id;

    // Try partial name match
    for (const [key, list] of byPlayerName.entries()) {
      if (key.includes(normalized) || normalized.includes(key)) {
        const tm = list.find(
          (s) => s.team_code.toUpperCase() === entry.team_code.toUpperCase()
        );
        if (tm) return tm.id;
      }
    }
  }

  // 3. Team logo / team photo by team_code
  if (entry.team_code && entry.type === "team_logo") {
    const logoId = stickers.find(
      (s) =>
        s.team_code.toUpperCase() === entry.team_code.toUpperCase() &&
        s.type === "team_logo"
    );
    if (logoId) return logoId.id;
  }

  if (entry.team_code && entry.type === "team_photo") {
    const photoId = stickers.find(
      (s) =>
        s.team_code.toUpperCase() === entry.team_code.toUpperCase() &&
        s.type === "team_photo"
    );
    if (photoId) return photoId.id;
  }

  return null;
}

// --- Build mapping ---
const manifest = {}; // sticker_id → filename
const unmapped = [];

for (const entry of identifications) {
  const stickerId = findStickerId(entry);
  if (!stickerId) {
    unmapped.push(entry.file);
    continue;
  }
  // filename = sticker_id + .jpg
  const filename = `${stickerId}.jpg`;
  manifest[stickerId] = filename;

  if (DRY_RUN) {
    console.log(`${entry.file} → ${stickerId} (${filename})`);
  }
}

if (unmapped.length > 0) {
  console.warn(`\nUnmapped files (${unmapped.length}):`);
  unmapped.forEach((f) => console.warn(`  ⚠ ${f}`));
}

console.log(`\nMapped: ${Object.keys(manifest).length}/${identifications.length}`);

if (DRY_RUN) {
  console.log("\n[DRY RUN] No files copied, no manifest written.");
  process.exit(0);
}

// --- Copy + compress ---
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

let copied = 0;
let errors = 0;

for (const entry of identifications) {
  const stickerId = findStickerId(entry);
  if (!stickerId) continue;

  const srcFile = path.join(SEED_DIR, entry.file);
  const destFile = path.join(OUTPUT_DIR, `${stickerId}.jpg`);

  if (!existsSync(srcFile)) {
    console.warn(`  MISSING SOURCE: ${srcFile}`);
    errors++;
    continue;
  }

  try {
    // Rotate Mexico team photo (IMG_4480 is 90° off)
    const needsRotation =
      entry.file === "IMG_4480.jpg" || entry.notes?.includes("rotated 90");

    await sharp(srcFile)
      .rotate(needsRotation ? 90 : 0)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(destFile);

    copied++;
    process.stdout.write(`\r  Processed: ${copied}/${Object.keys(manifest).length}`);
  } catch (err) {
    console.error(`\n  ERROR processing ${entry.file}:`, err.message);
    errors++;
  }
}

process.stdout.write("\n");

// --- Write manifest ---
await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

console.log(`\nDone.`);
console.log(`  Copied:  ${copied}`);
console.log(`  Errors:  ${errors}`);
console.log(`  Manifest written to: ${MANIFEST_FILE}`);

// Enforce bundle size cap
const { execSync } = require("child_process");
const totalKB = parseInt(
  execSync(`du -sk "${OUTPUT_DIR}"`).toString().split("\t")[0]
);
const totalMB = totalKB / 1024;
console.log(`  Seed bundle size: ${totalMB.toFixed(1)} MB`);
if (totalMB > 20) {
  console.error(`\nFATAL: Seed bundle exceeds 20MB cap (${totalMB.toFixed(1)} MB). Reduce quality or count.`);
  process.exit(1);
}

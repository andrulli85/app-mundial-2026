/**
 * tools/scripts/extract-phase2/extract-doradas.mjs
 *
 * Crops 27 doradas cells from quarantine/doradas/page-1.jpg + page-2.jpg using sharp.
 *
 * Layout:
 *   Page 1: row1 (5 portrait) + row2 (5 portrait) + row3 (4 landscape) = 14 cells
 *   Page 2: row1 (5 portrait) + row2 (5 portrait) + row3 (3 landscape) = 13 cells
 *
 * Outputs:
 *   public/stickers/seed/<sticker_id>.jpg  — cropped cells (source of truth)
 *   public/stickers/seed-manifest.json     — updated manifest
 *   quarantine/doradas/debug-page-1.jpg    — debug overlay (red bboxes)
 *   quarantine/doradas/debug-page-2.jpg    — debug overlay (red bboxes)
 *
 * Usage:
 *   node tools/scripts/extract-phase2/extract-doradas.mjs [--dry-run]
 *
 * KNOWN_FLAGS: --dry-run, --help
 * Unknown flags → FATAL exit 2 (MC CLI standard)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

// ---------------------------------------------------------------------------
// Flag validation — unknown flag = FATAL exit 2
// ---------------------------------------------------------------------------
const KNOWN_FLAGS = new Set(["--dry-run", "--help"]);
const rawArgs = process.argv.slice(2);
for (const arg of rawArgs) {
  if (arg.startsWith("--") && !KNOWN_FLAGS.has(arg)) {
    console.error(`FATAL: unknown flag "${arg}". Known flags: ${[...KNOWN_FLAGS].join(", ")}`);
    process.exit(2);
  }
}

const DRY_RUN = rawArgs.includes("--dry-run");
const HELP = rawArgs.includes("--help");

if (HELP) {
  console.log(`
extract-doradas.mjs — crops 27 doradas cells from page-1.jpg + page-2.jpg

Usage:
  node tools/scripts/extract-phase2/extract-doradas.mjs [--dry-run]

Flags:
  --dry-run   Print bbox table + dims; no files written
  --help      Show this help
  `);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Cell sequence (sticker_id order)
// ---------------------------------------------------------------------------
const PAGE1_IDS = [
  // row1 — portrait x5
  "dor-bra-neymar", "dor-egy-salah", "dor-col-diaz", "dor-uru-valverde", "dor-tur-guler",
  // row2 — portrait x5
  "dor-nor-haaland", "dor-por-ronaldo", "dor-bel-courtois", "dor-cro-modric", "dor-sen-mane",
  // row3 — landscape x4
  "dor-ned-vandijk", "dor-aus-ryan", "dor-arg-messi", "dor-usa-pulisic",
];

const PAGE2_IDS = [
  // row1 — portrait x5
  "dor-eng-palmer", "dor-fra-mbappe", "dor-alg-mahrez", "dor-esp-yamal", "dor-ger-musiala",
  // row2 — portrait x5
  "dor-mex-mora", "dor-par-gomez", "dor-ecu-caicedo", "dor-cuw-bacuna", "dor-mar-diaz",
  // row3 — landscape x3
  "dor-kor-son", "dor-swe-gyokeres", "dor-jpn-kubo",
];

// ---------------------------------------------------------------------------
// Bbox computation
// ---------------------------------------------------------------------------

/**
 * Compute cell bboxes for a doradas page.
 *
 * Page structure (visually inspected from quarantine JPEGs):
 *   - Top/bottom margin: ~4% of height each
 *   - Row 1 + 2 (portrait): 5 cells wide, ~29% of height each
 *   - Row 3 (landscape): 4 cells (page1) / 3 cells (page2) wide, ~29% of height
 *   - Left/right margin: ~2% of width each
 *   - Thin horizontal divider gap between rows: ~1% of height
 *
 * Note: We use 0-based pixel integers (sharp requires left, top, width, height).
 */
function computeBboxes(W, H, page) {
  const marginTop = Math.round(H * 0.05);
  const marginBottom = Math.round(H * 0.04);
  const marginLeft = Math.round(W * 0.02);
  const marginRight = Math.round(W * 0.02);
  const innerW = W - marginLeft - marginRight;
  const innerH = H - marginTop - marginBottom;

  // Row heights: 3 rows, each ~31% of innerH with 1% gap between
  // Approximate: row1 + gap + row2 + gap + row3 = innerH
  const rowGap = Math.round(innerH * 0.015);
  const rowH = Math.round((innerH - 2 * rowGap) / 3);

  const row1Top = marginTop;
  const row2Top = row1Top + rowH + rowGap;
  const row3Top = row2Top + rowH + rowGap;

  const bboxes = [];

  // Row 1 — portrait x5
  const portraitW = Math.round(innerW / 5);
  for (let i = 0; i < 5; i++) {
    bboxes.push({
      left: marginLeft + i * portraitW,
      top: row1Top,
      width: portraitW,
      height: rowH,
      row: 1,
    });
  }

  // Row 2 — portrait x5
  for (let i = 0; i < 5; i++) {
    bboxes.push({
      left: marginLeft + i * portraitW,
      top: row2Top,
      width: portraitW,
      height: rowH,
      row: 2,
    });
  }

  // Row 3 — landscape
  const landCols = page === 1 ? 4 : 3;
  const landscapeW = Math.round(innerW / landCols);
  for (let i = 0; i < landCols; i++) {
    bboxes.push({
      left: marginLeft + i * landscapeW,
      top: row3Top,
      width: landscapeW,
      height: rowH,
      row: 3,
    });
  }

  return bboxes;
}

// ---------------------------------------------------------------------------
// Debug overlay (draw red rectangles using SVG composite)
// ---------------------------------------------------------------------------
async function writeDebugOverlay(inputPath, outputPath, bboxes) {
  const meta = await sharp(inputPath).metadata();
  const W = meta.width;
  const H = meta.height;

  // Build SVG rectangles
  const rects = bboxes
    .map(
      (b, i) =>
        `<rect x="${b.left}" y="${b.top}" width="${b.width}" height="${b.height}"
          stroke="red" stroke-width="6" fill="none" />`
        + `<text x="${b.left + 8}" y="${b.top + 30}" font-size="28" fill="red" font-family="sans-serif">${i + 1}</text>`
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rects}</svg>`;

  await sharp(inputPath)
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  console.log(`  Debug overlay: ${outputPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const quarantineDir = path.join(__dirname, "quarantine/doradas");
  const seedDir = path.join(REPO_ROOT, "public/stickers/seed");
  const manifestPath = path.join(REPO_ROOT, "public/stickers/seed-manifest.json");

  const page1Path = path.join(quarantineDir, "page-1.jpg");
  const page2Path = path.join(quarantineDir, "page-2.jpg");

  if (!existsSync(page1Path) || !existsSync(page2Path)) {
    console.error(`FATAL: source files not found at ${quarantineDir}`);
    process.exit(1);
  }

  const meta1 = await sharp(page1Path).metadata();
  const meta2 = await sharp(page2Path).metadata();

  console.log("extract-doradas.mjs");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`  page-1.jpg: ${meta1.width} x ${meta1.height}`);
  console.log(`  page-2.jpg: ${meta2.width} x ${meta2.height}`);

  const bboxes1 = computeBboxes(meta1.width, meta1.height, 1);
  const bboxes2 = computeBboxes(meta2.width, meta2.height, 2);

  console.log("\n  Page 1 bboxes (14 cells):");
  bboxes1.forEach((b, i) => {
    console.log(`    [${i + 1}] ${PAGE1_IDS[i].padEnd(22)} row${b.row} | left=${b.left} top=${b.top} w=${b.width} h=${b.height}`);
  });

  console.log("\n  Page 2 bboxes (13 cells):");
  bboxes2.forEach((b, i) => {
    console.log(`    [${i + 1}] ${PAGE2_IDS[i].padEnd(22)} row${b.row} | left=${b.left} top=${b.top} w=${b.width} h=${b.height}`);
  });

  if (DRY_RUN) {
    console.log("\n  DRY RUN: no files written.");
    return;
  }

  // Ensure seed dir exists
  if (!existsSync(seedDir)) {
    mkdirSync(seedDir, { recursive: true });
  }

  // Crop page 1
  console.log("\n  Cropping page 1...");
  const page1Files = [];
  for (let i = 0; i < bboxes1.length; i++) {
    const b = bboxes1[i];
    const stickerId = PAGE1_IDS[i];
    const outPath = path.join(seedDir, `${stickerId}.jpg`);
    await sharp(page1Path)
      .extract({ left: b.left, top: b.top, width: b.width, height: b.height })
      .jpeg({ quality: 92 })
      .toFile(outPath);
    const stat = readFileSync(outPath);
    const kb = Math.round(stat.length / 1024);
    console.log(`    ${stickerId}.jpg — ${kb} KB`);
    page1Files.push({ id: stickerId, filename: `${stickerId}.jpg` });
  }

  // Crop page 2
  console.log("\n  Cropping page 2...");
  const page2Files = [];
  for (let i = 0; i < bboxes2.length; i++) {
    const b = bboxes2[i];
    const stickerId = PAGE2_IDS[i];
    const outPath = path.join(seedDir, `${stickerId}.jpg`);
    await sharp(page2Path)
      .extract({ left: b.left, top: b.top, width: b.width, height: b.height })
      .jpeg({ quality: 92 })
      .toFile(outPath);
    const stat = readFileSync(outPath);
    const kb = Math.round(stat.length / 1024);
    console.log(`    ${stickerId}.jpg — ${kb} KB`);
    page2Files.push({ id: stickerId, filename: `${stickerId}.jpg` });
  }

  // Update seed-manifest.json
  const existing = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {};

  const allNewFiles = [...page1Files, ...page2Files];
  for (const { id, filename } of allNewFiles) {
    existing[id] = filename;
  }

  // Sort keys alphabetically
  const sorted = Object.fromEntries(
    Object.entries(existing).sort(([a], [b]) => a.localeCompare(b))
  );

  writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n", "utf8");
  const manifestCount = Object.keys(sorted).length;
  console.log(`\n  seed-manifest.json updated: ${manifestCount} total entries`);

  // Debug overlays
  console.log("\n  Writing debug overlays...");
  await writeDebugOverlay(page1Path, path.join(quarantineDir, "debug-page-1.jpg"), bboxes1);
  await writeDebugOverlay(page2Path, path.join(quarantineDir, "debug-page-2.jpg"), bboxes2);

  console.log(`\n  Done. Wrote ${allNewFiles.length} sticker JPEGs to ${seedDir}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

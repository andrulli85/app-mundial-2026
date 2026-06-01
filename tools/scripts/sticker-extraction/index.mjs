/**
 * tools/scripts/sticker-extraction/index.mjs
 *
 * Orchestrator for the Albumix sticker extraction pipeline.
 *
 * Processes Panini FIFA World Cup 2026 country PDFs and extracts all ~600
 * individual sticker images into public/stickers/seed/ with seed-manifest.json
 * updated.
 *
 * Usage:
 *   node tools/scripts/sticker-extraction/index.mjs --country all --dry-run
 *   node tools/scripts/sticker-extraction/index.mjs --country arg
 *   node tools/scripts/sticker-extraction/index.mjs --country all
 *   node tools/scripts/sticker-extraction/index.mjs --country all --force
 *
 * Flags:
 *   --country <ISO|all>   Country ISO-3 code or "all" (required)
 *   --dry-run             Print plan without writing files or modifying manifest
 *   --force               Overwrite existing manifest entries (including manual crops)
 *   --help                Show this help
 *
 * Known flags: --country, --dry-run, --force, --help
 * Unknown flags: FATAL exit 2 (per Mission Control CLI convention)
 */

import { readFileSync, mkdirSync } from "fs";
import path from "path";
import os from "os";
import { validateFlags, parseArgs } from "./KNOWN_FLAGS.mjs";
import {
  FOLDER_TO_ISO,
  ISO_TO_FOLDER,
  ALL_ISOS,
  findMainPdf,
  resolveCountry,
} from "./country-map.mjs";
import { getPageCount, getFrontPages, renderAllFrontPages } from "./render-pdf.mjs";
import { cropGrid } from "./crop-grid.mjs";
import { buildCellMap } from "./map-cells.mjs";
import { writeBatch, loadManifest } from "./write-output.mjs";

// --- Flag validation (unknown flags = exit 2) ---
const argv = process.argv.slice(2);
validateFlags(argv);

const args = parseArgs(argv);
const DRY_RUN = args["dry-run"] === true;
const FORCE = args["force"] === true;
const HELP = args["help"] === true;
const COUNTRY_ARG = typeof args["country"] === "string" ? args["country"] : null;

const APP_ROOT = "/Users/Andy/Desktop/app-mundial-2026";
const CATALOG_PATH = path.join(APP_ROOT, "src/data/stickers.json");
const TEMP_DIR = path.join(os.tmpdir(), "sticker-extraction");

// --- Help ---
if (HELP) {
  console.log(`
sticker-extraction/index.mjs — Panini FIFA World Cup 2026 sticker extraction pipeline

Usage:
  node tools/scripts/sticker-extraction/index.mjs --country all --dry-run
  node tools/scripts/sticker-extraction/index.mjs --country arg
  node tools/scripts/sticker-extraction/index.mjs --country all

Flags:
  --country <ISO|all>   Country ISO-3 code or "all" (required)
  --dry-run             Print plan without writing files or modifying manifest
  --force               Overwrite existing manifest entries (including manual crops)
  --help                Show this help

Examples:
  node tools/scripts/sticker-extraction/index.mjs --country arg --dry-run
  node tools/scripts/sticker-extraction/index.mjs --country all --dry-run
  node tools/scripts/sticker-extraction/index.mjs --country all
`);
  process.exit(0);
}

// --- Validate --country ---
if (!COUNTRY_ARG) {
  console.error("ERROR: --country is required. Use --country all or --country <ISO-3>.");
  console.error("  Example: node tools/scripts/sticker-extraction/index.mjs --country all --dry-run");
  process.exit(1);
}

// --- Load catalog ---
let catalog;
try {
  catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
} catch (err) {
  console.error(`ERROR: Could not read catalog at ${CATALOG_PATH}: ${err.message}`);
  process.exit(1);
}

// --- Determine which ISOs to process ---
let targetISOs;
if (COUNTRY_ARG.toLowerCase() === "all") {
  targetISOs = ALL_ISOS;
} else {
  const resolved = resolveCountry(COUNTRY_ARG);
  if (!resolved) {
    console.error(`ERROR: Unknown country: "${COUNTRY_ARG}"`);
    console.error(`Known codes: ${ALL_ISOS.join(", ")}`);
    process.exit(1);
  }
  targetISOs = [resolved];
}

// --- Summary header ---
console.log("");
console.log("=== Albumix Sticker Extraction Pipeline ===");
console.log(`Mode:     ${DRY_RUN ? "DRY RUN (no files written)" : FORCE ? "FORCE (overwrite existing)" : "NORMAL (preserve manual crops)"}`);
console.log(`Countries: ${targetISOs.length === ALL_ISOS.length ? "ALL" : targetISOs.join(", ")}`);
console.log(`Catalog:  ${catalog.length} stickers total`);
console.log("");

// --- Pre-flight: audit all target countries ---
const manifest = loadManifest();
const existingIds = new Set(Object.keys(manifest));

const countryPlans = [];
let totalExpectedStickers = 0;
let mismatches = [];

for (const iso of targetISOs) {
  const folder = ISO_TO_FOLDER[iso];
  const pdfPath = findMainPdf(folder);

  if (!pdfPath) {
    mismatches.push(`${iso}: PDF not found in folder "${folder}"`);
    continue;
  }

  const totalPages = getPageCount(pdfPath);
  const frontPages = getFrontPages(totalPages);
  const { cellMaps, stickerCount, totalCells, mismatch } = buildCellMap(
    iso,
    catalog,
    frontPages.length
  );

  if (mismatch) {
    mismatches.push(`${iso}: ${mismatch}`);
  }

  const alreadyExtracted = cellMaps.filter((c) => existingIds.has(c.stickerId));
  const toWrite = cellMaps.filter(
    (c) => FORCE || !existingIds.has(c.stickerId)
  );

  countryPlans.push({
    iso,
    folder,
    pdfPath,
    totalPages,
    frontPages,
    cellMaps,
    stickerCount,
    totalCells,
    alreadyExtracted: alreadyExtracted.length,
    toWrite: toWrite.length,
  });

  totalExpectedStickers += stickerCount;
}

// --- Print per-country plan ---
console.log("--- Per-Country Plan ---");
let grandTotalToWrite = 0;
for (const plan of countryPlans) {
  const stickerIds = plan.cellMaps.map((c) => c.stickerId).join(", ");
  console.log(
    `${plan.iso.padEnd(4)} | ${String(plan.stickerCount).padStart(2)} stickers | ` +
    `${plan.frontPages.length} front page(s) of ${plan.totalPages} | ` +
    `${plan.alreadyExtracted} existing | ` +
    `${plan.toWrite} to write`
  );
  if (DRY_RUN) {
    // Show first few sticker IDs
    const preview = plan.cellMaps.slice(0, 5).map((c) => c.stickerId).join(", ");
    const more = plan.cellMaps.length > 5 ? ` … +${plan.cellMaps.length - 5} more` : "";
    console.log(`       IDs: ${preview}${more}`);
  }
  grandTotalToWrite += plan.toWrite;
}

console.log("");
console.log(`--- Summary ---`);
console.log(`Countries planned:    ${countryPlans.length}`);
console.log(`Total stickers:       ${totalExpectedStickers}`);
console.log(`Already in manifest:  ${existingIds.size} (preserved)`);
console.log(`To write this run:    ${grandTotalToWrite}`);

if (mismatches.length > 0) {
  console.log("");
  console.log("--- Mismatches / Warnings ---");
  for (const m of mismatches) {
    console.log(`  WARN: ${m}`);
  }
}

if (DRY_RUN) {
  console.log("");
  console.log("[DRY RUN] No files written. Remove --dry-run to execute.");
  process.exit(0);
}

// --- Execute ---
console.log("");
console.log("--- Extracting Stickers ---");

let totalWritten = 0;
let totalSkipped = 0;
let totalErrors = 0;
const allErrorDetails = [];
const executionMismatches = [];

for (const plan of countryPlans) {
  console.log(`\n[${plan.iso}] Processing ${plan.stickerCount} stickers (${plan.frontPages.length} pages)…`);

  // Create temp directory for this country
  const countryTempDir = path.join(TEMP_DIR, plan.iso.toLowerCase());
  mkdirSync(countryTempDir, { recursive: true });

  // Render all front pages
  let pageCells = []; // array of arrays: pageCells[pageIndex] = [{row, col, buffer}, ...]

  try {
    const { pagePaths, frontPages } = renderAllFrontPages(
      plan.pdfPath,
      countryTempDir,
      plan.iso.toLowerCase()
    );

    for (let pi = 0; pi < pagePaths.length; pi++) {
      process.stdout.write(`  Rendering page ${frontPages[pi]}…`);
      const cells = await cropGrid(pagePaths[pi]);
      pageCells.push(cells);
      process.stdout.write(` ${cells.length} cells\n`);
    }
  } catch (err) {
    const msg = `[${plan.iso}] Render/crop failed: ${err.message}`;
    console.error(msg);
    allErrorDetails.push(msg);
    totalErrors++;
    continue;
  }

  // Build list of { stickerId, buffer } pairs
  const items = [];
  for (const cellMap of plan.cellMaps) {
    const pageGrid = pageCells[cellMap.pageIndex];
    if (!pageGrid) {
      const msg = `[${plan.iso}] No cells for page index ${cellMap.pageIndex} (sticker ${cellMap.stickerId})`;
      executionMismatches.push(msg);
      continue;
    }
    const cell = pageGrid[cellMap.linearIndex];
    if (!cell) {
      const msg = `[${plan.iso}] No cell at index ${cellMap.linearIndex} for ${cellMap.stickerId}`;
      executionMismatches.push(msg);
      continue;
    }
    items.push({ stickerId: cellMap.stickerId, buffer: cell.buffer });
  }

  // Write batch
  const result = await writeBatch(items, FORCE, false);
  totalWritten += result.written;
  totalSkipped += result.skipped;
  totalErrors += result.errors;
  allErrorDetails.push(...result.errorDetails);

  console.log(
    `  [${plan.iso}] Done: ${result.written} written, ${result.skipped} skipped, ${result.errors} errors`
  );
}

// --- Final report ---
console.log("");
console.log("=== Extraction Complete ===");
console.log(`Written:    ${totalWritten}`);
console.log(`Skipped:    ${totalSkipped} (existing manual crops preserved)`);
console.log(`Errors:     ${totalErrors}`);

if (executionMismatches.length > 0) {
  console.log("\nCell Mismatches:");
  for (const m of executionMismatches) {
    console.log(`  ${m}`);
  }
}

if (allErrorDetails.length > 0) {
  console.log("\nError Details:");
  for (const e of allErrorDetails) {
    console.log(`  ${e}`);
  }
}

const newManifest = loadManifest();
console.log(`\nManifest entries: ${Object.keys(newManifest).length}`);
console.log(`Manifest: public/stickers/seed-manifest.json`);

if (totalErrors > 0) {
  process.exit(1);
}

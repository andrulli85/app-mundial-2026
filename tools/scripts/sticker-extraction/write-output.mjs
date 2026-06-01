/**
 * write-output.mjs
 *
 * Writes extracted sticker cells to public/stickers/seed/<sticker_id>.jpg
 * and updates public/stickers/seed-manifest.json.
 *
 * Rules:
 *   - Output size: 400×533 px (portrait, matches existing manual crops)
 *   - JPEG quality: 85, mozjpeg: true
 *   - Manifest: idempotent — never overwrites existing entries unless --force
 *   - Existing 50 manual crops in seed-manifest.json are preserved
 */

import { createRequire } from "module";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const APP_ROOT = "/Users/Andy/Desktop/app-mundial-2026";
const SEED_DIR = path.join(APP_ROOT, "public/stickers/seed");
const MANIFEST_PATH = path.join(APP_ROOT, "public/stickers/seed-manifest.json");

const TARGET_WIDTH = 400;
const TARGET_HEIGHT = 533;
const JPEG_QUALITY = 85;

/**
 * Load the current seed-manifest.json.
 * Returns an object { sticker_id → filename }.
 *
 * @returns {Record<string, string>}
 */
export function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Save the manifest to disk.
 *
 * @param {Record<string, string>} manifest
 */
export async function saveManifest(manifest) {
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

/**
 * Write a single sticker image to disk.
 * Resizes and compresses from a Buffer.
 *
 * @param {string} stickerId
 * @param {Buffer} imageBuffer
 * @param {Record<string, string>} manifest - current manifest (mutated in place)
 * @param {boolean} force - overwrite existing entries
 * @returns {{ written: boolean, skipped: boolean, reason?: string }}
 */
export async function writeStickerImage(stickerId, imageBuffer, manifest, force = false) {
  if (!existsSync(SEED_DIR)) {
    mkdirSync(SEED_DIR, { recursive: true });
  }

  const filename = `${stickerId}.jpg`;
  const destPath = path.join(SEED_DIR, filename);

  // Skip if already in manifest and not forcing
  if (!force && manifest[stickerId]) {
    return {
      written: false,
      skipped: true,
      reason: "already in manifest (manual crop preserved)",
    };
  }

  // Write image
  await sharp(imageBuffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(destPath);

  manifest[stickerId] = filename;
  return { written: true, skipped: false };
}

/**
 * Write multiple sticker images from a list of { stickerId, buffer } pairs.
 * Persists the manifest after all writes.
 *
 * @param {Array<{stickerId: string, buffer: Buffer}>} items
 * @param {boolean} force
 * @param {boolean} dryRun
 * @returns {Promise<{written: number, skipped: number, errors: number, errorDetails: string[]}>}
 */
export async function writeBatch(items, force = false, dryRun = false) {
  const manifest = loadManifest();
  let written = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails = [];

  for (const { stickerId, buffer } of items) {
    if (dryRun) {
      if (!force && manifest[stickerId]) {
        process.stdout.write(`  [DRY] SKIP  ${stickerId} (already in manifest)\n`);
        skipped++;
      } else {
        process.stdout.write(`  [DRY] WRITE ${stickerId}.jpg\n`);
        written++;
      }
      continue;
    }

    try {
      const result = await writeStickerImage(stickerId, buffer, manifest, force);
      if (result.skipped) {
        skipped++;
      } else {
        written++;
        process.stdout.write(`  + ${stickerId}.jpg\n`);
      }
    } catch (err) {
      errors++;
      const msg = `ERROR writing ${stickerId}: ${err.message}`;
      errorDetails.push(msg);
      console.error(msg);
    }
  }

  if (!dryRun) {
    await saveManifest(manifest);
  }

  return { written, skipped, errors, errorDetails };
}

/**
 * photo.ts — Photo URL resolution for player sticker cards.
 *
 * Resolution priority:
 *   1. originales-manifest.json   — 720+ BULK-processed photos (full quality)
 *   2. seed-manifest.json         — 52 manually-cropped photos
 *   3. /stickers/placeholder.svg  — gold "?" card for any sticker without a photo
 *
 * originales-manifest.json is written by BULK's PNG-processing pipeline.
 * The file may not exist during early development — the import is wrapped in a
 * try/catch so a missing file degrades gracefully to seed/ fallback.
 */

// Seed manifest is always present — import statically.
import seedManifest from "../../../public/stickers/seed-manifest.json";

// Originales manifest — may not exist yet while BULK processes PNGs.
// Use require() inside a try/catch so a missing JSON doesn't break the build.
let originalesManifest: Record<string, string> = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  originalesManifest = require("../../../public/stickers/originales-manifest.json") as Record<string, string>;
} catch {
  // BULK hasn't written this file yet — seed/ and placeholder will cover all stickers.
}

const seedMap = seedManifest as Record<string, string>;

/**
 * Returns the best available photo URL for a given sticker_id.
 *
 * @param stickerId  — canonical sticker_id from the catalog (e.g. "mex-3-vasquez")
 * @returns          — absolute public path (e.g. "/stickers/originales/mex-3-vasquez.jpg")
 */
export function photoUrlFor(stickerId: string): string {
  // 1. originales (BULK pipeline — full quality)
  const orig = originalesManifest[stickerId];
  if (orig) return orig.startsWith("/") ? orig : `/stickers/originales/${orig}`;

  // 2. seed (manually cropped subset)
  const seed = seedMap[stickerId];
  if (seed) return `/stickers/seed/${seed}`;

  // 3. placeholder
  return "/stickers/placeholder.svg";
}

/**
 * Returns photo coverage stats — useful for debug / verification.
 * Returns { originales, seed, total } counts for any iterable of sticker_ids.
 */
export function photoCoverage(stickerIds: string[]): {
  originales: number;
  seed: number;
  placeholder: number;
  total: number;
} {
  let originales = 0;
  let seed = 0;
  let placeholder = 0;

  for (const id of stickerIds) {
    if (originalesManifest[id]) {
      originales++;
    } else if (seedMap[id]) {
      seed++;
    } else {
      placeholder++;
    }
  }

  return { originales, seed, placeholder, total: stickerIds.length };
}

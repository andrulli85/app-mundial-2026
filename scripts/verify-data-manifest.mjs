/**
 * verify-data-manifest.mjs
 *
 * For each src/data/<file>.json that has a sibling <file>.manifest.json:
 *   - Recomputes sha256 of the data file
 *   - Compares against the manifest's recorded sha256
 *   - Compares row_count
 *   - Optionally warns if field_coverage regressed > 1pp
 *
 * Exits 0 if all checks pass; exits 1 on any mismatch.
 *
 * Flags:
 *   --regenerate   Overwrite all manifests with current state (use after a
 *                  legitimate data update via the ETL pipeline).
 *
 * Usage:
 *   node scripts/verify-data-manifest.mjs              # verify
 *   node scripts/verify-data-manifest.mjs --regenerate # regenerate
 *
 * Part of the Phase 1.5 (Albumix data hardening) prebuild gate.
 * Plan: docs/plans/2026-06-02-albumix-data-hardening.md
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve, dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Flag validation — unknown flags exit 2 (never silently accepted)
// ---------------------------------------------------------------------------
const KNOWN_FLAGS = new Set(['--regenerate']);
const unknownFlags = process.argv.slice(2).filter(a => a.startsWith('--') && !KNOWN_FLAGS.has(a));
if (unknownFlags.length > 0) {
  console.error(`[verify-data-manifest] Unknown flag(s): ${unknownFlags.join(', ')}`);
  console.error('Known flags: --regenerate');
  process.exit(2);
}

const REGENERATE = process.argv.includes('--regenerate');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

const DATA_FILES = [
  'stickers.json',
  'player-mapping.json',
  'player-ratings.json',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 of raw file bytes (byte-exact, no normalization).
 */
function sha256File(filePath) {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Return the row count for a JSON data file.
 * Arrays → length; Objects → key count.
 */
function rowCount(filePath) {
  const content = JSON.parse(readFileSync(filePath, 'utf8'));
  return Array.isArray(content) ? content.length : Object.keys(content).length;
}

/**
 * Get current git short SHA synchronously.
 */
function resolveGitSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Compute field_coverage for a data file.
 *
 * stickers.json  → cross-reference both player-mapping and player-ratings
 * player-mapping.json → coverage = "% of player stickers with a mapping entry"
 * player-ratings.json → coverage = "% of player stickers with a ratings entry"
 *
 * All coverage metrics are relative to player-type stickers (864 of 980 total).
 */
function computeFieldCoverage(dataFilePath) {
  const name = basename(dataFilePath);
  const stickersPath = join(DATA_DIR, 'stickers.json');
  const mappingPath = join(DATA_DIR, 'player-mapping.json');
  const ratingsPath = join(DATA_DIR, 'player-ratings.json');

  if (name === 'stickers.json') {
    if (!existsSync(mappingPath) || !existsSync(ratingsPath)) return null;
    const stickers = JSON.parse(readFileSync(dataFilePath, 'utf8'));
    const mapping = JSON.parse(readFileSync(mappingPath, 'utf8'));
    const ratings = JSON.parse(readFileSync(ratingsPath, 'utf8'));
    const playerIds = stickers.filter(s => s.type === 'player').map(s => s.sticker_id);
    const total = playerIds.length;
    const mappingKeys = new Set(Object.keys(mapping));
    const ratingKeys = new Set(Object.keys(ratings));
    const covMap = playerIds.filter(id => mappingKeys.has(id)).length;
    const covRat = playerIds.filter(id => ratingKeys.has(id)).length;
    return {
      ratings: { covered: covRat, total, pct: parseFloat((covRat / total).toFixed(6)) },
      mapping: { covered: covMap, total, pct: parseFloat((covMap / total).toFixed(6)) },
    };
  }

  if (!existsSync(stickersPath)) return null;
  const stickers = JSON.parse(readFileSync(stickersPath, 'utf8'));
  const playerIds = stickers.filter(s => s.type === 'player').map(s => s.sticker_id);
  const total = playerIds.length;
  const content = JSON.parse(readFileSync(dataFilePath, 'utf8'));
  const keys = new Set(Object.keys(content));
  const covered = playerIds.filter(id => keys.has(id)).length;

  if (name === 'player-mapping.json') {
    return { mapping: { covered, total, pct: parseFloat((covered / total).toFixed(6)) } };
  }
  if (name === 'player-ratings.json') {
    return { ratings: { covered, total, pct: parseFloat((covered / total).toFixed(6)) } };
  }
  return null;
}

/**
 * Collect low-confidence IDs from a data file.
 * - stickers.json       → cross-reads player-mapping + player-ratings for low-confidence entries
 * - player-mapping.json → entries where match_confidence != "high"
 * - player-ratings.json → entries where match_confidence != "high"
 */
function computeLowConfidence(dataFilePath) {
  const name = basename(dataFilePath);
  const mappingPath = join(DATA_DIR, 'player-mapping.json');
  const ratingsPath = join(DATA_DIR, 'player-ratings.json');

  if (name === 'stickers.json') {
    const lowConfMapping = existsSync(mappingPath)
      ? Object.entries(JSON.parse(readFileSync(mappingPath, 'utf8')))
          .filter(([, v]) => v.match_confidence !== 'high')
          .map(([k]) => k)
      : [];
    const lowConfRatings = existsSync(ratingsPath)
      ? Object.entries(JSON.parse(readFileSync(ratingsPath, 'utf8')))
          .filter(([, v]) => v.match_confidence !== 'high')
          .map(([k]) => k)
      : [];
    return { low_confidence_ratings_ids: lowConfRatings, low_confidence_mapping_ids: lowConfMapping };
  }

  const content = JSON.parse(readFileSync(dataFilePath, 'utf8'));
  const lowConf = Object.entries(content)
    .filter(([, v]) => v.match_confidence && v.match_confidence !== 'high')
    .map(([k]) => k);

  if (name === 'player-mapping.json') {
    return { low_confidence_mapping_ids: lowConf, low_confidence_ratings_ids: [] };
  }
  if (name === 'player-ratings.json') {
    return { low_confidence_ratings_ids: lowConf, low_confidence_mapping_ids: [] };
  }
  return { low_confidence_ratings_ids: [], low_confidence_mapping_ids: [] };
}

/**
 * Build a complete manifest object for a given data file path.
 */
function buildManifest(dataFilePath) {
  const name = basename(dataFilePath);
  return {
    manifest_version: '1.0',
    data_file: name,
    generated_at: new Date().toISOString(),
    source_commit: resolveGitSha(),
    scraper_version: '1.0.0',
    row_count: rowCount(dataFilePath),
    sha256: sha256File(dataFilePath),
    field_coverage: computeFieldCoverage(dataFilePath),
    ...computeLowConfidence(dataFilePath),
  };
}

// ---------------------------------------------------------------------------
// Verify mode
// ---------------------------------------------------------------------------
function verify() {
  let allOk = true;

  for (const fileName of DATA_FILES) {
    const dataPath = join(DATA_DIR, fileName);
    const manifestPath = join(DATA_DIR, fileName.replace('.json', '.manifest.json'));

    if (!existsSync(dataPath)) {
      console.error(`[verify-data-manifest] MISSING data file: ${dataPath}`);
      allOk = false;
      continue;
    }

    if (!existsSync(manifestPath)) {
      console.warn(`[verify-data-manifest] WARN no manifest for ${fileName} — skipping`);
      continue;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const currentHash = sha256File(dataPath);
    const currentRows = rowCount(dataPath);

    // sha256 check
    if (currentHash !== manifest.sha256) {
      console.error(
        `[verify-data-manifest] FAIL sha256 mismatch for ${fileName}\n` +
        `  manifest: ${manifest.sha256}\n` +
        `  current:  ${currentHash}\n` +
        `  Data file \`${fileName}\` has been edited post-manifest.\n` +
        `  Either regenerate the manifest (rerun the ETL or \`npm run regenerate-manifests\`)\n` +
        `  or revert the data file edit. See plan §10 Gotchas.`
      );
      allOk = false;
      continue;
    }

    // row_count check
    if (currentRows !== manifest.row_count) {
      console.error(
        `[verify-data-manifest] FAIL row_count mismatch for ${fileName}\n` +
        `  manifest: ${manifest.row_count}\n` +
        `  current:  ${currentRows}\n` +
        `  File content drifted in row count — manifest must be regenerated.\n` +
        `  Run \`npm run regenerate-manifests\` after a legitimate data update.`
      );
      allOk = false;
      continue;
    }

    // Optional: coverage regression warning (> 1pp)
    if (manifest.field_coverage) {
      const currentCoverage = computeFieldCoverage(dataPath);
      if (currentCoverage) {
        for (const [key, recorded] of Object.entries(manifest.field_coverage)) {
          if (currentCoverage[key]) {
            const diff = recorded.pct - currentCoverage[key].pct;
            if (diff > 0.01) {
              console.warn(
                `[verify-data-manifest] WARN coverage regression in ${fileName}.${key}: ` +
                `manifest=${(recorded.pct * 100).toFixed(2)}% → current=${(currentCoverage[key].pct * 100).toFixed(2)}% ` +
                `(${(diff * 100).toFixed(2)}pp drop)`
              );
            }
          }
        }
      }
    }

    console.log(`[verify-data-manifest] OK  ${fileName} (${currentRows} rows, sha256: ${currentHash.substring(0, 8)}...)`);
  }

  if (!allOk) {
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Regenerate mode
// ---------------------------------------------------------------------------
function regenerate() {
  for (const fileName of DATA_FILES) {
    const dataPath = join(DATA_DIR, fileName);
    const manifestPath = join(DATA_DIR, fileName.replace('.json', '.manifest.json'));

    if (!existsSync(dataPath)) {
      console.error(`[verify-data-manifest] MISSING data file: ${dataPath}`);
      continue;
    }

    const manifest = buildManifest(dataPath);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(
      `[verify-data-manifest] WROTE ${manifestPath.replace(ROOT + '/', '')} ` +
      `(${manifest.row_count} rows, sha256: ${manifest.sha256.substring(0, 8)}...)`
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
if (REGENERATE) {
  regenerate();
} else {
  verify();
}

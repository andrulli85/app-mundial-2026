/**
 * domi-seed.ts — Demo collection seeder for Domi's missing cards.
 *
 * Demo data: Domi's missing cards from figuritas.app — replace with real Firebase
 * user state in Phase 5b.
 *
 * Strategy (mirrors figuritas-import.ts overwrite-limpio pattern):
 *   - For every team_code in DOMI_MISSING: stickers in the missing set → count=0,
 *     stickers NOT in the missing set → count=1.
 *   - Teams NOT listed in DOMI_MISSING are left untouched (teams Domi has complete).
 *   - Seed is idempotent: guarded by profile key "domi_seed_v1" so it only runs once
 *     per device/IDB instance.
 *
 * Usage:
 *   await applyDomiSeedIfNeeded();   // call once on album mount
 */

import rawMissing from "@/data/domi-missing.json";
import { getCatalog } from "@/lib/catalog";
import { bulkSetStickers, getProfile, setProfile } from "@/lib/db";

// ---------------------------------------------------------------------------
// Build the MISSING set from the static JSON.
// Exclude the "_comment" meta-key — it's documentation, not data.
// ---------------------------------------------------------------------------

type DomiMissingRaw = Record<string, number[] | string>;

const domiRaw = rawMissing as DomiMissingRaw;

/**
 * Set of "TEAMCODE-NUMBER" tuples representing Domi's missing cards.
 * Computed once at module load time.
 */
export const DOMI_MISSING: Set<string> = new Set(
  Object.entries(domiRaw)
    .filter(([key]) => !key.startsWith("_")) // skip meta-keys like "_comment"
    .flatMap(([teamCode, numbers]) =>
      (numbers as number[]).map((n) => `${teamCode}-${n}`)
    )
);

/**
 * The set of team_codes covered by Domi's missing list.
 * Only these teams will have their IndexedDB counts seeded.
 */
export const DOMI_TEAM_CODES: Set<string> = new Set(
  Object.keys(domiRaw).filter((k) => !k.startsWith("_"))
);

// Profile key used to guard against double-seeding
const SEED_VERSION_KEY = "domi_seed_v1";

/**
 * Applies Domi's missing-card seed to IndexedDB if it hasn't been applied yet.
 *
 * - Checks profile key "domi_seed_v1"; if truthy, returns immediately (already seeded).
 * - Loads the catalog, resolves (team_code, number) tuples to sticker_ids.
 * - For each sticker in the affected teams:
 *     owned → count=1
 *     missing → count=0
 * - Writes entries via bulkSetStickers, then marks the seed as applied.
 *
 * Returns a summary object for console reporting.
 */
export async function applyDomiSeedIfNeeded(): Promise<{
  skipped: boolean;
  owned: number;
  missing: number;
  unmatched: string[];
}> {
  // Guard: already seeded on this device
  const existing = await getProfile(SEED_VERSION_KEY);
  if (existing) {
    return { skipped: true, owned: 0, missing: 0, unmatched: [] };
  }

  const catalog = await getCatalog();
  const now = Date.now();

  // Build (team_code, number) → sticker_id lookup
  const lookup = new Map<string, string>();
  for (const s of catalog) {
    if (s.team_code && s.number !== null) {
      lookup.set(`${s.team_code}-${s.number}`, s.id);
    }
  }

  // Track unmatched tuples (team_code-number combos with no catalog entry)
  const unmatched: string[] = [];
  for (const tuple of DOMI_MISSING) {
    if (!lookup.has(tuple)) {
      unmatched.push(tuple);
    }
  }
  if (unmatched.length > 0) {
    console.warn("[domi-seed] Unmatched tuples (no catalog entry):", unmatched);
  }

  // Build IndexedDB entries for all affected team stickers
  const entries: { sticker_id: string; count: number; acquired_at: number }[] = [];
  let ownedCount = 0;
  let missingCount = 0;

  for (const s of catalog) {
    // Only seed teams that appear in Domi's missing list
    if (!DOMI_TEAM_CODES.has(s.team_code)) continue;
    if (s.number === null) continue; // skip non-numbered stickers (extras)

    const tuple = `${s.team_code}-${s.number}`;
    const isMissing = DOMI_MISSING.has(tuple);

    entries.push({
      sticker_id: s.id,
      count: isMissing ? 0 : 1,
      acquired_at: now,
    });

    if (isMissing) {
      missingCount++;
    } else {
      ownedCount++;
    }
  }

  await bulkSetStickers(entries);
  await setProfile(SEED_VERSION_KEY, new Date(now).toISOString());

  console.info(
    `[domi-seed] Seeded ${entries.length} stickers: ${ownedCount} owned, ${missingCount} missing.`
  );

  return { skipped: false, owned: ownedCount, missing: missingCount, unmatched };
}

/**
 * Resets the domi seed guard so it can be re-applied on next page load.
 * Useful for debugging or re-seeding after catalog changes.
 */
export async function resetDomiSeed(): Promise<void> {
  const { setProfile } = await import("@/lib/db");
  await setProfile(SEED_VERSION_KEY, "");
}

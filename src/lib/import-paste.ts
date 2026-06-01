/**
 * import-paste.ts — Parse "me faltan" text + compute owned sticker_ids.
 *
 * Two exports:
 *   parseMeFaltanPaste(text)         → { [team_code: string]: number[] }
 *   computeOwnedFromCatalog(missing, catalog) → sticker_id[]
 *
 * Handles Andy's exact format:
 *   "FWC 🏆: 1, 2, 3"  (missing numbers, may span multiple sub-rows for FWC)
 *   "MEX 🇲🇽: 1, 5, 10"
 *   "TUR 🇹🇷: 1, 2, 3"
 *
 * FWC sub-rows (🏆 🌎 📜) are collapsed into a single "FWC" key.
 * This lib is for future use — when Domi gets new stickers Andy can paste
 * an updated list to recalculate what's owned.
 */

import type { Sticker } from "@/lib/catalog";

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parses Andy's "me faltan" paste into a map of team_code → missing numbers.
 *
 * Rules:
 * - Lines with a colon split into "left : right" form.
 * - Left side: first whitespace-delimited token is the team code (uppercased).
 * - FWC sub-row emojis (🏆 🌎 📜) all map to team_code "FWC".
 * - Right side: comma-separated integers (missing sticker numbers).
 * - Duplicates within the same team are deduplicated.
 * - Lines without a colon are skipped silently.
 */
export function parseMeFaltanPaste(text: string): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const left = line.slice(0, colonIdx).trim();
    const right = line.slice(colonIdx + 1).trim();

    // First whitespace-delimited token = team code (strip emoji prefix/suffix)
    const firstToken = left.split(/\s/)[0].toUpperCase();
    if (!firstToken) continue;

    // FWC sub-row codes collapse to "FWC"
    const teamCode = firstToken === "FWC" ? "FWC" : firstToken;

    // Parse comma-separated numbers
    const numbers: number[] = [];
    for (const part of right.split(",")) {
      const n = parseInt(part.trim(), 10);
      if (!isNaN(n) && n > 0) {
        numbers.push(n);
      }
    }

    if (numbers.length === 0) continue;

    // Merge into existing team entry (handles FWC multi-row)
    const existing = result[teamCode] ?? [];
    const merged = [...existing, ...numbers];
    result[teamCode] = [...new Set(merged)];
  }

  return result;
}

// ---------------------------------------------------------------------------
// Compute owned from catalog
// ---------------------------------------------------------------------------

/**
 * Given a map of team_code → missing numbers and the full sticker catalog,
 * returns the sticker_ids that Domi OWNS (i.e., present in catalog for
 * affected teams but NOT in the missing set).
 *
 * Teams not present in `missing` are excluded entirely.
 */
export function computeOwnedFromCatalog(
  missing: Record<string, number[]>,
  catalog: Sticker[]
): string[] {
  const owned: string[] = [];

  for (const [teamCodeRaw, missingNumbers] of Object.entries(missing)) {
    const teamCode = teamCodeRaw.toUpperCase();
    const missingSet = new Set(missingNumbers);

    for (const sticker of catalog) {
      if (sticker.team_code.toUpperCase() !== teamCode) continue;
      if (sticker.number === null) continue;
      if (!missingSet.has(sticker.number)) {
        owned.push(sticker.id);
      }
    }
  }

  return owned;
}

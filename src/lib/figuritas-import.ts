/**
 * Figuritas.app import — parser + DB write logic.
 *
 * Parses the "Me faltan" WhatsApp export from Figuritas.app and maps it
 * to our sticker catalog using (team_code, number) → sticker_id lookup.
 *
 * Overwrite-limpio strategy:
 *   - Only team_codes present in the import are modified.
 *   - For each affected team: stickers IN the missing set → count=0,
 *     stickers NOT in the missing set → count=1.
 *   - acquired_at is reset to import time for all modified stickers.
 *   - Teams not in the import (e.g., panini-00) are left untouched.
 */

import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import { bulkSetStickers } from "@/lib/db";
import type { StickerEntry } from "@/lib/db";

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export interface ParsedLine {
  teamCode: string;
  missingNumbers: number[];
}

export interface ParseResult {
  parsed: ParsedLine[];
  unmatched: string[];
}

/**
 * Parses the Figuritas.app "Me faltan" text export.
 *
 * Header/footer lines skipped:
 *   - "Figuritas App - Lista"
 *   - "Usa ..." (any line starting with "Usa")
 *   - "Me faltan"
 *   - "Descarga la app"
 *   - Lines starting with "https://"
 *   - Empty lines
 *
 * Data lines: "<TEAM_CODE> <emoji(s)>: <numbers>"
 *   - Split on first ":" and trim both sides.
 *   - Left side: split on whitespace, take first token as team_code (uppercase).
 *   - Right side: comma-separated integers.
 */
export function parseFiguritasText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const parsed: ParsedLine[] = [];
  const unmatched: string[] = [];

  const SKIP_PATTERNS = [
    /^Figuritas App/i,
    /^Usa\s/i,
    /^Me faltan/i,
    /^Descarga la app/i,
    /^https?:\/\//i,
  ];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip known header/footer lines
    if (SKIP_PATTERNS.some((re) => re.test(line))) continue;

    // Expect a colon separating code from numbers
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      unmatched.push(line);
      continue;
    }

    const left = line.slice(0, colonIdx).trim();
    const right = line.slice(colonIdx + 1).trim();

    // Team code is the first whitespace-delimited token (ignores emoji suffix)
    const firstToken = left.split(/\s/)[0].toUpperCase();
    if (!firstToken) {
      unmatched.push(line);
      continue;
    }

    // Parse comma-separated numbers
    const numbers: number[] = [];
    for (const part of right.split(",")) {
      const n = parseInt(part.trim(), 10);
      if (!isNaN(n) && n > 0) {
        numbers.push(n);
      }
    }

    if (numbers.length === 0) {
      unmatched.push(line);
      continue;
    }

    parsed.push({ teamCode: firstToken, missingNumbers: numbers });
  }

  return { parsed, unmatched };
}

// ---------------------------------------------------------------------------
// Lookup + DB write
// ---------------------------------------------------------------------------

export interface ImportPreview {
  /** Total sticker_ids resolved from catalog across all imported teams */
  totalResolved: number;
  /** Number of stickers in the "me faltan" (missing) set */
  missingCount: number;
  /** Number of stickers that will be marked as owned (count=1) */
  ownedCount: number;
  /** Team codes found in the import that match our catalog */
  affectedTeamCodes: string[];
  /** Team codes found in the import that do NOT exist in our catalog */
  unknownTeamCodes: string[];
  /** Team codes in our catalog that were NOT in the import (untouched) */
  untouchedTeamCodes: string[];
  /** Raw parse unmatched lines */
  unmatchedLines: string[];
}

/** Build a lookup map: "TEAMCODE-NUMBER" → sticker_id */
function buildLookup(catalog: Sticker[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of catalog) {
    if (s.team_code) {
      map.set(`${s.team_code}-${s.number}`, s.id);
    }
  }
  return map;
}

/** Returns the set of team_codes present in the catalog (excluding empty/panini). */
function catalogTeamCodes(catalog: Sticker[]): Set<string> {
  const codes = new Set<string>();
  for (const s of catalog) {
    if (s.team_code) codes.add(s.team_code);
  }
  return codes;
}

export async function previewImport(text: string): Promise<ImportPreview> {
  const { parsed, unmatched } = parseFiguritasText(text);
  const catalog = await getCatalog();
  const lookup = buildLookup(catalog);
  const allCatalogCodes = catalogTeamCodes(catalog);

  const importedCodes = new Set(parsed.map((p) => p.teamCode));
  const missingSet = new Set<string>();
  const affectedTeamCodes: string[] = [];
  const unknownTeamCodes: string[] = [];

  for (const { teamCode, missingNumbers } of parsed) {
    if (!allCatalogCodes.has(teamCode)) {
      unknownTeamCodes.push(teamCode);
      continue;
    }
    affectedTeamCodes.push(teamCode);
    for (const n of missingNumbers) {
      const stickerKey = `${teamCode}-${n}`;
      const stickerId = lookup.get(stickerKey);
      if (stickerId) {
        missingSet.add(stickerId);
      }
    }
  }

  // Stickers in affected teams that are NOT missing → owned
  const affectedSet = new Set(affectedTeamCodes);
  let ownedCount = 0;
  let totalResolved = 0;
  for (const s of catalog) {
    if (!affectedSet.has(s.team_code)) continue;
    totalResolved++;
    if (!missingSet.has(s.id)) {
      ownedCount++;
    }
  }

  const untouchedTeamCodes = [...allCatalogCodes]
    .filter((c) => !importedCodes.has(c))
    .sort();

  return {
    totalResolved,
    missingCount: missingSet.size,
    ownedCount,
    affectedTeamCodes,
    unknownTeamCodes,
    untouchedTeamCodes,
    unmatchedLines: unmatched,
  };
}

/**
 * Writes import results to IndexedDB using overwrite-limpio strategy.
 * Returns number of sticker entries written.
 */
export async function executeImport(text: string): Promise<number> {
  const { parsed } = parseFiguritasText(text);
  const catalog = await getCatalog();
  const lookup = buildLookup(catalog);
  const allCatalogCodes = catalogTeamCodes(catalog);

  const affectedTeamCodes = new Set<string>();
  const missingSet = new Set<string>();

  for (const { teamCode, missingNumbers } of parsed) {
    if (!allCatalogCodes.has(teamCode)) continue;
    affectedTeamCodes.add(teamCode);
    for (const n of missingNumbers) {
      const stickerId = lookup.get(`${teamCode}-${n}`);
      if (stickerId) {
        missingSet.add(stickerId);
      }
    }
  }

  const now = Date.now();
  const entries: StickerEntry[] = [];

  for (const s of catalog) {
    if (!affectedTeamCodes.has(s.team_code)) continue;
    entries.push({
      sticker_id: s.id,
      count: missingSet.has(s.id) ? 0 : 1,
      acquired_at: now,
    });
  }

  await bulkSetStickers(entries);
  return entries.length;
}

/**
 * player-meta.ts — Deterministic player metadata layer.
 *
 * For each player sticker in the catalog, computes:
 *   - position: 'POR' | 'DEF' | 'MED' | 'DEL'
 *   - ovr:      integer 65–93 (Overall rating)
 *   - rarity:   'common' | 'rare' | 'epic' | 'legendary'
 *
 * Catalog notes for FIFA 2026 sticker set:
 *   - Sticker numbers start at 2 (no #1 in catalog; #2 = GK per Panini convention)
 *   - Each team section has 18 stickers (numbers 2–20, skipping 13)
 *   - type === 'player' filters non-player stickers
 *
 * Position heuristic (adapted from Panini convention for this catalog):
 *   #2          → POR (goalkeeper)
 *   #3–5        → DEF (defenders)
 *   #6–11       → MED (midfielders)
 *   #12–20      → DEL (forwards / attackers)
 *
 * OVR heuristic:
 *   Lower sticker numbers get higher OVR (starters are listed first).
 *   Deterministic jitter via sticker_id hash (0–7 range).
 *   Final OVR clamped to [65, 93].
 *
 * Results are cached in-memory so the same sticker always returns the same meta.
 */

import type { Sticker } from "@/lib/catalog";
import playerRatings from "@/data/player-ratings.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Position = "POR" | "DEF" | "MED" | "DEL";
export type Rarity = "common" | "rare" | "epic" | "legendary";

// ---------------------------------------------------------------------------
// Real-ratings lookup layer
// ---------------------------------------------------------------------------

interface PlayerRatingEntry {
  ovr: number;
  position: Position;
  real_name?: string;
  match_confidence?: "high" | "medium" | "low";
}

const PLAYER_RATINGS = playerRatings as Record<string, PlayerRatingEntry>;

export interface PlayerMeta {
  position: Position;
  ovr: number;
  rarity: Rarity;
}

// ---------------------------------------------------------------------------
// Deterministic hash: maps sticker_id string → small integer (0–7)
// Uses a simple djb2-style hash for determinism across reloads.
// ---------------------------------------------------------------------------

function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0; // ensure unsigned 32-bit
  }
  return h % 8; // 0–7 jitter
}

// ---------------------------------------------------------------------------
// OVR base table by sticker number
// Lower numbers = starters / more prominent players → higher OVR
// ---------------------------------------------------------------------------

const BASE_OVR_BY_NUMBER: Record<number, number> = {
  2:  89, // GK — typically the first-choice keeper
  3:  84, // Defenders
  4:  82,
  5:  80,
  6:  83, // Midfielders
  7:  81,
  8:  80,
  9:  79,
  10: 85, // #10 = playmaker — usually a star
  11: 78,
  12: 83, // Forwards
  14: 81,
  15: 79,
  16: 78,
  17: 77,
  18: 75,
  19: 74,
  20: 72,
};

const DEFAULT_OVR = 75;

// ---------------------------------------------------------------------------
// Compute meta for a single sticker
// ---------------------------------------------------------------------------

function computeMeta(sticker: Sticker): PlayerMeta | null {
  if (sticker.type !== "player") return null;
  if (sticker.number === null) return null;

  // Real-ratings lookup — consulted first; falls through to deterministic logic on miss.
  const rated = PLAYER_RATINGS[sticker.id];
  if (rated) {
    const { ovr, position } = rated;
    let rarity: Rarity;
    if (ovr >= 89) rarity = "legendary";
    else if (ovr >= 85) rarity = "epic";
    else if (ovr >= 78) rarity = "rare";
    else rarity = "common";
    return { position, ovr, rarity };
  }

  const n = sticker.number;

  // Position
  let position: Position;
  if (n === 2) position = "POR";
  else if (n >= 3 && n <= 5) position = "DEF";
  else if (n >= 6 && n <= 11) position = "MED";
  else position = "DEL";

  // OVR
  const base = BASE_OVR_BY_NUMBER[n] ?? DEFAULT_OVR;
  const jitter = simpleHash(sticker.id) - 4; // −4..+3
  const ovr = Math.max(65, Math.min(93, base + jitter));

  // Rarity
  let rarity: Rarity;
  if (ovr >= 89) rarity = "legendary";
  else if (ovr >= 85) rarity = "epic";
  else if (ovr >= 78) rarity = "rare";
  else rarity = "common";

  return { position, ovr, rarity };
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const _cache = new Map<string, PlayerMeta>();

export function getPlayerMeta(sticker: Sticker): PlayerMeta | null {
  if (sticker.type !== "player") return null;
  if (_cache.has(sticker.id)) return _cache.get(sticker.id)!;
  const meta = computeMeta(sticker);
  if (meta) _cache.set(sticker.id, meta);
  return meta;
}

/** Convenience: get player meta by sticker_id from a catalog map */
export function getPlayerMetaById(
  stickerId: string,
  catalogMap: Map<string, Sticker>
): PlayerMeta | null {
  const sticker = catalogMap.get(stickerId);
  if (!sticker) return null;
  return getPlayerMeta(sticker);
}

// ---------------------------------------------------------------------------
// Catalog map builder (utility for consumers)
// ---------------------------------------------------------------------------

export function buildCatalogMap(stickers: Sticker[]): Map<string, Sticker> {
  return new Map(stickers.map((s) => [s.id, s]));
}

// ---------------------------------------------------------------------------
// OVR / Chemistry calculators (used by SquadBuilder)
// ---------------------------------------------------------------------------

export function calcOVR(
  lineup: Record<string, string>,
  slotIds: string[],
  catalogMap: Map<string, Sticker>
): number {
  const ids = slotIds.map((sid) => lineup[sid]).filter(Boolean);
  if (!ids.length) return 0;
  const total = ids.reduce((sum, id) => {
    const meta = getPlayerMetaById(id, catalogMap);
    return sum + (meta?.ovr ?? 75);
  }, 0);
  return Math.round(total / ids.length);
}

export function calcChem(
  lineup: Record<string, string>,
  slotIds: string[],
  catalogMap: Map<string, Sticker>
): number {
  const ids = slotIds.map((sid) => lineup[sid]).filter(Boolean);
  if (!ids.length) return 0;

  // Chemistry = pairs of players from the same team (nation-based)
  const byNation: Record<string, number> = {};
  ids.forEach((id) => {
    const sticker = catalogMap.get(id);
    const nation = sticker?.team_code ?? "?";
    byNation[nation] = (byNation[nation] ?? 0) + 1;
  });

  let links = 0;
  Object.values(byNation).forEach((k) => {
    links += (k * (k - 1)) / 2;
  });

  const fillRatio = ids.length / slotIds.length;
  return Math.min(100, Math.round((28 + links * 8) * fillRatio));
}

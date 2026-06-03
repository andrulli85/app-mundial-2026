/**
 * Sticker catalog — loaded from stickers.json (stickers-enriched.json, Stream B) at build time.
 *
 * Stream B delivers the authoritative dataset with:
 *   - sticker_id  — canonical short-form ID (e.g. "mex-3-vasquez", "fwc-01")
 *   - team_color  — per-sticker hex color (replaces the old hardcoded TEAM_COLORS map)
 *   - sort_order  — integer driving album display order
 *   - display_name — uppercased display string
 *
 * The Sticker interface keeps `id` as the canonical key (mapped from sticker_id)
 * so callers (album page, StickerCard, db.ts) are unaffected.
 *
 * ---------------------------------------------------------------------------
 * APP-SIDE PRODUCT FIELDS
 * ---------------------------------------------------------------------------
 * The base catalog is sourced from the mission-control ETL pipeline
 * (`tools/scripts/mundial-2026-visuals/generate-enriched-dataset.mjs`).
 * The following fields are APP-SIDE product fields, added in commit 976ba4a
 * (2026-06-01) — they are NOT produced by the ETL and must NOT be backfilled
 * into it:
 *
 *   variant        — "base" | "extra-gold"
 *                    drives variant display (all 980 current entries are "base";
 *                    "extra-gold" is a planned product value)
 *
 *   rarity_tier    — "common" | "team"
 *                    drives gold border CSS + /album/doradas filter
 *
 *   base_player_id — string | null  (100% null across all 980 entries as of 2026-06-02)
 *                    scheduled for removal in Phase 4.1
 *
 * See docs/learnings/2026-06-02-albumix-field-drift-trace.md for the full trace.
 * Zod validation: src/data/stickers.schema.ts (EtlStickerSchema / AppStickerSchema).
 * ---------------------------------------------------------------------------
 */

export type StickerType = "player" | "team_logo" | "team_photo" | "fwc" | "panini_special" | "extra";

export interface Sticker {
  id: string;           // canonical sticker_id (e.g. "mex-3-vasquez")
  code: string;         // album code (e.g. "MEX 3")
  name: string;         // player/sticker name
  display_name: string; // uppercased display name
  team: string;         // full team name
  team_code: string;    // ISO-ish team code (e.g. "MEX")
  number: number | null;  // sticker number within team section (null for extras)
  type: StickerType;
  sort_order: number;   // album display order (0-based)
  seed_image?: string;  // public path e.g. "/stickers/seed/mex-3-vasquez.jpg"
  team_color: string;   // hex — from stickers-enriched.json (authoritative)
  group: string;        // FIFA 2026 group (A-L) or "_fwc" / "_end" for specials
  // Rarity fields (present on extra-gold stickers; undefined for base stickers)
  variant?: string;          // "base" | "extra-gold"
  rarity_tier?: string;      // "common" | "team" | "legend" | "rookie"
  base_player_id?: string | null;
}

export const DEFAULT_TEAM_COLOR = "#9ca3af";

// ---------- Seed manifest ----------
// Maps sticker_id → seed image filename.
// Written by scripts/import-seed.mjs after processing seed photos.

let seedManifest: Record<string, string> | null = null;

export async function getSeedManifest(): Promise<Record<string, string>> {
  if (seedManifest) return seedManifest;
  try {
    const res = await fetch("/stickers/seed-manifest.json");
    if (res.ok) {
      seedManifest = await res.json();
    } else {
      seedManifest = {};
    }
  } catch {
    seedManifest = {};
  }
  return seedManifest!;
}

// ---------- Raw schema (stickers-enriched.json) ----------

interface RawSticker {
  sticker_id: string;
  code: string;
  name: string;
  display_name: string;
  team: string;
  team_code: string;
  team_color: string;
  number: number | null;
  type: string;
  sort_order: number;
  group: string;
  // New optional rarity fields (present after schema upgrade)
  variant?: string;
  rarity_tier?: string;
  base_player_id?: string | null;
}

// ---------- Catalog loader ----------
// stickers.json is embedded at build time via dynamic import.

let _catalog: Sticker[] | null = null;

export async function getCatalog(): Promise<Sticker[]> {
  if (_catalog) return _catalog;

  const raw = (await import("@/data/stickers.json")).default as RawSticker[];
  const manifest = await getSeedManifest();

  // Sort by sort_order (enriched dataset guarantees this, but sort defensively)
  const sorted = [...raw].sort((a, b) => a.sort_order - b.sort_order);

  _catalog = sorted.map((s) => ({
    id: s.sticker_id,
    code: s.code,
    name: s.name,
    display_name: s.display_name,
    team: s.team,
    team_code: s.team_code,
    number: s.number ?? null,
    type: s.type as StickerType,
    sort_order: s.sort_order,
    seed_image: manifest[s.sticker_id]
      ? `/stickers/seed/${manifest[s.sticker_id]}`
      : undefined,
    team_color: s.team_color ?? DEFAULT_TEAM_COLOR,
    group: s.group ?? "",
    // Rarity fields — passed through when present (extra-gold stickers)
    ...(s.variant !== undefined ? { variant: s.variant } : {}),
    ...(s.rarity_tier !== undefined ? { rarity_tier: s.rarity_tier } : {}),
    ...(s.base_player_id !== undefined ? { base_player_id: s.base_player_id } : {}),
  }));

  return _catalog;
}

/** Ordered list of canonical sticker IDs (by sort_order) */
export async function getOrderedIds(): Promise<string[]> {
  const catalog = await getCatalog();
  return catalog.map((s) => s.id);
}

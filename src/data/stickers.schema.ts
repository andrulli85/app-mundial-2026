/**
 * Zod schemas for Albumix data files.
 *
 * Split into two layers:
 *   EtlStickerSchema — fields produced by the mission-control ETL pipeline
 *                      (tools/scripts/mundial-2026-visuals/generate-enriched-dataset.mjs)
 *   AppStickerSchema — ETL fields + app-side product fields (commit 976ba4a, 2026-06-01)
 *
 * App-side fields (variant, rarity_tier, base_player_id) are NOT produced by
 * the ETL and must NOT be backfilled into it. See:
 *   docs/learnings/2026-06-02-albumix-field-drift-trace.md
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Sticker schemas
// ---------------------------------------------------------------------------

/** Fields produced by the mission-control ETL (mundial-2026-visuals). */
export const EtlStickerSchema = z.object({
  sticker_id: z.string(),
  code: z.string(),
  name: z.string(),
  display_name: z.string(),
  team: z.string(),
  team_code: z.string(),
  team_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  number: z.number().int().nullable(),
  type: z.enum(["player", "fwc", "team_logo", "team_photo", "panini_special"]),
  sort_order: z.number().int(),
  group: z.string(),
});

/**
 * Full app schema = ETL fields + app-side product fields.
 *
 * App-side fields as of 2026-06-02 (980 entries):
 *   variant        — all 980 entries are "base"; "extra-gold" is a planned product value
 *   rarity_tier    — "common" (932) | "team" (48)
 *   base_player_id — 100% null; scheduled for removal in Phase 4.1
 */
export const AppStickerSchema = EtlStickerSchema.extend({
  variant: z.enum(["base", "extra-gold"]),
  rarity_tier: z.enum(["common", "team"]),
  // `base_player_id` is 100% null in all 980 rows as of 2026-06-02.
  // Scheduled for removal in Phase 4.1 — kept nullable until then.
  base_player_id: z.string().nullable(),
});

export type EtlSticker = z.infer<typeof EtlStickerSchema>;
export type AppSticker = z.infer<typeof AppStickerSchema>;

// ---------------------------------------------------------------------------
// Player mapping schema (src/data/player-mapping.json)
// ---------------------------------------------------------------------------
// Record keyed by sticker_id (e.g. "mex-3-vasquez").
// fifa_player_id is always an integer (never null).
// fbref_id is null for ~736 of 980 entries (FBRef data pending).

const PlayerMappingEntrySchema = z.object({
  fifa_player_id: z.number().int(),
  fbref_id: z.string().nullable(),
  match_confidence: z.enum(["high", "medium", "low"]),
});

export const PlayerMappingSchema = z.record(z.string(), PlayerMappingEntrySchema);

export type PlayerMappingEntry = z.infer<typeof PlayerMappingEntrySchema>;
export type PlayerMapping = z.infer<typeof PlayerMappingSchema>;

// ---------------------------------------------------------------------------
// Player ratings schema (src/data/player-ratings.json)
// ---------------------------------------------------------------------------
// Record keyed by sticker_id (e.g. "mex-3-vasquez").

const PlayerRatingsEntrySchema = z.object({
  ovr: z.number().int(),
  position: z.string(),
  real_name: z.string(),
  match_confidence: z.enum(["high", "medium", "low"]),
});

export const PlayerRatingsSchema = z.record(z.string(), PlayerRatingsEntrySchema);

export type PlayerRatingsEntry = z.infer<typeof PlayerRatingsEntrySchema>;
export type PlayerRatings = z.infer<typeof PlayerRatingsSchema>;

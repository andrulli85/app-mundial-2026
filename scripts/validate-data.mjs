/**
 * validate-data.mjs — Albumix data file validation against Zod schemas.
 *
 * Validates src/data/{stickers,player-mapping,player-ratings}.json against
 * the schemas defined in src/data/stickers.schema.ts.
 *
 * Mirrors AppStickerSchema, PlayerMappingSchema, PlayerRatingsSchema in plain
 * JS so this script runs with bare `node` (no TypeScript runner required).
 * The canonical type definitions live in src/data/stickers.schema.ts.
 *
 * Usage: node scripts/validate-data.mjs
 * npm:   npm run validate-data
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Schema definitions (mirrors src/data/stickers.schema.ts)
// ---------------------------------------------------------------------------

// ETL-produced fields
const EtlStickerSchema = z.object({
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

// Full app schema = ETL fields + app-side product fields
// variant: all 980 current entries are "base"; "extra-gold" is a planned product value
// rarity_tier: "common" (932) | "team" (48)
// base_player_id: 100% null as of 2026-06-02, scheduled for removal in Phase 4.1
const AppStickerSchema = EtlStickerSchema.extend({
  variant: z.enum(["base", "extra-gold"]),
  rarity_tier: z.enum(["common", "team"]),
  base_player_id: z.string().nullable(),
});

// player-mapping.json — keyed by sticker_id
// fifa_player_id is always int; fbref_id is null for ~736/980 entries
const PlayerMappingSchema = z.record(
  z.string(),
  z.object({
    fifa_player_id: z.number().int(),
    fbref_id: z.string().nullable(),
    match_confidence: z.enum(["high", "medium", "low"]),
  })
);

// player-ratings.json — keyed by sticker_id
const PlayerRatingsSchema = z.record(
  z.string(),
  z.object({
    ovr: z.number().int(),
    position: z.string(),
    real_name: z.string(),
    match_confidence: z.enum(["high", "medium", "low"]),
  })
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJson(relPath) {
  const absPath = join(ROOT, relPath);
  try {
    return JSON.parse(readFileSync(absPath, "utf-8"));
  } catch (err) {
    console.error(`ERROR: Failed to read ${relPath}: ${err.message}`);
    process.exit(1);
  }
}

let allPassed = true;

function validateFile(label, data, schema) {
  const result = schema.safeParse(data);
  if (result.success) {
    const count = Array.isArray(data) ? data.length : Object.keys(data).length;
    console.log(`  OK  ${label} — ${count} entries`);
  } else {
    allPassed = false;
    console.error(`\n  FAIL  ${label}`);
    const issues = result.error.issues;
    const shown = issues.slice(0, 10);
    for (const issue of shown) {
      const path = issue.path.join(".");
      console.error(`    [${path || "(root)"}] ${issue.message}`);
    }
    if (issues.length > 10) {
      console.error(`    ... and ${issues.length - 10} more issue(s)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Run validation
// ---------------------------------------------------------------------------

console.log("Validating Albumix data files...\n");

validateFile(
  "stickers.json        → AppStickerSchema.array()",
  loadJson("src/data/stickers.json"),
  AppStickerSchema.array()
);

validateFile(
  "player-mapping.json  → PlayerMappingSchema",
  loadJson("src/data/player-mapping.json"),
  PlayerMappingSchema
);

validateFile(
  "player-ratings.json  → PlayerRatingsSchema",
  loadJson("src/data/player-ratings.json"),
  PlayerRatingsSchema
);

console.log("");

if (allPassed) {
  console.log("all schemas valid");
  process.exit(0);
} else {
  console.error("schema validation FAILED — fix errors above before building");
  process.exit(1);
}

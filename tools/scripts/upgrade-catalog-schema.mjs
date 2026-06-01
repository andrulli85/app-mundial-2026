/**
 * tools/scripts/upgrade-catalog-schema.mjs
 *
 * Additive schema upgrade for src/data/stickers.json.
 * Adds three new fields to every existing entry (non-breaking):
 *   - variant: "base"
 *   - rarity_tier: "common" (team_logo entries get "team")
 *   - base_player_id: null
 *
 * Usage:
 *   node tools/scripts/upgrade-catalog-schema.mjs [--dry-run]
 *
 * KNOWN_FLAGS: --dry-run, --help
 * Unknown flags → FATAL exit 2 (MC CLI standard)
 */

import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Flag validation — unknown flag = FATAL exit 2
// ---------------------------------------------------------------------------
const KNOWN_FLAGS = new Set(["--dry-run", "--help"]);
const rawArgs = process.argv.slice(2);
for (const arg of rawArgs) {
  if (arg.startsWith("--") && !KNOWN_FLAGS.has(arg)) {
    console.error(`FATAL: unknown flag "${arg}". Known flags: ${[...KNOWN_FLAGS].join(", ")}`);
    process.exit(2);
  }
}

const DRY_RUN = rawArgs.includes("--dry-run");
const HELP = rawArgs.includes("--help");

if (HELP) {
  console.log(`
upgrade-catalog-schema.mjs — additive schema upgrade for stickers.json

Usage:
  node tools/scripts/upgrade-catalog-schema.mjs [--dry-run]

Flags:
  --dry-run   Preview changes without writing files
  --help      Show this help

What it does:
  1. Backs up src/data/stickers.json → src/data/stickers.backup-pre-variants.json
  2. Adds variant, rarity_tier, base_player_id to every existing entry
  3. Preserves all existing fields exactly as-is
  `);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const STICKERS_PATH = path.join(REPO_ROOT, "src/data/stickers.json");
const BACKUP_PATH = path.join(REPO_ROOT, "src/data/stickers.backup-pre-variants.json");

console.log("upgrade-catalog-schema.mjs");
console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
console.log(`  Source: ${STICKERS_PATH}`);

const raw = readFileSync(STICKERS_PATH, "utf8");
const data = JSON.parse(raw);

console.log(`  Entries loaded: ${data.length}`);

// Count which entries already have the new fields
const alreadyUpgraded = data.filter((e) => "variant" in e).length;
const needsUpgrade = data.length - alreadyUpgraded;

console.log(`  Already upgraded (has 'variant'): ${alreadyUpgraded}`);
console.log(`  Needs upgrade: ${needsUpgrade}`);

if (needsUpgrade === 0) {
  console.log("  All entries already upgraded. Nothing to do.");
  process.exit(0);
}

// Apply upgrades
const upgraded = data.map((entry) => {
  if ("variant" in entry) return entry; // already done

  // Determine rarity_tier
  let rarity_tier = "common";
  if (entry.type === "team_logo") rarity_tier = "team";

  return {
    ...entry,
    variant: "base",
    rarity_tier,
    base_player_id: null,
  };
});

// Preview sample
console.log("\n  Sample upgraded entry (index 0):");
console.log("  ", JSON.stringify(upgraded[0], null, 2).split("\n").slice(0, 8).join("\n  "));

if (DRY_RUN) {
  console.log("\n  DRY RUN: no files written.");
  console.log(`  Would write backup to: ${BACKUP_PATH}`);
  console.log(`  Would write upgraded catalog to: ${STICKERS_PATH}`);
  console.log(`  Entries to upgrade: ${needsUpgrade}`);
  process.exit(0);
}

// Backup original
copyFileSync(STICKERS_PATH, BACKUP_PATH);
console.log(`\n  Backup written: ${BACKUP_PATH}`);

// Write upgraded
writeFileSync(STICKERS_PATH, JSON.stringify(upgraded, null, 2) + "\n", "utf8");
console.log(`  Upgraded catalog written: ${STICKERS_PATH}`);
console.log(`  Done. ${needsUpgrade} entries upgraded.`);

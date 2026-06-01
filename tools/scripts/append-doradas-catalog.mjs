/**
 * tools/scripts/append-doradas-catalog.mjs
 *
 * Appends 27 doradas (extra-gold) entries to src/data/stickers.json.
 * Each entry carries variant:"extra-gold", rarity_tier:"legend"|"rookie",
 * and a best-guess base_player_id linking back to the base catalog.
 *
 * Usage:
 *   node tools/scripts/append-doradas-catalog.mjs [--dry-run]
 *
 * KNOWN_FLAGS: --dry-run, --help
 * Unknown flags → FATAL exit 2 (MC CLI standard)
 */

import { readFileSync, writeFileSync } from "fs";
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
append-doradas-catalog.mjs — appends 27 doradas entries to stickers.json

Usage:
  node tools/scripts/append-doradas-catalog.mjs [--dry-run]

Flags:
  --dry-run   Preview entries without writing
  --help      Show this help
  `);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Doradas catalog definition (orchestrator-validated)
// base_player_id: resolved from base catalog; null = no base entry found
// ---------------------------------------------------------------------------
const DORADAS = [
  // Page 1 row 1 — portrait x5
  { sticker_id: "dor-bra-neymar",    code: "DOR 01", name: "Neymar Jr (Extra Gold)",         display_name: "NEYMAR JR — LEGEND",         team: "Brazil",       team_code: "BRA", team_color: "#FCD34D", number: null, sort_order: 9001, rarity_tier: "legend", base_player_id: null },           // not in 2026 BRA squad
  { sticker_id: "dor-egy-salah",      code: "DOR 02", name: "Mohamed Salah (Extra Gold)",      display_name: "MOHAMED SALAH — LEGEND",     team: "Egypt",        team_code: "EGY", team_color: "#FCD34D", number: null, sort_order: 9002, rarity_tier: "legend", base_player_id: "egy-17-salah" },
  { sticker_id: "dor-col-diaz",       code: "DOR 03", name: "Luis Díaz (Extra Gold)",          display_name: "LUIS DÍAZ — LEGEND",         team: "Colombia",     team_code: "COL", team_color: "#FCD34D", number: null, sort_order: 9003, rarity_tier: "legend", base_player_id: null },             // no base COL Diaz (Luis Díaz) found
  { sticker_id: "dor-uru-valverde",   code: "DOR 04", name: "Federico Valverde (Extra Gold)",  display_name: "FEDERICO VALVERDE — LEGEND", team: "Uruguay",      team_code: "URU", team_color: "#FCD34D", number: null, sort_order: 9004, rarity_tier: "legend", base_player_id: "uru-10-valverde" },
  { sticker_id: "dor-tur-guler",      code: "DOR 05", name: "Arda Güler (Extra Gold)",         display_name: "ARDA GÜLER — ROOKIE",        team: "Turkey",       team_code: "TUR", team_color: "#FCD34D", number: null, sort_order: 9005, rarity_tier: "rookie", base_player_id: "tur-14-guler" },

  // Page 1 row 2 — portrait x5
  { sticker_id: "dor-nor-haaland",    code: "DOR 06", name: "Erling Haaland (Extra Gold)",     display_name: "ERLING HAALAND — ROOKIE",    team: "Norway",       team_code: "NOR", team_color: "#FCD34D", number: null, sort_order: 9006, rarity_tier: "rookie", base_player_id: "nor-15-haaland" },
  { sticker_id: "dor-por-ronaldo",    code: "DOR 07", name: "Cristiano Ronaldo (Extra Gold)",  display_name: "CRISTIANO RONALDO — LEGEND", team: "Portugal",     team_code: "POR", team_color: "#FCD34D", number: null, sort_order: 9007, rarity_tier: "legend", base_player_id: "por-15-ronaldo" },
  { sticker_id: "dor-bel-courtois",   code: "DOR 08", name: "Thibaut Courtois (Extra Gold)",   display_name: "THIBAUT COURTOIS — LEGEND",  team: "Belgium",      team_code: "BEL", team_color: "#FCD34D", number: null, sort_order: 9008, rarity_tier: "legend", base_player_id: "bel-2-courtois" },
  { sticker_id: "dor-cro-modric",     code: "DOR 09", name: "Luka Modrić (Extra Gold)",        display_name: "LUKA MODRIĆ — LEGEND",       team: "Croatia",      team_code: "CRO", team_color: "#FCD34D", number: null, sort_order: 9009, rarity_tier: "legend", base_player_id: "cro-9-modric" },
  { sticker_id: "dor-sen-mane",       code: "DOR 10", name: "Sadio Mané (Extra Gold)",         display_name: "SADIO MANÉ — LEGEND",        team: "Senegal",      team_code: "SEN", team_color: "#FCD34D", number: null, sort_order: 9010, rarity_tier: "legend", base_player_id: "sen-15-mane" },

  // Page 1 row 3 — landscape x4
  { sticker_id: "dor-ned-vandijk",    code: "DOR 11", name: "Virgil van Dijk (Extra Gold)",    display_name: "VIRGIL VAN DIJK — LEGEND",   team: "Netherlands",  team_code: "NED", team_color: "#FCD34D", number: null, sort_order: 9011, rarity_tier: "legend", base_player_id: "ned-3-dijk" },
  { sticker_id: "dor-aus-ryan",       code: "DOR 12", name: "Mathew Ryan (Extra Gold)",        display_name: "MATHEW RYAN — LEGEND",       team: "Australia",    team_code: "AUS", team_color: "#FCD34D", number: null, sort_order: 9012, rarity_tier: "legend", base_player_id: "aus-2-ryan" },
  { sticker_id: "dor-arg-messi",      code: "DOR 13", name: "Lionel Messi (Extra Gold)",       display_name: "LIONEL MESSI — LEGEND",      team: "Argentina",    team_code: "ARG", team_color: "#FCD34D", number: null, sort_order: 9013, rarity_tier: "legend", base_player_id: "arg-17-messi" },
  { sticker_id: "dor-usa-pulisic",    code: "DOR 14", name: "Christian Pulisic (Extra Gold)",  display_name: "CHRISTIAN PULISIC — LEGEND", team: "USA",          team_code: "USA", team_color: "#FCD34D", number: null, sort_order: 9014, rarity_tier: "legend", base_player_id: "usa-16-pulisic" },

  // Page 2 row 1 — portrait x5
  { sticker_id: "dor-eng-palmer",     code: "DOR 15", name: "Cole Palmer (Extra Gold)",        display_name: "COLE PALMER — ROOKIE",       team: "England",      team_code: "ENG", team_color: "#FCD34D", number: null, sort_order: 9015, rarity_tier: "rookie", base_player_id: "eng-12-palmer" },
  { sticker_id: "dor-fra-mbappe",     code: "DOR 16", name: "Kylian Mbappé (Extra Gold)",      display_name: "KYLIAN MBAPPÉ — LEGEND",     team: "France",       team_code: "FRA", team_color: "#FCD34D", number: null, sort_order: 9016, rarity_tier: "legend", base_player_id: "fra-20-mbappe" },
  { sticker_id: "dor-alg-mahrez",     code: "DOR 17", name: "Riyad Mahrez (Extra Gold)",       display_name: "RIYAD MAHREZ — LEGEND",      team: "Algeria",      team_code: "ALG", team_color: "#FCD34D", number: null, sort_order: 9017, rarity_tier: "legend", base_player_id: "alg-15-mahrez" },
  { sticker_id: "dor-esp-yamal",      code: "DOR 18", name: "Lamine Yamal (Extra Gold)",       display_name: "LAMINE YAMAL — ROOKIE",      team: "Spain",        team_code: "ESP", team_color: "#FCD34D", number: null, sort_order: 9018, rarity_tier: "rookie", base_player_id: "esp-15-yamal" },
  { sticker_id: "dor-ger-musiala",    code: "DOR 19", name: "Jamal Musiala (Extra Gold)",      display_name: "JAMAL MUSIALA — ROOKIE",     team: "Germany",      team_code: "GER", team_color: "#FCD34D", number: null, sort_order: 9019, rarity_tier: "rookie", base_player_id: "ger-15-musiala" },

  // Page 2 row 2 — portrait x5
  { sticker_id: "dor-mex-mora",       code: "DOR 20", name: "Gilberto Mora (Extra Gold)",      display_name: "GILBERTO MORA — ROOKIE",     team: "Mexico",       team_code: "MEX", team_color: "#FCD34D", number: null, sort_order: 9020, rarity_tier: "rookie", base_player_id: null },             // not in base MEX catalog
  { sticker_id: "dor-par-gomez",      code: "DOR 21", name: "Diego Gómez (Extra Gold)",        display_name: "DIEGO GÓMEZ — ROOKIE",       team: "Paraguay",     team_code: "PAR", team_color: "#FCD34D", number: null, sort_order: 9021, rarity_tier: "rookie", base_player_id: "par-10-gomez" },
  { sticker_id: "dor-ecu-caicedo",    code: "DOR 22", name: "Moisés Caicedo (Extra Gold)",     display_name: "MOISÉS CAICEDO — LEGEND",    team: "Ecuador",      team_code: "ECU", team_color: "#FCD34D", number: null, sort_order: 9022, rarity_tier: "legend", base_player_id: "ecu-9-caicedo" },
  { sticker_id: "dor-cuw-bacuna",     code: "DOR 23", name: "Leandro Bacuna (Extra Gold)",     display_name: "LEANDRO BACUNA — LEGEND",    team: "Curaçao",      team_code: "CUW", team_color: "#FCD34D", number: null, sort_order: 9023, rarity_tier: "legend", base_player_id: "cuw-12-bacuna" },
  { sticker_id: "dor-mar-diaz",       code: "DOR 24", name: "Brahim Díaz (Extra Gold)",        display_name: "BRAHIM DÍAZ — ROOKIE",       team: "Morocco",      team_code: "MAR", team_color: "#FCD34D", number: null, sort_order: 9024, rarity_tier: "rookie", base_player_id: "mar-19-diaz" },

  // Page 2 row 3 — landscape x3
  { sticker_id: "dor-kor-son",        code: "DOR 25", name: "Son Heung-min (Extra Gold)",      display_name: "SON HEUNG-MIN — LEGEND",     team: "South Korea",  team_code: "KOR", team_color: "#FCD34D", number: null, sort_order: 9025, rarity_tier: "legend", base_player_id: "kor-18-son" },
  { sticker_id: "dor-swe-gyokeres",   code: "DOR 26", name: "Viktor Gyökeres (Extra Gold)",    display_name: "VIKTOR GYÖKERES — ROOKIE",   team: "Sweden",       team_code: "SWE", team_color: "#FCD34D", number: null, sort_order: 9026, rarity_tier: "rookie", base_player_id: "swe-20-gyokeres" },
  { sticker_id: "dor-jpn-kubo",       code: "DOR 27", name: "Takefusa Kubo (Extra Gold)",      display_name: "TAKEFUSA KUBO — ROOKIE",     team: "Japan",        team_code: "JPN", team_color: "#FCD34D", number: null, sort_order: 9027, rarity_tier: "rookie", base_player_id: "jpn-12-kubo" },
];

// Attach common extra fields
const DORADAS_ENTRIES = DORADAS.map((d) => ({
  sticker_id: d.sticker_id,
  code: d.code,
  name: d.name,
  display_name: d.display_name,
  team: d.team,
  team_code: d.team_code,
  team_color: d.team_color,
  number: d.number,
  type: "extra",
  sort_order: d.sort_order,
  group: "_doradas",
  variant: "extra-gold",
  rarity_tier: d.rarity_tier,
  base_player_id: d.base_player_id,
}));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const STICKERS_PATH = path.join(REPO_ROOT, "src/data/stickers.json");

console.log("append-doradas-catalog.mjs");
console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
console.log(`  Entries to append: ${DORADAS_ENTRIES.length}`);

const raw = readFileSync(STICKERS_PATH, "utf8");
const data = JSON.parse(raw);

// Check for duplicates
const existingIds = new Set(data.map((e) => e.sticker_id));
const newEntries = DORADAS_ENTRIES.filter((e) => !existingIds.has(e.sticker_id));
const duplicates = DORADAS_ENTRIES.filter((e) => existingIds.has(e.sticker_id));

console.log(`  Current catalog entries: ${data.length}`);
console.log(`  New entries (not yet in catalog): ${newEntries.length}`);
if (duplicates.length > 0) {
  console.log(`  Already present (skipping): ${duplicates.map((e) => e.sticker_id).join(", ")}`);
}

// Report null base_player_ids
const nullBases = DORADAS_ENTRIES.filter((e) => e.base_player_id === null);
console.log(`\n  base_player_id = null (${nullBases.length} entries — review manually):`);
nullBases.forEach((e) => {
  console.log(`    ${e.sticker_id} | ${e.name}`);
});

if (newEntries.length === 0) {
  console.log("\n  All doradas already in catalog. Nothing to do.");
  process.exit(0);
}

if (DRY_RUN) {
  console.log("\n  DRY RUN — first 3 new entries:");
  newEntries.slice(0, 3).forEach((e) => {
    console.log("  ", JSON.stringify(e, null, 2).replace(/\n/g, "\n  "));
  });
  console.log(`\n  Would append ${newEntries.length} entries. No files written.`);
  process.exit(0);
}

// Append
const merged = [...data, ...newEntries];
writeFileSync(STICKERS_PATH, JSON.stringify(merged, null, 2) + "\n", "utf8");
console.log(`\n  Written: ${STICKERS_PATH}`);
console.log(`  Total entries now: ${merged.length} (was ${data.length}, added ${newEntries.length})`);

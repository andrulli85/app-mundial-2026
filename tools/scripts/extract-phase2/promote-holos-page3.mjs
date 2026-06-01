/**
 * Promote 16 holographic country shields from escudos-holos page 3.
 * Mapping visually verified by orchestrator.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../..');
const QUAR = path.join(REPO, 'tools/scripts/extract-phase2/quarantine/escudos-holos/cells');
const SEED = path.join(REPO, 'public/stickers/seed');
const MANIFEST = path.join(REPO, 'public/stickers/seed-manifest.json');
const CATALOG = path.join(REPO, 'src/data/stickers.json');

const mapping = [
  { cell: 1,  iso: 'CIV' }, { cell: 2,  iso: 'CUW' }, { cell: 3,  iso: 'EGY' }, { cell: 4,  iso: 'SCO' },
  { cell: 5,  iso: 'COL' }, { cell: 6,  iso: 'JPN' }, { cell: 7,  iso: 'JOR' }, { cell: 8,  iso: 'IRN' },
  { cell: 9,  iso: 'IRQ' }, { cell: 10, iso: 'COD' }, { cell: 11, iso: 'FRA' }, { cell: 12, iso: 'NZL' },
  { cell: 13, iso: 'CRO' }, { cell: 14, iso: 'TUN' }, { cell: 15, iso: 'ECU' }, { cell: 16, iso: 'SWE' },
];

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const teamLookup = {};
for (const s of catalog) if (s.type === 'team_logo' && s.team_code) teamLookup[s.team_code] = s;

const SORT_BASE = 11020; // After page 1 holos
const newEntries = [];
let copied = 0, skipped = 0;

for (let i = 0; i < mapping.length; i++) {
  const { cell, iso } = mapping[i];
  const base = teamLookup[iso];
  if (!base) { console.log(`SKIP ${iso}`); skipped++; continue; }
  const src = path.join(QUAR, `p3-cell-${String(cell).padStart(2, '0')}.jpg`);
  const id = `holo-${iso.toLowerCase()}`;
  if (manifest[id]) { console.log(`SKIP ${id} already exists`); skipped++; continue; }
  if (!fs.existsSync(src)) { console.log(`SKIP ${iso} no src`); skipped++; continue; }
  const destName = `${id}.jpg`;
  fs.copyFileSync(src, path.join(SEED, destName));
  copied++;
  manifest[id] = destName;
  newEntries.push({
    sticker_id: id, code: `HOLO ${iso}`,
    name: `${base.team} (Hologram)`, display_name: `${base.team.toUpperCase()} ✨ HOLO`,
    team: base.team, team_code: iso, team_color: base.team_color,
    number: null, type: 'hologram',
    sort_order: SORT_BASE + i, group: '_hologramas',
    variant: 'hologram', rarity_tier: 'hologram',
    base_player_id: base.sticker_id,
  });
  console.log(`OK ${id} (${base.team})`);
}

fs.writeFileSync(CATALOG, JSON.stringify(catalog.concat(newEntries), null, 2));
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');

console.log(`\nCopied=${copied} Catalog+${newEntries.length} (${catalog.length + newEntries.length} total) Manifest=${Object.keys(sorted).length} Skipped=${skipped}`);

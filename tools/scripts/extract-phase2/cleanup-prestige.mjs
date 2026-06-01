/**
 * Cleanup prestige content per Andy's design decision 2026-06-01:
 * "Borrar y volver al estilo único" (Fase 1 design alignment).
 *
 * Removes:
 *   - 27 doradas (dor-*)
 *   - 32 hologramas (holo-*)
 *   - 8 campeones (champ-*)
 *   Total: 67 catalog entries + 67 JPEGs
 *
 * Does NOT touch:
 *   - StickerCardFut.tsx (Fase 2 card rewrite)
 *   - rarity-mock.ts (no callers will produce gold/purple tiers anymore)
 *   - Route files /album/doradas + /album/historia (deleted separately)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../..');
const SEED = path.join(REPO, 'public/stickers/seed');
const MANIFEST = path.join(REPO, 'public/stickers/seed-manifest.json');
const CATALOG = path.join(REPO, 'src/data/stickers.json');

const PREFIXES = ['dor-', 'holo-', 'champ-'];

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

const before = { catalog: catalog.length, manifest: Object.keys(manifest).length };

// Filter catalog
const filtered = catalog.filter(s => !PREFIXES.some(p => s.sticker_id.startsWith(p)));
const removedEntries = catalog.filter(s => PREFIXES.some(p => s.sticker_id.startsWith(p)));

// Filter manifest
const filteredManifest = Object.fromEntries(
  Object.entries(manifest).filter(([k]) => !PREFIXES.some(p => k.startsWith(p)))
);

// Collect JPEGs to delete
const jpegsToDelete = Object.entries(manifest)
  .filter(([k]) => PREFIXES.some(p => k.startsWith(p)))
  .map(([, filename]) => path.join(SEED, filename));

let deleted = 0;
for (const f of jpegsToDelete) {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    deleted++;
  }
}

fs.writeFileSync(CATALOG, JSON.stringify(filtered, null, 2));
fs.writeFileSync(MANIFEST, JSON.stringify(filteredManifest, null, 2) + '\n');

console.log(`Before: catalog=${before.catalog} manifest=${before.manifest}`);
console.log(`Removed: ${removedEntries.length} catalog entries`);
console.log(`  Doradas: ${removedEntries.filter(s => s.sticker_id.startsWith('dor-')).length}`);
console.log(`  Hologramas: ${removedEntries.filter(s => s.sticker_id.startsWith('holo-')).length}`);
console.log(`  Campeones: ${removedEntries.filter(s => s.sticker_id.startsWith('champ-')).length}`);
console.log(`Deleted JPEGs: ${deleted}/${jpegsToDelete.length}`);
console.log(`After: catalog=${filtered.length} manifest=${Object.keys(filteredManifest).length}`);

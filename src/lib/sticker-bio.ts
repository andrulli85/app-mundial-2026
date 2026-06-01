/**
 * sticker-bio — deterministic bio placeholder for any sticker.
 *
 * Uses the same formula as data.jsx lines 70-78 (seeded by sticker_id hash).
 * The hash ensures the same sticker always gets the same bio data across renders.
 */

const CLUBS = [
  "CD Albo", "Real Andes", "Atlético Sur", "FC Pacífico", "Unión Costa",
  "Dep. Cumbre", "Sporting Valle", "Club Litoral", "Racing Norte", "CF Pradera",
];

/** Simple deterministic hash (same algorithm as rarity-mock.ts) */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface StickerBio {
  born: string;   // "DD-MM-YYYY"
  height: number; // cm
  weight: number; // kg
  club: string;   // "CD Albo (ARG)"
}

/**
 * Returns a deterministic bio for any sticker_id.
 * Values are fictional placeholders — not real player data.
 */
export function getBio(stickerId: string, teamCode: string = ""): StickerBio {
  const h = hash(stickerId);
  const i = h % 24; // index 0-23 drives the bio formula (24 = lcm of moduli)

  const d = (i * 7) % 28 + 1;
  const m = (i * 5) % 12 + 1;
  const y = 1994 + (i % 9);
  const born = `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
  const height = 170 + ((i * 3) % 24);
  const weight = 64 + ((i * 5) % 24);
  const teamSuffix = teamCode ? ` (${teamCode.slice(0, 3).toUpperCase()})` : "";
  const club = CLUBS[i % CLUBS.length] + teamSuffix;

  return { born, height, weight, club };
}

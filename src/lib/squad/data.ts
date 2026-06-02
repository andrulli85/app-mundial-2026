/**
 * squad/data.ts — Real catalog-backed data layer for Mi Once squad builder.
 *
 * Sources:
 *   - src/data/stickers.json        — 980-sticker canonical catalog (all types)
 *   - src/data/player-ratings.json  — 699 SoFIFA real OVR + position entries
 *   - src/data/domi-missing.json    — Demo data: Domi's missing cards from figuritas.app
 *   - src/lib/player-meta.ts        — deterministic fallback for unrated players
 *   - src/lib/team-catalog.ts       — team display names + flag emojis
 *   - src/lib/squad/photo.ts        — photo URL resolution (originales → seed → placeholder)
 *
 * Ownership model (demo — no Firebase):
 *   Priority 1: DOMI_MISSING set — if (team_code, number) is in Domi's missing list
 *               → owned: false, dup: 0.
 *   Priority 2: Deterministic hash fallback — simpleHash(sticker_id) % 100 < 60 (~60% owned)
 *               dup: simpleHash(sticker_id) % 100 < 15 (~15% as duplicates)
 *
 * Demo data: Domi's missing cards from figuritas.app — replace with real Firebase
 * user state in Phase 5b.
 *
 * This is the single source of truth. market/data.ts re-exports PLAYERS + FRIENDS.
 */

import rawStickers from "@/data/stickers.json";
import rawRatings from "@/data/player-ratings.json";
import domiMissing from "@/data/domi-missing.json";
import { TEAM_CATALOG } from "@/lib/team-catalog";
import { photoUrlFor } from "@/lib/squad/photo";

// ---------------------------------------------------------------------------
// Domi missing set — (team_code)-(number) tuples where owned must be false.
// Demo data: Domi's missing cards from figuritas.app — replace with real
// Firebase user state in Phase 5b.
// ---------------------------------------------------------------------------

type DomiMissingJson = Record<string, number[] | string>;

const MISSING: Set<string> = new Set(
  Object.entries(domiMissing as DomiMissingJson)
    .filter(([key]) => !key.startsWith("_")) // skip meta-keys like "_comment"
    .flatMap(([teamCode, numbers]) =>
      (numbers as number[]).map((n) => `${teamCode}-${n}`)
    )
);

// ---------------------------------------------------------------------------
// Types (exported — consumed by squad/page.tsx and market/data.ts)
// ---------------------------------------------------------------------------

export type Position = "POR" | "DEF" | "MED" | "DEL";
export type Rarity = "common" | "rare" | "epic" | "legendary" | "icon";

export interface Player {
  id: string;
  /** Uppercased display name (e.g. "LUIS MALAGÓN") */
  name: string;
  /** Full team name in Spanish (e.g. "México") */
  team: string;
  /** 3-letter team code (e.g. "MEX") */
  team_code: string;
  /** Hex team color (e.g. "#006847") */
  team_color: string;
  /** Country flag emoji */
  flag: string;
  /** Primary position */
  pos: Position;
  /** Overall rating 65–93 */
  ovr: number;
  /** Fantasy points (deterministic from OVR + hash) */
  pts: number;
  rarity: Rarity;
  owned: boolean;
  /** Duplicate copies (0 = none, 1–2 = has extras) */
  dup: number;
  /** Best available photo URL (originales → seed → placeholder) */
  photo: string;
}

export interface Friend {
  id: string;
  name: string;
  pts: number;
  /** Sticker IDs this friend owns as duplicates (can offer in trade) */
  dupIds: string[];
  /** Sticker IDs this friend is looking for */
  wantIds: string[];
  you?: boolean;
}

export interface MatchResult {
  id: string;
  stage: string;
  when: string;
  home: { n: string; f: string; s: number };
  away: { n: string; f: string; s: number };
  myPts: number;
  fav?: boolean;
}

// ---------------------------------------------------------------------------
// Internal types for raw JSON
// ---------------------------------------------------------------------------

interface RawSticker {
  sticker_id: string;
  display_name: string;
  team: string;
  team_code: string;
  team_color: string;
  number: number | null;
  type: string;
  sort_order: number;
}

interface RatingEntry {
  ovr: number;
  position: Position;
  real_name?: string;
}

// ---------------------------------------------------------------------------
// Deterministic hash: sticker_id → unsigned 32-bit integer
// Same djb2-style hash used in player-meta.ts for consistency.
// ---------------------------------------------------------------------------

function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

// ---------------------------------------------------------------------------
// OVR base table (mirrored from player-meta.ts)
// ---------------------------------------------------------------------------

const BASE_OVR: Record<number, number> = {
  2: 89, 3: 84, 4: 82, 5: 80, 6: 83, 7: 81, 8: 80, 9: 79, 10: 85,
  11: 78, 12: 83, 14: 81, 15: 79, 16: 78, 17: 77, 18: 75, 19: 74, 20: 72,
};

// ---------------------------------------------------------------------------
// Derive position from sticker number (Panini convention for this catalog)
// ---------------------------------------------------------------------------

function positionFromNumber(n: number): Position {
  if (n === 2) return "POR";
  if (n >= 3 && n <= 5) return "DEF";
  if (n >= 6 && n <= 11) return "MED";
  return "DEL";
}

// ---------------------------------------------------------------------------
// Build PLAYERS from catalog + ratings
// ---------------------------------------------------------------------------

const ratings = rawRatings as Record<string, RatingEntry>;

function buildPlayers(): Player[] {
  const stickers = rawStickers as RawSticker[];
  const playerStickers = stickers
    .filter((s) => s.type === "player" && s.number !== null)
    .sort((a, b) => a.sort_order - b.sort_order);

  return playerStickers.map((s): Player => {
    const id = s.sticker_id;
    const rated = ratings[id];
    const n = s.number!;
    const hashVal = simpleHash(id);

    // Position
    const pos: Position = rated?.position ?? positionFromNumber(n);

    // OVR
    let ovr: number;
    if (rated) {
      ovr = rated.ovr;
    } else {
      const base = BASE_OVR[n] ?? 75;
      const jitter = (hashVal % 8) - 4; // −4..+3
      ovr = Math.max(65, Math.min(93, base + jitter));
    }

    // Rarity
    let rarity: Rarity;
    if (ovr >= 89) rarity = "legendary";
    else if (ovr >= 85) rarity = "epic";
    else if (ovr >= 78) rarity = "rare";
    else rarity = "common";

    // Fantasy points: deterministic from OVR + hash (range 60–250)
    const pts = ovr * 2 + (hashVal % 40);

    // Ownership (demo, no Firebase)
    // Priority 1: Domi's missing list overrides the hash rule.
    // Demo data: Domi's missing cards from figuritas.app — replace with real
    // Firebase user state in Phase 5b.
    const domiKey = `${s.team_code}-${n}`;
    const isDomiMissing = MISSING.has(domiKey);
    const owned = isDomiMissing ? false : hashVal % 100 < 60;
    const dupRaw = hashVal % 100 < 15 ? 1 + (hashVal % 2) : 0; // 1 or 2 dupes
    const dup = isDomiMissing ? 0 : owned ? dupRaw : 0;

    // Team display
    const catalogEntry = TEAM_CATALOG[s.team_code];
    const flag = catalogEntry?.flag ?? "🏳️";
    const teamName = catalogEntry?.display_name ?? s.team;

    return {
      id,
      name: s.display_name,
      team: teamName,
      team_code: s.team_code,
      team_color: s.team_color,
      flag,
      pos,
      ovr,
      pts,
      rarity,
      owned,
      dup,
      photo: photoUrlFor(id),
    };
  });
}

export const PLAYERS: Player[] = buildPlayers();

// ---------------------------------------------------------------------------
// Friends
// Benja/Sofi/Vicente/Lucas/Martín — kid-friendly LatAm Spanish names.
// dupIds / wantIds use real sticker_ids from PLAYERS for MEX/USA/BRA/ARG.
// ---------------------------------------------------------------------------

const _MEX_IDS = PLAYERS
  .filter((p) => p.team_code === "MEX")
  .map((p) => p.id);

const _ARG_IDS = PLAYERS
  .filter((p) => p.team_code === "ARG")
  .map((p) => p.id);

const _BRA_IDS = PLAYERS
  .filter((p) => p.team_code === "BRA")
  .map((p) => p.id);

const _USA_IDS = PLAYERS
  .filter((p) => p.team_code === "USA")
  .map((p) => p.id);

export const FRIENDS: Friend[] = [
  {
    id: "benja",
    name: "Benja",
    pts: 1840,
    dupIds: [_MEX_IDS[2], _MEX_IDS[9], _BRA_IDS[4], _ARG_IDS[3], _MEX_IDS[14]].filter(Boolean),
    wantIds: [_MEX_IDS[0], _ARG_IDS[7]].filter(Boolean),
  },
  {
    id: "sofi",
    name: "Sofi",
    pts: 1620,
    dupIds: [_ARG_IDS[1], _BRA_IDS[2], _MEX_IDS[7]].filter(Boolean),
    wantIds: [_BRA_IDS[0], _MEX_IDS[4]].filter(Boolean),
  },
  {
    id: "vicente",
    name: "Vicente",
    pts: 1390,
    dupIds: [_USA_IDS[2], _MEX_IDS[5], _ARG_IDS[5], _BRA_IDS[7]].filter(Boolean),
    wantIds: [_ARG_IDS[0], _MEX_IDS[8]].filter(Boolean),
  },
  {
    id: "lucas",
    name: "Lucas",
    pts: 1180,
    dupIds: [_BRA_IDS[11], _MEX_IDS[12], _USA_IDS[4]].filter(Boolean),
    wantIds: [_BRA_IDS[3]].filter(Boolean),
  },
  {
    id: "martin",
    name: "Martín",
    pts: 980,
    dupIds: [_ARG_IDS[9], _USA_IDS[6], _MEX_IDS[16]].filter(Boolean),
    wantIds: [_ARG_IDS[6], _BRA_IDS[1]].filter(Boolean),
  },
];

// ---------------------------------------------------------------------------
// Match results — Chile + México + USA + Brasil + Argentina games.
// Chile marked fav: true (Andy's audience is Chilean/Mexican).
// ---------------------------------------------------------------------------

export const RESULTS: MatchResult[] = [
  {
    id: "r1",
    stage: "Grupo D · Fecha 3",
    when: "Hoy 18:00",
    home: { n: "México",        f: "🇲🇽", s: 2 },
    away: { n: "Estados Unidos", f: "🇺🇸", s: 1 },
    myPts: 86,
    fav: true,
  },
  {
    id: "r2",
    stage: "Grupo J · Fecha 3",
    when: "Hoy 15:00",
    home: { n: "Argentina",     f: "🇦🇷", s: 3 },
    away: { n: "Jordania",      f: "🇯🇴", s: 0 },
    myPts: 54,
  },
  {
    id: "r3",
    stage: "Grupo C · Fecha 3",
    when: "Ayer 20:00",
    home: { n: "Brasil",        f: "🇧🇷", s: 2 },
    away: { n: "Marruecos",     f: "🇲🇦", s: 1 },
    myPts: 41,
    fav: true,
  },
  {
    id: "r4",
    stage: "Grupo D · Fecha 2",
    when: "Ayer 17:00",
    home: { n: "Estados Unidos", f: "🇺🇸", s: 2 },
    away: { n: "Turquía",       f: "🇹🇷", s: 2 },
    myPts: 33,
  },
  {
    id: "r5",
    stage: "Grupo A · Fecha 1",
    when: "Hace 2 días",
    home: { n: "México",        f: "🇲🇽", s: 1 },
    away: { n: "Sudáfrica",     f: "🇿🇦", s: 1 },
    myPts: 22,
    fav: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Owned players for a given position, sorted by OVR desc. */
export function ownedByPos(pos: Position): Player[] {
  return PLAYERS.filter((p) => p.owned && p.pos === pos).sort(
    (a, b) => b.ovr - a.ovr,
  );
}

/** Find a player by sticker_id. */
export function byId(id: string): Player | undefined {
  return PLAYERS.find((p) => p.id === id);
}

/** Sorted leaderboard: FRIENDS + current user ("Yo"), desc by pts. */
export function pointsLeaderboard(): (Friend & { you?: boolean })[] {
  const MY_PTS = 1620;
  const rows = [
    ...FRIENDS.map((f) => ({ ...f, you: false })),
    { id: "me", name: "Yo", pts: MY_PTS, dupIds: [], wantIds: [], you: true },
  ];
  return rows.sort((a, b) => b.pts - a.pts);
}

// ---------------------------------------------------------------------------
// localStorage persistence (unchanged from original)
// ---------------------------------------------------------------------------

const LS_KEY = "albumix.miOnce";

export interface SavedSquad {
  formation: "4-3-3" | "4-4-2" | "3-5-2";
  lineup: Record<string, string>;
}

export function loadSavedSquad(): SavedSquad | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSquad;
  } catch {
    return null;
  }
}

export function persistSquad(data: SavedSquad): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

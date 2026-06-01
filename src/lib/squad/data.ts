/**
 * squad/data.ts — Mock data layer for Mi Once squad builder.
 *
 * Phase 4.2 (Stream B): mocked for kickoff. Real Firebase integration is Phase 5.
 * Players are fictional — no real likenesses, no Panini/FIFA trademarks.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Position = "POR" | "DEF" | "MED" | "DEL";
export type Rarity = "common" | "rare" | "epic" | "legendary" | "icon";

export interface Player {
  id: string;
  name: string;
  /** 3-letter team code */
  team: string;
  /** Country flag emoji or code */
  flag: string;
  pos: Position;
  /** Overall rating 70-92 */
  ovr: number;
  /** Fantasy points accumulated */
  pts: number;
  rarity: Rarity;
  owned: boolean;
  /** Duplicate copies owned */
  dup: number;
}

export interface Friend {
  id: string;
  name: string;
  pts: number;
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
// Players (fictional, mix Chile + Argentina, Brasil, France, Mexico)
// ---------------------------------------------------------------------------

export const PLAYERS: Player[] = [
  // -- Porteros --
  { id: "q1",  name: "C. FUENTES",    team: "CHI", flag: "🇨🇱", pos: "POR", ovr: 84, pts: 142, rarity: "rare",      owned: true,  dup: 0 },
  { id: "q2",  name: "D. HERRERA",    team: "CHI", flag: "🇨🇱", pos: "POR", ovr: 78, pts: 98,  rarity: "common",    owned: true,  dup: 1 },
  { id: "q3",  name: "M. PERALTA",    team: "ARG", flag: "🇦🇷", pos: "POR", ovr: 88, pts: 176, rarity: "epic",      owned: true,  dup: 0 },
  { id: "q4",  name: "R. MOLINA",     team: "BRA", flag: "🇧🇷", pos: "POR", ovr: 91, pts: 214, rarity: "legendary", owned: true,  dup: 0 },
  { id: "q5",  name: "T. GIRARD",     team: "FRA", flag: "🇫🇷", pos: "POR", ovr: 86, pts: 160, rarity: "epic",      owned: false, dup: 0 },

  // -- Defensores --
  { id: "d1",  name: "A. ROJAS",      team: "CHI", flag: "🇨🇱", pos: "DEF", ovr: 80, pts: 118, rarity: "rare",      owned: true,  dup: 2 },
  { id: "d2",  name: "F. SANTELICES", team: "CHI", flag: "🇨🇱", pos: "DEF", ovr: 76, pts: 88,  rarity: "common",    owned: true,  dup: 0 },
  { id: "d3",  name: "G. VILLANUEVA", team: "CHI", flag: "🇨🇱", pos: "DEF", ovr: 82, pts: 130, rarity: "rare",      owned: true,  dup: 1 },
  { id: "d4",  name: "H. CONTRERAS",  team: "CHI", flag: "🇨🇱", pos: "DEF", ovr: 74, pts: 76,  rarity: "common",    owned: true,  dup: 0 },
  { id: "d5",  name: "L. DOMÍNGUEZ",  team: "ARG", flag: "🇦🇷", pos: "DEF", ovr: 85, pts: 150, rarity: "epic",      owned: true,  dup: 0 },
  { id: "d6",  name: "N. FERREIRA",   team: "ARG", flag: "🇦🇷", pos: "DEF", ovr: 83, pts: 138, rarity: "rare",      owned: true,  dup: 0 },
  { id: "d7",  name: "P. CAVALCANTE", team: "BRA", flag: "🇧🇷", pos: "DEF", ovr: 87, pts: 168, rarity: "epic",      owned: true,  dup: 0 },
  { id: "d8",  name: "Q. LEBLANC",    team: "FRA", flag: "🇫🇷", pos: "DEF", ovr: 89, pts: 190, rarity: "legendary", owned: false, dup: 0 },
  { id: "d9",  name: "R. ESTRADA",    team: "MEX", flag: "🇲🇽", pos: "DEF", ovr: 79, pts: 106, rarity: "rare",      owned: true,  dup: 0 },

  // -- Mediocampistas --
  { id: "m1",  name: "S. ARAYA",      team: "CHI", flag: "🇨🇱", pos: "MED", ovr: 86, pts: 158, rarity: "epic",      owned: true,  dup: 0 },
  { id: "m2",  name: "T. POBLETE",    team: "CHI", flag: "🇨🇱", pos: "MED", ovr: 81, pts: 122, rarity: "rare",      owned: true,  dup: 1 },
  { id: "m3",  name: "U. CARREÑO",    team: "CHI", flag: "🇨🇱", pos: "MED", ovr: 77, pts: 94,  rarity: "common",    owned: true,  dup: 0 },
  { id: "m4",  name: "V. GUTIÉRREZ",  team: "ARG", flag: "🇦🇷", pos: "MED", ovr: 90, pts: 202, rarity: "legendary", owned: true,  dup: 0 },
  { id: "m5",  name: "W. BARBOSA",    team: "BRA", flag: "🇧🇷", pos: "MED", ovr: 88, pts: 178, rarity: "epic",      owned: true,  dup: 0 },
  { id: "m6",  name: "X. MARTIN",     team: "FRA", flag: "🇫🇷", pos: "MED", ovr: 85, pts: 152, rarity: "rare",      owned: false, dup: 0 },
  { id: "m7",  name: "Y. REYES",      team: "MEX", flag: "🇲🇽", pos: "MED", ovr: 82, pts: 126, rarity: "rare",      owned: true,  dup: 0 },
  { id: "m8",  name: "Z. FUENTES",    team: "CHI", flag: "🇨🇱", pos: "MED", ovr: 79, pts: 108, rarity: "common",    owned: true,  dup: 2 },

  // -- Delanteros --
  { id: "f1",  name: "A. MEDINA",     team: "CHI", flag: "🇨🇱", pos: "DEL", ovr: 87, pts: 172, rarity: "epic",      owned: true,  dup: 0 },
  { id: "f2",  name: "B. TOBAR",      team: "CHI", flag: "🇨🇱", pos: "DEL", ovr: 83, pts: 136, rarity: "rare",      owned: true,  dup: 1 },
  { id: "f3",  name: "C. VALENZUELA", team: "CHI", flag: "🇨🇱", pos: "DEL", ovr: 79, pts: 104, rarity: "common",    owned: true,  dup: 0 },
  { id: "f4",  name: "D. RÍOS",       team: "ARG", flag: "🇦🇷", pos: "DEL", ovr: 92, pts: 228, rarity: "icon",      owned: true,  dup: 0 },
  { id: "f5",  name: "E. SANTOS",     team: "BRA", flag: "🇧🇷", pos: "DEL", ovr: 90, pts: 208, rarity: "legendary", owned: true,  dup: 0 },
  { id: "f6",  name: "F. LECLAIR",    team: "FRA", flag: "🇫🇷", pos: "DEL", ovr: 88, pts: 182, rarity: "epic",      owned: false, dup: 0 },
  { id: "f7",  name: "G. TORRES",     team: "MEX", flag: "🇲🇽", pos: "DEL", ovr: 84, pts: 144, rarity: "rare",      owned: true,  dup: 0 },
  { id: "f8",  name: "H. SOTO",       team: "CHI", flag: "🇨🇱", pos: "DEL", ovr: 75, pts: 82,  rarity: "common",    owned: true,  dup: 3 },
];

// ---------------------------------------------------------------------------
// Friends leaderboard
// ---------------------------------------------------------------------------

const MY_POINTS = 1620;

const _FRIENDS_RAW: Friend[] = [
  { id: "benja",   name: "Benja",   pts: 1840 },
  { id: "sofi",    name: "Sofi",    pts: 1620 },
  { id: "vicente", name: "Vicente", pts: 1390 },
  { id: "agus",    name: "Agus",    pts: 1180 },
  { id: "flo",     name: "Flo",     pts: 980  },
];

/**
 * Returns the sorted leaderboard including the current user ("Yo").
 * The user row is marked with `you: true`.
 */
export function pointsLeaderboard(): Friend[] {
  const rows: Friend[] = [
    ...(_FRIENDS_RAW.filter((f) => f.name !== "Sofi")),
    { id: "me", name: "Yo", pts: MY_POINTS, you: true },
    { id: "sofi", name: "Sofi", pts: 1620 },
  ];
  return rows.sort((a, b) => b.pts - a.pts);
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export const RESULTS: MatchResult[] = [
  {
    id: "r1",
    stage: "Grupo D · Fecha 3",
    when: "Hoy 18:00",
    home: { n: "Chile",     f: "🇨🇱", s: 2 },
    away: { n: "México",    f: "🇲🇽", s: 1 },
    myPts: 86,
    fav: true,
  },
  {
    id: "r2",
    stage: "Grupo B · Fecha 3",
    when: "Hoy 15:00",
    home: { n: "Argentina", f: "🇦🇷", s: 3 },
    away: { n: "Japón",     f: "🇯🇵", s: 0 },
    myPts: 54,
  },
  {
    id: "r3",
    stage: "Grupo C · Fecha 3",
    when: "Ayer 20:00",
    home: { n: "Francia",   f: "🇫🇷", s: 1 },
    away: { n: "Portugal",  f: "🇵🇹", s: 1 },
    myPts: 41,
  },
  {
    id: "r4",
    stage: "Grupo A · Fecha 2",
    when: "Ayer 17:00",
    home: { n: "Brasil",    f: "🇧🇷", s: 2 },
    away: { n: "Corea",     f: "🇰🇷", s: 2 },
    myPts: 33,
  },
  {
    id: "r5",
    stage: "Grupo F · Fecha 1",
    when: "Hace 2 días",
    home: { n: "España",    f: "🇪🇸", s: 1 },
    away: { n: "Alemania",  f: "🇩🇪", s: 1 },
    myPts: 22,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns owned players for a given position, sorted by OVR desc. */
export function ownedByPos(pos: Position): Player[] {
  return PLAYERS.filter((p) => p.owned && p.pos === pos).sort(
    (a, b) => b.ovr - a.ovr
  );
}

/** Find a player by id. */
export function byId(id: string): Player | undefined {
  return PLAYERS.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// localStorage persistence
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

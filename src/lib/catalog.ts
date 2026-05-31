/**
 * Sticker catalog — loaded from stickers.json at build time.
 * Team colors are hardcoded here; Stream B will produce stickers-enriched.json
 * with authoritative color data once ready.
 */

export type StickerType = "player" | "team_logo" | "team_photo" | "fwc" | "panini_special";

export interface Sticker {
  id: string;
  code: string;
  name: string;
  team: string;
  team_code: string;
  number: number;
  type: StickerType;
  seed_image?: string; // public path e.g. "/stickers/seed/mex-13.jpg"
  team_color: string; // hex — from team colors map or default gray
}

// ---------- Team colors ----------
// Primary kit/badge color per team.
// Replace with Stream B authoritative data when stickers-enriched.json lands.

export const TEAM_COLORS: Record<string, string> = {
  "": "#6b7280",       // Panini special / FWC
  ALG: "#006233",      // Algeria — green
  ARG: "#74ACDF",      // Argentina — sky blue
  AUS: "#00843D",      // Australia — green
  AUT: "#ED2939",      // Austria — red
  BEL: "#EF3340",      // Belgium — red
  BIH: "#002395",      // Bosnia — blue
  BRA: "#009C3B",      // Brazil — green
  CAN: "#FF0000",      // Canada — red
  CIV: "#F77F00",      // Côte d'Ivoire — orange
  COD: "#007FFF",      // DR Congo — blue
  COL: "#FCD116",      // Colombia — yellow
  CPV: "#003893",      // Cape Verde — dark blue
  CRO: "#FF0000",      // Croatia — red (checkerboard)
  CUW: "#002B7F",      // Curaçao — dark blue
  CZE: "#D7141A",      // Czechia — red
  ECU: "#FFD100",      // Ecuador — yellow
  EGY: "#C8102E",      // Egypt — red
  ENG: "#003090",      // England — dark blue
  ESP: "#AA151B",      // Spain — red
  FRA: "#003189",      // France — blue
  FWC: "#C0A85E",      // World Cup History — gold
  GER: "#000000",      // Germany — black
  GHA: "#006B3F",      // Ghana — green
  HAI: "#00209F",      // Haiti — blue
  IRN: "#239F40",      // Iran — green
  IRQ: "#CE1126",      // Iraq — red
  JOR: "#007A3D",      // Jordan — green
  JPN: "#BC002D",      // Japan — red
  KOR: "#C60C30",      // Korea — red
  KSA: "#006C35",      // Saudi Arabia — green
  MAR: "#C1272D",      // Morocco — red
  MEX: "#006847",      // Mexico — green
  NED: "#FF4F00",      // Netherlands — orange
  NOR: "#EF2B2D",      // Norway — red
  NZL: "#00247D",      // New Zealand — dark blue
  PAN: "#DA121A",      // Panama — red
  PAR: "#D52B1E",      // Paraguay — red
  POR: "#006600",      // Portugal — green
  QAT: "#8D1B3D",      // Qatar — maroon
  RSA: "#007749",      // South Africa — green
  SCO: "#003F87",      // Scotland — dark blue
  SEN: "#00853F",      // Senegal — green
  SUI: "#FF0000",      // Switzerland — red
  SWE: "#006AA7",      // Sweden — blue
  TUN: "#E70013",      // Tunisia — red
  TUR: "#E30A17",      // Turkey — red
  URU: "#75AADB",      // Uruguay — sky blue
  USA: "#BF0A30",      // USA — red
  UZB: "#1EB53A",      // Uzbekistan — green
};

export const DEFAULT_TEAM_COLOR = "#9ca3af";

// ---------- Seed manifest ----------
// Maps sticker_id → seed image filename.
// Populated by scripts/import-seed.mjs when seed images are processed.
// Until Stream B delivers stickers-enriched.json, we use this static map.

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

// ---------- Catalog loader ----------
// stickers.json is embedded at build time via dynamic import
// to avoid large JSON in the client bundle on every route.

let _catalog: Sticker[] | null = null;

export async function getCatalog(): Promise<Sticker[]> {
  if (_catalog) return _catalog;

  // Load raw JSON (bundled by Next.js — no fetch needed)
  const raw = (await import("@/data/stickers.json")).default as Array<{
    id: string;
    code: string;
    name: string;
    team: string;
    team_code: string;
    number: number;
    type: string;
  }>;

  const manifest = await getSeedManifest();

  _catalog = raw.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    team: s.team,
    team_code: s.team_code,
    number: s.number,
    type: s.type as StickerType,
    seed_image: manifest[s.id]
      ? `/stickers/seed/${manifest[s.id]}`
      : undefined,
    team_color: TEAM_COLORS[s.team_code] ?? DEFAULT_TEAM_COLOR,
  }));

  return _catalog;
}

/** Ordered list of canonical sticker IDs (FWC first, then teams alphabetical) */
export async function getOrderedIds(): Promise<string[]> {
  const catalog = await getCatalog();
  return catalog.map((s) => s.id);
}

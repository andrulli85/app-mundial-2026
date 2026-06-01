/**
 * market/data.ts — Mock data for the Mercado hub (Stream C, Phase 4.2).
 *
 * PLAYERS shape mirrors the design-pack's data.jsx.
 * FRIENDS is imported from src/data/friends.ts (shared with Squad / Stream B).
 * INCOMING_OFFERS: 3 hardcoded incoming trade offers.
 *
 * When Stream B lands squad/data.ts with a canonical PLAYERS export, import
 * from there and remove the local PLAYERS constant.
 */

export { FRIENDS } from "@/data/friends";
export type { Friend } from "@/data/friends";

// ---------------------------------------------------------------------------
// Player shape
// ---------------------------------------------------------------------------

export type Rarity = "common" | "rare" | "epic" | "legendary" | "icon";

export interface Player {
  id: string;
  name: string;
  team: string;
  flag: string;
  ovr: number;
  pts: number;
  rarity: Rarity;
  owned: boolean;
  dup: number; // extra copies (0 = no dup, 1+ = has dup)
}

// ---------------------------------------------------------------------------
// PLAYERS — 12-card mock catalog
// ---------------------------------------------------------------------------

export const PLAYERS: Player[] = [
  { id: "p01", name: "Messi", team: "Argentina", flag: "🇦🇷", ovr: 91, pts: 340, rarity: "legendary", owned: true,  dup: 2 },
  { id: "p02", name: "Mbappé", team: "Francia",   flag: "🇫🇷", ovr: 90, pts: 320, rarity: "legendary", owned: true,  dup: 0 },
  { id: "p03", name: "Vinicius", team: "Brasil",  flag: "🇧🇷", ovr: 88, pts: 280, rarity: "epic",      owned: true,  dup: 1 },
  { id: "p04", name: "Bellingham", team: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", ovr: 87, pts: 270, rarity: "epic", owned: true,  dup: 0 },
  { id: "p05", name: "Haaland", team: "Noruega",  flag: "🇳🇴", ovr: 86, pts: 250, rarity: "epic",      owned: false, dup: 0 },
  { id: "p06", name: "De Bruyne", team: "Bélgica",flag: "🇧🇪", ovr: 85, pts: 230, rarity: "epic",      owned: true,  dup: 2 },
  { id: "p07", name: "Pedri", team: "España",     flag: "🇪🇸", ovr: 83, pts: 210, rarity: "rare",      owned: true,  dup: 1 },
  { id: "p08", name: "Son", team: "Corea del Sur",flag: "🇰🇷", ovr: 82, pts: 200, rarity: "rare",      owned: true,  dup: 0 },
  { id: "p09", name: "Salah", team: "Egipto",     flag: "🇪🇬", ovr: 84, pts: 220, rarity: "rare",      owned: false, dup: 0 },
  { id: "p10", name: "Carvajal", team: "España",  flag: "🇪🇸", ovr: 80, pts: 180, rarity: "common",    owned: true,  dup: 3 },
  { id: "p11", name: "Davies", team: "Canadá",    flag: "🇨🇦", ovr: 82, pts: 195, rarity: "rare",      owned: true,  dup: 1 },
  { id: "p12", name: "Pulisic", team: "USA",       flag: "🇺🇸", ovr: 81, pts: 185, rarity: "common",   owned: false, dup: 0 },
];

// ---------------------------------------------------------------------------
// IncomingOffer shape
// ---------------------------------------------------------------------------

export interface IncomingOffer {
  id: string;
  them: string;      // friend's name
  theirCard: Player; // what the friend gives YOU
  yourCard: Player;  // what they want FROM YOU
}

// ---------------------------------------------------------------------------
// INCOMING_OFFERS — 3 hardcoded incoming proposals
// ---------------------------------------------------------------------------

export const INCOMING_OFFERS: IncomingOffer[] = [
  {
    id: "o1",
    them: "Benja",
    theirCard: PLAYERS[6],  // Pedri
    yourCard:  PLAYERS[3],  // Bellingham
  },
  {
    id: "o2",
    them: "Sofi",
    theirCard: PLAYERS[9],  // Carvajal
    yourCard:  PLAYERS[7],  // Son
  },
  {
    id: "o3",
    them: "Vicente",
    theirCard: PLAYERS[10], // Davies
    yourCard:  PLAYERS[3],  // Bellingham
  },
];

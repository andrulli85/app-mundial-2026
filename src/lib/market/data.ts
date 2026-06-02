/**
 * market/data.ts — Mercado data layer (Stream C, Phase 4.2 → real catalog).
 *
 * PLAYERS and FRIENDS are re-exported from squad/data.ts (single source of truth).
 * INCOMING_OFFERS uses real sticker_ids from the catalog — high-OVR players
 * from teams Andy's audience cares about (México, Argentina, Brasil, USA).
 *
 * Trade logic:
 *   - theirCard: a high-OVR card the friend is offering (good deal for you)
 *   - yourCard:  one of YOUR duplicates the friend wants
 */

export {
  PLAYERS,
  FRIENDS,
  byId,
  ownedByPos,
  pointsLeaderboard,
  type Player,
  type Friend,
  type Position,
  type Rarity,
} from "@/lib/squad/data";

// ---------------------------------------------------------------------------
// IncomingOffer
// ---------------------------------------------------------------------------

import { PLAYERS } from "@/lib/squad/data";

export interface IncomingOffer {
  id: string;
  /** Friend's display name */
  them: string;
  /** Card the friend gives YOU (high OVR star) */
  theirCard: (typeof PLAYERS)[number];
  /** Card they want FROM YOU (one of your duplicates) */
  yourCard: (typeof PLAYERS)[number];
}

// ---------------------------------------------------------------------------
// Helpers to locate specific sticker_ids safely
// ---------------------------------------------------------------------------

function findPlayer(stickerId: string) {
  return PLAYERS.find((p) => p.id === stickerId);
}

// theirCard picks — high-OVR players that are NOT owned by the user
// (hash % 100 >= 60) so the trade is attractive: you'd gain a card you lack.
// arg-17-messi OVR 88, bra-15-rodrygo OVR 86, mex-9-rodriguez OVR 83
const MESSI     = findPlayer("arg-17-messi")      ?? PLAYERS[0];
const RODRYGO   = findPlayer("bra-15-rodrygo")    ?? PLAYERS[1];
const RODRIGUEZ = findPlayer("mex-9-rodriguez")   ?? PLAYERS[2];

// yourCard picks — duplicate cards you own (hash % 100 < 15)
// mex-3-vasquez dup, mex-10-alvarez dup, bra-19-raphinha dup
const VASQUEZ  = findPlayer("mex-3-vasquez")     ?? PLAYERS[3];
const ALVAREZ  = findPlayer("mex-10-alvarez")    ?? PLAYERS[4];
const RAPHINHA = findPlayer("bra-19-raphinha")   ?? PLAYERS[5];

// ---------------------------------------------------------------------------
// INCOMING_OFFERS — 3 hardcoded trade proposals
// ---------------------------------------------------------------------------

export const INCOMING_OFFERS: IncomingOffer[] = [
  {
    id: "o1",
    them: "Benja",
    theirCard: MESSI,
    yourCard:  VASQUEZ,
  },
  {
    id: "o2",
    them: "Sofi",
    theirCard: RODRYGO,
    yourCard:  RAPHINHA,
  },
  {
    id: "o3",
    them: "Vicente",
    theirCard: RODRIGUEZ,
    yourCard:  ALVAREZ,
  },
];

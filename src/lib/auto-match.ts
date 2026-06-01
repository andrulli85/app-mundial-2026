/**
 * auto-match — mutual trade opportunity engine.
 *
 * Given two CollectionState values (bitset-encoded), computes:
 *   - iCanGive:       sticker_ids I have as duplicates that friend lacks
 *   - iCanReceive:    sticker_ids friend has as duplicates that I lack
 *   - balancedPairs:  ranked 1-for-1 swap suggestions
 *   - inferredFairness: delta + asymmetry warnings
 *
 * Pure client-side logic — no Firebase, no UI.
 * The future /friends/[friendUid] page wires this up.
 *
 * Scoring rubric for balancedPairs:
 *   +10 same team_code (same team stickers swapped)
 *   +5  same FIFA 2026 group (A-L, both non-special)
 *   +3  both are FWC type (rare-for-rare swap)
 *   +1  base score per pair
 */

import { getCatalog, type Sticker } from "./catalog";
import { __internal, STICKER_COUNT } from "./qr-engine";

const { unpackBitset, unpackRepes, b64ToBytes } = __internal;

// ---------- Public types ----------

export interface CollectionState {
  hasBitset: string;   // base64 — 1 bit per sticker, 1 = has at least 1
  repesBitset: string; // base64 — 2 bits per sticker, 0|1|2|3+
}

export interface TradePair {
  iGive: string;     // sticker_id I give
  iReceive: string;  // sticker_id I receive
  score: number;     // higher = better mutual match
}

export interface MatchResult {
  iCanGive: string[];
  iCanReceive: string[];
  balancedPairs: TradePair[];
  inferredFairness: {
    myGiveCount: number;
    myReceiveCount: number;
    delta: number; // positive = I give more; negative = I receive more
  };
  warnings: string[];
}

// ---------- Helpers ----------

/** Decode a base64-encoded bitset string → boolean[]. */
function decodeHasBitset(b64: string): boolean[] {
  const bytes = b64ToBytes(b64);
  return unpackBitset(bytes, STICKER_COUNT);
}

/** Decode a base64-encoded repes bitset → number[]. */
function decodeRepesBitset(b64: string): number[] {
  const bytes = b64ToBytes(b64);
  return unpackRepes(bytes, STICKER_COUNT);
}

/** Score a single TradePair given the catalog map. */
function scorePair(
  giveId: string,
  receiveId: string,
  byId: Map<string, Sticker>
): number {
  const give = byId.get(giveId);
  const recv = byId.get(receiveId);
  let score = 1; // base

  if (!give || !recv) return score;

  if (give.team_code === recv.team_code) {
    score += 10; // same team
  } else if (
    give.group === recv.group &&
    give.group.length === 1 // A-L only, not _fwc or _end
  ) {
    score += 5; // same group
  }

  if (give.type === "fwc" && recv.type === "fwc") {
    score += 3; // rare for rare
  }

  return score;
}

// ---------- Main export ----------

/**
 * Compute mutual trade opportunities between two collection states.
 *
 * @param me     My collection (hasBitset + repesBitset, base64 encoded).
 * @param friend Friend's collection (same format).
 * @param catalog Optional catalog override — used in tests to avoid
 *                dynamic import of @/data/stickers.json.
 */
export async function computeMatch(
  me: CollectionState,
  friend: CollectionState,
  catalog?: Sticker[]
): Promise<MatchResult> {
  const warnings: string[] = [];

  // Decode bitsets
  const meHas = decodeHasBitset(me.hasBitset);
  const meRepes = decodeRepesBitset(me.repesBitset);
  const friendHas = decodeHasBitset(friend.hasBitset);
  const friendRepes = decodeRepesBitset(friend.repesBitset);

  // Warn on empty collections
  const meOwns = meHas.some(Boolean);
  const friendOwns = friendHas.some(Boolean);
  if (!meOwns && !friendOwns) {
    warnings.push("No hay datos para hacer match");
  } else if (!friendOwns) {
    warnings.push("El amigo aún no tiene figuritas marcadas");
  }

  // Load catalog for ID resolution and scoring
  const stickers = catalog ?? (await getCatalog());
  const orderedIds = stickers.map((s) => s.id);
  const byId = new Map<string, Sticker>(stickers.map((s) => [s.id, s]));

  // Build give/receive lists
  const iCanGive: string[] = [];
  const iCanReceive: string[] = [];

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    // I have at least 2 (repe=2 or 3), friend doesn't have it
    if (meRepes[i] >= 2 && !friendHas[i]) {
      iCanGive.push(id);
    }
    // Friend has at least 2, I don't have it
    if (friendRepes[i] >= 2 && !meHas[i]) {
      iCanReceive.push(id);
    }
  }

  // No-match warning (only when both collections are non-empty)
  if (meOwns && friendOwns && iCanGive.length === 0 && iCanReceive.length === 0) {
    warnings.push("Sin coincidencias — sus colecciones no se complementan");
  }

  // Build balanced pairs: pair iCanGive ↔ iCanReceive, scored, sorted desc
  const pairCount = Math.min(iCanGive.length, iCanReceive.length);
  const rawPairs: TradePair[] = [];
  for (let i = 0; i < pairCount; i++) {
    const iGive = iCanGive[i];
    const iReceive = iCanReceive[i];
    rawPairs.push({ iGive, iReceive, score: scorePair(iGive, iReceive, byId) });
  }
  rawPairs.sort((a, b) => b.score - a.score);

  // Fairness
  const myGiveCount = iCanGive.length;
  const myReceiveCount = iCanReceive.length;
  const delta = myGiveCount - myReceiveCount;

  if (delta > 5) {
    warnings.push(
      "Le estás dando muchas más que las que recibes. ¿Estás seguro?"
    );
  } else if (delta < -5) {
    warnings.push("Te están dando muchas más que las que das. Generoso.");
  }

  return {
    iCanGive,
    iCanReceive,
    balancedPairs: rawPairs,
    inferredFairness: { myGiveCount, myReceiveCount, delta },
    warnings,
  };
}

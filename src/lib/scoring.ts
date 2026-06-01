/**
 * scoring.ts — Pure scoring functions for Mi Once fantasy points.
 *
 * Reads userXI lineup (slotId → sticker_id), player-mapping.json (sticker_id → fifa_player_id),
 * and one or more matchday score files (fifa_player_id → points).
 *
 * Decision #8: FIFA Fantasy does all scoring math; we only aggregate.
 * Decision #9: Empty slots = 0 points, no crash.
 * Decision #11: No captain bonus, no bench scoring — pure sum of 11 starters.
 */

export interface MatchdayScores {
  matchday: number;
  /** Key: fifa_player_id as string, Value: points earned */
  scores: Record<string, number>;
}

export interface PlayerScoreEntry {
  sticker_id: string;
  fifa_player_id: number | null;
  /** Points earned across all matchdays provided */
  points: number;
  /**
   * false if no player-mapping entry or no matchday data has arrived yet.
   * An unplayed player in an arrived matchday still has has_data=true but points=0.
   */
  has_data: boolean;
}

export interface XIScoreResult {
  total: number;
  perPlayer: PlayerScoreEntry[];
  perMatchday: Array<{ matchday: number; subtotal: number }>;
}

type MappingEntry = {
  fifa_player_id: number;
  fbref_id: string | null;
  match_confidence: "high" | "medium" | "low";
};

/**
 * Compute the fantasy score for a confirmed XI.
 *
 * @param userXI   - The saved lineup: { lineup: Record<slotId, sticker_id> }
 * @param matchScores - Array of matchday score objects (one per MD that has data)
 * @param mapping  - player-mapping.json contents (sticker_id → { fifa_player_id, ... })
 */
export function getXIScore(
  userXI: { lineup: Record<string, string> },
  matchScores: MatchdayScores[],
  mapping: Record<string, MappingEntry>
): XIScoreResult {
  // perMatchday subtotals indexed by matchday number
  const matchdayTotals: Map<number, number> = new Map();
  for (const md of matchScores) {
    matchdayTotals.set(md.matchday, 0);
  }

  const perPlayer: PlayerScoreEntry[] = [];
  let total = 0;

  const slots = Object.values(userXI.lineup);

  for (const sticker_id of slots) {
    // Empty slot — sticker_id is empty string or falsy
    if (!sticker_id) {
      perPlayer.push({
        sticker_id: "",
        fifa_player_id: null,
        points: 0,
        has_data: false,
      });
      continue;
    }

    const mappingEntry = mapping[sticker_id];
    if (!mappingEntry) {
      // No fifa_player_id mapping — we know the sticker but can't look up points
      perPlayer.push({
        sticker_id,
        fifa_player_id: null,
        points: 0,
        has_data: false,
      });
      continue;
    }

    const fifa_player_id = mappingEntry.fifa_player_id;
    const key = String(fifa_player_id);

    let playerTotal = 0;
    let hasAnyData = false;

    for (const md of matchScores) {
      if (key in md.scores) {
        hasAnyData = true;
        const pts = md.scores[key] ?? 0;
        playerTotal += pts;
        matchdayTotals.set(md.matchday, (matchdayTotals.get(md.matchday) ?? 0) + pts);
      }
    }

    perPlayer.push({
      sticker_id,
      fifa_player_id,
      points: playerTotal,
      has_data: hasAnyData,
    });

    total += playerTotal;
  }

  const perMatchday = Array.from(matchdayTotals.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([matchday, subtotal]) => ({ matchday, subtotal }));

  return { total, perPlayer, perMatchday };
}

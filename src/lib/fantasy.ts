/**
 * fantasy.ts — Deterministic fantasy points system.
 *
 * Formula from data.jsx lines 10-13:
 *   pts = round(ovr * 1.6 + ((i * 13) % 40) - (owned ? 0 : 60))
 *   floor at 0
 *
 * Since sticker_ids are strings (not sequential indices), we use a
 * deterministic hash to produce the `(i * 13) % 40` offset.
 * OVR is derived from player-meta (same logic the rest of the app uses).
 */

/** Simple djb2-style hash — same as player-meta.ts */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

/**
 * Returns deterministic fantasy points for a sticker.
 * Produces a value in roughly 60-200 range for owned cards.
 *
 * @param stickerId  — sticker_id string from catalog
 * @param ovr        — OVR from getPlayerMeta (pass 75 as default)
 * @param owned      — whether the user owns this card
 */
export function getFantasyPoints(
  stickerId: string,
  ovr = 75,
  owned = true
): number {
  const h = hash(stickerId);
  const offset = (h * 13) % 40; // mimics (i * 13) % 40 from data.jsx
  const raw = Math.round(ovr * 1.6 + offset - (owned ? 0 : 60));
  return Math.max(0, raw);
}

/** Accumulated points for the user's 11 (constant from data.jsx line 35). */
export const MY_POINTS = 1620;

export interface LeaderboardRow {
  name: string;
  pts: number;
  you: boolean;
}

/**
 * Returns a sorted leaderboard that includes the user.
 * Uses FRIENDS from friends.ts internally — caller can override myName/myPts.
 */
export function pointsLeaderboard(
  myName = "Tú",
  myPts = MY_POINTS,
  friends: Array<{ name: string; pts: number }>
): LeaderboardRow[] {
  const rows: LeaderboardRow[] = friends.map((f) => ({
    name: f.name,
    pts: f.pts,
    you: false,
  }));
  rows.push({ name: `${myName} (tú)`, pts: myPts, you: true });
  return rows.sort((a, b) => b.pts - a.pts);
}

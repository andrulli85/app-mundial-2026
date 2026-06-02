/**
 * loadScores.ts — Aggregates all available matchday score JSON files.
 *
 * MD-1 is a static import (committed, always available).
 * MD-2 through MD-8 are fetched at runtime from /data/match-scores/MD-N.json
 * (served as static assets from /public/data/ or via next.config rewrites).
 *
 * Phase C will commit new MD files post-matchday → Vercel auto-deploys →
 * PWA picks them up on next launch. Zero code change needed here.
 *
 * NOTE: We use static import for MD-1 and runtime fetch for future MDs to avoid
 * Turbopack build errors for files that don't exist at build time.
 */

import type { MatchdayScores } from "./scoring";
import MD1Scores from "@/data/match-scores/MD-1.json";

/**
 * Matchdays whose JSON has been committed beyond MD-1 (which is static-imported
 * above). Empty for now — the World Cup hasn't kicked off yet. Push numbers
 * here as new MD-N.json files land in /public/data/match-scores/.
 *
 * Hardcoded instead of "fetch + 404-tolerate" because browsers log every 404
 * at the network layer regardless of JS try/catch, polluting the console with
 * 7+ false-positive errors per /scoreboard load.
 */
const SHIPPED_MATCHDAYS: number[] = [];

/**
 * Try to fetch a matchday JSON from the public directory.
 * Returns null if the file 404s or the fetch fails.
 */
async function fetchMD(n: number): Promise<MatchdayScores | null> {
  try {
    const res = await fetch(`/data/match-scores/MD-${n}.json`, {
      // Next.js static files: no-store so we always pick up fresh data post-deploy
      cache: "no-store",
    });
    if (!res.ok) return null;
    const scores: Record<string, number> = await res.json();
    return { matchday: n, scores };
  } catch {
    return null;
  }
}

/**
 * Returns an array of all matchday score objects for which a JSON file is available.
 * MD-1 comes from the committed static import (always present).
 * MD-2 through MD-8 are fetched at runtime — missing files return null and are skipped.
 */
export async function loadAvailableScores(): Promise<MatchdayScores[]> {
  // MD-1 is always available (committed with Phase D)
  const md1: MatchdayScores = {
    matchday: 1,
    scores: MD1Scores as Record<string, number>,
  };

  // Future MDs: runtime fetch only the ones we've shipped (see SHIPPED_MATCHDAYS
  // above). When a matchday file is committed, bump the array.
  const futureMDs = await Promise.all(SHIPPED_MATCHDAYS.map((n) => fetchMD(n)));

  return [md1, ...futureMDs.filter((r): r is MatchdayScores => r !== null)];
}

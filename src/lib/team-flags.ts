/**
 * team-flags.ts — flag emoji lookup for FUT-style cards.
 *
 * Sourced from TEAM_CATALOG (team-catalog.ts) which already carries the
 * canonical flag strings including subdivision tag sequences for ENG/SCO.
 * This thin wrapper re-exports them in the Record<string, string> shape
 * that StickerCardFut expects.
 */

import { TEAM_CATALOG } from "./team-catalog";

// Build the TEAM_FLAGS map from the authoritative TEAM_CATALOG entries.
// This avoids duplicating the subdivision tag sequences for ENG and SCO.
export const TEAM_FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_CATALOG).map(([code, entry]) => [code, entry.flag])
);

// Convenience lookup — returns white flag for unknown codes.
export function getFlag(teamCode: string): string {
  return TEAM_FLAGS[teamCode] ?? "🏳️";
}

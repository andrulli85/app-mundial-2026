/**
 * pos-color.ts — Position-coded border colors for StickerCardPanini.
 *
 * Design spec (Fase 2.5, 2026-06-01):
 *   POR (Portero/Goalkeeper) → purple
 *   DEF (Defensor)           → red
 *   MED (Mediocampista)      → orange
 *   DEL (Delantero)          → green
 *
 * Non-player stickers (team_logo, team_photo, fwc, panini_special, extra)
 * fall back to neutral gold (var(--gold)) — the border codes POSITION only
 * for player stickers; the gold neutral reads as "album sticker" without position.
 */

import type { Sticker } from "@/lib/catalog";
import { getPlayerMeta } from "@/lib/player-meta";

export const POS_COLORS = {
  POR: "#A06BFF", // purple
  DEF: "#E4002B", // red
  MED: "#F5852A", // orange
  DEL: "#19B65A", // green
  NEUTRAL: "#C0A85E", // gold — for non-player stickers
} as const;

/**
 * Returns the border color for a sticker based on its position.
 * - Player stickers: derived via getPlayerMeta (real ratings lookup + deterministic fallback)
 * - Non-player stickers: returns NEUTRAL gold
 */
export function getPosColor(sticker: Sticker): string {
  if (sticker.type !== "player") return POS_COLORS.NEUTRAL;
  const meta = getPlayerMeta(sticker);
  if (!meta) return POS_COLORS.NEUTRAL;
  return POS_COLORS[meta.position];
}

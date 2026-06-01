// TODO: Mock data — replace with FIFA-like rating source when available.

import type { Sticker } from "./catalog";

// Deterministic hash so same sticker always gets same mock values
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getRating(s: Sticker): number {
  const h = hash(s.id);
  const tier = s.rarity_tier;
  // Doradas LEGEND: 90-94
  if (tier === "legend") return 90 + (h % 5);
  // Doradas ROOKIE: 84-89
  if (tier === "rookie") return 84 + (h % 6);
  // Hologramas (future): 88-92
  if (tier === "hologram") return 88 + (h % 5);
  // Team logo/photo: 70-74
  if (s.type === "team_logo" || s.type === "team_photo") return 70 + (h % 5);
  // FWC specials: 80-87
  if (s.type === "fwc") return 80 + (h % 8);
  // Base players: 75-85
  return 75 + (h % 11);
}

export type Position = "GK" | "DEF" | "MED" | "DEL" | "ESC" | "TEAM" | "ESP";

export function getPosition(s: Sticker): Position {
  if (s.type === "team_logo") return "ESC";
  if (s.type === "team_photo") return "TEAM";
  if (s.type === "fwc" || s.type === "extra") return "ESP";
  const n = s.number ?? 0;
  if (n === 1) return "GK";       // arg-logo is 1 but type team_logo catches it
  if (n >= 2 && n <= 7) return "DEF";
  if (n >= 8 && n <= 14) return "MED";
  if (n >= 15 && n <= 20) return "DEL";
  return "MED"; // fallback
}

export type RarityTier =
  | "gold"    // legend, extra-gold, dorada → gold border + gold rating
  | "purple"  // hologram, fwc special, rating ≥ 88
  | "red"     // rating 86-87 (high)
  | "blue"    // rating 80-85 (mid)
  | "gray";   // rating < 80 (common)

export function getRarityVisualTier(s: Sticker): RarityTier {
  if (s.rarity_tier === "legend" || s.variant === "extra-gold") return "gold";
  if (s.rarity_tier === "hologram") return "purple";
  const r = getRating(s);
  if (r >= 88) return "purple";
  if (r >= 86) return "red";
  if (r >= 80) return "blue";
  return "gray";
}

export const RARITY_COLORS: Record<RarityTier, { border: string; ratingText: string; glow: string }> = {
  gold:   { border: "linear-gradient(135deg, #fde047 0%, #facc15 25%, #fbbf24 50%, #f59e0b 75%, #d97706 100%)", ratingText: "#fbbf24", glow: "0 0 16px rgba(252,211,77,0.5)" },
  purple: { border: "linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7e22ce 100%)",                            ratingText: "#c084fc", glow: "0 0 14px rgba(168,85,247,0.45)" },
  red:    { border: "linear-gradient(135deg, #fca5a5 0%, #ef4444 50%, #b91c1c 100%)",                            ratingText: "#fca5a5", glow: "0 0 12px rgba(239,68,68,0.4)" },
  blue:   { border: "linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)",                            ratingText: "#93c5fd", glow: "0 0 12px rgba(59,130,246,0.4)" },
  gray:   { border: "linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%)",                            ratingText: "#9ca3af", glow: "none" },
};

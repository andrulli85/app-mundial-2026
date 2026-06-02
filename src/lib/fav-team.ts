/**
 * fav-team.ts — Favorite national team constant.
 *
 * Defaults to France because Chile did not qualify for the 2026 World Cup.
 */

export interface FavTier {
  stage: string;
  detail: string;
  pts: number;
  reached: boolean;
}

export interface FavTeam {
  name: string;
  flag: string;
  tiers: FavTier[];
}

export const FAV_TEAM: FavTeam = {
  name: "France",
  flag: "🇫🇷",
  tiers: [
    { stage: "Cuartos de final", detail: "Top 8",       pts: 200, reached: true  },
    { stage: "Semifinal / Podio", detail: "2º · 3º · 4º", pts: 350, reached: false },
    { stage: "Campeón del Mundo", detail: "1er lugar",  pts: 800, reached: false },
  ],
};

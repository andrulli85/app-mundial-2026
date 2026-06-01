/**
 * fav-team.ts — Favorite national team constant.
 *
 * Verbatim from data.jsx lines 16-23.
 * FIJA = fixed, cannot be changed mid-tournament.
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
  name: "Chile",
  flag: "🇨🇱",
  tiers: [
    { stage: "Cuartos de final", detail: "Top 8",       pts: 200, reached: true  },
    { stage: "Semifinal / Podio", detail: "2º · 3º · 4º", pts: 350, reached: false },
    { stage: "Campeón del Mundo", detail: "1er lugar",  pts: 800, reached: false },
  ],
};

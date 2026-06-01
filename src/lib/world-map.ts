/**
 * world-map.ts — helpers for the /album/map heatmap page.
 *
 * ISO 3166-1 alpha-3 → team_code mapping for the 48 FIFA 2026 qualified countries.
 * Only countries with a team_code entry in TEAM_CATALOG are included.
 *
 * Special cases:
 *   - England (ENG) and Scotland (SCO) are sub-national — no ISO-3166-1 alpha-3 code.
 *     They are listed explicitly below with synthetic keys "GBR_ENG" / "GBR_SCO".
 *   - South Africa ISO is ZAF but team_code is RSA.
 *   - South Korea ISO is KOR (matches team_code).
 *   - Ivory Coast ISO is CIV (matches team_code).
 *   - Congo DR ISO is COD (matches team_code).
 */

/** Maps ISO 3166-1 alpha-3 (or synthetic key) → our team_code */
export const ISO3_TO_TEAM: Record<string, string> = {
  MEX: "MEX",
  ZAF: "RSA",
  KOR: "KOR",
  CZE: "CZE",
  CAN: "CAN",
  BIH: "BIH",
  QAT: "QAT",
  CHE: "SUI",
  BRA: "BRA",
  MAR: "MAR",
  HTI: "HAI",
  // SCO has no ISO-3166-1 alpha-3 country code; it maps to GBR in SVGs.
  // We use a synthetic key to render Scotland as part of GBR.
  GBR_SCO: "SCO",
  USA: "USA",
  PRY: "PAR",
  AUS: "AUS",
  TUR: "TUR",
  DEU: "GER",
  CUW: "CUW",
  CIV: "CIV",
  ECU: "ECU",
  NLD: "NED",
  JPN: "JPN",
  SWE: "SWE",
  TUN: "TUN",
  BEL: "BEL",
  EGY: "EGY",
  IRN: "IRN",
  NZL: "NZL",
  ESP: "ESP",
  CPV: "CPV",
  SAU: "KSA",
  URY: "URU",
  FRA: "FRA",
  SEN: "SEN",
  IRQ: "IRQ",
  NOR: "NOR",
  ARG: "ARG",
  DZA: "ALG",
  AUT: "AUT",
  JOR: "JOR",
  PRT: "POR",
  COD: "COD",
  UZB: "UZB",
  COL: "COL",
  // ENG has no ISO-3166-1 alpha-3 country code; it maps to GBR in SVGs.
  GBR_ENG: "ENG",
  CRO: "CRO",
  GHA: "GHA",
  PAN: "PAN",
};

/** Reverse: team_code → ISO3 key */
export const TEAM_TO_ISO3: Record<string, string> = Object.fromEntries(
  Object.entries(ISO3_TO_TEAM).map(([iso, team]) => [team, iso])
);

/**
 * Lightens a hex color by blending it toward white.
 * factor 0 = original, factor 1 = white
 */
export function lightenHex(hex: string, factor: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

export interface CountryFillResult {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

/**
 * Returns fill/stroke for a country based on completion percentage.
 *
 * Tiers:
 *   0%         → light gray #e5e7eb
 *   1–29%      → lightenHex(teamColor, 0.6)
 *   30–69%     → teamColor at 80% opacity (rendered as hex blend over white)
 *   70–99%     → teamColor at full opacity
 *   100%       → teamColor + gold border
 */
export function countryFill(
  teamColor: string,
  pct: number
): CountryFillResult {
  if (pct === 0) {
    return { fill: "#e5e7eb", stroke: "#d1d5db", strokeWidth: 0.5 };
  }
  if (pct === 100) {
    return { fill: teamColor, stroke: "#fbbf24", strokeWidth: 2 };
  }
  if (pct >= 70) {
    return { fill: teamColor, stroke: "#9ca3af", strokeWidth: 0.5 };
  }
  if (pct >= 30) {
    // Blend toward white at 40% to give ~60% opacity feel
    return { fill: lightenHex(teamColor, 0.4), stroke: "#9ca3af", strokeWidth: 0.5 };
  }
  // 1–29%
  return { fill: lightenHex(teamColor, 0.6), stroke: "#9ca3af", strokeWidth: 0.5 };
}

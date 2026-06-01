/**
 * NATION_ACCENT — Per-team accent color for the Panini TradingCard.
 *
 * The "6" motif and the name plate bottom use this color.
 * Source: derived from national flag palettes + design bundle (data.jsx lines 65-69).
 * Coverage: all 48 FIFA World Cup 2026 teams + FWC specials + _PANINI fallback.
 *
 * Keyed by sticker.team (full Spanish team name) matching stickers.json `team` field.
 * Fallback: '#E4002B' (FIFA red).
 */

export const NATION_ACCENT: Record<string, string> = {
  // Design bundle originals (data.jsx lines 65-69)
  "Chile":      "#E4002B",
  "Brasil":     "#1FA34A",
  "Argentina":  "#5BBDE4",
  "México":     "#0A7A3B",
  "Alemania":   "#111111",
  "Portugal":   "#C8102E",
  "Francia":    "#1466FF",
  "Nigeria":    "#1FA34A",
  "Corea":      "#0A7A3B",
  "Italia":     "#0A57C2",
  "Inglaterra": "#C8102E",
  "Senegal":    "#1FA34A",
  "Marruecos":  "#C8102E",
  "Japón":      "#BC002D",
  "Serbia":     "#C6363C",
  "España":     "#C60B1E",

  // Extended — Group A
  "Sudáfrica":        "#007A4D",
  "Corea del Sur":    "#0A7A3B",
  "República Checa":  "#D7141A",

  // Group B
  "Canadá":               "#FF0000",
  "Bosnia y Herzegovina": "#002395",
  "Catar":                "#8D1B3D",
  "Suiza":                "#FF0000",

  // Group C (Marruecos already defined above)
  "Haití":       "#00209F",
  "Escocia":     "#005EB8",

  // Group D
  "Estados Unidos": "#002868",
  "Paraguay":       "#D52B1E",
  "Australia":      "#00843D",
  "Turquía":        "#E30A17",

  // Group E
  "Curazao":         "#002B7F",
  "Costa de Marfil": "#F77F00",
  "Ecuador":         "#FFD100",

  // Group F
  "Países Bajos": "#FF4F00",
  "Suecia":       "#006AA7",
  "Túnez":        "#E70013",

  // Group G
  "Bélgica":      "#000000",
  "Egipto":       "#CE1126",
  "Irán":         "#239F40",
  "Nueva Zelanda":"#00247D",

  // Group H
  "Cabo Verde":    "#003893",
  "Arabia Saudita":"#006C35",
  "Uruguay":       "#75AADB",

  // Group I
  "Irak":    "#CE1126",
  "Noruega": "#EF2B2D",

  // Group J
  "Argelia": "#006233",
  "Austria": "#ED2939",
  "Jordania":"#007A3D",

  // Group K
  "RD Congo":  "#007FFF",
  "Uzbekistán":"#1EB53A",
  "Colombia":  "#FCD116",

  // Group L
  "Croacia": "#FF0000",
  "Ghana":   "#006B3F",
  "Panamá":  "#005293",

  // FWC specials + Panini (no accent needed — use fallback)
  "Especiales Mundial": "#C0A85E",
  "Panini":             "#C0A85E",
};

/**
 * Returns the accent color for a given team name.
 * Falls back to FIFA red if the team is not in the map.
 */
export function getAccent(teamName: string): string {
  return NATION_ACCENT[teamName] ?? "#E4002B";
}

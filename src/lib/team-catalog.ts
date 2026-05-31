/**
 * Team catalog — canonical map of team_code → display metadata.
 *
 * Source of truth for Spanish display names and flag emojis.
 * Used exclusively for UI rendering (headers). NOT stored in stickers.json
 * to keep data and presentation concerns separate.
 *
 * Coverage: 48 countries (12 groups × 4) + FWC specials + Panini = 50 entries.
 * Group ordering matches the FIFA 2026 draw used in stickers-enriched.json.
 *
 * Scotland and England flags use Unicode tag sequences (RGI subdivision flags).
 * These render correctly on iOS 13+, Android 11+, Chrome, Safari.
 * If they appear as empty boxes in production, the fallback is 🏴 (plain black flag).
 */

export interface TeamCatalogEntry {
  code: string;         // "MEX" | "FWC" | "_PANINI"
  display_name: string; // "México" | "Especiales Mundial" | "Panini"
  flag: string;         // emoji "🇲🇽" | "🏆" | "⭐"
  group: string;        // "A" | "_fwc" | "_end" — matches stickers.json `group` field
}

export const TEAM_CATALOG: Record<string, TeamCatalogEntry> = {
  // FWC specials (group "_fwc")
  FWC: { code: "FWC", display_name: "Especiales Mundial", flag: "🏆", group: "_fwc" },

  // Group A
  MEX: { code: "MEX", display_name: "México",          flag: "🇲🇽", group: "A" },
  RSA: { code: "RSA", display_name: "Sudáfrica",        flag: "🇿🇦", group: "A" },
  KOR: { code: "KOR", display_name: "Corea del Sur",   flag: "🇰🇷", group: "A" },
  CZE: { code: "CZE", display_name: "República Checa", flag: "🇨🇿", group: "A" },

  // Group B
  CAN: { code: "CAN", display_name: "Canadá",               flag: "🇨🇦", group: "B" },
  BIH: { code: "BIH", display_name: "Bosnia y Herzegovina", flag: "🇧🇦", group: "B" },
  QAT: { code: "QAT", display_name: "Catar",                flag: "🇶🇦", group: "B" },
  SUI: { code: "SUI", display_name: "Suiza",                flag: "🇨🇭", group: "B" },

  // Group C
  BRA: { code: "BRA", display_name: "Brasil",    flag: "🇧🇷", group: "C" },
  MAR: { code: "MAR", display_name: "Marruecos", flag: "🇲🇦", group: "C" },
  HAI: { code: "HAI", display_name: "Haití",     flag: "🇭🇹", group: "C" },
  // Scotland: RGI subdivision tag sequence — renders on iOS 13+/Android 11+/Chrome/Safari
  // Fallback if empty box: replace with 🏴 (plain black flag emoji)
  SCO: {
    code: "SCO",
    display_name: "Escocia",
    flag: "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
    group: "C",
  },

  // Group D
  USA: { code: "USA", display_name: "Estados Unidos", flag: "🇺🇸", group: "D" },
  PAR: { code: "PAR", display_name: "Paraguay",       flag: "🇵🇾", group: "D" },
  AUS: { code: "AUS", display_name: "Australia",      flag: "🇦🇺", group: "D" },
  TUR: { code: "TUR", display_name: "Turquía",        flag: "🇹🇷", group: "D" },

  // Group E
  GER: { code: "GER", display_name: "Alemania",         flag: "🇩🇪", group: "E" },
  CUW: { code: "CUW", display_name: "Curazao",           flag: "🇨🇼", group: "E" },
  CIV: { code: "CIV", display_name: "Costa de Marfil",  flag: "🇨🇮", group: "E" },
  ECU: { code: "ECU", display_name: "Ecuador",           flag: "🇪🇨", group: "E" },

  // Group F
  NED: { code: "NED", display_name: "Países Bajos", flag: "🇳🇱", group: "F" },
  JPN: { code: "JPN", display_name: "Japón",        flag: "🇯🇵", group: "F" },
  SWE: { code: "SWE", display_name: "Suecia",       flag: "🇸🇪", group: "F" },
  TUN: { code: "TUN", display_name: "Túnez",        flag: "🇹🇳", group: "F" },

  // Group G
  BEL: { code: "BEL", display_name: "Bélgica",       flag: "🇧🇪", group: "G" },
  EGY: { code: "EGY", display_name: "Egipto",         flag: "🇪🇬", group: "G" },
  IRN: { code: "IRN", display_name: "Irán",           flag: "🇮🇷", group: "G" },
  NZL: { code: "NZL", display_name: "Nueva Zelanda",  flag: "🇳🇿", group: "G" },

  // Group H
  ESP: { code: "ESP", display_name: "España",         flag: "🇪🇸", group: "H" },
  CPV: { code: "CPV", display_name: "Cabo Verde",     flag: "🇨🇻", group: "H" },
  KSA: { code: "KSA", display_name: "Arabia Saudita", flag: "🇸🇦", group: "H" },
  URU: { code: "URU", display_name: "Uruguay",        flag: "🇺🇾", group: "H" },

  // Group I
  FRA: { code: "FRA", display_name: "Francia", flag: "🇫🇷", group: "I" },
  SEN: { code: "SEN", display_name: "Senegal", flag: "🇸🇳", group: "I" },
  IRQ: { code: "IRQ", display_name: "Irak",    flag: "🇮🇶", group: "I" },
  NOR: { code: "NOR", display_name: "Noruega", flag: "🇳🇴", group: "I" },

  // Group J
  ARG: { code: "ARG", display_name: "Argentina", flag: "🇦🇷", group: "J" },
  ALG: { code: "ALG", display_name: "Argelia",   flag: "🇩🇿", group: "J" },
  AUT: { code: "AUT", display_name: "Austria",   flag: "🇦🇹", group: "J" },
  JOR: { code: "JOR", display_name: "Jordania",  flag: "🇯🇴", group: "J" },

  // Group K
  POR: { code: "POR", display_name: "Portugal",    flag: "🇵🇹", group: "K" },
  COD: { code: "COD", display_name: "RD Congo",    flag: "🇨🇩", group: "K" },
  UZB: { code: "UZB", display_name: "Uzbekistán",  flag: "🇺🇿", group: "K" },
  COL: { code: "COL", display_name: "Colombia",    flag: "🇨🇴", group: "K" },

  // Group L
  // England: RGI subdivision tag sequence — renders on iOS 13+/Android 11+/Chrome/Safari
  // Fallback if empty box: replace with 🏴 (plain black flag emoji)
  ENG: {
    code: "ENG",
    display_name: "Inglaterra",
    flag: "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
    group: "L",
  },
  CRO: { code: "CRO", display_name: "Croacia", flag: "🇭🇷", group: "L" },
  GHA: { code: "GHA", display_name: "Ghana",   flag: "🇬🇭", group: "L" },
  PAN: { code: "PAN", display_name: "Panamá",  flag: "🇵🇦", group: "L" },

  // Panini special (group "_end")
  // Maps to team_code="" stickers via defensive lookup in album page
  _PANINI: { code: "_PANINI", display_name: "Panini", flag: "⭐", group: "_end" },
};

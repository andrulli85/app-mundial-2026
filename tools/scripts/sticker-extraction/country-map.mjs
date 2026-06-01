/**
 * country-map.mjs
 *
 * Canonical mapping: folder name → ISO-3 team code (uppercase).
 * Also maps ISO-3 → folder name for reverse lookups.
 *
 * The PDF inside each folder is found via glob — we pick the largest
 * non-"extra" PDF to handle filename inconsistencies (e.g. "japon 2026.pdf",
 * "ESPANHA.pdf", "ARGENTINA.pdf").
 */

import { readdirSync, statSync } from "fs";
import path from "path";

/** Folder name → ISO-3 (uppercase) */
export const FOLDER_TO_ISO = {
  "ALEMANIA": "GER",
  "ARABIA SAUDITA": "KSA",
  "ARGELIA": "ALG",
  "ARGENTINA": "ARG",
  "AUSTRALIA": "AUS",
  "AUSTRIA": "AUT",
  "BELGICA": "BEL",
  "BOSNIA": "BIH",
  "BRASIL": "BRA",
  "CABO VERDE": "CPV",
  "CANADA": "CAN",
  "COLOMBIA": "COL",
  "COSTA DE MARFIL": "CIV",
  "CROACIA": "CRO",
  "CURAZAO": "CUW",
  "ECUADOR": "ECU",
  "EGIPTO": "EGY",
  "ESCOCIA": "SCO",
  "ESPAÑA": "ESP",
  "ESTADOS UNIDOS": "USA",
  "FRANCIA": "FRA",
  "GHANA": "GHA",
  "HAITI": "HAI",
  "HOLANDA": "NED",
  "INGLATERRA": "ENG",
  "IRAK": "IRQ",
  "IRAN": "IRN",
  "JAPON": "JPN",
  "JORDANIA": "JOR",
  "KOREA": "KOR",
  "MARRUECOS": "MAR",
  "MEXICO": "MEX",
  "NORUEGA": "NOR",
  "NUEVA ZELANDA": "NZL",
  "PANAMA": "PAN",
  "PARAGUAY": "PAR",
  "PORTUGAL": "POR",
  "QATAR": "QAT",
  "RD CONGO": "COD",
  "REPUBLICA CHECA": "CZE",
  "SENEGAL": "SEN",
  "SOUTH AFRICA": "RSA",
  "SUECIA": "SWE",
  "SUIZA": "SUI",
  "TUNEZ": "TUN",
  "TURQUIA": "TUR",
  "URUGUAY": "URU",
  "UZBEKISTAN": "UZB",
};

/** ISO-3 (uppercase) → folder name */
export const ISO_TO_FOLDER = Object.fromEntries(
  Object.entries(FOLDER_TO_ISO).map(([folder, iso]) => [iso, folder])
);

export const PANINI_ROOT = "/Users/Andy/Desktop/app-mundial-2026/originales/PANINI 2026";

/**
 * Find the primary PDF for a country folder.
 * Returns the largest PDF that is NOT an "extras" file.
 *
 * @param {string} folderName
 * @returns {string|null} absolute path or null if not found
 */
export function findMainPdf(folderName) {
  const folderPath = path.join(PANINI_ROOT, folderName);
  let files;
  try {
    files = readdirSync(folderPath);
  } catch {
    return null;
  }

  const pdfs = files
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => ({
      name: f,
      fullPath: path.join(folderPath, f),
      size: (() => {
        try {
          return statSync(path.join(folderPath, f)).size;
        } catch {
          return 0;
        }
      })(),
      isExtra: /extra|messi|dorad/i.test(f),
    }))
    .filter((p) => !p.isExtra);

  if (pdfs.length === 0) return null;

  // Pick largest non-extra PDF
  pdfs.sort((a, b) => b.size - a.size);
  return pdfs[0].fullPath;
}

/**
 * Resolve a user-supplied country identifier to an ISO-3 code (uppercase).
 * Accepts: ISO-3 code (any case) or folder name.
 * Returns null if not found.
 *
 * @param {string} input
 * @returns {string|null}
 */
export function resolveCountry(input) {
  const upper = input.toUpperCase();
  // Direct ISO match
  if (ISO_TO_FOLDER[upper]) return upper;
  // Folder name match
  if (FOLDER_TO_ISO[upper]) return FOLDER_TO_ISO[upper];
  // Partial folder match (case-insensitive)
  const folderMatch = Object.keys(FOLDER_TO_ISO).find(
    (f) => f.toUpperCase() === upper
  );
  if (folderMatch) return FOLDER_TO_ISO[folderMatch];
  return null;
}

/** All ISO-3 codes in alphabetical order */
export const ALL_ISOS = Object.values(FOLDER_TO_ISO).sort();

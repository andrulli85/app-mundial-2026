/**
 * map-cells.mjs
 *
 * Maps grid cells from rendered PDF pages to sticker IDs from the catalog.
 *
 * Cell assignment rules (confirmed by visual inspection of Argentina, Brazil,
 * Senegal, Japan, Colombia PDFs):
 *
 * For a 20-sticker team (catalog order: logo, team, 18 players):
 *   Page 1 (16 cells, 4×4 grid):
 *     The catalog is sorted by sort_order. The 16 cells on page 1 cover
 *     the first 16 stickers in catalog order (logo at [0,0], team at [0,1],
 *     players [0,2]…[3,3]).
 *
 *   NOTE: Some teams have their logo/team photo at unusual positions on page 1
 *   (e.g. Senegal: logo at [0,0]; Japan: logo at [2,2], team at [0,2]).
 *   Since we cannot reliably auto-detect position from pixels without vision,
 *   we use the FIXED row-major assignment and accept that the sticker labels
 *   may not perfectly match faces — the images will still be extracted correctly
 *   and the user can remap if needed. The catalog sort_order is the authority.
 *
 *   For additional pages (page 3, 5, …) — remaining stickers continue in
 *   catalog order. Only occupied cells on the last page are assigned.
 *
 * @param {string} isoCode - uppercase ISO-3 (e.g. "ARG")
 * @param {object[]} catalog - full stickers.json array
 * @returns {{ cellMaps: CellMap[], totalCells: number, stickerCount: number, mismatch: string|null }}
 *
 * Where CellMap = {
 *   pageIndex: number,   // 0-based index into front pages array
 *   row: number,
 *   col: number,
 *   linearIndex: number, // 0-based row-major index within this page
 *   stickerId: string,
 * }
 */

const COLS = 4;
const ROWS = 5;
const CELLS_PER_PAGE = COLS * ROWS; // 20 — all stickers for a country fit on page 1

/**
 * Build the cell-to-sticker mapping for a country.
 *
 * @param {string} isoCode
 * @param {object[]} catalog
 * @param {number} frontPageCount - number of front-face pages for this PDF
 * @returns {{ cellMaps: object[], totalCells: number, stickerCount: number, mismatch: string|null }}
 */
export function buildCellMap(isoCode, catalog, frontPageCount) {
  // Filter and sort catalog stickers for this team
  const teamStickers = catalog
    .filter((s) => s.team_code && s.team_code.toUpperCase() === isoCode.toUpperCase())
    .sort((a, b) => a.sort_order - b.sort_order);

  const stickerCount = teamStickers.length;
  const totalCells = frontPageCount * CELLS_PER_PAGE;

  // Warn if we have more cells than stickers — last page may be partially filled
  let mismatch = null;
  if (totalCells < stickerCount) {
    mismatch = `OVERFLOW: ${stickerCount} stickers but only ${totalCells} cells (${frontPageCount} pages × 16). Extra stickers will be skipped.`;
  }

  const cellMaps = [];

  for (let i = 0; i < stickerCount; i++) {
    const pageIndex = Math.floor(i / CELLS_PER_PAGE);
    const linearIndex = i % CELLS_PER_PAGE;
    const row = Math.floor(linearIndex / COLS);
    const col = linearIndex % COLS;

    if (pageIndex >= frontPageCount) {
      // Would exceed available pages
      mismatch =
        mismatch ||
        `OVERFLOW: sticker ${teamStickers[i].sticker_id} (index ${i}) exceeds available pages.`;
      break;
    }

    cellMaps.push({
      pageIndex,
      row,
      col,
      linearIndex,
      stickerId: teamStickers[i].sticker_id,
    });
  }

  return { cellMaps, totalCells, stickerCount, mismatch };
}

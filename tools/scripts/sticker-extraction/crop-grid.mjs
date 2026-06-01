/**
 * crop-grid.mjs
 *
 * Crops a rendered sticker sheet JPEG into individual cell images.
 *
 * Page layout for Panini FIFA World Cup 2026 PDFs:
 *   - 5 rows × 4 cols = 20 cells per page (all 20 team stickers on page 1)
 *   - Standard portrait page (width < height)
 *   - If landscape (width > height), rotate 90° CW before cropping
 *
 * Returns an array of { row, col, linearIndex, buffer } objects in reading order
 * (row-major: (0,0), (0,1), … (0,3), (1,0), …).
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");

const COLS = 4;
const ROWS = 5; // 5 rows × 4 cols = 20 stickers per page (all 20 team stickers on page 1)
const INSET_FRACTION = 0.01; // 1% inset on each side of each cell

/**
 * Crop a rendered page image into a 5×4 grid of cell images.
 *
 * @param {string} imagePath - path to the rendered JPEG
 * @returns {Promise<Array<{row: number, col: number, linearIndex: number, buffer: Buffer}>>}
 */
export async function cropGrid(imagePath) {
  const meta = await sharp(imagePath).metadata();
  let { width, height } = meta;

  // If landscape, rotate 90° clockwise to normalize to portrait
  let baseImage = sharp(imagePath);
  if (width > height) {
    baseImage = baseImage.rotate(-90);
    [width, height] = [height, width];
  }

  // Get normalized buffer
  const normalizedBuffer = await baseImage.toBuffer();
  const normalizedMeta = await sharp(normalizedBuffer).metadata();
  const actualWidth = normalizedMeta.width;
  const actualHeight = normalizedMeta.height;

  const cellW = Math.floor(actualWidth / COLS);
  const cellH = Math.floor(actualHeight / ROWS);

  const insetX = Math.floor(cellW * INSET_FRACTION);
  const insetY = Math.floor(cellH * INSET_FRACTION);

  const cropWidth = cellW - 2 * insetX;
  const cropHeight = cellH - 2 * insetY;

  const cells = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const left = col * cellW + insetX;
      const top = row * cellH + insetY;

      const buffer = await sharp(normalizedBuffer)
        .extract({
          left,
          top,
          width: cropWidth,
          height: cropHeight,
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      const linearIndex = row * COLS + col;
      cells.push({ row, col, linearIndex, buffer });
    }
  }

  return cells;
}

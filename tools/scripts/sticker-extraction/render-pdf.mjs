/**
 * render-pdf.mjs
 *
 * Renders a PDF to JPEG images using pdftoppm at 300 DPI.
 * Only renders odd-numbered pages (front faces of sticker sheets).
 * Even pages are reverse-printing backs ("FIFA OFFICIAL LICENSED PRODUCT").
 *
 * Returns an array of absolute paths to the rendered JPEG files, sorted by page.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync } from "fs";
import path from "path";
import os from "os";

const PDFTOPPM = "/opt/homebrew/bin/pdftoppm";
const DPI = 300;

/**
 * Get page count of a PDF.
 *
 * @param {string} pdfPath
 * @returns {number}
 */
export function getPageCount(pdfPath) {
  try {
    const out = execSync(`/opt/homebrew/bin/pdfinfo "${pdfPath}" 2>/dev/null`, {
      encoding: "utf8",
    });
    const match = out.match(/Pages:\s+(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  } catch {
    return 1;
  }
}

/**
 * Determine which pages contain sticker faces.
 * Rule: ALL 20 stickers for a country are always on PAGE 1 in a 5×4 grid.
 * Additional pages (2, 3, 4) are either:
 *   - reverse-print backs ("FIFA OFFICIAL LICENSED PRODUCT")
 *   - large-format extras (oversized stickers, not in the standard 5×4 grid)
 * We only process page 1 for all country PDFs.
 *
 * @param {number} totalPages
 * @returns {number[]} page numbers (1-indexed) — always [1]
 */
export function getFrontPages(totalPages) {
  // Always page 1 only — all 20 country stickers are in the 5×4 grid on page 1
  return [1];
}

/**
 * Render one page of a PDF to JPEG in a temp directory.
 *
 * @param {string} pdfPath
 * @param {number} pageNum 1-indexed
 * @param {string} outDir directory to write into
 * @param {string} prefix filename prefix
 * @returns {string} path to rendered JPEG
 */
export function renderPage(pdfPath, pageNum, outDir, prefix) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const outPrefix = path.join(outDir, prefix);
  const cmd = [
    PDFTOPPM,
    `-r ${DPI}`,
    `-jpeg`,
    `-f ${pageNum}`,
    `-l ${pageNum}`,
    `"${pdfPath}"`,
    `"${outPrefix}"`,
  ].join(" ");

  execSync(cmd, { stdio: "pipe" });

  // pdftoppm outputs <prefix>-N.jpg (zero-padded based on total pages)
  const files = readdirSync(outDir)
    .filter((f) => f.startsWith(path.basename(prefix)) && f.endsWith(".jpg"))
    .map((f) => path.join(outDir, f))
    .sort();

  if (files.length === 0) {
    throw new Error(`pdftoppm produced no output for page ${pageNum} of ${pdfPath}`);
  }

  // Return the most recent file (there should be exactly one)
  return files[files.length - 1];
}

/**
 * Render all front-face pages of a PDF.
 *
 * @param {string} pdfPath
 * @param {string} outDir
 * @param {string} prefix
 * @returns {{ pagePaths: string[], totalPages: number, frontPages: number[] }}
 */
export function renderAllFrontPages(pdfPath, outDir, prefix) {
  const totalPages = getPageCount(pdfPath);
  const frontPages = getFrontPages(totalPages);

  const pagePaths = [];
  for (const pageNum of frontPages) {
    const pagePrefix = `${prefix}-p${pageNum}`;
    const rendered = renderPage(pdfPath, pageNum, outDir, pagePrefix);
    pagePaths.push(rendered);
  }

  return { pagePaths, totalPages, frontPages };
}

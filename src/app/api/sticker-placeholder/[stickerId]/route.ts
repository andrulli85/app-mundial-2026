/**
 * GET /api/sticker-placeholder/[stickerId]
 *
 * Generates a branded dynamic SVG placeholder for stickers that lack a real photo.
 * Uses the sticker's catalog metadata (team_color, type, display_name, number, team)
 * to produce a visually distinct card per sticker — far better than a generic "?" card.
 *
 * Four visual variants based on sticker type:
 *   A — player         : team color background + large number + surname
 *   B — team_logo      : dark background + team color circle + team code
 *   C — team_photo     : team color gradient + silhouette grid + team strip
 *   D — fwc / panini_special : foil-gold dark background + trophy icon
 *
 * Cache: 1 year immutable — content is deterministic per sticker_id.
 * SVG fonts: Arial/sans-serif (web fonts don't load in SVG without CSS injection).
 *
 * Color tokens (from globals.css — embedded as hex since SVG can't read CSS vars):
 *   --bg-0: #07080A   --bg-1: #0D0F13   --bg-2: #15181F   --bg-3: #1D212B
 *   --gold: #F4C84A   --gold-bright: #FFE17A   --gold-deep: #C2913A
 *   --fg-1: #F6F8FB
 */

import { NextRequest, NextResponse } from "next/server";
import stickersRaw from "@/data/stickers.json";

// ---------------------------------------------------------------------------
// Catalog types
// ---------------------------------------------------------------------------

interface StickerEntry {
  sticker_id: string;
  code: string;
  name: string;
  display_name: string;
  team: string;
  team_code: string;
  team_color: string;
  number: number;
  type: "player" | "team_logo" | "team_photo" | "fwc" | "panini_special";
  group: string;
}

const catalog = stickersRaw as StickerEntry[];
const catalogMap = new Map<string, StickerEntry>(
  catalog.map((s) => [s.sticker_id, s])
);

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/** Parses "#RRGGBB" → [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return [r, g, b];
}

/** Darkens a hex color by reducing each channel by `amount` (0–255). */
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `rgb(${clamp(r - amount)},${clamp(g - amount)},${clamp(b - amount)})`;
}

/** Returns perceived luminance (0–1) so we can decide text color. */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Picks white or near-black text depending on background luminance. */
function contrastText(hex: string): string {
  return luminance(hex) > 0.5 ? "#0D0F13" : "#F6F8FB";
}

// ---------------------------------------------------------------------------
// Surname extraction
// ---------------------------------------------------------------------------

/** Returns the last word of display_name (usually surname for players). */
function lastName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? displayName;
}

// ---------------------------------------------------------------------------
// SVG variant builders
// ---------------------------------------------------------------------------

/** Variant A — player sticker */
function svgPlayer(s: StickerEntry): string {
  const tc = s.team_color || "#1D212B";
  const darkBg = darken(tc, 55);
  const textColor = "#F6F8FB";
  const surname = lastName(s.display_name);
  const numStr = s.number > 0 ? String(s.number) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520">
  <defs>
    <radialGradient id="bg-grad" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="${tc}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${darkBg}" stop-opacity="1"/>
    </radialGradient>
    <clipPath id="card-clip">
      <rect width="400" height="520" rx="18" ry="18"/>
    </clipPath>
  </defs>

  <!-- Card background -->
  <rect width="400" height="520" rx="18" ry="18" fill="url(#bg-grad)"/>

  <!-- Subtle inner border -->
  <rect x="2" y="2" width="396" height="516" rx="16" ry="16" fill="none"
        stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>

  <!-- Top-left: flag chip -->
  <rect x="16" y="16" width="38" height="24" rx="4" ry="4" fill="rgba(0,0,0,0.35)"/>
  <rect x="17" y="17" width="36" height="22" rx="3" ry="3" fill="${tc}"
        stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
  <text x="36" y="33" font-family="Arial,sans-serif" font-size="10" font-weight="700"
        fill="${contrastText(tc)}" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="0.5">${s.team_code}</text>

  <!-- Top-right: FWC 26 label -->
  <text x="384" y="26" font-family="Arial,sans-serif" font-size="11" font-weight="600"
        fill="#F4C84A" text-anchor="end" opacity="0.9" letter-spacing="1">FWC 26</text>

  <!-- Giant number -->
  <text x="200" y="295" font-family="Arial Black,Arial,sans-serif" font-size="180"
        font-weight="900" fill="${textColor}" text-anchor="middle"
        dominant-baseline="middle" opacity="0.22">${numStr}</text>
  <!-- Number foreground (layered for depth) -->
  <text x="200" y="290" font-family="Arial Black,Arial,sans-serif" font-size="172"
        font-weight="900" fill="${textColor}" text-anchor="middle"
        dominant-baseline="middle" opacity="0.75">${numStr}</text>

  <!-- Surname -->
  <text x="200" y="432" font-family="Arial Black,Arial,sans-serif" font-size="28"
        font-weight="800" fill="${textColor}" text-anchor="middle"
        dominant-baseline="middle" letter-spacing="2">${surname}</text>

  <!-- Team name subtitle -->
  <text x="200" y="468" font-family="Arial,sans-serif" font-size="13" font-weight="400"
        fill="${textColor}" text-anchor="middle" dominant-baseline="middle"
        opacity="0.65" letter-spacing="1">${s.team.toUpperCase()}</text>

  <!-- Bottom-right gold corner mark -->
  <line x1="358" y1="502" x2="386" y2="502" stroke="#F4C84A" stroke-width="2" opacity="0.7"/>
  <line x1="386" y1="502" x2="386" y2="474" stroke="#F4C84A" stroke-width="2" opacity="0.7"/>
</svg>`;
}

/** Variant B — team_logo sticker */
function svgTeamLogo(s: StickerEntry): string {
  const tc = s.team_color || "#1466FF";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520">
  <defs>
    <radialGradient id="circle-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${tc}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${darken(tc, 40)}" stop-opacity="1"/>
    </radialGradient>
  </defs>

  <!-- Dark background -->
  <rect width="400" height="520" rx="18" ry="18" fill="#15181F"/>

  <!-- Gold border -->
  <rect x="2" y="2" width="396" height="516" rx="16" ry="16" fill="none"
        stroke="#F4C84A" stroke-width="2" opacity="0.7"/>

  <!-- Team color circle -->
  <circle cx="200" cy="230" r="110" fill="url(#circle-grad)"/>
  <circle cx="200" cy="230" r="110" fill="none" stroke="rgba(255,255,255,0.2)"
          stroke-width="2"/>

  <!-- Team code in circle -->
  <text x="200" y="238" font-family="Arial Black,Arial,sans-serif" font-size="68"
        font-weight="900" fill="#F6F8FB" text-anchor="middle"
        dominant-baseline="middle" letter-spacing="3">${s.team_code}</text>

  <!-- Team name below -->
  <text x="200" y="390" font-family="Arial,sans-serif" font-size="22" font-weight="600"
        fill="#F6F8FB" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="2">${s.team.toUpperCase()}</text>

  <!-- TEAM LOGO eyebrow -->
  <text x="200" y="450" font-family="Arial,sans-serif" font-size="12" font-weight="400"
        fill="#F4C84A" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="3" opacity="0.8">ESCUDO OFICIAL</text>

  <!-- Top-right: FWC 26 -->
  <text x="384" y="26" font-family="Arial,sans-serif" font-size="11" font-weight="600"
        fill="#F4C84A" text-anchor="end" opacity="0.9" letter-spacing="1">FWC 26</text>
</svg>`;
}

/** Variant C — team_photo sticker */
function svgTeamPhoto(s: StickerEntry): string {
  const tc = s.team_color || "#1D212B";
  const darkTc = darken(tc, 50);

  // Generate a 4-row × 3-col grid of abstract silhouette figures
  // Each figure = a gray circle (head) + rounded rect (body)
  const figures: string[] = [];
  const cols = 4;
  const rows = 3;
  const startX = 40;
  const startY = 90;
  const colGap = 80;
  const rowGap = 100;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * colGap + (row % 2 === 1 ? 18 : 0);
      const y = startY + row * rowGap;
      figures.push(`
      <!-- Figure row${row} col${col} -->
      <circle cx="${x}" cy="${y}" r="14" fill="rgba(255,255,255,0.18)"/>
      <rect x="${x - 13}" y="${y + 18}" width="26" height="36" rx="6"
            fill="rgba(255,255,255,0.13)"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520">
  <defs>
    <linearGradient id="team-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tc}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${darkTc}" stop-opacity="1"/>
    </linearGradient>
  </defs>

  <!-- Gradient background -->
  <rect width="400" height="520" rx="18" ry="18" fill="url(#team-grad)"/>

  <!-- Subtle inner border -->
  <rect x="2" y="2" width="396" height="516" rx="16" ry="16" fill="none"
        stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>

  <!-- Silhouette grid -->
  ${figures.join("")}

  <!-- Bottom dark strip -->
  <rect x="0" y="420" width="400" height="100" rx="0" ry="0" fill="rgba(0,0,0,0.55)"/>
  <rect x="0" y="420" width="400" height="100" rx="0" ry="0"
        fill="none" clip-path="none"/>
  <!-- Rounded bottom corners -->
  <rect x="0" y="470" width="400" height="50" rx="0" ry="0" fill="rgba(0,0,0,0.55)"/>
  <rect x="0" y="440" width="400" height="80" rx="0" ry="0" fill="rgba(0,0,0,0)"/>

  <!-- EQUIPO eyebrow -->
  <text x="200" y="447" font-family="Arial,sans-serif" font-size="11" font-weight="600"
        fill="#F4C84A" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="4" opacity="0.9">EQUIPO</text>

  <!-- Team name -->
  <text x="200" y="476" font-family="Arial Black,Arial,sans-serif" font-size="24"
        font-weight="800" fill="#F6F8FB" text-anchor="middle"
        dominant-baseline="middle" letter-spacing="2">${s.team.toUpperCase()}</text>

  <!-- Team code top-left -->
  <rect x="16" y="16" width="42" height="24" rx="4" ry="4" fill="rgba(0,0,0,0.4)"/>
  <text x="37" y="28" font-family="Arial,sans-serif" font-size="11" font-weight="700"
        fill="#F6F8FB" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="0.5">${s.team_code}</text>

  <!-- Top-right: FWC 26 -->
  <text x="384" y="26" font-family="Arial,sans-serif" font-size="11" font-weight="600"
        fill="#F4C84A" text-anchor="end" opacity="0.9" letter-spacing="1">FWC 26</text>
</svg>`;
}

/** Variant D — fwc / panini_special sticker */
function svgFwc(s: StickerEntry): string {
  // Trophy SVG path (simplified trophy silhouette, centered at 200,230, ~120px tall)
  const trophyPath = `M 200 130
    C 200 130 155 130 155 168
    C 155 195 168 210 185 218
    L 185 248
    L 165 248
    L 165 262
    L 235 262
    L 235 248
    L 215 248
    L 215 218
    C 232 210 245 195 245 168
    C 245 130 200 130 200 130 Z
    M 155 145 C 135 145 128 162 128 178
    C 128 195 140 205 155 210
    L 155 168
    Z
    M 245 145 L 245 210
    C 260 205 272 195 272 178
    C 272 162 265 145 245 145 Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520">
  <defs>
    <radialGradient id="foil-bg" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#2A2510" stop-opacity="1"/>
      <stop offset="60%" stop-color="#0D0F13" stop-opacity="1"/>
      <stop offset="100%" stop-color="#07080A" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="foil-trophy" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#FFE9A8"/>
      <stop offset="38%"  stop-color="#F4C84A"/>
      <stop offset="62%"  stop-color="#C2913A"/>
      <stop offset="100%" stop-color="#FFE9A8"/>
    </linearGradient>
    <linearGradient id="foil-text" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#FFE9A8"/>
      <stop offset="50%"  stop-color="#F4C84A"/>
      <stop offset="100%" stop-color="#C2913A"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="400" height="520" rx="18" ry="18" fill="url(#foil-bg)"/>

  <!-- Foil border -->
  <rect x="2" y="2" width="396" height="516" rx="16" ry="16" fill="none"
        stroke="url(#foil-trophy)" stroke-width="2.5"/>

  <!-- Subtle inner glow ring -->
  <rect x="8" y="8" width="384" height="504" rx="12" ry="12" fill="none"
        stroke="rgba(244,200,74,0.15)" stroke-width="1"/>

  <!-- Trophy silhouette (gold fill) -->
  <path d="${trophyPath}" fill="url(#foil-trophy)" filter="url(#glow)"/>

  <!-- Star accent above trophy -->
  <text x="200" y="108" font-family="Arial,sans-serif" font-size="20"
        fill="#F4C84A" text-anchor="middle" dominant-baseline="middle"
        opacity="0.85">&#9733;</text>

  <!-- FIFA WORLD CUP HISTORY eyebrow -->
  <text x="200" y="52" font-family="Arial,sans-serif" font-size="10" font-weight="600"
        fill="#F4C84A" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="3" opacity="0.8">FIFA WORLD CUP HISTORY</text>

  <!-- Display name (foil gold) -->
  <text x="200" y="330" font-family="Arial Black,Arial,sans-serif" font-size="18"
        font-weight="800" fill="url(#foil-text)" text-anchor="middle"
        dominant-baseline="middle" letter-spacing="1.5"
        filter="url(#glow)">${s.display_name}</text>

  <!-- Code label -->
  <text x="200" y="365" font-family="Arial,sans-serif" font-size="13" font-weight="400"
        fill="#F4C84A" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="2" opacity="0.6">${s.code}</text>

  <!-- Bottom stars decoration -->
  <text x="160" y="440" font-family="Arial,sans-serif" font-size="12"
        fill="#F4C84A" text-anchor="middle" opacity="0.5">&#9733;</text>
  <text x="200" y="445" font-family="Arial,sans-serif" font-size="16"
        fill="#F4C84A" text-anchor="middle" opacity="0.65">&#9733;</text>
  <text x="240" y="440" font-family="Arial,sans-serif" font-size="12"
        fill="#F4C84A" text-anchor="middle" opacity="0.5">&#9733;</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ stickerId: string }> }
): Promise<NextResponse> {
  const { stickerId } = await params;

  const sticker = catalogMap.get(stickerId);

  if (!sticker) {
    return new NextResponse(null, { status: 404 });
  }

  let svg: string;

  switch (sticker.type) {
    case "player":
      svg = svgPlayer(sticker);
      break;
    case "team_logo":
      svg = svgTeamLogo(sticker);
      break;
    case "team_photo":
      svg = svgTeamPhoto(sticker);
      break;
    case "fwc":
    case "panini_special":
      svg = svgFwc(sticker);
      break;
    default:
      // Fallback for unknown types — render as player variant
      svg = svgPlayer(sticker);
  }

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Vary": "Accept-Encoding",
    },
  });
}

// Ensure Node runtime — catalog import and JSON parsing
export const runtime = "nodejs";

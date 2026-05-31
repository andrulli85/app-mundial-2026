"use client";

/**
 * EmptySlot — authentic Panini album empty-cell design.
 *
 * Reproduces what the kid sees in his physical album when a sticker is missing:
 * - Team color band at the top (~6% height)
 * - Sticker code chip (top-left)
 * - Giant "2 6" silhouette in Bowlby One, lighter shade of team color, opacity 0.25
 * - Player/sticker name centered at the bottom
 *
 * Aspect ratio: 3:4 portrait (same as seed-cropped/)
 *
 * Props:
 *   stickerCode  — e.g. "MEX 13"
 *   playerName   — e.g. "SANTIAGO GIMÉNEZ" (uppercase)
 *   teamColor    — hex color, e.g. "#006847" (Mexico green)
 */

import { Bowlby_One } from "next/font/google";

const bowlby = Bowlby_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

interface EmptySlotProps {
  stickerCode: string;
  playerName: string;
  teamColor?: string;
  landscape?: boolean;
}

/** Lighten a hex color by mixing with white at the given ratio (0-1) */
function lightenHex(hex: string, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * ratio);
  const lg = Math.round(g + (255 - g) * ratio);
  const lb = Math.round(b + (255 - b) * ratio);
  return `rgb(${lr},${lg},${lb})`;
}

export default function EmptySlot({
  stickerCode,
  playerName,
  teamColor = "#9ca3af",
  landscape = false,
}: EmptySlotProps) {
  const silhouetteColor = lightenHex(teamColor, 0.6);

  return (
    <div
      className="relative w-full overflow-hidden rounded"
      style={{
        aspectRatio: landscape ? "4/3" : "3/4",
        backgroundColor: "#f5f0e8", // cream — matches the physical album page color
        border: "1px solid #d1c9b8",
      }}
    >
      {/* Team color band — top ~6% */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: "7%",
          backgroundColor: teamColor,
        }}
      />

      {/* Sticker code chip — top-left below color band */}
      <div
        className="absolute top-[9%] left-[6%] text-[0.55rem] font-bold leading-none uppercase tracking-wide"
        style={{ color: teamColor }}
      >
        {stickerCode}
      </div>

      {/* Giant "2 6" silhouette — centered */}
      <div
        className={`${bowlby.className} absolute inset-0 flex items-center justify-center select-none pointer-events-none`}
        style={{
          color: silhouetteColor,
          opacity: 0.28,
          fontSize: "clamp(2.2rem, 10vw, 3.8rem)",
          letterSpacing: "0.25em",
          lineHeight: 1,
          paddingTop: "7%", // clear the color band
        }}
        aria-hidden="true"
      >
        2&nbsp;6
      </div>

      {/* Player name — bottom strip */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center px-1"
        style={{
          height: "22%",
          backgroundColor: "rgba(255,255,255,0.85)",
          borderTop: `2px solid ${teamColor}`,
        }}
      >
        <span
          className="text-center font-semibold uppercase leading-tight"
          style={{
            fontSize: "clamp(0.45rem, 2vw, 0.7rem)",
            color: "#1a1a1a",
            wordBreak: "break-word",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {playerName}
        </span>
      </div>
    </div>
  );
}

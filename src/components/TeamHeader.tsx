"use client";

/**
 * TeamHeader — visual separator between sticker groups in the Album screen.
 *
 * Renders flag emoji + Spanish country name in bold, with an optional
 * team-color underline sourced from the first sticker of that group.
 *
 * Completion stat: "X / Y · ZZ%" below the team name.
 * Color coding:
 *   0–29%  → muted gray (#4b5563 — text-gray-600, high-contrast)
 *   30–69% → team_color at full saturation
 *   70–99% → team_color + bold + slightly larger
 *   100%   → 🎉 + team_color + bold
 */

import type { TeamCatalogEntry } from "@/lib/team-catalog";

interface TeamHeaderProps {
  entry: TeamCatalogEntry;
  teamColor?: string; // hex from first sticker of the group, optional
  owned?: number;     // stickers in this team with count >= 1 (omit to hide stat)
  total?: number;     // total stickers in this team (from full catalog)
}

export default function TeamHeader({ entry, teamColor, owned, total }: TeamHeaderProps) {
  const showStat = total !== undefined && total > 0;
  const pct = showStat ? Math.round(((owned ?? 0) / total!) * 100) : 0;

  // Resolve stat color and style
  const fallbackColor = "#4b5563"; // gray-600
  const accentColor = teamColor ?? fallbackColor;

  let statColor: string;
  let statFontWeight: string;
  let statFontSize: string;
  let statPrefix: string;

  if (pct === 100) {
    statColor = accentColor;
    statFontWeight = "700";
    statFontSize = "0.75rem";
    statPrefix = "🎉 ";
  } else if (pct >= 70) {
    statColor = accentColor;
    statFontWeight = "700";
    statFontSize = "0.75rem";
    statPrefix = "";
  } else if (pct >= 30) {
    statColor = accentColor;
    statFontWeight = "400";
    statFontSize = "0.7rem";
    statPrefix = "";
  } else {
    statColor = fallbackColor;
    statFontWeight = "400";
    statFontSize = "0.7rem";
    statPrefix = "";
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-2 mt-1"
      style={{
        borderBottom: teamColor
          ? `2px solid ${teamColor}`
          : "2px solid #d1c9b8",
      }}
    >
      <span className="text-2xl" aria-hidden="true">
        {entry.flag}
      </span>
      <div className="flex flex-col leading-tight">
        <h2
          className="text-sm font-bold tracking-tight"
          style={{ color: "#1f2937" }}
        >
          {entry.display_name}
        </h2>
        {showStat && (
          <span
            aria-label={`${owned ?? 0} de ${total} figuritas, ${pct} por ciento`}
            style={{
              color: statColor,
              fontWeight: statFontWeight,
              fontSize: statFontSize,
              lineHeight: "1.2",
            }}
          >
            {statPrefix}{owned ?? 0} / {total} · {pct}%
          </span>
        )}
      </div>
    </div>
  );
}

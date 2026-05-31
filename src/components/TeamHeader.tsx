"use client";

/**
 * TeamHeader — visual separator between sticker groups in the Album screen.
 *
 * Renders flag emoji + Spanish country name in bold, with an optional
 * team-color underline sourced from the first sticker of that group.
 */

import type { TeamCatalogEntry } from "@/lib/team-catalog";

interface TeamHeaderProps {
  entry: TeamCatalogEntry;
  teamColor?: string; // hex from first sticker of the group, optional
}

export default function TeamHeader({ entry, teamColor }: TeamHeaderProps) {
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
      <h2
        className="text-sm font-bold tracking-tight"
        style={{ color: "#1f2937" }}
      >
        {entry.display_name}
      </h2>
    </div>
  );
}

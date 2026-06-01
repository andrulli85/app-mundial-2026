/**
 * stats.ts — Pure computation functions for the /stats dashboard.
 *
 * No UI, no side effects. All functions are synchronous given pre-loaded
 * catalog and counts. Call computeAllStats() from the page component after
 * loading both catalog (getCatalog) and counts (getAllStickers).
 *
 * Sticker type breakdown:
 *   - "Países": team stickers that are NOT fwc / panini_special / FWC team_code
 *   - "Especiales": type === 'fwc' || type === 'panini_special' || team_code === 'FWC'
 *     (FWC has 19 stickers, _PANINI has 1 — total specials = 20)
 *
 * Groups A–L hold 80 stickers each (4 teams × 20). Groups _fwc and _end are special.
 */

import type { Sticker } from "@/lib/catalog";
import { TEAM_CATALOG } from "@/lib/team-catalog";

export interface OverallStats {
  ownedCount: number;
  totalCount: number;
  percent: number;
}

export interface TypeStats {
  paises: OverallStats;
  especiales: OverallStats;
}

export interface GroupStats {
  group: string;        // 'A' through 'L'
  ownedCount: number;
  totalCount: number;
  percent: number;
}

export interface TeamStats {
  team_code: string;
  team_name: string;
  flag_emoji: string;
  ownedCount: number;
  totalCount: number;
  percent: number;
  team_color: string;
}

export interface FooterStats {
  totalMarked: number;  // stickers with count >= 1
  totalRepes: number;   // stickers with count >= 2
  completedTeams: number; // teams where percent === 100
  daysInApp: number;    // days since firstStickerTs (or 0 if no stickers)
}

export interface AllStats {
  overall: OverallStats;
  byType: TypeStats;
  byGroup: GroupStats[];    // 12 entries A-L
  topTeams: TeamStats[];    // top 5 by percent desc (country teams only)
  bottomTeams: TeamStats[]; // bottom 5 by percent asc (country teams only, 0% included)
  footer: FooterStats;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIFA_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

function makeOverall(owned: number, total: number): OverallStats {
  return {
    ownedCount: owned,
    totalCount: total,
    percent: total > 0 ? Math.round((owned / total) * 100) : 0,
  };
}

function isSpecial(s: Sticker): boolean {
  return (
    s.type === "fwc" ||
    s.type === "panini_special" ||
    s.team_code === "FWC" ||
    s.team_code === ""
  );
}

function isPaises(s: Sticker): boolean {
  return !isSpecial(s);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function computeAllStats(
  catalog: Sticker[],
  counts: Record<string, number>,
  firstStickerTs?: number
): AllStats {
  // ---- Overall ----
  let totalOwned = 0;
  for (const s of catalog) {
    if ((counts[s.id] ?? 0) >= 1) totalOwned++;
  }
  const overall = makeOverall(totalOwned, catalog.length);

  // ---- By type ----
  let paisesOwned = 0, paisesTotal = 0;
  let especialesOwned = 0, especialesTotal = 0;
  for (const s of catalog) {
    if (isPaises(s)) {
      paisesTotal++;
      if ((counts[s.id] ?? 0) >= 1) paisesOwned++;
    } else {
      especialesTotal++;
      if ((counts[s.id] ?? 0) >= 1) especialesOwned++;
    }
  }
  const byType: TypeStats = {
    paises: makeOverall(paisesOwned, paisesTotal),
    especiales: makeOverall(especialesOwned, especialesTotal),
  };

  // ---- By group (A-L) ----
  const groupMap: Record<string, { owned: number; total: number }> = {};
  for (const s of catalog) {
    const g = s.group;
    if (!FIFA_GROUPS.includes(g as typeof FIFA_GROUPS[number])) continue;
    if (!groupMap[g]) groupMap[g] = { owned: 0, total: 0 };
    groupMap[g].total++;
    if ((counts[s.id] ?? 0) >= 1) groupMap[g].owned++;
  }
  const byGroup: GroupStats[] = FIFA_GROUPS.map((g) => {
    const entry = groupMap[g] ?? { owned: 0, total: 0 };
    return {
      group: g,
      ownedCount: entry.owned,
      totalCount: entry.total,
      percent: entry.total > 0 ? Math.round((entry.owned / entry.total) * 100) : 0,
    };
  });

  // ---- Per-team stats (country teams only) ----
  const teamMap: Record<string, { owned: number; total: number; color: string }> = {};
  for (const s of catalog) {
    if (!isPaises(s)) continue;
    const code = s.team_code;
    if (!teamMap[code]) teamMap[code] = { owned: 0, total: 0, color: s.team_color };
    teamMap[code].total++;
    if ((counts[s.id] ?? 0) >= 1) teamMap[code].owned++;
  }

  const teamList: TeamStats[] = Object.entries(teamMap).map(([code, data]) => {
    const entry = TEAM_CATALOG[code];
    return {
      team_code: code,
      team_name: entry?.display_name ?? code,
      flag_emoji: entry?.flag ?? "🏳️",
      ownedCount: data.owned,
      totalCount: data.total,
      percent: data.total > 0 ? Math.round((data.owned / data.total) * 100) : 0,
      team_color: data.color,
    };
  });

  // Top 5: highest percent desc; break ties by ownedCount desc
  const sorted = [...teamList].sort(
    (a, b) => b.percent - a.percent || b.ownedCount - a.ownedCount
  );
  const topTeams = sorted.slice(0, 5);

  // Bottom 5: lowest percent asc; only teams with at least some stickers
  // Per spec: 0% teams go in bottom, sorted lowest first
  const bottomSorted = [...teamList].sort(
    (a, b) => a.percent - b.percent || a.ownedCount - b.ownedCount
  );
  const bottomTeams = bottomSorted.slice(0, 5);

  // ---- Footer ----
  let totalMarked = 0;
  let totalRepes = 0;
  let completedTeams = 0;

  for (const s of catalog) {
    const c = counts[s.id] ?? 0;
    if (c >= 1) totalMarked++;
    if (c >= 2) totalRepes++;
  }
  for (const t of teamList) {
    if (t.percent === 100) completedTeams++;
  }

  const nowMs = Date.now();
  const daysInApp =
    firstStickerTs && firstStickerTs > 0
      ? Math.max(1, Math.floor((nowMs - firstStickerTs) / (1000 * 60 * 60 * 24)))
      : 0;

  const footer: FooterStats = { totalMarked, totalRepes, completedTeams, daysInApp };

  return { overall, byType, byGroup, topTeams, bottomTeams, footer };
}

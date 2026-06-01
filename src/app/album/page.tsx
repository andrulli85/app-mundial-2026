"use client";

/**
 * Album screen — 980-cell sticker grid.
 *
 * - Each cell is a <StickerCard> (filled photo or <EmptySlot>)
 * - Tap toggles count: 0→1→2→3→0 (missing→got→repe×1→repe×2→missing)
 * - State persisted in IndexedDB
 * - Header shows progress: X/980
 * - Stickers are grouped by team with a <TeamHeader> separator
 *
 * Tabs: Todo | Tengo | Me faltan | Repetidas
 * Team headers respond to active tab: only teams with visible stickers show a header.
 *
 * Category chips: 🔍 Todos | 🌍 Países | 🏆 Grupos | ✨ Especiales
 * Search input: case-insensitive match on code / name / team / display_name
 * Groups chip: shows FIFA 2026 group (A–L) section headers above team headers.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StickerCard from "@/components/StickerCard";
import TeamHeader from "@/components/TeamHeader";
import { getNickname, getAllStickers, toggleSticker } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import type { StickerEntry } from "@/lib/db";
import { TEAM_CATALOG } from "@/lib/team-catalog";
import type { TeamCatalogEntry } from "@/lib/team-catalog";
import InstallBanner from "@/components/InstallBanner";
import BottomNav from "@/components/BottomNav";
import { getPeersWishing } from "@/lib/peer-mock";

type Tab = "todo" | "tengo" | "faltan" | "repetidas";
type Category = "todos" | "paises" | "grupos" | "especiales";

// ---------------------------------------------------------------------------
// Category chip definitions
// ---------------------------------------------------------------------------

const CATEGORY_CHIPS: { id: Category; label: string }[] = [
  { id: "todos",     label: "🔍 Todos" },
  { id: "paises",    label: "🌍 Países" },
  { id: "grupos",    label: "🏆 Grupos" },
  { id: "especiales", label: "✨ Especiales" },
];

/**
 * External chip — navigates away from the album grid.
 * Chip is hidden from strip (2026-06-01, Andy paused doradas focus).
 * Route /album/doradas remains accessible. Re-enable chip by restoring the
 * <a> block in the category-chips group below.
 */
const _DORADAS_CHIP_HREF = "/album/doradas";

// Groups A–L in order
const FIFA_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// ---------------------------------------------------------------------------
// Team grouping helpers
// ---------------------------------------------------------------------------

interface TeamGroup {
  team_code: string;
  display_name: string;
  catalogEntry: TeamCatalogEntry;
  teamColor: string;
  stickers: Sticker[];
  /** FIFA group letter (A-L) or "_fwc" / "_end" */
  group: string;
}

/**
 * Groups an ordered sticker array into consecutive runs by team_code.
 * Stickers with team_code="" (Panini-00) are mapped to "_PANINI".
 * The order of groups reflects the sort_order already baked into the catalog.
 */
function groupStickersByTeam(stickers: Sticker[]): TeamGroup[] {
  const groups: TeamGroup[] = [];
  for (const sticker of stickers) {
    const teamKey = sticker.team_code || "_PANINI";
    const last = groups[groups.length - 1];
    if (!last || last.team_code !== teamKey) {
      const catalogEntry = TEAM_CATALOG[teamKey] ?? TEAM_CATALOG._PANINI;
      groups.push({
        team_code: teamKey,
        display_name: catalogEntry.display_name,
        catalogEntry,
        teamColor: sticker.team_color,
        stickers: [sticker],
        group: catalogEntry.group,
      });
    } else {
      last.stickers.push(sticker);
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Search normalization — strips diacritics so "Modric" matches "Modrić",
// "Sao Paulo" matches "São Paulo", "Sudafrica" matches "Sudáfrica", etc.
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function AlbumPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Sticker[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("todo");
  const [nickname, setNickname] = useState("");
  const [category, setCategory] = useState<Category>("todos");
  const [search, setSearch] = useState("");
  // demand map: sticker_id → number of friends who wishlisted it (used for demand badge)
  const [demandMap, setDemandMap] = useState<Record<string, number>>({});

  // Load catalog + collection on mount
  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }
      setNickname(nick);

      const [cat, entries] = await Promise.all([
        getCatalog(),
        getAllStickers(),
      ]);

      const countMap: Record<string, number> = {};
      entries.forEach((e: StickerEntry) => {
        countMap[e.sticker_id] = e.count;
      });

      setCatalog(cat);
      setCounts(countMap);
      setLoading(false);

      // Build demand map: for each sticker I own ≥2, count how many friends wish it
      const demand: Record<string, number> = {};
      for (const s of cat) {
        const peers = getPeersWishing(s.id);
        if (peers.length > 0) demand[s.id] = peers.length;
      }
      setDemandMap(demand);
    })();
  }, [router]);

  const handleTap = useCallback(async (stickerId: string) => {
    const updated = await toggleSticker(stickerId);
    setCounts((prev) => ({ ...prev, [stickerId]: updated.count }));
  }, []);

  // ---------- Filter pipeline: tab → category → search ----------
  const filteredStickers = useMemo(() => {
    // 1. Tab filter
    let stickers = catalog;
    if (tab === "tengo")     stickers = stickers.filter((s) => (counts[s.id] ?? 0) >= 1);
    if (tab === "faltan")    stickers = stickers.filter((s) => (counts[s.id] ?? 0) === 0);
    if (tab === "repetidas") stickers = stickers.filter((s) => (counts[s.id] ?? 0) >= 2);

    // 2. Category filter
    if (category === "paises" || category === "grupos") {
      // Country teams only: exclude FWC and Panini
      stickers = stickers.filter(
        (s) => s.type !== "fwc" && s.type !== "panini_special" && s.team_code !== "" && s.team_code !== "FWC"
      );
    } else if (category === "especiales") {
      stickers = stickers.filter(
        (s) => s.type === "fwc" || s.type === "panini_special" || s.team_code === "" || s.team_code === "FWC"
      );
    }

    // 3. Search filter — accent-insensitive, matches code, name, English team,
    //    team_code, sticker display_name, AND the Spanish display_name from
    //    TEAM_CATALOG so that "Estados Unidos", "Sudáfrica", "Modric" (→ Modrić)
    //    all resolve correctly regardless of diacritics.
    if (search.trim()) {
      const q = normalize(search.trim());
      stickers = stickers.filter((s) => {
        const spanishTeamName = normalize(
          TEAM_CATALOG[s.team_code || "_PANINI"]?.display_name ?? ""
        );
        return (
          normalize(s.code).includes(q) ||
          normalize(s.name).includes(q) ||
          normalize(s.team).includes(q) ||
          normalize(s.team_code).includes(q) ||
          normalize(s.display_name).includes(q) ||
          spanishTeamName.includes(q)
        );
      });
    }

    return stickers;
  }, [catalog, counts, tab, category, search]);

  // Stats (always from full catalog)
  const total = catalog.length;
  const owned = catalog.filter((s) => (counts[s.id] ?? 0) >= 1).length;
  const dupes = catalog.filter((s) => (counts[s.id] ?? 0) >= 2).length;

  // Per-team completion stats from the FULL catalog (not the filtered view),
  // so "X / 20" stays consistent regardless of active tab or search.
  const teamStats = useMemo(() => {
    const map = new Map<string, { owned: number; total: number }>();
    for (const sticker of catalog) {
      const code = sticker.team_code || "_PANINI";
      const m = map.get(code) ?? { owned: 0, total: 0 };
      m.total++;
      if ((counts[sticker.id] ?? 0) >= 1) m.owned++;
      map.set(code, m);
    }
    return map;
  }, [catalog, counts]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "todo",      label: "Todo",      count: total },
    { id: "tengo",     label: "Tengo",     count: owned },
    { id: "faltan",    label: "Me faltan", count: total - owned },
    { id: "repetidas", label: "Repetidas", count: dupes },
  ];

  // Category label for empty-state
  const categoryLabel: Record<Category, string> = {
    todos:     "el álbum",
    paises:    "Países",
    grupos:    "Grupos",
    especiales: "Especiales",
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "#006847", borderTopColor: "transparent" }}
          />
          <p className="text-sm text-gray-600">Cargando álbum...</p>
        </div>
      </div>
    );
  }

  // Group the filtered stickers for rendering
  const teamGroups = groupStickersByTeam(filteredStickers);

  return (
    <div className="flex flex-col flex-1 w-full lg:max-w-5xl xl:max-w-6xl mx-auto">
      {/* ------------------------------------------------------------------ */}
      {/* Header — sticky top-[54px] z-20 */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-black text-white leading-none">
              Mi Álbum
            </h1>
            <p className="text-xs text-green-200 mt-0.5">
              {nickname} · {owned}/{total} figuritas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/stats"
              className="rounded-full p-2 text-white hover:bg-green-700 transition-colors"
              aria-label="Ver estadísticas"
              title="Estadísticas"
            >
              <span className="text-xl leading-none" aria-hidden="true">📊</span>
            </a>
            <a
              href="/trade"
              className="rounded-full px-4 py-1.5 text-sm font-bold text-green-800"
              style={{ backgroundColor: "#c2ef4e" }}
            >
              Intercambiar
            </a>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-green-900 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: total > 0 ? `${(owned / total) * 100}%` : "0%",
              backgroundColor: "#c2ef4e",
            }}
          />
        </div>
      </header>

      {/* Smart install banner — hidden in standalone, respects 30d dismiss TTL */}
      <InstallBanner />

      {/* ------------------------------------------------------------------ */}
      {/* Search + Category chips — sticky below header (top-[72px] z-10)   */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="sticky top-[126px] z-10 px-3 pt-2.5 pb-2 border-b"
        style={{ backgroundColor: "#f9f5ee", borderColor: "#d1c9b8" }}
        data-testid="search-chips-bar"
      >
        {/* Search input */}
        <div className="relative mb-2">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none select-none"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar Estados Unidos / Modric / FWC…"
            aria-label="Buscar figuritas"
            data-testid="search-input"
            className="w-full rounded-full border pl-9 pr-4 py-2.5 text-sm outline-none transition-shadow"
            style={{
              fontSize: "16px", // iOS zoom guard — must be ≥16px
              backgroundColor: "#ffffff",
              borderColor: "#d1c9b8",
              color: "#1f2937",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#006847";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,104,71,0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#d1c9b8";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        {/* Category chip strip — horizontal scroll, snap */}
        <div
          className="flex gap-2 overflow-x-auto pb-0.5"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
          role="group"
          aria-label="Filtrar por categoría"
          data-testid="category-chips"
        >
          {CATEGORY_CHIPS.map((chip) => {
            const isSelected = category === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setCategory(chip.id)}
                data-testid={`chip-${chip.id}`}
                aria-pressed={isSelected}
                className="flex-shrink-0 rounded-full px-4 font-semibold transition-all"
                style={{
                  scrollSnapAlign: "start",
                  height: "44px",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  backgroundColor: isSelected ? "#006847" : "transparent",
                  color: isSelected ? "#ffffff" : "#374151",
                  border: isSelected ? "2px solid #006847" : "2px solid #d1c9b8",
                }}
              >
                {chip.label}
              </button>
            );
          })}
          {/* Doradas chip — hidden from chip strip (route /album/doradas still accessible).
               Andy paused doradas focus 2026-06-01; re-enable by restoring this block. */}
          {/* <a href={DORADAS_CHIP_HREF} data-testid="chip-doradas" ... >Doradas ✨</a> */}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tab bar — sticky below search+chips                                */}
      {/* ------------------------------------------------------------------ */}
      <nav
        className="sticky top-[230px] z-10 flex border-b"
        style={{ backgroundColor: "#f9f5ee", borderColor: "#d1c9b8" }}
        data-testid="tab-bar"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`tab-${t.id}`}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors relative"
            style={{
              color: tab === t.id ? "#006847" : "#6b7280",
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1 text-[0.6rem] opacity-70">
                ({t.count})
              </span>
            )}
            {tab === t.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: "#006847" }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Sticker grid — grouped by team (+ group headers when chip=Grupos)  */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 px-2 py-3" data-testid="sticker-grid">
        {filteredStickers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            {search.trim() ? (
              /* Search empty state */
              <>
                <p className="text-4xl mb-3" aria-hidden="true">🔍</p>
                <p className="text-sm font-medium text-center px-4">
                  No encontramos &ldquo;{search}&rdquo; en {categoryLabel[category]}
                </p>
                <button
                  onClick={() => setSearch("")}
                  className="mt-3 text-sm font-semibold underline"
                  style={{ color: "#006847" }}
                >
                  Limpiar búsqueda
                </button>
              </>
            ) : (
              /* Tab empty state (original) */
              <>
                <p className="text-4xl mb-3" aria-hidden="true">
                  {tab === "tengo" ? "📭" : tab === "repetidas" ? "📋" : "📦"}
                </p>
                <p className="text-sm font-medium">
                  {tab === "tengo"
                    ? "Todavía no tenés ninguna"
                    : tab === "repetidas"
                    ? "No tenés repetidas por ahora"
                    : "No hay figuritas para mostrar"}
                </p>
              </>
            )}
          </div>
        ) : category === "grupos" ? (
          /* Grupos view: group headers (A–L) above team sections */
          <GroupsView groups={teamGroups} counts={counts} onTap={handleTap} teamStats={teamStats} demandMap={demandMap} />
        ) : (
          /* Default view: flat team sections */
          teamGroups.map((group) => (
            <section key={group.team_code} aria-label={group.display_name} data-testid={`team-section-${group.team_code}`}>
              <TeamHeader
                entry={group.catalogEntry}
                teamColor={group.teamColor}
                owned={teamStats.get(group.team_code)?.owned ?? 0}
                total={teamStats.get(group.team_code)?.total ?? group.stickers.length}
              />
              <div
                className="grid gap-1.5 mb-4"
                style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
              >
                {group.stickers.map((sticker) => (
                  <StickerCard
                    key={sticker.id}
                    sticker={sticker}
                    count={counts[sticker.id] ?? 0}
                    onTap={handleTap}
                    friendsWanting={demandMap[sticker.id] ?? 0}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Bottom nav — shared 5-tab component */}
      <BottomNav active="album" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupsView — renders A-L group headers with teams nested inside
// ---------------------------------------------------------------------------

interface GroupsViewProps {
  groups: TeamGroup[];
  counts: Record<string, number>;
  onTap: (stickerId: string) => void;
  teamStats: Map<string, { owned: number; total: number }>;
  demandMap: Record<string, number>;
}

function GroupsView({ groups, counts, onTap, teamStats, demandMap }: GroupsViewProps) {
  // Build a map: FIFA group letter → TeamGroup[]
  const groupMap: Record<string, TeamGroup[]> = {};
  for (const tg of groups) {
    const g = tg.group;
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(tg);
  }

  // Render groups in canonical order A-L, skip empty
  const visibleGroups = FIFA_GROUPS.filter((g) => groupMap[g]?.length > 0);

  return (
    <>
      {visibleGroups.map((g) => (
        <section key={g} aria-label={`Grupo ${g}`} data-testid={`group-section-${g}`}>
          {/* Group header A–L */}
          <div
            className="flex items-center gap-2 px-2 py-1.5 mt-3 mb-1 rounded"
            style={{ backgroundColor: "#006847" }}
            data-testid={`group-header-${g}`}
          >
            <span className="text-xs font-black text-white tracking-widest">
              GRUPO {g}
            </span>
          </div>

          {/* Teams inside this group */}
          {groupMap[g].map((tg) => (
            <section key={tg.team_code} aria-label={tg.display_name} data-testid={`team-section-${tg.team_code}`}>
              <TeamHeader
                  entry={tg.catalogEntry}
                  teamColor={tg.teamColor}
                  owned={teamStats.get(tg.team_code)?.owned ?? 0}
                  total={teamStats.get(tg.team_code)?.total ?? tg.stickers.length}
                />
              <div
                className="grid gap-1.5 mb-4"
                style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
              >
                {tg.stickers.map((sticker) => (
                  <StickerCard
                    key={sticker.id}
                    sticker={sticker}
                    count={counts[sticker.id] ?? 0}
                    onTap={onTap}
                    friendsWanting={demandMap[sticker.id] ?? 0}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      ))}
    </>
  );
}


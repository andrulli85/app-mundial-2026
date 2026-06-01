"use client";

/**
 * Album screen — FUT Champions card style (redesigned 2026-06-01).
 *
 * Dark theme scoped to this page via .home-dark wrapper.
 * Grid renders <StickerCardFut> (photo + rarity border + rating + position + flag).
 * StickerCard.tsx is preserved for /trade routes — DO NOT delete it.
 *
 * Chips: 🔍 Todos | 🌍 Países | 🏆 Grupos | ✨ Especiales | ✨ Legendario | 🏆 Campeones
 * Tabs: Todo | Tengo | Me faltan | Repetidas  (gold underline active)
 * "Doradas" chip stays hidden (route /album/doradas still accessible).
 * "Campeones" chip navigates to /album/historia (does NOT filter the main grid).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StickerCardPanini from "@/components/StickerCardPanini";
import { getNickname, getAllStickers, toggleSticker } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import type { StickerEntry } from "@/lib/db";
import { TEAM_CATALOG } from "@/lib/team-catalog";
import type { TeamCatalogEntry } from "@/lib/team-catalog";
import InstallBanner from "@/components/InstallBanner";
import BottomNav from "@/components/BottomNav";
import { getPeersWishing } from "@/lib/peer-mock";
import ScanPageModal from "@/components/ScanPageModal";

type Tab = "todo" | "tengo" | "faltan" | "repetidas";
// "hologramas" kept in type for filter logic but hidden from chips (Fase 1 — 2026-06-01)
type Category = "todos" | "paises" | "grupos" | "especiales" | "legendario" | "hologramas" | "favoritas";

// ---------------------------------------------------------------------------
// Category chip definitions
// ---------------------------------------------------------------------------

// Fase 1 chip strip: exactly 5 chips visible — Todos / Países / Grupos / Especiales / Favoritas
// "💎 Hologramas" — removed per Fase 1 design alignment 2026-06-01 (route /album/hologramas stays in code)
// "🏆 Campeones"  — removed per Fase 1 design alignment 2026-06-01 (route /album/historia stays in code)
// "✨ Legendario" → renamed "⭐ Favoritas" (filter logic stays on rarity_tier==="legend" for now — Fase 2 will refine)
const CATEGORY_CHIPS: { id: Category; label: string }[] = [
  { id: "todos",      label: "🔍 Todos" },
  { id: "paises",     label: "🌍 Países" },
  { id: "grupos",     label: "🏆 Grupos" },
  { id: "especiales", label: "✨ Especiales" },
  { id: "favoritas",  label: "⭐ Favoritas" },
];

// Hidden doradas route (re-enable by restoring the chip)
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
  group: string;
}

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
// Search normalization — strips diacritics
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
  const [_demandMap, setDemandMap] = useState<Record<string, number>>({});

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

  const handleScanBulkAdded = useCallback((ids: string[]) => {
    setCounts((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = Math.max(next[id] ?? 0, 1);
      }
      return next;
    });
  }, []);

  // ---------- Filter pipeline: tab → category → search ----------
  const filteredStickers = useMemo(() => {
    let stickers = catalog;

    // Tab filter
    if (tab === "tengo")     stickers = stickers.filter((s) => (counts[s.id] ?? 0) >= 1);
    if (tab === "faltan")    stickers = stickers.filter((s) => (counts[s.id] ?? 0) === 0);
    if (tab === "repetidas") stickers = stickers.filter((s) => (counts[s.id] ?? 0) >= 2);

    // Category filter
    if (category === "paises" || category === "grupos") {
      stickers = stickers.filter(
        (s) => s.type !== "fwc" && s.type !== "panini_special" && s.team_code !== "" && s.team_code !== "FWC"
      );
    } else if (category === "especiales") {
      stickers = stickers.filter(
        (s) => s.type === "fwc" || s.type === "panini_special" || s.team_code === "" || s.team_code === "FWC"
      );
    } else if (category === "legendario" || category === "favoritas") {
      // "favoritas" is the Fase 1 rename of "legendario" — filter stays on rarity_tier==="legend"
      stickers = stickers.filter((s) => s.rarity_tier === "legend");
    } else if (category === "hologramas") {
      // "hologramas" chip is hidden from UI (Fase 1) but filter preserved for direct URL access
      stickers = stickers.filter((s) => s.rarity_tier === "hologram");
    }

    // Search filter — accent-insensitive
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

  // x1/x2/x3+ summary counts for the pill row
  const uniqueOwned = catalog.filter((s) => (counts[s.id] ?? 0) === 1).length;
  const dupX2 = catalog.filter((s) => (counts[s.id] ?? 0) === 2).length;
  const dupX3plus = catalog.filter((s) => (counts[s.id] ?? 0) >= 3).length;

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

  const categoryLabel: Record<Category, string> = {
    todos:      "el álbum",
    paises:     "Países",
    grupos:     "Grupos",
    especiales: "Especiales",
    legendario: "Favoritas",
    favoritas:  "Favoritas",
    hologramas: "Hologramas",
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center home-dark">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "#facc15", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "#9ca3af" }}>Cargando álbum...</p>
        </div>
      </div>
    );
  }

  const teamGroups = groupStickersByTeam(filteredStickers);

  return (
    <div
      className="flex flex-col flex-1 w-full lg:max-w-5xl xl:max-w-6xl mx-auto home-dark"
      data-testid="album-dark-root"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header — dark + gold accent                                         */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3"
        style={{
          backgroundColor: "#111111",
          borderBottom: "1px solid rgba(250,204,21,0.2)",
          boxShadow: "0 1px 12px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1
              className="text-lg font-black leading-none uppercase tracking-wider"
              style={{
                background: "linear-gradient(135deg, #fde047 0%, #facc15 50%, #f59e0b 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              MI ÁLBUM
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
              {nickname} · {owned}/{total} figuritas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/stats"
              className="rounded-full p-2 transition-colors"
              style={{ color: "#9ca3af" }}
              aria-label="Ver estadísticas"
              title="Estadísticas"
            >
              <span className="text-xl leading-none" aria-hidden="true">📊</span>
            </a>
            <a
              href="/trade"
              className="rounded-full px-4 py-1.5 text-sm font-bold"
              style={{ backgroundColor: "#facc15", color: "#0a0a0a" }}
            >
              Intercambiar
            </a>
          </div>
        </div>

        {/* Progress bar — gold */}
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: total > 0 ? `${(owned / total) * 100}%` : "0%",
              background: "linear-gradient(90deg, #facc15, #f59e0b)",
            }}
          />
        </div>
      </header>

      <InstallBanner />

      {/* ------------------------------------------------------------------ */}
      {/* x1/x2/x3+ summary pill row                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex items-center justify-center gap-3 px-4 py-2"
        style={{ backgroundColor: "#0a0a0a" }}
        data-testid="dup-summary-row"
      >
        <span className="text-xs font-semibold" style={{ color: "#d1d5db" }}>
          Únicas <span style={{ color: "#f5f5f5", fontWeight: 700 }}>{uniqueOwned}</span>
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
        <span className="text-xs font-semibold" style={{ color: "#d1d5db" }}>
          ×2: <span style={{ color: "#C0A85E", fontWeight: 700 }}>{dupX2}</span>
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
        <span className="text-xs font-semibold" style={{ color: "#d1d5db" }}>
          ×3+: <span style={{ color: "#C0A85E", fontWeight: 700 }}>{dupX3plus}</span>
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Search + Category chips                                              */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="sticky top-[126px] z-10 px-3 pt-2.5 pb-2"
        style={{
          backgroundColor: "#0a0a0a",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
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
            className="w-full rounded-full pl-9 pr-4 py-2.5 outline-none transition-shadow"
            style={{
              fontSize: "16px", // iOS zoom guard — must be ≥16px
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f5f5f5",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#facc15";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(250,204,21,0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
              style={{ color: "#6b7280" }}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        {/* Category chip strip */}
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
                  height: "36px",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  backgroundColor: isSelected ? "#facc15" : "rgba(255,255,255,0.06)",
                  color: isSelected ? "#0a0a0a" : "#d1d5db",
                  border: isSelected ? "none" : "1px solid rgba(255,255,255,0.12)",
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                {chip.label}
              </button>
            );
          })}
          {/* Campeones chip — hidden per Fase 1 design alignment 2026-06-01.
               Route /album/historia stays in code but is unlinked from main chip strip.
               Re-enable by restoring the <a> block below:
          <a href="/album/historia" data-testid="chip-campeones" ...>🏆 Campeones</a>
          */}
          {/* Doradas chip — hidden from chip strip (route /album/doradas still accessible).
               Andy paused doradas focus 2026-06-01; re-enable by restoring this block. */}
          {/* <a href={_DORADAS_CHIP_HREF} data-testid="chip-doradas" ... >Doradas ✨</a> */}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tab bar                                                              */}
      {/* ------------------------------------------------------------------ */}
      <nav
        className="sticky top-[218px] z-10 flex"
        style={{
          backgroundColor: "#0a0a0a",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
        data-testid="tab-bar"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`tab-${t.id}`}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors relative"
            style={{
              color: tab === t.id ? "#facc15" : "#6b7280",
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
                style={{ background: "linear-gradient(90deg, #facc15, #f59e0b)" }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Sticker grid                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 px-2 py-3" data-testid="sticker-grid" key={category}>
        {filteredStickers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "#6b7280" }}>
            {search.trim() ? (
              <>
                <p className="text-4xl mb-3" aria-hidden="true">🔍</p>
                <p className="text-sm font-medium text-center px-4" style={{ color: "#9ca3af" }}>
                  No encontramos &ldquo;{search}&rdquo; en {categoryLabel[category]}
                </p>
                <button
                  onClick={() => setSearch("")}
                  className="mt-3 text-sm font-semibold underline"
                  style={{ color: "#facc15" }}
                >
                  Limpiar búsqueda
                </button>
              </>
            ) : (
              <>
                <p className="text-4xl mb-3" aria-hidden="true">
                  {tab === "tengo" ? "📭" : tab === "repetidas" ? "📋" : "📦"}
                </p>
                <p className="text-sm font-medium" style={{ color: "#9ca3af" }}>
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
          <GroupsView groups={teamGroups} counts={counts} onTap={handleTap} teamStats={teamStats} />
        ) : (
          teamGroups.map((group) => (
            <section key={group.team_code} aria-label={group.display_name} data-testid={`team-section-${group.team_code}`}>
              {/* Dark-themed team header */}
              <DarkTeamHeader
                entry={group.catalogEntry}
                teamColor={group.teamColor}
                owned={teamStats.get(group.team_code)?.owned ?? 0}
                total={teamStats.get(group.team_code)?.total ?? group.stickers.length}
              />
              <div className="grid grid-cols-3 gap-2 mb-4 md:grid-cols-5 lg:grid-cols-6">
                {group.stickers.map((sticker) => (
                  <StickerCardPanini
                    key={sticker.id}
                    sticker={sticker}
                    count={counts[sticker.id] ?? 0}
                    onClick={() => handleTap(sticker.id)}
                    favorited={sticker.rarity_tier === "legend"}
                    size="md"
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Hidden per Andy 2026-06-01 — Fase 3 may re-surface CV scan */}
      {/* ScanPageModal and /api/scan-page endpoint remain in code, just unlinked from UI */}
      {process.env.NEXT_PUBLIC_ENABLE_CV_SCAN === "true" && (
        <ScanPageModal counts={counts} onStickersBulkAdded={handleScanBulkAdded} />
      )}

      <BottomNav active="album" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DarkTeamHeader — dark-themed team section header
// ---------------------------------------------------------------------------

interface DarkTeamHeaderProps {
  entry: TeamCatalogEntry;
  teamColor: string;
  owned: number;
  total: number;
}

function DarkTeamHeader({ entry, teamColor, owned, total }: DarkTeamHeaderProps) {
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  const complete = owned === total;

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-2 mb-2 mt-3 rounded-lg"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-base leading-none">{entry.flag}</span>
      <span className="text-xs font-bold flex-1 uppercase tracking-wide" style={{ color: "#e5e7eb" }}>
        {entry.display_name}
      </span>
      <span
        className="text-[11px] font-bold"
        style={{ color: complete ? "#facc15" : "#6b7280" }}
      >
        {owned}/{total}
        {complete && <span className="ml-1">✓</span>}
      </span>
      <div
        className="w-16 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: complete ? "#facc15" : teamColor,
          }}
        />
      </div>
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
}

function GroupsView({ groups, counts, onTap, teamStats }: GroupsViewProps) {
  const groupMap: Record<string, TeamGroup[]> = {};
  for (const tg of groups) {
    const g = tg.group;
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(tg);
  }

  const visibleGroups = FIFA_GROUPS.filter((g) => groupMap[g]?.length > 0);

  return (
    <>
      {visibleGroups.map((g) => (
        <section key={g} aria-label={`Grupo ${g}`} data-testid={`group-section-${g}`}>
          {/* Group header */}
          <div
            className="flex items-center gap-2 px-2 py-1.5 mt-3 mb-1 rounded"
            style={{
              backgroundColor: "rgba(250,204,21,0.1)",
              border: "1px solid rgba(250,204,21,0.2)",
            }}
            data-testid={`group-header-${g}`}
          >
            <span className="text-xs font-black tracking-widest" style={{ color: "#facc15" }}>
              GRUPO {g}
            </span>
          </div>

          {groupMap[g].map((tg) => (
            <section key={tg.team_code} aria-label={tg.display_name} data-testid={`team-section-${tg.team_code}`}>
              <DarkTeamHeader
                entry={tg.catalogEntry}
                teamColor={tg.teamColor}
                owned={teamStats.get(tg.team_code)?.owned ?? 0}
                total={teamStats.get(tg.team_code)?.total ?? tg.stickers.length}
              />
              <div className="grid grid-cols-3 gap-2 mb-4 md:grid-cols-5 lg:grid-cols-6">
                {tg.stickers.map((sticker) => (
                  <StickerCardPanini
                    key={sticker.id}
                    sticker={sticker}
                    count={counts[sticker.id] ?? 0}
                    onClick={() => onTap(sticker.id)}
                    favorited={sticker.rarity_tier === "legend"}
                    size="md"
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

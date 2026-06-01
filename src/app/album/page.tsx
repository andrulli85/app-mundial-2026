"use client";

/**
 * Album screen — Panini TradingCard style (Fase 2.5, 2026-06-01).
 *
 * Design alignment patch (Fase 2.5):
 *   Fix 1 — Header: "MI ÁLBUM X/Y · Completado N% · gold progress bar"
 *   Fix 2 — 3 stat tiles: Favoritas / Dobles / Triples  (replace pill row)
 *   Fix 3 — SeleccionFavoritaCard moved here from /inicio
 *   Fix 4 — Chip strip: Todos / Favoritas / Chile / Repetidas  (4 chips)
 *   Fix 5 — StickerCardPanini outer border = position color (POS_COLORS)
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
import { getPosColor } from "@/lib/pos-color";
import { getFavorites, toggleFavorite } from "@/lib/favorites";
import { FAV_TEAM } from "@/lib/fav-team";
import SeleccionFavoritaCard from "@/components/SeleccionFavoritaCard";
import InstallBanner from "@/components/InstallBanner";
import BottomNav from "@/components/BottomNav";
import Coachmark from "@/components/Coachmark";
import { getPeersWishing } from "@/lib/peer-mock";
import { Star } from "lucide-react";

// Fase 2.5: 4-chip strip (per screens.jsx line 135)
type ChipFilter = "todos" | "favoritas" | "chile" | "repetidas";

// Tab bar (Tengo / Me faltan / Todo) — kept for search/nav purposes
type Tab = "todo" | "tengo" | "faltan" | "repetidas";

const CHIP_DEFS: { id: ChipFilter; label: string }[] = [
  { id: "todos",      label: "Todos" },
  { id: "favoritas",  label: "Favoritas" },
  { id: "chile",      label: `${FAV_TEAM.flag} ${FAV_TEAM.name}` },
  { id: "repetidas",  label: "Repetidas" },
];

// Groups A–L in order (reserved for GroupsView — not active in Fase 2.5)
// const _FIFA_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

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
  const [_nickname, setNickname] = useState("");
  const [chip, setChip] = useState<ChipFilter>("todos");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [_demandMap, setDemandMap] = useState<Record<string, number>>({});

  // Load favorites from localStorage on mount
  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

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

  const handleToggleFav = useCallback((stickerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(stickerId);
    setFavorites(getFavorites());
  }, []);

  // ---------- Filter pipeline: chip → tab → search ----------
  const filteredStickers = useMemo(() => {
    let stickers = catalog;

    // Chip filter (primary, replaces category system)
    if (chip === "favoritas")  stickers = stickers.filter((s) => favorites.has(s.id));
    if (chip === "chile")      stickers = stickers.filter((s) => s.team_code === FAV_TEAM.name || s.team === FAV_TEAM.name);
    if (chip === "repetidas")  stickers = stickers.filter((s) => (counts[s.id] ?? 0) > 1);

    // Tab sub-filter (only relevant for "todos" chip to further narrow)
    if (chip === "todos") {
      if (tab === "tengo")     stickers = stickers.filter((s) => (counts[s.id] ?? 0) >= 1);
      if (tab === "faltan")    stickers = stickers.filter((s) => (counts[s.id] ?? 0) === 0);
      if (tab === "repetidas") stickers = stickers.filter((s) => (counts[s.id] ?? 0) >= 2);
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
  }, [catalog, counts, tab, chip, search, favorites]);

  // Stats (always from full catalog / all counts)
  const total = catalog.length;
  const owned = catalog.filter((s) => (counts[s.id] ?? 0) >= 1).length;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  // Fix 2 stat tiles: Favoritas / Dobles / Triples
  const favCount = favorites.size;
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
    { id: "repetidas", label: "Repetidas", count: catalog.filter((s) => (counts[s.id] ?? 0) >= 2).length },
  ];

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
      {/* Fix 1 — Header: MI ÁLBUM X/Y · Completado N% · gold progress bar    */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="sticky top-[54px] z-20 px-4 pb-3 pt-4"
        style={{
          backgroundColor: "#111111",
          borderBottom: "1px solid rgba(250,204,21,0.2)",
          boxShadow: "0 1px 12px rgba(0,0,0,0.6)",
        }}
        data-testid="album-header"
      >
        {/* Title row */}
        <div className="flex items-flex-end justify-between mb-2">
          <div>
            <div
              className="text-[12px] font-extrabold uppercase tracking-widest"
              style={{ color: "#F4C84A" }}
              data-testid="album-title"
            >
              Mi álbum
            </div>
            <div className="flex items-baseline gap-0.5" style={{ fontFamily: "var(--font-display, 'Impact', sans-serif)", lineHeight: 1 }}>
              <span className="text-3xl font-black" style={{ color: "#f5f5f5" }} data-testid="album-owned-count">
                {owned}
              </span>
              <span className="text-xl" style={{ color: "#6b7280" }} data-testid="album-total-count">
                /{total}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold" style={{ color: "#6b7280" }}>
              Completado
            </div>
            <div
              className="font-extrabold text-2xl leading-none"
              style={{ color: "#a3e635", fontFamily: "var(--font-stat, 'Roboto Mono', monospace)" }}
              data-testid="album-pct"
            >
              {pct}%
            </div>
          </div>
        </div>

        {/* Gold gradient progress bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 8, backgroundColor: "rgba(255,255,255,0.08)" }}
          data-testid="album-progress-bar"
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: total > 0 ? `${pct}%` : "0%",
              background: "linear-gradient(90deg, #facc15, #f59e0b)",
            }}
          />
        </div>
      </header>

      <InstallBanner />

      {/* ------------------------------------------------------------------ */}
      {/* Fix 2 — 3 stat tiles: ⭐ Favoritas / ×2 Dobles / ×3+ Triples       */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="grid grid-cols-3 gap-2 px-4 py-3"
        style={{ backgroundColor: "#0a0a0a" }}
        data-testid="stat-tiles"
      >
        {[
          { label: "Favoritas", value: favCount,    prefix: "⭐" },
          { label: "Dobles",    value: dupX2,        prefix: "×2" },
          { label: "Triples",   value: dupX3plus,    prefix: "×3+" },
        ].map(({ label, value, prefix }) => (
          <div
            key={label}
            className="flex flex-col items-center py-2.5 px-2 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(250,204,21,0.25)",
              textAlign: "center",
            }}
            data-testid={`stat-tile-${label.toLowerCase()}`}
          >
            <span
              className="font-extrabold leading-none"
              style={{ fontSize: 18, color: "#F4C84A", fontFamily: "var(--font-stat, 'Roboto Mono', monospace)" }}
            >
              {value}
            </span>
            <span
              className="font-bold mt-1"
              style={{ fontSize: 10, color: "#6b7280" }}
            >
              {prefix} · {label}
            </span>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Fix 3 — Selección Favorita Chile FIJA                               */}
      {/* (moved from /inicio — per screens.jsx line 174-195)                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-4 pb-2" style={{ backgroundColor: "#0a0a0a" }} data-testid="seleccion-favorita-section">
        <SeleccionFavoritaCard compact />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Fix 4 — Chip strip: 4 chips (Todos / Favoritas / Chile / Repetidas)  */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="sticky top-[54px] z-10 px-3 pt-2.5 pb-2"
        style={{
          backgroundColor: "#0a0a0a",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
        data-testid="chip-strip"
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
            placeholder="Buscar jugador, equipo, código…"
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

        {/* 4 chips — Todos / Favoritas / Chile / Repetidas */}
        <div
          className="flex gap-2 overflow-x-auto pb-0.5"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
          role="group"
          aria-label="Filtrar figuritas"
          data-testid="category-chips"
        >
          {CHIP_DEFS.map((c) => {
            const isSelected = chip === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                data-testid={`chip-${c.id}`}
                aria-pressed={isSelected}
                className="flex-shrink-0 rounded-full px-4 font-semibold transition-all flex items-center gap-1.5"
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
                {c.id === "favoritas" && (
                  <Star
                    size={13}
                    strokeWidth={0}
                    fill={isSelected ? "#0a0a0a" : "#F4C84A"}
                    style={{ flexShrink: 0 }}
                    aria-hidden
                  />
                )}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tab bar (shows only under "Todos" chip — full sub-filter)            */}
      {/* ------------------------------------------------------------------ */}
      {chip === "todos" && (
        <nav
          className="sticky top-[126px] z-10 flex"
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
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Fix 5 — Sticker grid with position-coded borders                     */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 px-2 py-3" data-testid="sticker-grid" key={chip}>
        {filteredStickers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "#6b7280" }}>
            {search.trim() ? (
              <>
                <p className="text-4xl mb-3" aria-hidden="true">🔍</p>
                <p className="text-sm font-medium text-center px-4" style={{ color: "#9ca3af" }}>
                  No encontramos &ldquo;{search}&rdquo;
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
                  {chip === "favoritas" ? "⭐" : chip === "repetidas" ? "📋" : "📦"}
                </p>
                <p className="text-sm font-medium" style={{ color: "#9ca3af" }}>
                  {chip === "favoritas"
                    ? "Todavía no marcaste favoritas"
                    : chip === "repetidas"
                    ? "No tenés repetidas por ahora"
                    : "No hay figuritas para mostrar"}
                </p>
              </>
            )}
          </div>
        ) : (
          teamGroups.map((group) => (
            <section key={group.team_code} aria-label={group.display_name} data-testid={`team-section-${group.team_code}`}>
              <DarkTeamHeader
                entry={group.catalogEntry}
                teamColor={group.teamColor}
                owned={teamStats.get(group.team_code)?.owned ?? 0}
                total={teamStats.get(group.team_code)?.total ?? group.stickers.length}
              />
              <div className="grid grid-cols-3 gap-3 mb-4 md:grid-cols-5 lg:grid-cols-6">
                {group.stickers.map((sticker) => {
                  const isFav = favorites.has(sticker.id);
                  const posColor = getPosColor(sticker);
                  return (
                    <div key={sticker.id} className="relative" data-sticker-pos-color={posColor}>
                      <StickerCardPanini
                        sticker={sticker}
                        count={counts[sticker.id] ?? 0}
                        onClick={() => handleTap(sticker.id)}
                        favorited={isFav}
                        posColor={posColor}
                        size="md"
                      />
                      {/* Favorite toggle — shown on owned stickers */}
                      {(counts[sticker.id] ?? 0) > 0 && (
                        <button
                          onClick={(e) => handleToggleFav(sticker.id, e)}
                          aria-label={isFav ? "Quitar de favoritas" : "Añadir a favoritas"}
                          data-testid={`fav-btn-${sticker.id}`}
                          className="absolute flex items-center justify-center"
                          style={{
                            top: 7,
                            left: 7,
                            width: 26,
                            height: 26,
                            borderRadius: 99,
                            border: "none",
                            cursor: "pointer",
                            zIndex: 5,
                            background: "rgba(7,8,10,0.6)",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          <Star
                            size={14}
                            strokeWidth={isFav ? 0 : 2}
                            fill={isFav ? "#F4C84A" : "none"}
                            color={isFav ? "#F4C84A" : "#6b7280"}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      <BottomNav active="album" />
      <Coachmark section="album" />
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

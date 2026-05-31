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

type Tab = "todo" | "tengo" | "faltan" | "repetidas";

// ---------------------------------------------------------------------------
// Team grouping helpers
// ---------------------------------------------------------------------------

interface TeamGroup {
  team_code: string;
  display_name: string;
  catalogEntry: TeamCatalogEntry;
  teamColor: string;
  stickers: Sticker[];
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
      groups.push({
        team_code: teamKey,
        display_name: TEAM_CATALOG[teamKey]?.display_name ?? teamKey,
        catalogEntry: TEAM_CATALOG[teamKey] ?? TEAM_CATALOG._PANINI,
        teamColor: sticker.team_color,
        stickers: [sticker],
      });
    } else {
      last.stickers.push(sticker);
    }
  }
  return groups;
}

export default function AlbumPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Sticker[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("todo");
  const [nickname, setNickname] = useState("");

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
    })();
  }, [router]);

  const handleTap = useCallback(async (stickerId: string) => {
    const updated = await toggleSticker(stickerId);
    setCounts((prev) => ({ ...prev, [stickerId]: updated.count }));
  }, []);

  // Filtered list by tab
  const visibleStickers = useMemo(() => {
    if (tab === "todo") return catalog;
    if (tab === "tengo") return catalog.filter((s) => (counts[s.id] ?? 0) >= 1);
    if (tab === "faltan") return catalog.filter((s) => (counts[s.id] ?? 0) === 0);
    if (tab === "repetidas") return catalog.filter((s) => (counts[s.id] ?? 0) >= 2);
    return catalog;
  }, [catalog, counts, tab]);

  // Stats
  const total = catalog.length;
  const owned = catalog.filter((s) => (counts[s.id] ?? 0) >= 1).length;
  const dupes = catalog.filter((s) => (counts[s.id] ?? 0) >= 2).length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "todo", label: "Todo", count: total },
    { id: "tengo", label: "Tengo", count: owned },
    { id: "faltan", label: "Me faltan", count: total - owned },
    { id: "repetidas", label: "Repetidas", count: dupes },
  ];

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

  return (
    <div className="flex flex-col flex-1 w-full lg:max-w-5xl xl:max-w-6xl mx-auto">
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3 shadow-sm"
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
          <a
            href="/trade"
            className="rounded-full px-4 py-1.5 text-sm font-bold text-green-800"
            style={{ backgroundColor: "#c2ef4e" }}
          >
            Intercambiar
          </a>
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

      {/* Tab bar */}
      <nav className="sticky top-[72px] z-10 flex border-b" style={{ backgroundColor: "#f9f5ee", borderColor: "#d1c9b8" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
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

      {/* Sticker grid — grouped by team */}
      <main className="flex-1 px-2 py-3">
        {visibleStickers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
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
          </div>
        ) : (
          groupStickersByTeam(visibleStickers).map((group) => (
            <section key={group.team_code} aria-label={group.display_name}>
              <TeamHeader
                entry={group.catalogEntry}
                teamColor={group.teamColor}
              />
              <div
                className="grid gap-1.5 mb-4"
                style={{
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                }}
              >
                {group.stickers.map((sticker) => (
                  <StickerCard
                    key={sticker.id}
                    sticker={sticker}
                    count={counts[sticker.id] ?? 0}
                    onTap={handleTap}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Bottom nav */}
      <BottomNav active="album" />
    </div>
  );
}

function BottomNav({ active }: { active: "album" | "trade" | "settings" }) {
  const items = [
    { id: "album", href: "/album", label: "Álbum", icon: "📕" },
    { id: "trade", href: "/trade", label: "Intercambiar", icon: "🤝" },
    { id: "settings", href: "/settings", label: "Opciones", icon: "⚙️" },
  ];

  return (
    <nav
      className="flex border-t"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#d1c9b8",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href}
          className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[0.6rem] font-semibold transition-colors"
          style={{
            color: active === item.id ? "#006847" : "#9ca3af",
          }}
          aria-current={active === item.id ? "page" : undefined}
        >
          <span className="text-xl" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

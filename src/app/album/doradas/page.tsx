"use client";

/**
 * /album/doradas — R1 Gold rarity tier showcase.
 *
 * Renders 27 extra-gold stickers (variant:"extra-gold") wrapped in the
 * .rarity-gold CSS treatment (gold border gradient + glow + sparkle particles).
 *
 * Features:
 *   - Filter pills: Todos | LEGEND | ROOKIE
 *   - Owned/missing indicator (50% opacity if not owned)
 *   - LEGEND / ROOKIE rarity tags per card
 *   - data-sticker-variant="extra-gold" for Playwright targeting
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getNickname, getAllStickers, toggleSticker } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import type { StickerEntry } from "@/lib/db";
import BottomNav from "@/components/BottomNav";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterPill = "todos" | "legend" | "rookie";

// Dorada stickers carry rarity_tier (guaranteed — set at catalog append time)
type DoradaSticker = Sticker & { rarity_tier: string; variant: string };

// ---------------------------------------------------------------------------
// Filter pills
// ---------------------------------------------------------------------------

const PILLS: { id: FilterPill; label: string }[] = [
  { id: "todos",  label: "Todos" },
  { id: "legend", label: "LEGEND" },
  { id: "rookie", label: "ROOKIE" },
];

// ---------------------------------------------------------------------------
// RarityTag — LEGEND / ROOKIE badge
// ---------------------------------------------------------------------------

function RarityTag({ tier }: { tier: string }) {
  const isLegend = tier === "legend";
  return (
    <span
      style={{
        fontSize: "0.55rem",
        fontWeight: 900,
        letterSpacing: "0.04em",
        padding: "1px 5px",
        borderRadius: 99,
        backgroundColor: isLegend ? "#f59e0b" : "#6366f1",
        color: "#fff",
        display: "inline-block",
        lineHeight: 1.5,
      }}
    >
      {isLegend ? "LEGEND" : "ROOKIE"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DoradaCard — single sticker wrapped in gold rarity treatment
// ---------------------------------------------------------------------------

interface DoradaCardProps {
  sticker: DoradaSticker;
  count: number;
  onTap: (id: string) => void;
}

function DoradaCard({ sticker, count, onTap }: DoradaCardProps) {
  const owned = count > 0;

  return (
    <div
      className="rarity-gold"
      data-sticker-variant="extra-gold"
      data-testid={`dorada-${sticker.id}`}
      style={{ opacity: owned ? 1 : 0.5 }}
    >
      <button
        onClick={() => onTap(sticker.id)}
        className="relative w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-[10px] overflow-hidden"
        style={{ aspectRatio: "3/4" }}
        title={`${sticker.code} — ${sticker.name}`}
        aria-label={`${sticker.name} — ${owned ? "la tengo" : "me falta"}`}
      >
        {sticker.seed_image ? (
          <Image
            src={sticker.seed_image}
            alt={sticker.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 20vw, 120px"
          />
        ) : (
          /* Fallback — no image yet */
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-1 p-1"
            style={{ backgroundColor: "#fef9c3" }}
          >
            <span style={{ fontSize: "1.4rem" }}>&#11088;</span>
            <span
              className="text-center font-bold leading-tight"
              style={{ fontSize: "0.5rem", color: "#78350f" }}
            >
              {sticker.code}
            </span>
          </div>
        )}

        {/* Owned checkmark */}
        {owned && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 0 0 2px rgba(250,204,21,0.8)" }}
          />
        )}

        {/* Count badge */}
        {count > 1 && (
          <div
            className="absolute top-1 right-1 rounded-full text-white font-bold text-[0.55rem] w-4 h-4 flex items-center justify-center z-10"
            style={{ backgroundColor: "#d97706" }}
          >
            ×{count}
          </div>
        )}
      </button>

      {/* Card footer */}
      <div
        className="px-1 py-1 flex flex-col items-center gap-0.5"
        style={{ backgroundColor: "#fff", borderRadius: "0 0 10px 10px" }}
      >
        <span
          className="font-black text-center leading-none truncate w-full text-center"
          style={{ fontSize: "0.5rem", color: "#78350f" }}
        >
          {sticker.display_name.replace(/ — (LEGEND|ROOKIE)$/, "")}
        </span>
        <RarityTag tier={sticker.rarity_tier} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DoradasPage() {
  const router = useRouter();
  const [doradas, setDoradas] = useState<DoradaSticker[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [pill, setPill] = useState<FilterPill>("todos");

  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }

      const [catalog, entries] = await Promise.all([getCatalog(), getAllStickers()]);

      // Filter doradas — variant:"extra-gold" OR group:"_doradas"
      const raw = catalog.filter(
        (s) => s.variant === "extra-gold" || s.group === "_doradas"
      );
      setDoradas(raw as DoradaSticker[]);

      const countMap: Record<string, number> = {};
      entries.forEach((e: StickerEntry) => {
        countMap[e.sticker_id] = e.count;
      });
      setCounts(countMap);
      setLoading(false);
    })();
  }, [router]);

  const handleTap = useCallback(async (stickerId: string) => {
    const updated = await toggleSticker(stickerId);
    setCounts((prev) => ({ ...prev, [stickerId]: updated.count }));
  }, []);

  const filtered = useMemo(() => {
    if (pill === "todos") return doradas;
    return doradas.filter((s) => s.rarity_tier === pill);
  }, [doradas, pill]);

  const owned = doradas.filter((s) => (counts[s.id] ?? 0) > 0).length;
  const total = doradas.length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "#f59e0b", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "#78350f" }}>Cargando doradas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full lg:max-w-5xl xl:max-w-6xl mx-auto">
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 shadow-sm"
        style={{ background: "linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1
              className="text-lg font-black text-white leading-none"
              data-testid="doradas-title"
            >
              DORADAS · {owned}/{total}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#fde68a" }}>
              Colección exclusiva extra-gold
            </p>
          </div>
          <a
            href="/album"
            className="rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}
            aria-label="Volver al álbum"
          >
            ← Álbum
          </a>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: total > 0 ? `${(owned / total) * 100}%` : "0%",
              background: "linear-gradient(90deg, #fde047, #f59e0b)",
            }}
          />
        </div>
      </header>

      {/* Filter pills */}
      <div
        className="sticky top-[126px] z-10 px-3 pt-2.5 pb-2 border-b flex gap-2"
        style={{ backgroundColor: "#fef9c3", borderColor: "#fde68a" }}
      >
        {PILLS.map((p) => {
          const active = pill === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPill(p.id)}
              aria-pressed={active}
              className="rounded-full px-4 font-semibold transition-all"
              style={{
                height: "36px",
                fontSize: "12px",
                backgroundColor: active ? "#d97706" : "transparent",
                color: active ? "#fff" : "#78350f",
                border: active ? "2px solid #d97706" : "2px solid #fbbf24",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <main className="flex-1 px-3 py-4" data-testid="doradas-grid">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "#78350f" }}>
            <p className="text-4xl mb-3" aria-hidden="true">&#11088;</p>
            <p className="text-sm font-medium">No hay doradas para mostrar</p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            {filtered.map((sticker) => (
              <DoradaCard
                key={sticker.id}
                sticker={sticker}
                count={counts[sticker.id] ?? 0}
                onTap={handleTap}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav active="album" />
    </div>
  );
}

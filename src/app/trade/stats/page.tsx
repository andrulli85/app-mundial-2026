"use client";

/**
 * /trade/stats — Trade analytics dashboard.
 *
 * S124 design spec:
 *  1. Header summary — 4 stat cards (2×2 grid)
 *  2. Top 5 frequent partners
 *  3. Top 10 most exchanged stickers
 *  4. Breakdown by sticker type (bar chart — pure CSS)
 *  5. 30-day timeline (pure CSS bars)
 *
 * Read-only. Pure client-side read of IndexedDB trade_log.
 * No schema changes. No chart library.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TradeStatCard from "@/components/TradeStatCard";
import {
  getAllTrades,
  computeSummary,
  computeTopPartners,
  computeTopStickersEnriched,
  computeTypeBreakdown,
  computeTimeline,
  TradeSummary,
  PartnerStat,
  StickerFrequency,
  TypeBreakdown,
  DayBucket,
} from "@/lib/trade-stats";
import { TradeLogEntry } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────

interface StatsData {
  trades: TradeLogEntry[];
  summary: TradeSummary;
  topPartners: PartnerStat[];
  topStickers: StickerFrequency[];
  typeBreakdown: TypeBreakdown[];
  timeline: DayBucket[];
}

// ── Partner avatar ─────────────────────────────────────────────────────────

function PartnerAvatar({ initials }: { initials: string }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-black text-white"
      style={{ backgroundColor: "#006847" }}
    >
      {initials || "?"}
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-sm font-black uppercase tracking-wider"
      style={{ color: "#006847" }}
    >
      {children}
    </h2>
  );
}

// ── Type bar ───────────────────────────────────────────────────────────────

function TypeBar({ row, max }: { row: TypeBreakdown; max: number }) {
  const pct = max > 0 ? Math.round((row.count / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-gray-700">{row.label}</span>
        <span className="text-xs font-bold" style={{ color: "#006847" }}>
          {row.count}
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 8, backgroundColor: "#f0ebe2" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: "#006847" }}
        />
      </div>
    </div>
  );
}

// ── Timeline bar ──────────────────────────────────────────────────────────

function TimelineSection({ timeline }: { timeline: DayBucket[] }) {
  const max = Math.max(...timeline.map((d) => d.count), 1);
  // Show last 14 days for readability on mobile
  const visible = timeline.slice(-14);

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Últimos 30 días</SectionTitle>
      <div className="flex items-end gap-0.5 h-20 overflow-x-auto pb-1">
        {visible.map((day, i) => {
          const heightPct = max > 0 ? (day.count / max) * 100 : 0;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-[18px]">
              <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(heightPct, day.count > 0 ? 6 : 0)}%`,
                    backgroundColor: day.count > 0 ? "#006847" : "#e5e0d6",
                    minHeight: day.count > 0 ? 4 : 0,
                  }}
                  title={`${day.dateLabel}: ${day.count} trade${day.count !== 1 ? "s" : ""}`}
                />
              </div>
              {day.count > 0 && (
                <span className="text-[9px] text-gray-400 leading-none">
                  {day.count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function TradeStatsPage() {
  const router = useRouter();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const trades = await getAllTrades();
      if (trades.length === 0) {
        setData({ trades, summary: computeSummary([]), topPartners: [], topStickers: [], typeBreakdown: [], timeline: computeTimeline([]) });
        setLoading(false);
        return;
      }
      const [summary, topPartners, topStickers, typeBreakdown, timeline] = await Promise.all([
        Promise.resolve(computeSummary(trades)),
        Promise.resolve(computeTopPartners(trades, 5)),
        computeTopStickersEnriched(trades, 10),
        computeTypeBreakdown(trades),
        Promise.resolve(computeTimeline(trades, 30)),
      ]);
      setData({ trades, summary, topPartners, topStickers, typeBreakdown, timeline });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <button
          onClick={() => router.back()}
          className="text-white text-xl leading-none"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-lg font-black text-white leading-none flex-1">
          Análisis de intercambios
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">
        {loading ? (
          /* Loading spinner */
          <div className="flex-1 flex items-center justify-center py-16">
            <div
              className="w-8 h-8 rounded-full border-4 animate-spin"
              style={{ borderColor: "#006847", borderTopColor: "transparent" }}
            />
          </div>
        ) : data && data.trades.length === 0 ? (
          /* Empty state */
          <div
            data-testid="trade-stats-empty"
            className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-4"
          >
            <span className="text-5xl leading-none">🤝</span>
            <div>
              <p className="font-bold text-gray-700 mb-1">
                Aún no hiciste trades.
              </p>
              <p className="text-sm text-gray-600 max-w-xs mx-auto">
                Vení acá cuando tengas tu primer intercambio para ver tu actividad.
              </p>
            </div>
            <a
              href="/trade"
              className="mt-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white inline-block"
              style={{ backgroundColor: "#006847" }}
            >
              Hacer mi primer trade
            </a>
          </div>
        ) : data ? (
          <>
            {/* 1. Header summary — 2×2 grid */}
            <section className="flex flex-col gap-3">
              <SectionTitle>Resumen</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <TradeStatCard
                  icon="🤝"
                  label="Trades totales"
                  value={data.summary.totalTrades}
                />
                <TradeStatCard
                  icon="📤"
                  label="Figuritas dadas"
                  value={data.summary.totalGave}
                />
                <TradeStatCard
                  icon="📥"
                  label="Figuritas recibidas"
                  value={data.summary.totalReceived}
                />
                <TradeStatCard
                  icon="👥"
                  label="Compañeros distintos"
                  value={data.summary.uniquePartners}
                />
              </div>
            </section>

            {/* 2. Top 5 partners */}
            {data.topPartners.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle>Tus partners más frecuentes</SectionTitle>
                <div className="flex flex-col gap-2">
                  {data.topPartners.map((p) => (
                    <div
                      key={p.partner}
                      className="flex items-center gap-3 rounded-xl px-4 py-3"
                      style={{ backgroundColor: "#fff", border: "1px solid #e5e0d6" }}
                    >
                      <PartnerAvatar initials={p.initials} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate text-sm">
                          {p.partner}
                        </p>
                      </div>
                      <span
                        className="text-xs font-black shrink-0"
                        style={{ color: "#006847" }}
                      >
                        {p.tradeCount} trade{p.tradeCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. Top 10 stickers más intercambiados */}
            {data.topStickers.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle>Stickers más intercambiados</SectionTitle>
                <div className="flex flex-col gap-2">
                  {data.topStickers.map((sf, i) => (
                    <div
                      key={sf.stickerId}
                      className="flex items-center gap-3 rounded-xl px-4 py-3"
                      style={{ backgroundColor: "#fff", border: "1px solid #e5e0d6" }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                        style={{ backgroundColor: sf.sticker?.team_color ?? "#9ca3af" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">
                          {sf.sticker ? sf.sticker.code : sf.stickerId}
                        </p>
                        {sf.sticker && (
                          <p className="text-xs text-gray-500 truncate">
                            {sf.sticker.name}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">
                        intercambiada {sf.count}{" "}
                        {sf.count === 1 ? "vez" : "veces"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Por categoría */}
            {data.typeBreakdown.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle>Por categoría</SectionTitle>
                <div
                  className="rounded-xl px-4 py-4 flex flex-col gap-3"
                  style={{ backgroundColor: "#fff", border: "1px solid #e5e0d6" }}
                >
                  {(() => {
                    const maxCount = Math.max(...data.typeBreakdown.map((r) => r.count), 1);
                    return data.typeBreakdown.map((row) => (
                      <TypeBar key={row.type} row={row} max={maxCount} />
                    ));
                  })()}
                </div>
              </section>
            )}

            {/* 5. Timeline 30 días */}
            <TimelineSection timeline={data.timeline} />
          </>
        ) : null}
      </main>
    </div>
  );
}

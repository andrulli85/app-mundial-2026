"use client";

/**
 * /inicio — Home dashboard.
 *
 * - Greeting with nickname
 * - Overall completion stat card (donut SVG + %)
 * - 3 quick-action buttons: Marcar stickers | Cambiar | Armar mi once
 * - "Tu último trade" widget
 * - "Logros recientes" widget (last 2 unlocked)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNickname, getAllStickers, getRecentTrades, getUnlockedBadgeEntries } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import { BADGES } from "@/lib/achievements";
import BottomNav from "@/components/BottomNav";

const GREEN = "#006847";
const LIME = "#c2ef4e";
const CREAM = "#f5f0e8";

// ---------------------------------------------------------------------------
// Simple donut SVG
// ---------------------------------------------------------------------------
function DonutChart({ pct, size = 96 }: { pct: number; size?: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {/* Track */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#d1c9b8"
        strokeWidth="10"
      />
      {/* Fill */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={LIME}
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      {/* Center text */}
      <text
        x="50"
        y="55"
        textAnchor="middle"
        style={{
          fontSize: 22,
          fontWeight: 900,
          fill: GREEN,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Quick action button
// ---------------------------------------------------------------------------
function QuickAction({
  href,
  emoji,
  label,
  primary,
}: {
  href: string;
  emoji: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl py-4 px-3 transition-colors"
      style={{
        backgroundColor: primary ? GREEN : "#ffffff",
        border: `1.5px solid ${primary ? GREEN : "#d1c9b8"}`,
        textDecoration: "none",
        flex: 1,
      }}
    >
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span
        className="text-xs font-bold text-center leading-tight"
        style={{ color: primary ? "#ffffff" : "#374151" }}
      >
        {label}
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function InicioPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string>("");
  const [owned, setOwned] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastTrade, setLastTrade] = useState<{
    partner: string;
    gave: string[];
    received: string[];
  } | null>(null);
  const [recentBadges, setRecentBadges] = useState<
    Array<{ id: string; unlockedAt: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }
      setNickname(nick);

      const [cat, entries, trades, badgeEntries] = await Promise.all([
        getCatalog(),
        getAllStickers(),
        getRecentTrades(1),
        getUnlockedBadgeEntries(),
      ]);

      setTotal(cat.length);
      setOwned(entries.filter((e) => e.count > 0).length);
      if (trades.length > 0) setLastTrade(trades[0]);

      // Sort by unlock time desc, take last 2
      const sorted = [...badgeEntries].sort((a, b) => b.unlockedAt - a.unlockedAt);
      setRecentBadges(sorted.slice(0, 2));

      setLoading(false);
    })();
  }, [router]);

  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: GREEN, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-lg mx-auto" style={{ backgroundColor: CREAM }}>
      {/* ---- Header ---- */}
      <header
        className="px-5 pt-6 pb-4"
        style={{ backgroundColor: GREEN }}
      >
        <p className="text-green-200 text-xs font-semibold tracking-wide uppercase mb-0.5">
          Bienvenido
        </p>
        <h1 className="text-2xl font-black text-white leading-tight capitalize">
          Hola, {nickname || "coleccionista"} 👋
        </h1>
        <p className="text-green-200 text-xs mt-1">
          Seguí armando tu álbum del Mundial 2026
        </p>
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-5 overflow-y-auto">
        {/* ---- Completion stat card ---- */}
        <section
          className="rounded-2xl p-4 flex items-center gap-4 shadow-sm"
          style={{ backgroundColor: "#ffffff", border: "1.5px solid #d1c9b8" }}
          aria-label="Progreso del álbum"
        >
          <DonutChart pct={pct} />
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
              Tu colección
            </div>
            <div
              className="text-3xl font-black leading-none"
              style={{ color: GREEN }}
            >
              {owned}
              <span className="text-base font-semibold text-gray-400">
                &nbsp;/ {total}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">figuritas marcadas</div>
            {/* progress bar */}
            <div className="mt-3 w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: LIME }}
              />
            </div>
          </div>
        </section>

        {/* ---- Quick actions ---- */}
        <section aria-label="Acciones rápidas">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
            Acciones rápidas
          </h2>
          <div className="flex gap-3">
            <QuickAction href="/album" emoji="📕" label="Marcar stickers" primary />
            <QuickAction href="/mercado" emoji="🤝" label="Cambiar" />
            <QuickAction href="/once" emoji="⚽" label="Armar mi once" />
          </div>
        </section>

        {/* ---- Last trade widget ---- */}
        <section aria-label="Último intercambio">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
            Tu último intercambio
          </h2>
          {lastTrade ? (
            <div
              className="rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: "#ffffff", border: "1.5px solid #d1c9b8" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg uppercase"
                  style={{ backgroundColor: GREEN }}
                >
                  {lastTrade.partner[0]}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-gray-800">
                    Con {lastTrade.partner}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Diste {lastTrade.gave.length} · Recibiste {lastTrade.received.length}
                  </div>
                </div>
                <Link
                  href="/trade/history"
                  className="text-xs font-semibold underline"
                  style={{ color: GREEN }}
                >
                  Ver más
                </Link>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-5 text-center shadow-sm"
              style={{ backgroundColor: "#ffffff", border: "1.5px solid #d1c9b8" }}
            >
              <p className="text-2xl mb-2" aria-hidden="true">🤝</p>
              <p className="text-sm text-gray-500">
                Todavía no hiciste ningún intercambio.{" "}
                <Link href="/mercado" style={{ color: GREEN }} className="font-semibold underline">
                  ¡Empezá acá!
                </Link>
              </p>
            </div>
          )}
        </section>

        {/* ---- Recent achievements ---- */}
        <section aria-label="Logros recientes">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Logros recientes
            </h2>
            <Link
              href="/achievements"
              className="text-xs font-semibold underline"
              style={{ color: GREEN }}
            >
              Ver todos
            </Link>
          </div>
          {recentBadges.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentBadges.map((entry) => {
                const badge = BADGES.find((b) => b.id === entry.id);
                if (!badge) return null;
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl p-3 flex items-center gap-3 shadow-sm"
                    style={{ backgroundColor: "#ffffff", border: "1.5px solid #d1c9b8" }}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {badge.emoji}
                    </span>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-800">{badge.name}</div>
                      <div className="text-xs text-gray-500">{badge.description}</div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: LIME, backgroundColor: GREEN, padding: "2px 8px", borderRadius: 99 }}>
                      ✓
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="rounded-2xl p-5 text-center shadow-sm"
              style={{ backgroundColor: "#ffffff", border: "1.5px solid #d1c9b8" }}
            >
              <p className="text-2xl mb-2" aria-hidden="true">🏆</p>
              <p className="text-sm text-gray-500">
                Todavía no desbloqueaste ningún logro.{" "}
                <Link href="/album" style={{ color: GREEN }} className="font-semibold underline">
                  ¡Marcá figuritas!
                </Link>
              </p>
            </div>
          )}
        </section>
      </main>

      <BottomNav active="inicio" />
    </div>
  );
}

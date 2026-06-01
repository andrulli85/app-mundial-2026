"use client";

/**
 * /inicio — FUT Champions-style dark home (redesigned 2026-06-01).
 *
 * Design: dark theme (#0a0a0a → #111111), gamification, pack hero, per-country
 * progress, recent stickers strip. SUPERSEDES the previous light-theme home.
 *
 * Mocked data (Phase 1 — TODO comments mark each):
 *   - coins:    1240  (TODO: wire to economy system)
 *   - streak:   5     (TODO: wire to daily-login tracker)
 *   - division: "Oro" (TODO: wire to ranking ladder)
 *   - ovr:      85    (TODO: compute from getSquad() players)
 *
 * Real data:
 *   - Per-country progress: catalog + getAllStickers()
 *   - Recent stickers:      last 5 owned entries by acquired_at desc
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNickname, getAllStickers } from "@/lib/db";
import type { StickerEntry } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import { TEAM_CATALOG } from "@/lib/team-catalog";
import BottomNav from "@/components/BottomNav";

// ── Mocked constants (Phase 1) ────────────────────────────────────────────────
// TODO(economy): replace with real user wallet query
const MOCK_COINS = 1240;
// TODO(streak): replace with daily-login streak tracker
const MOCK_STREAK = 5;
// TODO(ranking): replace with ranking ladder computation
const MOCK_DIVISION = "Oro";
// TODO(squad): compute from getSquad() lineup OVR average
const MOCK_OVR = 85;

// ── Priority country codes for "Completa tu álbum" section ───────────────────
const PRIORITY_TEAMS = ["ARG", "BRA", "MEX", "FRA", "ESP", "GER", "USA"];

// ── Country progress bar colors (row 1, 2, 3) ────────────────────────────────
const ROW_COLORS = ["#ef4444", "#22c55e", "#3b82f6"];

// ── Stat column definitions ───────────────────────────────────────────────────
const STAT_COLS = [
  { icon: "🔥", label: "Racha",    valueKey: "streak"   as const },
  { icon: "💰", label: "Monedas",  valueKey: "coins"    as const },
  { icon: "🛡️", label: "División", valueKey: "division" as const },
];

// ── CountryRow ────────────────────────────────────────────────────────────────

interface CountryRowProps {
  flag: string;
  name: string;
  owned: number;
  total: number;
  color: string;
}

function CountryRow({ flag, name, owned, total, color }: CountryRowProps) {
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none" aria-hidden="true">{flag}</span>
          <span className="text-sm font-semibold" style={{ color: "#f5f5f5" }}>{name}</span>
        </div>
        <span className="text-xs font-bold" style={{ color: "#9ca3af" }}>
          {owned}/{total}
        </span>
      </div>
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── RecentStickerChip ─────────────────────────────────────────────────────────

interface RecentStickerChipProps {
  sticker: Sticker;
}

function RecentStickerChip({ sticker }: RecentStickerChipProps) {
  const entry = TEAM_CATALOG[sticker.team_code || "_PANINI"];
  return (
    <div
      className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl"
      style={{
        background: "rgba(26,26,26,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        minWidth: 72,
      }}
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {entry?.flag ?? "⭐"}
      </span>
      <span
        className="text-[0.6rem] font-bold text-center leading-tight"
        style={{ color: "#d1d5db", maxWidth: 64 }}
      >
        {sticker.display_name.length > 10
          ? sticker.display_name.slice(0, 10) + "…"
          : sticker.display_name}
      </span>
      <span
        className="text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#9ca3af" }}
      >
        {sticker.code}
      </span>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ProximamenteToast({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [visible, onClose]);

  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl z-50"
      style={{
        backgroundColor: "#1a1a1a",
        border: "1px solid rgba(250,204,21,0.4)",
        color: "#facc15",
        whiteSpace: "nowrap",
      }}
    >
      Próximamente — ¡la apertura de sobres llega pronto!
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface CountryProgress {
  code: string;
  flag: string;
  name: string;
  owned: number;
  total: number;
}

export default function InicioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [countryProgress, setCountryProgress] = useState<CountryProgress[]>([]);
  const [recentStickers, setRecentStickers] = useState<Sticker[]>([]);
  const [toastVisible, setToastVisible] = useState(false);

  const hideToast = useCallback(() => setToastVisible(false), []);

  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }

      const [catalog, entries] = await Promise.all([getCatalog(), getAllStickers()]);

      // Build ownership map
      const ownedMap = new Map<string, number>();
      entries.forEach((e: StickerEntry) => {
        if (e.count > 0) ownedMap.set(e.sticker_id, e.count);
      });

      // ── Per-country progress (real data) ───────────────────────────────────
      // Build totals map: team_code → { owned, total }
      const teamMap = new Map<string, { owned: number; total: number }>();
      for (const sticker of catalog) {
        const code = sticker.team_code;
        if (!code || code === "FWC" || code === "") continue;
        const existing = teamMap.get(code) ?? { owned: 0, total: 0 };
        existing.total++;
        if (ownedMap.has(sticker.id)) existing.owned++;
        teamMap.set(code, existing);
      }

      // Pick top 3: from PRIORITY_TEAMS that exist in catalog, prefer those with owned > 0
      const withOwned = PRIORITY_TEAMS.filter(
        (c) => (teamMap.get(c)?.owned ?? 0) > 0
      );
      const candidates =
        withOwned.length >= 3
          ? withOwned.slice(0, 3)
          : [
              ...withOwned,
              ...PRIORITY_TEAMS.filter((c) => !withOwned.includes(c)),
            ].slice(0, 3);

      const progress: CountryProgress[] = candidates.map((code) => {
        const entry = TEAM_CATALOG[code];
        const stats = teamMap.get(code) ?? { owned: 0, total: 0 };
        return {
          code,
          flag: entry?.flag ?? "🏳️",
          name: entry?.display_name ?? code,
          owned: stats.owned,
          total: stats.total,
        };
      });
      setCountryProgress(progress);

      // ── Recent stickers (real data) ────────────────────────────────────────
      // Sort owned entries by acquired_at desc, take 5, map to catalog stickers
      const catalogById = new Map<string, Sticker>(catalog.map((s) => [s.id, s]));
      const recent = [...entries]
        .filter((e) => e.count > 0)
        .sort((a, b) => b.acquired_at - a.acquired_at)
        .slice(0, 5)
        .map((e) => catalogById.get(e.sticker_id))
        .filter((s): s is Sticker => s !== undefined);

      // Fallback: if no owned stickers, show first 5 from catalog as placeholders
      setRecentStickers(
        recent.length > 0 ? recent : catalog.slice(0, 5)
      );

      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center home-dark"
        style={{ minHeight: "100dvh" }}
      >
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: "#facc15", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const statValues: Record<string, string | number> = {
    streak:   MOCK_STREAK,
    coins:    MOCK_COINS.toLocaleString("es-AR"),
    division: MOCK_DIVISION,
  };

  return (
    <div
      className="flex flex-col flex-1 w-full home-dark"
      data-testid="home-dark-root"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Scrollable content area — TopBar (54px fixed) already injected      */}
      {/* by TopBarGlobal in layout.tsx. Its gradient bg blends with #0a0a0a. */}
      {/* ------------------------------------------------------------------ */}
      <main
        className="flex-1 overflow-y-auto pb-2"
        style={{ paddingTop: 12 }}
      >
        <div className="px-4 flex flex-col gap-5 max-w-lg mx-auto pb-4">

          {/* -------------------------------------------------------------- */}
          {/* Hero Pack Card                                                    */}
          {/* -------------------------------------------------------------- */}
          <section
            aria-label="Sobre diario"
            className="pack-gradient-border"
            data-testid="pack-hero"
          >
            <div className="p-5 flex flex-col gap-3">
              {/* Daily pack chip */}
              <div className="flex justify-center">
                <span
                  className="px-3 py-1 rounded-full text-xs font-black tracking-wide"
                  style={{ backgroundColor: "#facc15", color: "#111111" }}
                >
                  SOBRE DIARIO GRATIS
                </span>
              </div>

              {/* Title */}
              <div className="text-center">
                <h2
                  className="text-2xl font-black leading-tight gold-text"
                  data-testid="pack-title"
                >
                  SOBRE LEGENDARIO
                </h2>
                <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>
                  5 cartas · garantiza 1 Raro o mejor
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  // TODO(packs): wire to pack-opening flow when economy ships
                  setToastVisible(true);
                }}
                data-testid="open-pack-btn"
                className="w-full py-3 rounded-xl font-black text-sm tracking-wide transition-opacity active:opacity-80"
                style={{
                  background:
                    "linear-gradient(135deg, #c9a35a 0%, #e8c87b 50%, #c9a35a 100%)",
                  color: "#111111",
                }}
              >
                ABRIR SOBRE
              </button>
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Stats row (3 columns — mocked Phase 1)                           */}
          {/* -------------------------------------------------------------- */}
          <section
            aria-label="Estadísticas"
            className="grid grid-cols-3 gap-3"
            data-testid="stats-row"
          >
            {STAT_COLS.map((col) => (
              <div
                key={col.label}
                className="card-dark flex flex-col items-center py-3 px-2 gap-1"
                data-testid={`stat-col-${col.label.toLowerCase()}`}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  {col.icon}
                </span>
                <span
                  className="text-xl font-black leading-none"
                  style={{ color: "#f5f5f5" }}
                >
                  {statValues[col.valueKey]}
                </span>
                <span
                  className="text-[0.6rem] font-semibold uppercase tracking-wide"
                  style={{ color: "#6b7280" }}
                >
                  {col.label}
                </span>
              </div>
            ))}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* "Arma tu once" card                                              */}
          {/* -------------------------------------------------------------- */}
          <Link
            href="/once"
            className="card-dark flex items-center gap-3 p-4 active:opacity-80 transition-opacity"
            style={{ textDecoration: "none" }}
            data-testid="once-card"
          >
            {/* Squad icon */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.3)" }}
              aria-hidden="true"
            >
              ⚽
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm leading-none mb-1" style={{ color: "#f5f5f5" }}>
                Arma tu once
              </div>
              {/* TODO(squad): replace 85 with live OVR from getSquad() calculation */}
              <div className="text-xs" style={{ color: "#9ca3af" }}>
                Tu equipo está en{" "}
                <span
                  className="font-bold"
                  style={{ color: "#facc15" }}
                  data-testid="ovr-text"
                >
                  {MOCK_OVR} OVR
                </span>{" "}
                · mejóralo
              </div>
            </div>
            {/* Chevron */}
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>

          {/* -------------------------------------------------------------- */}
          {/* "Completa tu álbum" — per-country progress (real data)           */}
          {/* -------------------------------------------------------------- */}
          <section aria-label="Completa tu álbum" data-testid="country-progress-section">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: "#f5f5f5" }}
              >
                COMPLETA TU ÁLBUM
              </h2>
              <Link
                href="/album"
                className="text-xs font-semibold"
                style={{ color: "#facc15", textDecoration: "none" }}
              >
                Ver todo
              </Link>
            </div>

            <div className="card-dark flex flex-col gap-4 p-4">
              {countryProgress.map((cp, i) => (
                <CountryRow
                  key={cp.code}
                  flag={cp.flag}
                  name={cp.name}
                  owned={cp.owned}
                  total={cp.total}
                  color={ROW_COLORS[i] ?? "#6b7280"}
                />
              ))}
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* "Cartas recientes" — horizontal scroll (real data)               */}
          {/* -------------------------------------------------------------- */}
          <section aria-label="Cartas recientes" data-testid="recent-stickers-section">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: "#f5f5f5" }}
              >
                CARTAS RECIENTES
              </h2>
              <Link
                href="/album"
                className="text-xs font-semibold"
                style={{ color: "#facc15", textDecoration: "none" }}
              >
                Mi colección
              </Link>
            </div>

            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
            >
              {recentStickers.map((s) => (
                <div key={s.id} style={{ scrollSnapAlign: "start" }}>
                  <RecentStickerChip sticker={s} />
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>

      {/* Bottom nav — active tab = "inicio" */}
      <BottomNav active="inicio" />

      {/* Próximamente toast — fires when "ABRIR SOBRE" is tapped */}
      <ProximamenteToast visible={toastVisible} onClose={hideToast} />
    </div>
  );
}

"use client";

/**
 * /inicio — FUT Champions-style dark home.
 *
 * Fase 1 design alignment (2026-06-01):
 *   - "SOBRE LEGENDARIO" hero pack removed — replaced with "Carta de la semana"
 *   - "Arma tu once" → "Arma tu 11"
 *   - "Ver todo" link removed from "Completa tu álbum"
 *   - "Mi colección" link in Cartas recientes routes to /album
 *   - New section: "ÚLTIMOS PUNTOS · FECHA 3" after "Arma tu 11" card
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

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNickname, getAllStickers } from "@/lib/db";
import type { StickerEntry } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import { TEAM_CATALOG } from "@/lib/team-catalog";
import { photoUrlFor } from "@/lib/squad/photo";
import BottomNav from "@/components/BottomNav";
import Coachmark from "@/components/Coachmark";

// ── Mocked constants (Phase 1) ────────────────────────────────────────────────
// TODO(economy): replace with real user wallet query
const MOCK_COINS = 1240;
// TODO(streak): replace with daily-login streak tracker
const MOCK_STREAK = 5;
// TODO(ranking): replace with ranking ladder computation
const MOCK_DIVISION = "Oro";
// TODO(squad): compute from getSquad() lineup OVR average
const MOCK_OVR = 85;

// ── Last round mock data (inline — Phase 1) ───────────────────────────────────
const LAST_ROUND = {
  round: "Fecha 3",
  total: 214,
  top: [
    { initials: "RS", name: "R. Santos", pos: "DEL", pts: 34 },
    { initials: "EP", name: "E. Pérez",  pos: "MED", pts: 28 },
    { initials: "MA", name: "M. Araya",  pos: "MED", pts: 22 },
  ],
};

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

// ── CartaSemannaHero — "Carta de la semana" card ──────────────────────────────

interface CartaSemanaHeroProps {
  sticker: Sticker | null;
}

function CartaSemanaHero({ sticker }: CartaSemanaHeroProps) {
  // Fallback when no sticker available yet
  const name = sticker?.display_name ?? "MESSI";
  const href = sticker ? `/album?sticker=${sticker.id}` : "/album";

  return (
    <Link
      href={href}
      aria-label="Carta de la semana — ver detalle"
      className="pack-gradient-border cursor-pointer active:opacity-80 transition-opacity block"
      data-testid="carta-semana-hero"
      style={{ textDecoration: "none" }}
    >
      <div className="p-5 flex flex-col gap-3">
        {/* Top label */}
        <div className="flex justify-center">
          <span
            className="px-3 py-1 rounded-full text-xs font-black tracking-wide"
            style={{ backgroundColor: "rgba(244,200,74,0.15)", color: "#F4C84A", border: "1px solid rgba(244,200,74,0.4)" }}
          >
            CARTA DE LA SEMANA
          </span>
        </div>

        {/* Featured sticker visual */}
        <div className="flex flex-col items-center gap-2">
          {(() => {
            const photoSrc = sticker ? photoUrlFor(sticker.id) : null;
            const hasRealPhoto = photoSrc && !photoSrc.endsWith("placeholder.svg");
            return hasRealPhoto ? (
              <img
                src={photoSrc}
                alt={name}
                className="w-24 h-28 object-cover rounded-xl"
                style={{ border: "2px solid rgba(244,200,74,0.6)", boxShadow: "0 0 20px rgba(244,200,74,0.2)" }}
              />
            ) : (
              <div
                className="w-24 h-28 rounded-xl flex items-center justify-center text-5xl"
                style={{
                  background: "rgba(244,200,74,0.08)",
                  border: "2px solid rgba(244,200,74,0.4)",
                  boxShadow: "0 0 20px rgba(244,200,74,0.15)",
                }}
                aria-hidden="true"
              >
                ⭐
              </div>
            );
          })()}

          {/* Name only — position subtitle removed */}
          <div className="text-center">
            <div
              className="text-xl font-black leading-tight uppercase tracking-wide gold-text"
              data-testid="carta-semana-name"
            >
              {name}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── ÚltimosPuntos — last round scorers section ────────────────────────────────

function UltimosPuntosSection() {
  return (
    <section aria-label="Últimos puntos" data-testid="ultimos-puntos-section">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: "#f5f5f5" }}
        >
          ÚLTIMOS PUNTOS · {LAST_ROUND.round.toUpperCase()}
        </h2>
        <span
          className="text-xl font-black"
          style={{ color: "#a3e635", lineHeight: 1 }}
          data-testid="ultimos-puntos-total"
        >
          +{LAST_ROUND.total}
        </span>
      </div>

      {/* Scorers list */}
      <div className="card-dark flex flex-col divide-y divide-white/5">
        {LAST_ROUND.top.map((player) => (
          <div
            key={player.initials}
            className="flex items-center gap-3 px-4 py-3"
          >
            {/* Avatar circle with initials */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(244,200,74,0.3), rgba(244,200,74,0.1))",
                border: "1px solid rgba(244,200,74,0.4)",
                color: "#F4C84A",
              }}
              aria-hidden="true"
            >
              {player.initials}
            </div>

            {/* Name + position */}
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-bold leading-none"
                style={{ color: "#f5f5f5" }}
                data-testid={`player-name-${player.initials.toLowerCase()}`}
              >
                {player.name}
              </div>
              <div className="mt-0.5">
                <span
                  className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#9ca3af" }}
                >
                  {player.pos}
                </span>
              </div>
            </div>

            {/* Points badge */}
            <span
              className="text-sm font-black"
              style={{ color: "#F4C84A" }}
              data-testid={`player-pts-${player.initials.toLowerCase()}`}
            >
              +{player.pts}
            </span>
          </div>
        ))}
      </div>
    </section>
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
  const [featuredSticker, setFeaturedSticker] = useState<Sticker | null>(null);
  // "Arma tu 11" tile dismiss — render by default, hide via effect after reading localStorage
  const [arma11Dismissed, setArma11Dismissed] = useState(false);
  const [arma11Visible, setArma11Visible] = useState(true);

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

      // ── Featured sticker for "Carta de la semana" ──────────────────────────
      // Pick first owned legend, else first owned sticker, else first catalog entry
      const ownedStickers = catalog.filter((s) => ownedMap.has(s.id));
      const featuredLegend = ownedStickers.find((s) => s.rarity_tier === "legend");
      setFeaturedSticker(featuredLegend ?? ownedStickers[0] ?? catalog[0] ?? null);

      // ── Per-country progress (real data) ───────────────────────────────────
      const teamMap = new Map<string, { owned: number; total: number }>();
      for (const sticker of catalog) {
        const code = sticker.team_code;
        if (!code || code === "FWC" || code === "") continue;
        const existing = teamMap.get(code) ?? { owned: 0, total: 0 };
        existing.total++;
        if (ownedMap.has(sticker.id)) existing.owned++;
        teamMap.set(code, existing);
      }

      const allTeamCodes = Array.from(teamMap.keys()).filter(
        (code) => (teamMap.get(code)?.total ?? 0) > 0
      );
      allTeamCodes.sort((a, b) => {
        const statsA = teamMap.get(a)!;
        const statsB = teamMap.get(b)!;
        const pctA = statsA.owned / statsA.total;
        const pctB = statsB.owned / statsB.total;
        if (pctB !== pctA) return pctB - pctA;
        return a.localeCompare(b);
      });

      const top3 = allTeamCodes.slice(0, 3);
      const anyOwned = top3.some((c) => (teamMap.get(c)?.owned ?? 0) > 0);

      const candidates =
        anyOwned && top3.length >= 3
          ? top3
          : PRIORITY_TEAMS.filter((c) => teamMap.has(c)).slice(0, 3);

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
      const catalogById = new Map<string, Sticker>(catalog.map((s) => [s.id, s]));
      const recent = [...entries]
        .filter((e) => e.count > 0)
        .sort((a, b) => b.acquired_at - a.acquired_at)
        .slice(0, 5)
        .map((e) => catalogById.get(e.sticker_id))
        .filter((s): s is Sticker => s !== undefined);

      // Deterministic fallback: first 7 owned player stickers in catalog order.
      // "Owned" mirrors the squad/data.ts hash rule (simpleHash % 100 < 60).
      const fallbackRecent = recent.length > 0
        ? recent
        : catalog
            .filter((s) => {
              if (s.type !== "player") return false;
              let h = 5381;
              const str = s.id;
              for (let i = 0; i < str.length; i++) {
                h = ((h << 5) + h) ^ str.charCodeAt(i);
                h = h >>> 0;
              }
              return h % 100 < 60;
            })
            .slice(0, 7);

      setRecentStickers(fallbackRecent);

      setLoading(false);
    })();
  }, [router]);

  // Read localStorage on mount to restore dismiss state without hydration mismatch
  useEffect(() => {
    try {
      if (localStorage.getItem("arma_tu_11_dismissed_v1") === "1") {
        setArma11Dismissed(true);
        setArma11Visible(false);
      }
    } catch {
      // localStorage unavailable (private browsing, SSR) — show tile by default
    }
  }, []);

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
          {/* Carta de la semana (replaces "SOBRE LEGENDARIO" hero)            */}
          {/* Selección Favorita moved to /album (Fase 2.5, 2026-06-01)        */}
          {/* -------------------------------------------------------------- */}
          <CartaSemanaHero sticker={featuredSticker} />

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
          {/* "Arma tu 11" card (renamed from "Arma tu once" — Fase 1)         */}
          {/* Dismiss × button added — persists in localStorage (Fase 2)        */}
          {/* -------------------------------------------------------------- */}
          {!arma11Dismissed && (
            <div
              className="relative"
              data-testid="arma-tu-11-tile"
              style={{
                opacity: arma11Visible ? 1 : 0,
                transform: arma11Visible ? "translateY(0)" : "translateY(-6px)",
                transition: "opacity 200ms ease, transform 200ms ease",
                pointerEvents: arma11Visible ? "auto" : "none",
              }}
            >
              {/* × dismiss button — top-right overlay */}
              <button
                aria-label="Ocultar"
                data-testid="arma-tu-11-dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  // Fade/slide out first, then unmount
                  setArma11Visible(false);
                  try {
                    localStorage.setItem("arma_tu_11_dismissed_v1", "1");
                  } catch {
                    // localStorage unavailable — dismiss for session only
                  }
                  setTimeout(() => setArma11Dismissed(true), 210);
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  zIndex: 10,
                  // 32×32 hit area via padding
                  padding: "9px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                  lineHeight: 0,
                }}
              >
                {/* X icon — 14px, matches Lucide stroke style */}
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Tile body — <Link> to /squad (unchanged content) */}
              <Link
                href="/squad"
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
                    Arma tu 11
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
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* "Últimos puntos" — last round scores (mock, Fase 1)              */}
          {/* -------------------------------------------------------------- */}
          <UltimosPuntosSection />

          {/* -------------------------------------------------------------- */}
          {/* "Completa tu álbum" — per-country progress (real data)           */}
          {/* "Ver todo" link removed per Fase 1 design alignment               */}
          {/* -------------------------------------------------------------- */}
          <section aria-label="Completa tu álbum" data-testid="country-progress-section">
            <div className="flex items-center mb-3">
              <h2
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: "#f5f5f5" }}
              >
                COMPLETA TU ÁLBUM
              </h2>
              {/* "Ver todo" removed per Fase 1 — Andy 2026-06-01 */}
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
          {/* "Mi colección" link routes to /album (Fase 1)                    */}
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

      {/* Coachmark — first visit only */}
      <Coachmark section="inicio" />
    </div>
  );
}

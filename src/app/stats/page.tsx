"use client";

/**
 * Stats dashboard — /stats
 *
 * Reads catalog + IndexedDB counts client-side and renders:
 *   1. Hero donut — overall completion (SVG, animated stroke-dashoffset)
 *   2. Por tipo — Países / Especiales horizontal bars
 *   3. Por grupo — 12 mini-bars A-L
 *   4. Top 5 equipos / Equipos pendientes
 *   5. Footer mini-stats row (marcadas, repes, completados, días)
 *
 * Empty state: if 0 stickers owned → friendly message + link to /album
 * Palette: #006847 (green) / #f5f0e8 (cream) / #c2ef4e (lime accent)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { getAllStickers, getNickname } from "@/lib/db";
import type { StickerEntry } from "@/lib/db";
import { computeAllStats } from "@/lib/stats";
import type { AllStats, GroupStats, TeamStats } from "@/lib/stats";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GREEN = "#006847";
const CREAM = "#f5f0e8";
const CREAM_DARK = "#e8e0d0";
const LIME = "#c2ef4e";
const TEXT_DARK = "#1a2e1a";
const TEXT_MID = "#4b5563";
const TRACK_COLOR = "#e2ddd3";

// Donut geometry
const DONUT_RADIUS = 72;
const DONUT_STROKE = 14;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

// ---------------------------------------------------------------------------
// Hero Donut
// ---------------------------------------------------------------------------

interface DonutProps {
  percent: number;
  ownedCount: number;
  totalCount: number;
}

function HeroDonut({ percent, ownedCount, totalCount }: DonutProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    // Trigger animation after mount
    const id = requestAnimationFrame(() => {
      setTimeout(() => setAnimatedPercent(percent), 50);
    });
    return () => cancelAnimationFrame(id);
  }, [percent]);

  const offset = DONUT_CIRCUMFERENCE - (animatedPercent / 100) * DONUT_CIRCUMFERENCE;
  const size = DONUT_RADIUS * 2 + DONUT_STROKE * 2 + 8;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center py-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={`Completaste el ${percent}% del álbum`}
        role="img"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={DONUT_RADIUS}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth={DONUT_STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={DONUT_RADIUS}
          fill="none"
          stroke={GREEN}
          strokeWidth={DONUT_STROKE}
          strokeLinecap="round"
          strokeDasharray={DONUT_CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
        {/* Center text */}
        <text
          x={center}
          y={center - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="32"
          fontWeight="900"
          fill={TEXT_DARK}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {animatedPercent}%
        </text>
        <text
          x={center}
          y={center + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="13"
          fontWeight="600"
          fill={TEXT_MID}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {ownedCount} / {totalCount}
        </text>
        <text
          x={center}
          y={center + 35}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fontWeight="500"
          fill={TEXT_MID}
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.5"
        >
          MUNDIAL 2026
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bar
// ---------------------------------------------------------------------------

interface BarProps {
  label: string;
  owned: number;
  total: number;
  percent: number;
  color?: string;
  flag?: string;
}

function HBar({ label, owned, total, percent, color = GREEN, flag }: BarProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {flag && <span className="text-base leading-none">{flag}</span>}
          <span
            className="text-sm font-semibold truncate"
            style={{ color: TEXT_DARK }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs font-medium" style={{ color: TEXT_MID }}>
            {owned}/{total}
          </span>
          <span
            className="text-xs font-bold rounded-full px-2 py-0.5"
            style={{ backgroundColor: color, color: color === LIME ? TEXT_DARK : "#fff" }}
          >
            {percent}%
          </span>
        </div>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: "8px", backgroundColor: TRACK_COLOR }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
            transition: "width 0.5s ease-out",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section card
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="mx-4 mb-4 rounded-2xl overflow-hidden shadow-sm"
      style={{ backgroundColor: "#fff", border: `1px solid ${CREAM_DARK}` }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: CREAM_DARK }}
      >
        <h2 className="text-sm font-black tracking-wide uppercase" style={{ color: GREEN }}>
          {title}
        </h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer mini-stats card
// ---------------------------------------------------------------------------

interface MiniCardProps {
  icon: string;
  label: string;
  value: string | number;
}

function MiniCard({ icon, label, value }: MiniCardProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center py-4 rounded-2xl"
      style={{ backgroundColor: "#fff", border: `1px solid ${CREAM_DARK}` }}
    >
      <span className="text-2xl mb-1" aria-hidden="true">{icon}</span>
      <span className="text-xl font-black leading-none mb-1" style={{ color: TEXT_DARK }}>
        {value}
      </span>
      <span className="text-[10px] font-semibold text-center leading-tight px-1" style={{ color: TEXT_MID }}>
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team row — for top/bottom lists
// ---------------------------------------------------------------------------

function TeamRow({ t }: { t: TeamStats }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 last:mb-0">
      <span className="text-xl leading-none w-7 text-center flex-shrink-0" aria-hidden="true">
        {t.flag_emoji}
      </span>
      <span className="text-sm font-semibold flex-1 truncate" style={{ color: TEXT_DARK }}>
        {t.team_name}
      </span>
      <span className="text-xs font-medium mr-1" style={{ color: TEXT_MID }}>
        {t.ownedCount}/{t.totalCount}
      </span>
      <span
        className="text-xs font-bold rounded-full px-2 py-0.5 flex-shrink-0"
        style={{
          backgroundColor: t.percent === 100 ? LIME : t.percent >= 50 ? "#dcfce7" : "#fee2e2",
          color: t.percent === 100 ? TEXT_DARK : t.percent >= 50 ? "#166534" : "#991b1b",
        }}
      >
        {t.percent}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function StatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AllStats | null>(null);
  useEffect(() => {
    (async () => {
      // Redirect to onboarding if not set up yet
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }

      const [catalog, entries] = await Promise.all([getCatalog(), getAllStickers()]);

      const counts: Record<string, number> = {};
      let earliest = Infinity;
      entries.forEach((e: StickerEntry) => {
        counts[e.sticker_id] = e.count;
        if (e.count >= 1 && e.acquired_at < earliest) {
          earliest = e.acquired_at;
        }
      });

      const firstTs = isFinite(earliest) ? earliest : undefined;

      const computed = computeAllStats(catalog, counts, firstTs);
      setStats(computed);
      setLoading(false);
    })();
  }, [router]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: CREAM }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: GREEN, borderTopColor: "transparent" }}
          />
          <p className="text-sm font-medium" style={{ color: TEXT_MID }}>
            Calculando estadísticas…
          </p>
        </div>
      </div>
    );
  }

  const s = stats!;

  // ---- Empty state ----
  if (s.overall.ownedCount === 0) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: CREAM }}
        data-testid="stats-empty-state"
      >
        <StatsHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-6xl mb-5" aria-hidden="true">🌟</span>
          <p
            className="text-lg font-black mb-2"
            style={{ color: TEXT_DARK }}
            data-testid="stats-empty-message"
          >
            ¡Empezá a marcar figuritas!
          </p>
          <p className="text-sm mb-8" style={{ color: TEXT_MID }}>
            Tu álbum aún está vacío.
          </p>
          <a
            href="/album"
            className="rounded-full px-8 py-3 text-base font-bold"
            style={{ backgroundColor: GREEN, color: "#fff" }}
          >
            Ir al álbum
          </a>
        </div>
        <BottomNav active="stats" />
      </div>
    );
  }

  // ---- Full dashboard ----
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: CREAM }}
      data-testid="stats-page"
    >
      <StatsHeader />

      <main className="flex-1 pb-4" data-testid="stats-content">
        {/* Hero donut */}
        <HeroDonut
          percent={s.overall.percent}
          ownedCount={s.overall.ownedCount}
          totalCount={s.overall.totalCount}
        />

        {/* Por tipo */}
        <Section title="Por tipo">
          <HBar
            label="Países"
            owned={s.byType.paises.ownedCount}
            total={s.byType.paises.totalCount}
            percent={s.byType.paises.percent}
            color={GREEN}
          />
          <HBar
            label="Especiales Mundial"
            owned={s.byType.especiales.ownedCount}
            total={s.byType.especiales.totalCount}
            percent={s.byType.especiales.percent}
            color="#f59e0b"
          />
        </Section>

        {/* Por grupo */}
        <Section title="Por grupo del Mundial">
          {s.byGroup.map((g: GroupStats) => (
            <HBar
              key={g.group}
              label={`Grupo ${g.group}`}
              owned={g.ownedCount}
              total={g.totalCount}
              percent={g.percent}
              color={GREEN}
            />
          ))}
        </Section>

        {/* Top 5 completados */}
        {s.topTeams.length > 0 && (
          <Section title="Top 5 equipos">
            {s.topTeams.map((t) => (
              <TeamRow key={t.team_code} t={t} />
            ))}
          </Section>
        )}

        {/* Bottom 5 pendientes */}
        {s.bottomTeams.length > 0 && (
          <Section title="Equipos pendientes">
            {s.bottomTeams.map((t) => (
              <TeamRow key={t.team_code} t={t} />
            ))}
          </Section>
        )}

        {/* Footer mini-stats */}
        <div className="mx-4 grid grid-cols-2 gap-2.5" data-testid="footer-stats">
          <MiniCard icon="📈" label="Marcadas" value={s.footer.totalMarked} />
          <MiniCard icon="🔁" label="Repetidas" value={s.footer.totalRepes} />
          <MiniCard icon="🏆" label="Completados" value={s.footer.completedTeams} />
          <MiniCard
            icon="📅"
            label="Días en la app"
            value={s.footer.daysInApp > 0 ? s.footer.daysInApp : "—"}
          />
        </div>
      </main>

      <BottomNav active="stats" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared header
// ---------------------------------------------------------------------------

function StatsHeader() {
  return (
    <header
      className="sticky top-0 z-20 px-4 py-3 shadow-sm"
      style={{ backgroundColor: GREEN }}
      data-testid="stats-header"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white leading-none">
            Mis estadísticas
          </h1>
          <p className="text-xs text-green-200 mt-0.5">Mundial 2026</p>
        </div>
        <a
          href="/album"
          className="rounded-full p-2 text-white hover:bg-green-700 transition-colors"
          aria-label="Ir al álbum"
          title="Ir al álbum"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </a>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Bottom nav — mirrors album page but with stats as active
// ---------------------------------------------------------------------------

function BottomNav({ active }: { active: "album" | "trade" | "settings" | "stats" }) {
  const items: { id: string; href: string; label: string; icon: string }[] = [
    { id: "album",    href: "/album",    label: "Álbum",       icon: "📕" },
    { id: "stats",    href: "/stats",    label: "Stats",       icon: "📊" },
    { id: "trade",    href: "/trade",    label: "Intercambiar", icon: "🤝" },
    { id: "settings", href: "/settings", label: "Opciones",    icon: "⚙️" },
  ];

  return (
    <nav
      className="flex border-t"
      style={{
        backgroundColor: "#ffffff",
        borderColor: CREAM_DARK,
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href}
          className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[0.6rem] font-semibold transition-colors"
          style={{ color: active === item.id ? GREEN : "#9ca3af" }}
          aria-current={active === item.id ? "page" : undefined}
        >
          <span className="text-xl" aria-hidden="true">{item.icon}</span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

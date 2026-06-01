"use client";

/**
 * /album/map — World heatmap of the 48 qualifying countries.
 *
 * Each country is colored by Domi's sticker completion percentage:
 *   0%        → gray #e5e7eb
 *   1–29%     → lightened team_color
 *   30–69%    → team_color blended toward white (~60% opacity)
 *   70–99%    → full team_color
 *   100%      → full team_color + gold border (#fbbf24)
 *
 * Inline SVG paths (Natural Earth 110m, Equirectangular, viewBox 0 0 1000 500).
 * No GeoJSON parsed at runtime — paths are static data in this file.
 *
 * Tap a country → navigates to /album (deep link; user scrolls to team section).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { getAllStickers, getNickname } from "@/lib/db";
import { TEAM_CATALOG } from "@/lib/team-catalog";
import { countryFill, ISO3_TO_TEAM } from "@/lib/world-map";
import type { StickerEntry } from "@/lib/db";

// ---------------------------------------------------------------------------
// Simplified SVG paths for the 48 qualified countries
// Equirectangular projection, viewBox="0 0 1000 500"
// Coordinate formula: x = (lon + 180) / 360 * 1000, y = (90 - lat) / 180 * 500
// Paths are approximate polygons — optimized for a mobile heatmap, not precision cartography.
// ---------------------------------------------------------------------------

/** ISO3→SVG path(s). A country can have multiple paths (e.g. archipelagos). */
const COUNTRY_PATHS: Record<string, string[]> = {
  // Mexico
  MEX: [
    "M 221 188 L 228 192 L 242 198 L 258 205 L 260 218 L 255 228 L 248 235 L 240 240 L 233 243 L 228 248 L 223 252 L 218 248 L 213 240 L 210 233 L 208 225 L 213 218 L 217 210 L 218 200 Z",
  ],
  // USA (contiguous)
  USA: [
    "M 155 155 L 258 155 L 260 165 L 258 175 L 255 188 L 248 192 L 242 195 L 228 190 L 218 196 L 213 205 L 208 212 L 195 200 L 178 198 L 165 195 L 155 185 L 148 175 L 150 165 Z",
  ],
  // Canada
  CAN: [
    "M 148 80 L 260 80 L 265 100 L 260 120 L 255 135 L 248 145 L 240 150 L 225 150 L 210 148 L 195 148 L 180 148 L 165 148 L 155 148 L 148 140 L 143 120 L 140 100 Z",
  ],
  // Panama
  PAN: [
    "M 228 258 L 238 258 L 245 262 L 248 268 L 245 272 L 238 272 L 230 268 L 225 263 Z",
  ],
  // Colombia
  COL: [
    "M 238 268 L 255 268 L 262 278 L 265 290 L 260 298 L 252 300 L 244 298 L 238 290 L 235 280 Z",
  ],
  // Ecuador
  ECU: [
    "M 230 295 L 242 295 L 248 305 L 246 315 L 240 318 L 233 315 L 228 307 Z",
  ],
  // Brazil
  BRA: [
    "M 258 270 L 310 268 L 320 278 L 325 295 L 322 315 L 318 335 L 310 350 L 298 358 L 285 360 L 272 355 L 262 345 L 255 330 L 253 315 L 252 300 L 255 285 Z",
  ],
  // Paraguay
  PAR: [
    "M 268 338 L 285 338 L 292 348 L 290 358 L 282 362 L 272 360 L 265 352 Z",
  ],
  // Uruguay
  URU: [
    "M 278 362 L 292 360 L 300 368 L 298 378 L 288 382 L 278 378 L 272 370 Z",
  ],
  // Argentina
  ARG: [
    "M 265 360 L 285 360 L 295 370 L 300 390 L 298 415 L 290 435 L 278 448 L 268 450 L 260 442 L 255 425 L 255 405 L 258 385 L 260 370 Z",
  ],
  // France (mainland)
  FRA: [
    "M 468 138 L 482 138 L 490 148 L 490 160 L 482 165 L 470 163 L 462 155 L 462 145 Z",
  ],
  // Spain
  ESP: [
    "M 450 158 L 470 158 L 478 168 L 478 178 L 468 183 L 452 182 L 442 175 L 442 165 Z",
  ],
  // Portugal
  POR: [
    "M 438 162 L 450 162 L 453 172 L 452 182 L 443 183 L 436 177 L 435 168 Z",
  ],
  // Germany
  DEU: [
    "M 480 128 L 502 128 L 508 140 L 506 152 L 498 158 L 484 157 L 476 148 L 477 136 Z",
  ],
  // Belgium
  BEL: [
    "M 478 125 L 492 125 L 498 133 L 494 140 L 482 140 L 474 133 Z",
  ],
  // Netherlands
  NLD: [
    "M 478 118 L 490 118 L 496 127 L 492 133 L 480 132 L 474 124 Z",
  ],
  // Switzerland
  CHE: [
    "M 484 148 L 500 148 L 505 156 L 500 162 L 486 162 L 480 156 Z",
  ],
  // Austria
  AUT: [
    "M 498 140 L 515 140 L 522 150 L 518 158 L 505 158 L 496 150 Z",
  ],
  // Croatia
  CRO: [
    "M 508 148 L 522 148 L 528 158 L 524 166 L 514 166 L 506 158 Z",
  ],
  // Czech Republic
  CZE: [
    "M 500 130 L 518 130 L 524 140 L 520 148 L 506 148 L 498 140 Z",
  ],
  // Norway
  NOR: [
    "M 486 88 L 510 88 L 518 100 L 512 115 L 498 118 L 484 112 L 480 100 Z",
  ],
  // Sweden
  SWE: [
    "M 500 88 L 520 88 L 526 100 L 524 118 L 514 122 L 502 120 L 494 110 L 494 96 Z",
  ],
  // England (shown as part of Great Britain)
  GBR_ENG: [
    "M 454 108 L 468 108 L 472 118 L 468 128 L 456 130 L 448 122 L 449 112 Z",
  ],
  // Scotland (shown as top of Great Britain)
  GBR_SCO: [
    "M 454 96 L 466 96 L 472 106 L 468 114 L 456 114 L 448 106 Z",
  ],
  // Bosnia and Herzegovina
  BIH: [
    "M 518 152 L 530 152 L 535 162 L 531 170 L 520 170 L 514 162 Z",
  ],
  // Morocco
  MAR: [
    "M 448 190 L 466 190 L 472 200 L 470 212 L 460 215 L 448 212 L 442 202 Z",
  ],
  // Algeria
  DZA: [
    "M 462 190 L 498 190 L 504 208 L 498 225 L 478 228 L 462 225 L 455 210 Z",
  ],
  // Tunisia
  TUN: [
    "M 496 182 L 508 182 L 514 192 L 510 205 L 500 208 L 492 202 L 491 190 Z",
  ],
  // Egypt
  EGY: [
    "M 528 188 L 548 188 L 554 202 L 550 218 L 534 220 L 522 215 L 520 200 Z",
  ],
  // Senegal
  SEN: [
    "M 428 228 L 442 228 L 448 238 L 444 248 L 434 250 L 424 245 L 422 235 Z",
  ],
  // Ghana
  GHA: [
    "M 452 248 L 464 248 L 470 260 L 466 272 L 455 272 L 446 265 L 446 256 Z",
  ],
  // Ivory Coast (CIV)
  CIV: [
    "M 438 250 L 452 250 L 456 262 L 452 272 L 440 272 L 432 264 L 433 254 Z",
  ],
  // Cameroon — not in tournament, skip
  // Cape Verde (island, approximate location off West Africa)
  CPV: [
    "M 412 222 L 420 222 L 424 228 L 421 234 L 413 233 L 409 227 Z",
  ],
  // South Africa
  ZAF: [
    "M 502 340 L 525 338 L 532 350 L 528 368 L 515 375 L 502 372 L 494 360 L 495 348 Z",
  ],
  // Congo DR (COD)
  COD: [
    "M 510 275 L 535 272 L 545 285 L 542 302 L 528 308 L 510 305 L 500 292 L 502 278 Z",
  ],
  // Saudi Arabia
  SAU: [
    "M 570 195 L 600 192 L 610 205 L 608 225 L 595 235 L 575 235 L 562 222 L 560 207 Z",
  ],
  // Iraq
  IRQ: [
    "M 570 178 L 592 175 L 602 188 L 598 200 L 580 202 L 566 195 Z",
  ],
  // Iran
  IRN: [
    "M 595 165 L 635 162 L 646 178 L 640 198 L 620 205 L 598 202 L 588 188 L 590 172 Z",
  ],
  // Jordan
  JOR: [
    "M 548 190 L 565 188 L 572 200 L 568 212 L 552 214 L 543 205 Z",
  ],
  // Uzbekistan
  UZB: [
    "M 622 148 L 650 145 L 658 158 L 652 170 L 628 172 L 616 162 Z",
  ],
  // Turkey
  TUR: [
    "M 530 158 L 575 155 L 582 168 L 575 180 L 550 182 L 532 175 Z",
  ],
  // Qatar
  QAT: [
    "M 599 208 L 608 208 L 612 218 L 608 226 L 600 226 L 596 218 Z",
  ],
  // Japan
  JPN: [
    "M 762 162 L 772 162 L 778 172 L 774 182 L 762 182 L 756 172 Z",
    "M 768 148 L 778 148 L 782 158 L 775 165 L 765 162 L 760 155 Z",
  ],
  // South Korea
  KOR: [
    "M 748 168 L 762 168 L 765 180 L 760 188 L 748 188 L 742 178 Z",
  ],
  // Australia
  AUS: [
    "M 728 290 L 790 288 L 802 310 L 800 340 L 785 358 L 760 362 L 738 355 L 720 338 L 718 312 Z",
  ],
  // New Zealand
  NZL: [
    "M 820 348 L 835 345 L 840 358 L 835 370 L 822 372 L 815 362 Z",
    "M 828 370 L 840 368 L 845 380 L 840 395 L 826 398 L 818 385 Z",
  ],
  // Haiti
  HTI: [
    "M 240 225 L 252 225 L 256 232 L 252 240 L 241 240 L 236 232 Z",
  ],
  // Curazao (island near Venezuela)
  CUW: [
    "M 253 265 L 261 265 L 264 271 L 260 277 L 252 276 L 249 270 Z",
  ],
  // Panama already added above
};

// ---------------------------------------------------------------------------
// Hook: load catalog + counts → per-team stats
// ---------------------------------------------------------------------------

interface TeamStat {
  owned: number;
  total: number;
  color: string;
  pct: number;
}

function useTeamStats(): {
  stats: Map<string, TeamStat>;
  loading: boolean;
  hasAny: boolean;
} {
  const [stats, setStats] = useState<Map<string, TeamStat>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [catalog, entries] = await Promise.all([
        getCatalog(),
        getAllStickers(),
      ]);
      const countMap: Record<string, number> = {};
      entries.forEach((e: StickerEntry) => {
        countMap[e.sticker_id] = e.count;
      });

      const map = new Map<string, TeamStat>();
      for (const sticker of catalog) {
        const code = sticker.team_code;
        if (!code || code === "FWC") continue;
        const existing = map.get(code) ?? { owned: 0, total: 0, color: sticker.team_color, pct: 0 };
        existing.total++;
        if ((countMap[sticker.id] ?? 0) >= 1) existing.owned++;
        existing.color = sticker.team_color;
        map.set(code, existing);
      }
      // Compute pct
      for (const [code, stat] of map) {
        stat.pct = stat.total > 0 ? Math.round((stat.owned / stat.total) * 100) : 0;
        map.set(code, stat);
      }

      setStats(map);
      setLoading(false);
    })();
  }, []);

  const hasAny = useMemo(() => {
    for (const [, stat] of stats) {
      if (stat.owned > 0) return true;
    }
    return false;
  }, [stats]);

  return { stats, loading, hasAny };
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipInfo {
  x: number;
  y: number;
  iso3: string;
  teamCode: string;
  stat: TeamStat | null;
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function AlbumMapPage() {
  const router = useRouter();
  const { stats, loading, hasAny } = useTeamStats();
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check onboarding
  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) router.replace("/");
    })();
  }, [router]);

  /** Build per-iso3 fill/stroke from stats */
  const countryStyles = useMemo(() => {
    const result: Record<string, ReturnType<typeof countryFill>> = {};
    for (const [iso3, teamCode] of Object.entries(ISO3_TO_TEAM)) {
      const stat = stats.get(teamCode);
      const color = stat?.color ?? "#9ca3af";
      const pct = stat?.pct ?? 0;
      result[iso3] = countryFill(color, pct);
    }
    return result;
  }, [stats]);

  function handleCountryTap(iso3: string, e: React.MouseEvent | React.TouchEvent) {
    const teamCode = ISO3_TO_TEAM[iso3];
    if (!teamCode) return;

    // Get viewport-relative position for tooltip
    const rect = containerRef.current?.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = rect ? clientX - rect.left : clientX;
    const y = rect ? clientY - rect.top : clientY;

    const stat = stats.get(teamCode) ?? null;

    // Toggle tooltip: tap same country again closes it
    if (tooltip?.iso3 === iso3) {
      setTooltip(null);
      return;
    }

    setTooltip({ x, y, iso3, teamCode, stat });
  }

  function handleNavigateToTeam() {
    if (!tooltip) return;
    const teamCode = tooltip.teamCode.toLowerCase();
    router.push(`/album#${teamCode}`);
  }

  function handleMapBackground() {
    setTooltip(null);
  }

  const catalogEntry = tooltip ? TEAM_CATALOG[tooltip.teamCode] : null;

  // Empty state: no stickers at all
  const showEmpty = !loading && !hasAny;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#f9f5ee" }}>
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "#006847" }}
      >
        <a
          href="/album"
          aria-label="Volver al álbum"
          className="flex items-center justify-center w-9 h-9 rounded-full text-white"
          style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
        >
          ←
        </a>
        <div>
          <h1 className="text-lg font-black text-white leading-none">
            Mapa del Mundial
          </h1>
          <p className="text-xs text-green-200 mt-0.5">
            Tus países pintados
          </p>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Map container */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col items-center justify-start px-2 pt-4 pb-2">
        {loading ? (
          <div className="flex-1 flex items-center justify-center mt-16">
            <div
              className="w-10 h-10 rounded-full border-4 animate-spin"
              style={{ borderColor: "#006847", borderTopColor: "transparent" }}
            />
          </div>
        ) : showEmpty ? (
          /* Empty state */
          <div
            className="mx-4 mt-10 rounded-2xl p-6 text-center"
            style={{ backgroundColor: "#ffffff", border: "1px solid #d1c9b8" }}
            data-testid="map-empty-state"
          >
            <p className="text-3xl mb-3" aria-hidden="true">🗺️</p>
            <p className="text-sm font-medium text-gray-600 leading-relaxed">
              Aún no hay países pintados.
              <br />
              Marcá una figurita para iluminar el mapa.
            </p>
            <a
              href="/album"
              className="mt-4 inline-block px-5 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: "#006847" }}
            >
              Ir al álbum
            </a>
          </div>
        ) : null}

        {/* SVG world map — always rendered (even in empty state for context) */}
        {!loading && (
          <div
            ref={containerRef}
            className="w-full relative"
            style={{ maxWidth: "860px" }}
            data-testid="world-map-container"
          >
            <svg
              ref={svgRef}
              viewBox="0 0 1000 500"
              preserveAspectRatio="xMidYMid meet"
              className="w-full rounded-xl shadow-sm"
              style={{
                backgroundColor: "#a8d5e2",
                border: "1px solid #d1c9b8",
              }}
              onClick={handleMapBackground}
              role="img"
              aria-label="Mapa del mundial con países coloreados por tu colección"
            >
              {/* Ocean label */}
              <text x="500" y="470" textAnchor="middle" fontSize="10" fill="#6b7280" fontFamily="sans-serif" opacity="0.6">
                FIFA World Cup 2026
              </text>

              {/* Render all country paths */}
              {Object.entries(COUNTRY_PATHS).map(([iso3, paths]) => {
                const style = countryStyles[iso3] ?? { fill: "#e5e7eb", stroke: "#d1d5db", strokeWidth: 0.5 };
                const teamCode = ISO3_TO_TEAM[iso3];
                const stat = teamCode ? stats.get(teamCode) : null;
                const isTooltipActive = tooltip?.iso3 === iso3;

                return (
                  <g
                    key={iso3}
                    data-testid={`country-${iso3}`}
                    data-team={teamCode}
                    data-pct={stat?.pct ?? 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCountryTap(iso3, e);
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      handleCountryTap(iso3, e as unknown as React.TouchEvent);
                    }}
                    style={{ cursor: "pointer" }}
                    aria-label={teamCode ? `${TEAM_CATALOG[teamCode]?.display_name ?? teamCode} — ${stat?.pct ?? 0}%` : iso3}
                  >
                    {paths.map((d, i) => (
                      <path
                        key={i}
                        d={d}
                        fill={isTooltipActive ? style.fill : style.fill}
                        stroke={isTooltipActive ? "#1d4ed8" : style.stroke}
                        strokeWidth={isTooltipActive ? 2 : style.strokeWidth}
                        opacity={isTooltipActive ? 0.85 : 1}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {tooltip && catalogEntry && (
              <div
                className="absolute z-30 pointer-events-auto"
                style={{
                  left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 320) - 160),
                  top: tooltip.y - 90,
                  transform: "translateX(-50%)",
                }}
                data-testid="map-tooltip"
              >
                <div
                  className="rounded-xl px-4 py-3 shadow-lg text-center"
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1.5px solid #d1c9b8",
                    minWidth: "140px",
                    maxWidth: "180px",
                  }}
                >
                  <div className="text-2xl mb-0.5" aria-hidden="true">
                    {catalogEntry.flag}
                  </div>
                  <p className="font-bold text-gray-800 text-sm leading-tight">
                    {catalogEntry.display_name}
                  </p>
                  {tooltip.stat ? (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tooltip.stat.owned}/{tooltip.stat.total} figuritas · {tooltip.stat.pct}%
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">0 figuritas</p>
                  )}
                  <button
                    onClick={handleNavigateToTeam}
                    className="mt-2 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ backgroundColor: "#006847", color: "#ffffff" }}
                  >
                    Ver equipo →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Legend */}
      {/* ------------------------------------------------------------------ */}
      {!loading && (
        <div
          className="px-4 py-4 mx-2 mb-4 rounded-xl"
          style={{ backgroundColor: "#ffffff", border: "1px solid #d1c9b8" }}
          data-testid="map-legend"
        >
          <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
            Escala de completitud
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <LegendItem color="#e5e7eb" label="0%" border="1px solid #d1d5db" />
            <LegendItem color="#b3cce0" label="1–29%" />
            <LegendItem color="#6aa6cc" label="30–69%" />
            <LegendItem color="#1a6faf" label="70–99%" />
            <LegendItem color="#1a6faf" label="100%" border="2px solid #fbbf24" />
          </div>
          <p className="text-[0.6rem] text-gray-400 mt-2">
            El color real varía por equipo · Borde dorado = álbum completo
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Stats strip */}
      {/* ------------------------------------------------------------------ */}
      {!loading && !showEmpty && (
        <StatsStrip stats={stats} />
      )}

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend item
// ---------------------------------------------------------------------------

function LegendItem({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-4 h-4 rounded-sm flex-shrink-0"
        style={{ backgroundColor: color, border: border ?? "1px solid #9ca3af" }}
      />
      <span className="text-[0.65rem] text-gray-500">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats strip — top 3 teams by pct
// ---------------------------------------------------------------------------

function StatsStrip({ stats }: { stats: Map<string, TeamStat> }) {
  const top3 = useMemo(() => {
    return [...stats.entries()]
      .filter(([, s]) => s.owned > 0)
      .sort((a, b) => b[1].pct - a[1].pct)
      .slice(0, 3);
  }, [stats]);

  if (top3.length === 0) return null;

  return (
    <div className="px-2 pb-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-2 mb-2">
        Tu progreso — top equipos
      </p>
      <div className="flex gap-2">
        {top3.map(([teamCode, stat]) => {
          const entry = TEAM_CATALOG[teamCode];
          if (!entry) return null;
          return (
            <a
              key={teamCode}
              href={`/album#${teamCode.toLowerCase()}`}
              className="flex-1 rounded-xl p-2.5 text-center"
              style={{ backgroundColor: "#ffffff", border: "1px solid #d1c9b8" }}
              data-testid={`stat-strip-${teamCode}`}
            >
              <div className="text-xl" aria-hidden="true">{entry.flag}</div>
              <p className="text-[0.65rem] font-bold text-gray-700 mt-0.5 truncate">
                {entry.display_name}
              </p>
              <p className="text-[0.6rem] text-gray-500">
                {stat.owned}/{stat.total} · {stat.pct}%
              </p>
              <div
                className="mt-1.5 w-full h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: "#e5e7eb" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${stat.pct}%`,
                    backgroundColor: stat.color,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BottomNav (mirrored from album/page.tsx — no modification to that file)
// ---------------------------------------------------------------------------

function BottomNav() {
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
          style={{ color: "#9ca3af" }}
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

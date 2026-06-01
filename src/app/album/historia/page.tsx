"use client";

/**
 * /album/historia — Historical World Cup Champions timeline.
 *
 * Vertical timeline (1934 → 2022) of 8 prestige champion stickers.
 * Dark theme via .home-dark wrapper.
 *
 * Source images are rotated 90° CW in the original scans.
 * We apply transform: rotate(-90deg) + explicit width/height swap
 * so the card renders landscape-correct inside a portrait container.
 *
 * Tap a card → toggleSticker(id) to mark as owned.
 * Footer shows X/8 with progress bar.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getNickname, getAllStickers, toggleSticker } from "@/lib/db";
import type { StickerEntry } from "@/lib/db";
import BottomNav from "@/components/BottomNav";

// ---------------------------------------------------------------------------
// Champion data (static — not loaded from getCatalog to avoid type gymnastics)
// ---------------------------------------------------------------------------

interface Champion {
  id: string;
  year: number;
  displayName: string;
  team: string;
  teamCode: string;
  teamColor: string;
  flag: string;
  captain: string;
  host: string;
  imagePath: string;
}

const CHAMPIONS: Champion[] = [
  {
    id: "champ-ita-1934",
    year: 1934,
    displayName: "ITALIA 1934",
    team: "Italia",
    teamCode: "ITA",
    teamColor: "#003DA5",
    flag: "🇮🇹",
    captain: "Giuseppe Meazza",
    host: "Italia",
    imagePath: "/stickers/seed/champ-ita-1934.jpg",
  },
  {
    id: "champ-uru-1950",
    year: 1950,
    displayName: "URUGUAY 1950",
    team: "Uruguay",
    teamCode: "URU",
    teamColor: "#5CBFEB",
    flag: "🇺🇾",
    captain: "Obdulio Varela",
    host: "Brasil",
    imagePath: "/stickers/seed/champ-uru-1950.jpg",
  },
  {
    id: "champ-ger-1954",
    year: 1954,
    displayName: "ALEMANIA FR 1954",
    team: "Alemania FR",
    teamCode: "GER",
    teamColor: "#DD0000",
    flag: "🇩🇪",
    captain: "Fritz Walter",
    host: "Suiza",
    imagePath: "/stickers/seed/champ-ger-1954.jpg",
  },
  {
    id: "champ-bra-1962",
    year: 1962,
    displayName: "BRASIL 1962",
    team: "Brasil",
    teamCode: "BRA",
    teamColor: "#009C3B",
    flag: "🇧🇷",
    captain: "Garrincha",
    host: "Chile",
    imagePath: "/stickers/seed/champ-bra-1962.jpg",
  },
  {
    id: "champ-arg-1986",
    year: 1986,
    displayName: "ARGENTINA 1986",
    team: "Argentina",
    teamCode: "ARG",
    teamColor: "#75AADB",
    flag: "🇦🇷",
    captain: "Diego Maradona",
    host: "México",
    imagePath: "/stickers/seed/champ-arg-1986.jpg",
  },
  {
    id: "champ-bra-1994",
    year: 1994,
    displayName: "BRASIL 1994",
    team: "Brasil",
    teamCode: "BRA",
    teamColor: "#009C3B",
    flag: "🇧🇷",
    captain: "Romário",
    host: "EE.UU.",
    imagePath: "/stickers/seed/champ-bra-1994.jpg",
  },
  {
    id: "champ-bra-2002",
    year: 2002,
    displayName: "BRASIL 2002",
    team: "Brasil",
    teamCode: "BRA",
    teamColor: "#009C3B",
    flag: "🇧🇷",
    captain: "Ronaldo",
    host: "Corea/Japón",
    imagePath: "/stickers/seed/champ-bra-2002.jpg",
  },
  {
    id: "champ-arg-2022",
    year: 2022,
    displayName: "ARGENTINA 2022",
    team: "Argentina",
    teamCode: "ARG",
    teamColor: "#75AADB",
    flag: "🇦🇷",
    captain: "Lionel Messi",
    host: "Qatar",
    imagePath: "/stickers/seed/champ-arg-2022.jpg",
  },
];

// ---------------------------------------------------------------------------
// ChampionCard
// ---------------------------------------------------------------------------

interface ChampionCardProps {
  champion: Champion;
  owned: boolean;
  onTap: (id: string) => void;
}

function ChampionCard({ champion, owned, onTap }: ChampionCardProps) {
  return (
    <article
      data-testid="champion-card"
      data-champion-id={champion.id}
      onClick={() => onTap(champion.id)}
      className="relative cursor-pointer select-none"
      style={{
        opacity: owned ? 1 : 0.3,
        transition: "opacity 0.2s ease",
      }}
      aria-label={`${champion.displayName} — ${owned ? "en tu colección" : "te falta"}`}
    >
      {/* Card container — the card is portrait; image inside is rotated to landscape */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          border: owned
            ? `2px solid #facc15`
            : "2px solid rgba(255,255,255,0.12)",
          boxShadow: owned
            ? "0 0 20px rgba(250,204,21,0.4), 0 4px 24px rgba(0,0,0,0.6)"
            : "0 4px 16px rgba(0,0,0,0.5)",
          background: "#111111",
        }}
      >
        {/* Year badge top-left */}
        <div
          className="absolute top-3 left-3 z-10 font-black leading-none"
          style={{
            fontSize: "2rem",
            background: "linear-gradient(135deg, #fde047 0%, #facc15 50%, #f59e0b 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            textShadow: "none",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
          }}
        >
          {champion.year}
        </div>

        {/* Flag emoji top-right */}
        <div
          className="absolute top-3 right-3 z-10 text-3xl leading-none"
          aria-label={champion.team}
        >
          {champion.flag}
        </div>

        {/* Owned golden badge */}
        {owned && (
          <div
            className="absolute top-3 right-14 z-10 rounded-full px-2 py-0.5 text-[10px] font-black"
            style={{ backgroundColor: "#facc15", color: "#0a0a0a" }}
          >
            ★
          </div>
        )}

        {/* Champion sticker image — rotated 90° CCW to correct landscape orientation.
            Source scans are landscape pages rotated 90° CW; rotating -90° restores them.
            We use a fixed-size overflow:hidden container and rotate the Image inside it.
            The outer div is 240px tall × full width; the rotated image is 240px wide × 320px tall
            so after rotation it fills the container as a landscape crop. */}
        <div
          className="w-full flex items-center justify-center overflow-hidden"
          style={{
            height: "240px",
            backgroundColor: "#0a0a0a",
            position: "relative",
          }}
        >
          <div
            style={{
              transform: "rotate(-90deg)",
              width: "240px",
              height: "100%",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <Image
              src={champion.imagePath}
              alt={champion.displayName}
              fill
              style={{ objectFit: "cover", objectPosition: "center" }}
              sizes="240px"
              unoptimized
            />
          </div>
        </div>

        {/* Red ribbon banner — "ARGENTINA 1986" Panini label style */}
        <div
          className="w-full flex items-center justify-center py-2"
          style={{
            background: "linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #991b1b 100%)",
            borderTop: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <span
            className="text-sm font-black tracking-widest uppercase"
            style={{ color: "#ffffff", letterSpacing: "0.12em" }}
          >
            {champion.displayName}
          </span>
        </div>

        {/* Captain / legend text */}
        <div className="px-4 pt-2 pb-1 text-center">
          <p
            className="text-xs font-bold tracking-wide"
            style={{ color: "#e5e7eb" }}
          >
            {champion.captain}
          </p>
        </div>

        {/* Host text */}
        <div className="px-4 pb-3 text-center">
          <p
            className="text-[10px]"
            style={{ color: "#6b7280" }}
          >
            🌎 {champion.host}
          </p>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HistoriaPage() {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }
      const entries = await getAllStickers();
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

  const ownedCount = CHAMPIONS.filter((c) => (counts[c.id] ?? 0) >= 1).length;
  const total = CHAMPIONS.length;
  const progressPct = total > 0 ? (ownedCount / total) * 100 : 0;

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center home-dark">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "#facc15", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "#9ca3af" }}>Cargando campeones...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 w-full lg:max-w-2xl mx-auto home-dark"
      data-testid="historia-root"
    >
      {/* ------------------------------------------------------------------ */}
      {/* TopBar                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "#111111",
          borderBottom: "1px solid rgba(250,204,21,0.2)",
          boxShadow: "0 1px 12px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="rounded-full p-1.5 transition-colors"
          style={{ color: "#9ca3af" }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flex-1">
          <h1
            className="text-base font-black leading-none uppercase tracking-wider"
            style={{
              background: "linear-gradient(135deg, #fde047 0%, #facc15 50%, #f59e0b 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Campeones del Mundo
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
            Historia del torneo
          </p>
        </div>
        <span className="text-2xl" aria-hidden="true">🏆</span>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Timeline                                                             */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 px-4 py-6" data-testid="champions-timeline">
        <div className="relative">
          {/* Vertical gold dotted connector line */}
          <div
            className="absolute left-1/2 top-0 bottom-0"
            style={{
              width: "2px",
              transform: "translateX(-50%)",
              background:
                "repeating-linear-gradient(to bottom, #facc15 0px, #facc15 6px, transparent 6px, transparent 14px)",
              zIndex: 0,
            }}
            aria-hidden="true"
          />

          {/* Champion cards stacked vertically */}
          <div className="relative flex flex-col gap-8" style={{ zIndex: 1 }}>
            {CHAMPIONS.map((champion) => (
              <div key={champion.id} className="flex flex-col items-center">
                {/* Timeline dot */}
                <div
                  className="mb-3 rounded-full border-2 flex items-center justify-center"
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor:
                      (counts[champion.id] ?? 0) >= 1 ? "#facc15" : "#374151",
                    borderColor:
                      (counts[champion.id] ?? 0) >= 1 ? "#facc15" : "#4b5563",
                    boxShadow:
                      (counts[champion.id] ?? 0) >= 1
                        ? "0 0 8px rgba(250,204,21,0.6)"
                        : "none",
                    zIndex: 2,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <div className="w-full">
                  <ChampionCard
                    champion={champion}
                    owned={(counts[champion.id] ?? 0) >= 1}
                    onTap={handleTap}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer — progress                                                    */}
      {/* ------------------------------------------------------------------ */}
      <footer
        className="sticky bottom-16 z-10 px-4 py-3 mx-4 mb-2 rounded-2xl"
        style={{
          backgroundColor: "rgba(17,17,17,0.95)",
          border: "1px solid rgba(250,204,21,0.2)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold" style={{ color: "#9ca3af" }}>
            {ownedCount}/{total} campeones coleccionados
          </span>
          {ownedCount === total && (
            <span className="text-xs font-bold" style={{ color: "#facc15" }}>
              ¡Colección completa! ✓
            </span>
          )}
        </div>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #facc15, #f59e0b)",
            }}
          />
        </div>
      </footer>

      <BottomNav active="album" />
    </div>
  );
}

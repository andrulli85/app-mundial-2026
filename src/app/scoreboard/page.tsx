"use client";

/**
 * /scoreboard — Mi Once Fantasy Scoreboard
 *
 * Reads the confirmed XI from IndexedDB (userXI) and computes points
 * using scoring.ts + all available matchday JSON files.
 *
 * Local-first: no server requests. All score data is committed JSON.
 * Phase C will replace src/data/match-scores/MD-1.json with real FIFA
 * Fantasy data after each matchday — zero code change needed here.
 *
 * Design matches /once palette: bg #0d0f13, GREEN #006847, LIME #c2ef4e,
 * GOLD #F4C84A.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadXI } from "@/lib/userXI";
import { isLocked, getCurrentPhase } from "@/lib/userXI";
import type { UserXI } from "@/lib/userXI";
import { getXIScore } from "@/lib/scoring";
import type { XIScoreResult } from "@/lib/scoring";
import { loadAvailableScores } from "@/lib/loadScores";
import { getCatalog, DEFAULT_TEAM_COLOR } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import { getPlayerMeta } from "@/lib/player-meta";
import BottomNav from "@/components/BottomNav";
import playerMapping from "@/data/player-mapping.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GREEN = "#006847";
const LIME = "#c2ef4e";
const GOLD = "#F4C84A";

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  common:    { bg: "#1b1f27", border: "#3a3f4c", text: "#c8cdd9" },
  rare:      { bg: "#0f2033", border: "#2563eb", text: "#60a5fa" },
  epic:      { bg: "#241433", border: "#9333ea", text: "#c084fc" },
  legendary: { bg: "#2b2410", border: GOLD,      text: GOLD },
};

const POSITION_LABEL: Record<string, string> = {
  POR: "POR",
  DEF: "DEF",
  MED: "MED",
  DEL: "DEL",
};

// Slot position derived from slotId prefix
function slotToPos(slotId: string): string {
  if (slotId.startsWith("POR")) return "POR";
  if (slotId.startsWith("DEF")) return "DEF";
  if (slotId.startsWith("MED")) return "MED";
  if (slotId.startsWith("DEL")) return "DEL";
  return "";
}

// Total matchday count in the tournament (group + knockout for scoring)
const TOTAL_MATCHDAYS = 8;

// ---------------------------------------------------------------------------
// StatPod — mirrors the one in /once
// ---------------------------------------------------------------------------
function StatPod({
  label,
  value,
  suffix = "",
  big = false,
  accent,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  big?: boolean;
  accent?: string;
}) {
  const textColor = accent ?? (big ? GOLD : "#f3f4f6");

  return (
    <div
      style={{
        flex: 1,
        background: "#1a1e29",
        border: `1px solid ${big ? GOLD + "55" : "#2d3344"}`,
        borderRadius: 14,
        padding: "11px 12px",
      }}
    >
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontWeight: 900,
          fontSize: big ? 32 : 22,
          color: textColor,
          lineHeight: 1,
        }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 2 }}>{suffix}</span>
        )}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#9ca3af",
          fontWeight: 700,
          marginTop: 3,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatchdayTimeline
// ---------------------------------------------------------------------------
function MatchdayTimeline({
  perMatchday,
  maxPoints,
}: {
  perMatchday: Array<{ matchday: number; subtotal: number }>;
  maxPoints: number;
}) {
  const mds = Array.from({ length: TOTAL_MATCHDAYS }, (_, i) => i + 1);
  const dataByMd = new Map(perMatchday.map((p) => [p.matchday, p.subtotal]));

  return (
    <div
      style={{
        background: "#111318",
        border: "1px solid #2d3344",
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#9ca3af",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "system-ui, sans-serif",
          marginBottom: 12,
        }}
      >
        Puntaje por jornada
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "flex-end",
          height: 60,
        }}
      >
        {mds.map((md) => {
          const hasData = dataByMd.has(md);
          const pts = dataByMd.get(md) ?? 0;
          const barH = hasData && maxPoints > 0
            ? Math.max(8, Math.round((pts / maxPoints) * 52))
            : 0;

          return (
            <div
              key={md}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              {/* Bar */}
              <div
                style={{
                  width: "100%",
                  height: hasData ? barH : 20,
                  borderRadius: 4,
                  background: hasData
                    ? pts > 0
                      ? `linear-gradient(to top, ${GREEN}, ${LIME})`
                      : "#2d3344"
                    : "#1e2230",
                  border: hasData ? "none" : "1px dashed #2d3344",
                  transition: "height 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {hasData && pts > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -16,
                      fontSize: 9,
                      fontWeight: 800,
                      color: LIME,
                      fontFamily: "system-ui, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {pts}
                  </span>
                )}
              </div>
              {/* MD label */}
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: hasData ? "#9ca3af" : "#3a3f4c",
                  fontFamily: "system-ui, sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                J{md}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlayerRow — one row in the per-player breakdown table
// ---------------------------------------------------------------------------
function PlayerRow({
  slotId,
  sticker_id,
  points,
  has_data,
  catalogMap,
}: {
  slotId: string;
  sticker_id: string;
  points: number;
  has_data: boolean;
  catalogMap: Map<string, Sticker>;
}) {
  const pos = slotToPos(slotId);
  const posLabel = POSITION_LABEL[pos] ?? pos;

  if (!sticker_id) {
    // Empty slot
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "#111318",
          border: "1px solid #1e2230",
          borderRadius: 12,
          opacity: 0.5,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: "#4b5563",
            background: "#1e2230",
            borderRadius: 6,
            padding: "3px 6px",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.06em",
            minWidth: 32,
            textAlign: "center",
          }}
        >
          {posLabel}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 12,
            color: "#4b5563",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Vacío
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#4b5563",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          —
        </span>
      </div>
    );
  }

  const sticker = catalogMap.get(sticker_id);
  const meta = sticker ? getPlayerMeta(sticker) : null;
  const rarity = meta?.rarity ?? "common";
  const colors = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const teamColor = sticker?.team_color ?? DEFAULT_TEAM_COLOR;

  // Display name: last word of the sticker name (surname convention)
  const displayName = sticker
    ? sticker.name.split(" ").pop() ?? sticker.name
    : sticker_id.split("-").slice(2).join("-").toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: colors.bg,
        border: `1.5px solid ${colors.border}44`,
        borderLeft: `3px solid ${teamColor}`,
        borderRadius: 12,
      }}
    >
      {/* Position badge */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: "#9ca3af",
          background: "#0d0f13",
          borderRadius: 6,
          padding: "3px 6px",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "0.06em",
          minWidth: 32,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {posLabel}
      </span>

      {/* Sticker code + name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            color: "#6b7280",
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          {sticker?.code ?? sticker_id.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: colors.text,
            fontFamily: "system-ui, sans-serif",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          {displayName}
        </div>
      </div>

      {/* Points */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {has_data ? (
          <span
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: points > 0 ? LIME : "#9ca3af",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {points}
          </span>
        ) : (
          <span
            style={{
              fontSize: 13,
              color: "#4b5563",
              fontFamily: "system-ui, sans-serif",
            }}
            title="Sin datos aún"
          >
            —
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ScoreboardPage() {
  const [loading, setLoading] = useState(true);
  const [userXI, setUserXI] = useState<UserXI | null>(null);
  const [scoreResult, setScoreResult] = useState<XIScoreResult | null>(null);
  const [catalogMap, setCatalogMap] = useState<Map<string, Sticker>>(new Map());
  const [matchdaysLoaded, setMatchdaysLoaded] = useState(0);
  const [now] = useState(() => new Date());

  useEffect(() => {
    async function init() {
      try {
        const [xi, catalog, scores] = await Promise.all([
          loadXI(),
          getCatalog(),
          loadAvailableScores(),
        ]);

        const cMap = new Map(catalog.map((s) => [s.id, s]));
        setCatalogMap(cMap);
        setMatchdaysLoaded(scores.length);

        if (xi) {
          setUserXI(xi);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapping = playerMapping as any;
          const result = getXIScore(xi, scores, mapping);
          setScoreResult(result);
        }
      } catch (err) {
        console.error("[Scoreboard] Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const lockPhase = getCurrentPhase(now);
  const locked = isLocked(now);

  // ---- Loading state ----
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#0d0f13",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: `3px solid ${GREEN}`,
            borderTopColor: "transparent",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---- Empty state: no confirmed XI ----
  if (!userXI) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#0d0f13",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 32px",
            gap: 20,
          }}
        >
          <span style={{ fontSize: 56 }}>🏆</span>
          <div
            style={{
              fontFamily: "system-ui, sans-serif",
              fontWeight: 900,
              fontSize: 22,
              color: "#f3f4f6",
              textAlign: "center",
              lineHeight: 1.25,
            }}
          >
            Confirmá tu 11 primero
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#9ca3af",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.5,
            }}
          >
            Tu puntaje aparecerá aquí una vez que hayas armado y confirmado tu 11 en Mi Once.
          </div>
          <Link
            href="/once"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: GREEN,
              color: "#fff",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              borderRadius: 12,
              textDecoration: "none",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Ir a Mi 11
          </Link>
        </div>
        <BottomNav active="scoreboard" />
      </div>
    );
  }

  // ---- Computed values ----
  const result = scoreResult ?? { total: 0, perPlayer: [], perMatchday: [] };
  const slots = Object.entries(userXI.lineup); // [slotId, sticker_id][]

  // Top performer across all players with data
  const topPerformer = result.perPlayer
    .filter((p) => p.has_data && p.points > 0)
    .sort((a, b) => b.points - a.points)[0];

  const topPerformerSticker = topPerformer
    ? catalogMap.get(topPerformer.sticker_id)
    : null;
  const topPerformerName = topPerformerSticker
    ? topPerformerSticker.name.split(" ").pop()!
    : topPerformer?.sticker_id?.split("-").slice(2).join("-").toUpperCase() ?? "—";

  const maxMdPoints =
    result.perMatchday.length > 0
      ? Math.max(...result.perMatchday.map((m) => m.subtotal), 1)
      : 1;

  const filledSlots = slots.filter(([, sid]) => !!sid).length;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0d0f13",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* ---- Sticky header ---- */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#0d0f13",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "14px 18px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: LIME,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Tu puntaje
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "#f3f4f6",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            Scoreboard
          </div>
        </div>

        {/* Total points pod */}
        <div
          style={{
            background: "#1a1e29",
            border: `1.5px solid ${GOLD}66`,
            borderRadius: 14,
            padding: "8px 16px",
            textAlign: "center",
            minWidth: 72,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: GOLD,
              lineHeight: 1,
            }}
          >
            {result.total}
          </div>
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "#9ca3af",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            pts
          </div>
        </div>
      </div>

      {/* ---- Scrollable content ---- */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 18px",
          paddingBottom: 90,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Stats row */}
        <div style={{ display: "flex", gap: 8 }}>
          <StatPod
            label="Total"
            value={result.total}
            big
          />
          <StatPod
            label="Jornadas"
            value={`${matchdaysLoaded}/${TOTAL_MATCHDAYS}`}
            accent={LIME}
          />
          <StatPod
            label="Top scorer"
            value={topPerformer ? topPerformerName : "—"}
            suffix={topPerformer ? ` (${topPerformer.points})` : ""}
            accent="#f3f4f6"
          />
        </div>

        {/* Matchday timeline */}
        <MatchdayTimeline
          perMatchday={result.perMatchday}
          maxPoints={maxMdPoints}
        />

        {/* Per-player breakdown */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#9ca3af",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Jugadores · {filledSlots}/11
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {slots.map(([slotId, sticker_id]) => {
              const playerEntry = result.perPlayer.find(
                (p) => p.sticker_id === sticker_id && sticker_id !== ""
              ) ?? { sticker_id, fifa_player_id: null, points: 0, has_data: false };

              return (
                <PlayerRow
                  key={slotId}
                  slotId={slotId}
                  sticker_id={sticker_id}
                  points={playerEntry.points}
                  has_data={playerEntry.has_data}
                  catalogMap={catalogMap}
                />
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            background: "#111318",
            border: `1.5px solid ${locked ? GOLD + "44" : GREEN + "88"}`,
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20 }}>
            {locked ? "🔒" : lockPhase === "tournament_over" ? "🏆" : "✏️"}
          </span>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: locked ? GOLD : "#f3f4f6",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {locked
                ? (lockPhase === "md1_to_md2_lock"
                  ? "Tu 11 está bloqueado — ventana de cambios al cerrar MD2"
                  : lockPhase === "md3_to_final_lock"
                  ? "Tu 11 está bloqueado hasta el final del torneo"
                  : "Torneo terminado")
                : (lockPhase === "md2_unlock_window"
                ? "Ventana de cambios abierta — modificá tu 11"
                : "Modificá tu 11 antes del primer pitazo")}
            </div>
            {!locked && (
              <Link
                href="/once"
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: GREEN,
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                Ir a Mi 11 →
              </Link>
            )}
          </div>
        </div>

        {/* Matchday data note */}
        {matchdaysLoaded === 0 && (
          <div
            style={{
              fontSize: 11,
              color: "#4b5563",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
              padding: "0 8px",
              lineHeight: 1.5,
            }}
          >
            Puntajes del Jornada 1 se cargarán después del primer pitazo (11 jun).
          </div>
        )}
      </div>

      <BottomNav active="scoreboard" />
    </div>
  );
}

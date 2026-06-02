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
 * Design: dark/gold system — bg --bg-1, surfaces --bg-2/--bg-3,
 * LIME (#c2ef4e) kept as scoring accent (distinct from --green brand),
 * GOLD = --gold token.
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
// Constants — only LIME stays hardcoded (scoring accent, not in design system)
// ---------------------------------------------------------------------------

const LIME = "#c2ef4e";

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  common:    { bg: "var(--bg-2)",  border: "var(--line-strong)", text: "var(--fg-2)" },
  rare:      { bg: "#0f2033",      border: "#2563eb",             text: "#60a5fa" },
  epic:      { bg: "#241433",      border: "#9333ea",             text: "#c084fc" },
  legendary: { bg: "var(--bg-3)",  border: "var(--gold)",         text: "var(--gold)" },
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
  const textColor = accent ?? (big ? "var(--gold)" : "var(--fg-1)");

  return (
    <div
      style={{
        flex: 1,
        background: "var(--bg-2)",
        border: `1px solid ${big ? "var(--line-gold)" : "var(--line)"}`,
        borderRadius: 14,
        padding: "11px 12px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-stat)",
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
      <div className="t-label" style={{ marginTop: 3 }}>
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
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 14,
      }}
    >
      <div className="t-label" style={{ marginBottom: 12 }}>
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
                      ? `linear-gradient(to top, var(--green-deep), ${LIME})`
                      : "var(--bg-3)"
                    : "var(--bg-3)",
                  border: hasData ? "none" : "1px dashed var(--line-strong)",
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
                      fontFamily: "var(--font-stat)",
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
                  color: hasData ? "var(--fg-3)" : "var(--line-strong)",
                  fontFamily: "var(--font-ui)",
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
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          opacity: 0.5,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: "var(--fg-3)",
            background: "var(--bg-3)",
            borderRadius: 6,
            padding: "3px 6px",
            fontFamily: "var(--font-ui)",
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
            color: "var(--fg-3)",
            fontFamily: "var(--font-ui)",
          }}
        >
          Vacío
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "var(--fg-3)",
            fontFamily: "var(--font-ui)",
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
          color: "var(--fg-3)",
          background: "var(--bg-1)",
          borderRadius: 6,
          padding: "3px 6px",
          fontFamily: "var(--font-ui)",
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
            color: "var(--fg-3)",
            fontWeight: 700,
            fontFamily: "var(--font-ui)",
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
            fontFamily: "var(--font-ui)",
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
              color: points > 0 ? LIME : "var(--fg-3)",
              fontFamily: "var(--font-stat)",
            }}
          >
            {points}
          </span>
        ) : (
          <span
            style={{
              fontSize: 13,
              color: "var(--fg-3)",
              fontFamily: "var(--font-ui)",
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
          background: "var(--bg-1)",
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
            border: "3px solid var(--gold)",
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
          background: "var(--bg-1)",
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
          {/* Trophy icon in gold */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "var(--r-pill)",
              background: "rgba(244,200,74,0.12)",
              border: "1px solid rgba(244,200,74,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-hidden="true"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8 21 12 17 16 21" />
              <rect x="2" y="3" width="20" height="11" rx="2" />
              <path d="M2 6h20M12 14v3" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "var(--font-wide)",
              fontWeight: 900,
              fontSize: 22,
              color: "var(--fg-1)",
              textAlign: "center",
              lineHeight: 1.25,
            }}
          >
            Confirmá tu 11 primero
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--fg-3)",
              textAlign: "center",
              fontFamily: "var(--font-ui)",
              lineHeight: 1.5,
            }}
          >
            Tu puntaje aparecerá aquí una vez que hayas armado y confirmado tu 11 en Mi Once.
          </div>
          <Link
            href="/squad"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: "var(--foil-gold-soft)",
              color: "var(--fg-onlight)",
              fontFamily: "var(--font-ui)",
              fontWeight: 800,
              fontSize: 14,
              borderRadius: "var(--r-md)",
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
        background: "var(--bg-1)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* ---- Sticky header ---- */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--bg-1)",
          borderBottom: "1px solid var(--line)",
          padding: "14px 18px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 2 }}>
            Tu puntaje
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "var(--fg-1)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              textTransform: "uppercase",
              fontFamily: "var(--font-wide)",
            }}
          >
            Scoreboard
          </div>
        </div>

        {/* Total points pod */}
        <div
          style={{
            background: "var(--bg-2)",
            border: "1.5px solid var(--line-gold)",
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
              color: "var(--gold)",
              lineHeight: 1,
              fontFamily: "var(--font-stat)",
            }}
          >
            {result.total}
          </div>
          <div className="t-label" style={{ marginTop: 2 }}>
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
            accent="var(--fg-1)"
          />
        </div>

        {/* Matchday timeline */}
        <MatchdayTimeline
          perMatchday={result.perMatchday}
          maxPoints={maxMdPoints}
        />

        {/* Per-player breakdown */}
        <div>
          <div className="t-label" style={{ marginBottom: 10 }}>
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
            background: "var(--bg-2)",
            border: `1.5px solid ${locked ? "var(--line-gold)" : "var(--line-strong)"}`,
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
                color: locked ? "var(--gold)" : "var(--fg-1)",
                fontFamily: "var(--font-ui)",
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
                href="/squad"
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--gold)",
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
              color: "var(--fg-3)",
              textAlign: "center",
              fontFamily: "var(--font-ui)",
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

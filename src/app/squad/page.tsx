"use client";

/**
 * /squad — Mi Once: Squad Builder
 *
 * Phase 4.2 (Stream B) + Phase 5 Firebase persistence.
 * Real catalog data from src/lib/squad/data.ts.
 *
 * Design source: squad.jsx from Albumix design pack (497 lines).
 * Formations, geometry, and chemistry formula ported verbatim.
 *
 * Features:
 *   - 3 formations: 4-3-3 / 4-4-2 / 3-5-2
 *   - Pitch view with SVG pitch lines
 *   - Position color borders: POR=rarity-icon, DEF=red, MED=gold-bright, DEL=green
 *   - SquadToken mini card + EmptySlot dashed placeholder
 *   - Drag-to-swap via pointer events (native, no dnd-kit)
 *   - Tap empty/filled slot opens PickerSheet bottom sheet
 *   - Live OVR, Chemistry, Points stats
 *   - Auto-fill best XI
 *   - Dual-mode persistence:
 *     - Authenticated: Firestore users/{uid}/squad/current (cross-device sync)
 *     - Anonymous: localStorage under albumix.miOnce (no regression)
 *     - localStorage migrated to Firestore on first authenticated session
 *   - Segmented tabs: Equipo / Puntos / Resultados
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import {
  RESULTS,
  byId,
  loadSavedSquad,
  ownedByPos,
  persistSquad,
  pointsLeaderboard,
} from "@/lib/squad/data";
import type { Player, Position, SavedSquad } from "@/lib/squad/data";
import { useAuth } from "@/components/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

// ---------------------------------------------------------------------------
// Formation geometry (verbatim from squad.jsx lines 8-27)
// ---------------------------------------------------------------------------

type FormationKey = "4-3-3" | "4-4-2" | "3-5-2";

interface Slot {
  id: string;
  pos: Position;
  x: number;
  y: number;
}

const FORMATIONS: Record<FormationKey, Slot[]> = {
  "4-3-3": [
    { id: "POR0", pos: "POR", x: 50, y: 85 },
    { id: "DEF0", pos: "DEF", x: 15, y: 70 },
    { id: "DEF1", pos: "DEF", x: 38, y: 73 },
    { id: "DEF2", pos: "DEF", x: 62, y: 73 },
    { id: "DEF3", pos: "DEF", x: 85, y: 70 },
    { id: "MED0", pos: "MED", x: 27, y: 52 },
    { id: "MED1", pos: "MED", x: 50, y: 48 },
    { id: "MED2", pos: "MED", x: 73, y: 52 },
    { id: "DEL0", pos: "DEL", x: 22, y: 27 },
    { id: "DEL1", pos: "DEL", x: 50, y: 22 },
    { id: "DEL2", pos: "DEL", x: 78, y: 27 },
  ],
  "4-4-2": [
    { id: "POR0", pos: "POR", x: 50, y: 85 },
    { id: "DEF0", pos: "DEF", x: 15, y: 70 },
    { id: "DEF1", pos: "DEF", x: 38, y: 73 },
    { id: "DEF2", pos: "DEF", x: 62, y: 73 },
    { id: "DEF3", pos: "DEF", x: 85, y: 70 },
    { id: "MED0", pos: "MED", x: 15, y: 52 },
    { id: "MED1", pos: "MED", x: 38, y: 50 },
    { id: "MED2", pos: "MED", x: 62, y: 50 },
    { id: "MED3", pos: "MED", x: 85, y: 52 },
    { id: "DEL0", pos: "DEL", x: 34, y: 25 },
    { id: "DEL1", pos: "DEL", x: 66, y: 25 },
  ],
  "3-5-2": [
    { id: "POR0", pos: "POR", x: 50, y: 85 },
    { id: "DEF0", pos: "DEF", x: 26, y: 72 },
    { id: "DEF1", pos: "DEF", x: 50, y: 74 },
    { id: "DEF2", pos: "DEF", x: 74, y: 72 },
    { id: "MED0", pos: "MED", x: 12, y: 54 },
    { id: "MED1", pos: "MED", x: 33, y: 50 },
    { id: "MED2", pos: "MED", x: 50, y: 46 },
    { id: "MED3", pos: "MED", x: 67, y: 50 },
    { id: "MED4", pos: "MED", x: 88, y: 54 },
    { id: "DEL0", pos: "DEL", x: 34, y: 25 },
    { id: "DEL1", pos: "DEL", x: 66, y: 25 },
  ],
};

const FORMATION_KEYS: FormationKey[] = ["4-3-3", "4-4-2", "3-5-2"];

const LINE_LABEL: Record<Position, string> = {
  POR: "Arco",
  DEF: "Defensa",
  MED: "Mediocampo",
  DEL: "Ataque",
};

// ---------------------------------------------------------------------------
// Position color map (from squad.jsx POS_COLOR; tokens from globals.css)
// POR: --rarity-icon (#FF3B5C), DEF: --red (#E4002B),
// MED: --gold-bright (#FFE17A), DEL: --green (#00A24B)
// ---------------------------------------------------------------------------

const POS_COLOR: Record<Position, string> = {
  POR: "var(--rarity-icon)",
  DEF: "var(--red)",
  MED: "var(--gold-bright)",
  DEL: "var(--green)",
};

// ---------------------------------------------------------------------------
// Rarity gradient table
// ---------------------------------------------------------------------------

interface RarityStyle {
  grad: string;
  border: string;
  glow: string;
  foil: boolean;
}

const RARITY: Record<string, RarityStyle> = {
  common: {
    grad: "linear-gradient(180deg,#1b1f27,#12151c)",
    border: "#3a3f4c",
    glow: "",
    foil: false,
  },
  rare: {
    grad: "linear-gradient(180deg,#0f2033,#08141f)",
    border: "#2563eb",
    glow: "0 0 0 1px rgba(37,99,235,.4), 0 0 16px -4px rgba(37,99,235,.4)",
    foil: false,
  },
  epic: {
    grad: "linear-gradient(180deg,#241433,#150b22)",
    border: "#9333ea",
    glow: "0 0 0 1px rgba(147,51,234,.4), 0 0 16px -4px rgba(147,51,234,.4)",
    foil: false,
  },
  legendary: {
    grad: "linear-gradient(180deg,#2b2410,#181206)",
    border: "var(--gold)",
    glow: "var(--glow-legendary)",
    foil: false,
  },
  icon: {
    grad: "linear-gradient(180deg,#2b0a14,#1a0510)",
    border: "var(--rarity-icon)",
    glow: "var(--glow-icon)",
    foil: true,
  },
};

// ---------------------------------------------------------------------------
// Live stat calculations (from squad.jsx lines 42-58)
// ---------------------------------------------------------------------------

/** Mean OVR of placed players. Returns 0 if none placed. */
function calcOVR(lineup: Record<string, string>, slots: Slot[]): number {
  const ids = slots.map((s) => lineup[s.id]).filter(Boolean);
  if (!ids.length) return 0;
  return Math.round(
    ids.reduce((sum, id) => sum + (byId(id)?.ovr ?? 75), 0) / ids.length
  );
}

/**
 * Chemistry: nation-link count weighted by fill ratio, capped at 100.
 * Formula verbatim from squad.jsx calcChem.
 */
function calcChem(lineup: Record<string, string>, slots: Slot[]): number {
  const ids = slots.map((s) => lineup[s.id]).filter(Boolean);
  if (!ids.length) return 0;
  const byNation: Record<string, number> = {};
  ids.forEach((id) => {
    const t = byId(id)?.team ?? "";
    byNation[t] = (byNation[t] ?? 0) + 1;
  });
  let links = 0;
  Object.values(byNation).forEach((k) => {
    links += (k * (k - 1)) / 2;
  });
  const fillRatio = ids.length / slots.length;
  return Math.min(100, Math.round((28 + links * 8) * fillRatio));
}

/** Sum of pts for placed players. */
function calcPoints(lineup: Record<string, string>, slots: Slot[]): number {
  return slots
    .map((s) => lineup[s.id])
    .filter(Boolean)
    .reduce((sum, id) => sum + (byId(id)?.pts ?? 0), 0);
}

/** Auto-fill: picks best OVR player per slot, no repeats. */
function doAutoFill(slots: Slot[]): Record<string, string> {
  const used = new Set<string>();
  const map: Record<string, string> = {};
  slots.forEach((s) => {
    const pick = ownedByPos(s.pos).filter((p) => !used.has(p.id))[0];
    if (pick) {
      map[s.id] = pick.id;
      used.add(pick.id);
    }
  });
  return map;
}

// ---------------------------------------------------------------------------
// SquadToken — mini player card (from squad.jsx lines 62-85)
// ---------------------------------------------------------------------------

interface SquadTokenProps {
  player: Player;
  size?: number;
  dragging?: boolean;
  posColor?: string;
}

function SquadToken({ player, size = 78, dragging = false, posColor }: SquadTokenProps) {
  const c = RARITY[player.rarity] ?? RARITY.common;
  const border = posColor ?? c.border;
  const shadow = posColor
    ? `0 0 0 1px ${border}, 0 0 16px -4px ${border}${dragging ? ", 0 14px 26px -8px rgba(0,0,0,.7)" : ""}`
    : dragging && c.glow
    ? `${c.glow}, 0 14px 26px -8px rgba(0,0,0,.7)`
    : c.glow;
  const height = Math.round(size * 1.18);

  return (
    <div
      style={{
        width: size,
        height,
        borderRadius: 11,
        padding: "5px 4px 6px",
        position: "relative",
        overflow: "hidden",
        background: c.grad,
        boxShadow: shadow || undefined,
        border: `2px solid ${border}`,
        transition: "transform .12s var(--ease-pop)",
        transform: dragging ? "scale(1.08)" : "none",
        flexShrink: 0,
      }}
    >
      {/* Foil ring for icon rarity */}
      {c.foil && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 11,
            padding: 1.5,
            background: "var(--foil-gold)",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
          }}
        />
      )}

      {/* OVR + Flag row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 19,
            lineHeight: 0.8,
            color: "var(--fg-1)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {player.ovr}
        </span>
        <span style={{ fontSize: 13 }}>{player.flag}</span>
      </div>

      {/* Photo strip — real photo when available, stripe pattern fallback */}
      <div
        style={{
          height: 22,
          margin: "4px 0 3px",
          borderRadius: 5,
          position: "relative",
          zIndex: 2,
          overflow: "hidden",
          background:
            "repeating-linear-gradient(45deg,#0d0f13,#0d0f13 5px,#12151c 5px,#12151c 10px)",
        }}
      >
        {player.photo && !player.photo.endsWith("placeholder.svg") && (
          <img
            src={player.photo}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
            }}
          />
        )}
      </div>

      {/* Name */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 10.5,
          lineHeight: 0.95,
          letterSpacing: ".02em",
          color: "var(--fg-1)",
          position: "relative",
          zIndex: 2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {player.name}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptySlot (from squad.jsx lines 87-100)
// ---------------------------------------------------------------------------

interface EmptySlotProps {
  pos: Position;
  size?: number;
  onClick: () => void;
}

function EmptySlot({ pos, size = 78, onClick }: EmptySlotProps) {
  const col = POS_COLOR[pos];
  const height = Math.round(size * 1.18);
  return (
    <button
      onClick={onClick}
      aria-label={`Agregar ${LINE_LABEL[pos]}`}
      style={{
        width: size,
        height,
        borderRadius: 11,
        cursor: "pointer",
        background: "rgba(13,15,19,.5)",
        border: `1.5px dashed ${col}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        color: col,
        backdropFilter: "blur(2px)",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1, color: col }}>+</span>
      <span
        style={{
          fontSize: 8.5,
          fontWeight: 800,
          letterSpacing: ".08em",
          color: col,
          fontFamily: "var(--font-ui)",
        }}
      >
        {pos}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// PitchLines SVG (from squad.jsx lines 428-443)
// ---------------------------------------------------------------------------

function PitchLines() {
  return (
    <svg
      viewBox="0 0 100 135"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <g fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="0.5">
        <rect x="3" y="3" width="94" height="129" rx="2" />
        <line x1="3" y1="67.5" x2="97" y2="67.5" />
        <circle cx="50" cy="67.5" r="13" />
        <rect x="28" y="3" width="44" height="20" />
        <rect x="28" y="112" width="44" height="20" />
        <rect x="40" y="3" width="20" height="8" />
        <rect x="40" y="124" width="20" height="8" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PitchView (from squad.jsx lines 407-427)
// ---------------------------------------------------------------------------

interface PitchViewProps {
  slots: Slot[];
  renderSlot: (slot: Slot, size: number) => React.ReactNode;
}

function PitchView({ slots, renderSlot }: PitchViewProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "0.60",
        borderRadius: 20,
        overflow: "hidden",
        background: "linear-gradient(180deg,#0f3d24,#0a2d1a 55%,#082616)",
        border: "1px solid rgba(255,255,255,.1)",
        boxShadow: "var(--sh-3)",
      }}
    >
      <PitchLines />
      {slots.map((s) => (
        <div
          key={s.id}
          data-slot={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            transform: "translate(-50%,-50%)",
            zIndex: 3,
          }}
        >
          {renderSlot(s, 78)}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatPod (from squad.jsx lines 396-404)
// ---------------------------------------------------------------------------

interface StatPodProps {
  label: string;
  value: number | string;
  suffix?: string;
  big?: boolean;
  chemValue?: number;
}

function StatPod({ label, value, suffix = "", big = false, chemValue }: StatPodProps) {
  const col =
    chemValue != null
      ? chemValue >= 70
        ? "var(--green-bright)"
        : chemValue >= 45
        ? "var(--gold)"
        : "var(--fg-1)"
      : big
      ? "var(--gold)"
      : "var(--fg-1)";

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
          fontWeight: 800,
          fontSize: big ? 30 : 24,
          color: col,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
        {suffix && <span style={{ fontSize: 14 }}>{suffix}</span>}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-3)",
          fontWeight: 700,
          marginTop: 3,
          letterSpacing: ".04em",
          textTransform: "uppercase",
          fontFamily: "var(--font-ui)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PickerSheet — bottom sheet (from squad.jsx lines 468-495)
// ---------------------------------------------------------------------------

interface PickerSheetProps {
  slotId: string;
  pos: Position;
  lineup: Record<string, string>;
  onAssign: (pid: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

function PickerSheet({ slotId, pos, lineup, onAssign, onRemove, onClose }: PickerSheetProps) {
  const usedElsewhere = new Set(
    Object.entries(lineup)
      .filter(([k]) => k !== slotId)
      .map(([, v]) => v)
  );
  const current = lineup[slotId];
  const options = ownedByPos(pos);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(7,8,10,.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "72%",
          background: "var(--bg-1)",
          borderRadius: "22px 22px 0 0",
          border: "1px solid var(--line-gold)",
          borderBottom: "none",
          padding: "14px 18px 32px",
          display: "flex",
          flexDirection: "column",
          animation: "sheetup .3s var(--ease-out)",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 99,
            background: "var(--line-strong)",
            margin: "0 auto 14px",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                color: "var(--fg-1)",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              Elige {LINE_LABEL[pos]}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>
              {options.length} cartas disponibles
            </div>
          </div>
          {current && (
            <button
              onClick={onRemove}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "1px solid var(--line-strong)",
                borderRadius: 99,
                padding: "7px 12px",
                color: "var(--fg-2)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
              }}
            >
              ✕ Quitar
            </button>
          )}
        </div>

        {/* Player grid */}
        <div
          style={{
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
            justifyItems: "center",
          }}
        >
          {options.map((p) => {
            const inUse = usedElsewhere.has(p.id);
            const selected = p.id === current;
            return (
              <div
                key={p.id}
                onClick={() => onAssign(p.id)}
                style={{
                  cursor: "pointer",
                  position: "relative",
                  opacity: inUse ? 0.5 : 1,
                }}
              >
                <SquadToken player={p} size={68} posColor={POS_COLOR[pos]} />
                {selected && (
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      background: "var(--gold)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      boxShadow: "var(--sh-2)",
                    }}
                  >
                    ✓
                  </div>
                )}
                {inUse && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 18,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: 8,
                      fontWeight: 800,
                      color: "var(--fg-3)",
                      background: "var(--bg-0)",
                      padding: "1px 5px",
                      borderRadius: 99,
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    EN USO
                  </div>
                )}
              </div>
            );
          })}
          {options.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "30px 0",
                textAlign: "center",
                color: "var(--fg-3)",
                fontSize: 13,
                fontFamily: "var(--font-ui)",
              }}
            >
              No tenés cartas de {LINE_LABEL[pos]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PointsView (from squad.jsx lines 305-352)
// ---------------------------------------------------------------------------

interface PointsViewProps {
  lineup: Record<string, string>;
  slots: Slot[];
  teamPts: number;
}

function PointsView({ lineup, slots, teamPts }: PointsViewProps) {
  const players = slots
    .map((s) => ({ s, p: byId(lineup[s.id] ?? "") }))
    .filter((x): x is { s: Slot; p: Player } => x.p != null)
    .sort((a, b) => (b.p.pts ?? 0) - (a.p.pts ?? 0));

  const board = pointsLeaderboard();
  const medalColors = ["var(--gold)", "#C0C7D1", "#CD7F4B"];

  return (
    <div style={{ padding: "14px 0 0" }}>
      {/* Total points card */}
      <div
        style={{
          background: "linear-gradient(135deg,#1b1606,#0d0f13)",
          border: "1px solid var(--line-gold)",
          borderRadius: 16,
          padding: 16,
          boxShadow: "var(--glow-gold)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".1em",
              color: "var(--gold)",
              textTransform: "uppercase",
              fontFamily: "var(--font-ui)",
            }}
          >
            Puntos de tu 11
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              color: "var(--fg-1)",
              lineHeight: 1,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {teamPts}
          </div>
        </div>
        <span style={{ fontSize: 32 }} aria-hidden="true">⚡</span>
      </div>

      {/* Per-player breakdown */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: ".08em",
          color: "var(--fg-3)",
          textTransform: "uppercase",
          fontFamily: "var(--font-ui)",
          margin: "0 2px 10px",
        }}
      >
        Por jugador
      </div>
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 22,
        }}
      >
        {players.map(({ s, p }, i) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 14px",
              borderTop: i ? "1px solid var(--line)" : "none",
            }}
          >
            <span
              style={{
                width: 30,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: ".06em",
                color: POS_COLOR[s.pos],
                fontFamily: "var(--font-ui)",
              }}
            >
              {s.pos}
            </span>
            <span style={{ fontSize: 17 }}>{p.flag}</span>
            <span
              style={{
                flex: 1,
                fontWeight: 700,
                fontSize: 14,
                color: "var(--fg-1)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: "var(--font-ui)",
              }}
            >
              {p.name}
            </span>
            <span
              style={{
                fontFamily: "var(--font-stat)",
                fontWeight: 800,
                fontSize: 15,
                color: "var(--gold)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p.pts}
            </span>
          </div>
        ))}
        {players.length === 0 && (
          <div
            style={{
              padding: "24px 14px",
              textAlign: "center",
              color: "var(--fg-3)",
              fontSize: 13,
              fontFamily: "var(--font-ui)",
            }}
          >
            Armá tu 11 para ver los puntos
          </div>
        )}
      </div>

      {/* Friends leaderboard */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 15 }} aria-hidden="true">🏆</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "var(--fg-3)",
            textTransform: "uppercase",
            fontFamily: "var(--font-ui)",
          }}
        >
          Tabla de amigos · por puntos
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {board.map((row, i) => {
          const medalColor = medalColors[i] ?? "var(--fg-3)";
          return (
            <div
              key={row.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: 14,
                background: row.you ? "rgba(244,200,74,.1)" : "var(--bg-2)",
                border: `1px solid ${row.you ? "var(--line-gold)" : "var(--line)"}`,
              }}
            >
              <span
                style={{
                  width: 22,
                  textAlign: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  color: i < 3 ? medalColor : "var(--fg-3)",
                }}
              >
                {i + 1}
              </span>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 99,
                  background: "var(--bg-4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--fg-1)",
                  fontFamily: "var(--font-ui)",
                }}
                aria-hidden="true"
              >
                {row.name[0]}
              </div>
              <span
                style={{
                  flex: 1,
                  fontWeight: 700,
                  fontSize: 14,
                  color: row.you ? "var(--gold)" : "var(--fg-1)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {row.name}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-stat)",
                  fontWeight: 800,
                  fontSize: 15,
                  color: "var(--fg-2)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.pts.toLocaleString("es-CL")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultsView (from squad.jsx lines 354-393)
// ---------------------------------------------------------------------------

function ResultsView() {
  return (
    <div style={{ padding: "14px 0 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "10px 14px",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 15 }} aria-hidden="true">⚽</span>
        <span
          style={{
            fontSize: 12.5,
            color: "var(--fg-2)",
            fontWeight: 600,
            fontFamily: "var(--font-ui)",
          }}
        >
          Resultados oficiales · se sincronizan al terminar cada partido
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {RESULTS.map((r) => (
          <div
            key={r.id}
            style={{
              background: r.fav
                ? "linear-gradient(135deg,#1b1606,#0d0f13)"
                : "var(--bg-2)",
              border: `1px solid ${r.fav ? "var(--line-gold)" : "var(--line)"}`,
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: ".06em",
                  color: "var(--fg-3)",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {r.stage}
              </span>
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>
                {r.when}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{r.home.f}</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--fg-1)",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  {r.home.n}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  color: "var(--fg-1)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span>{r.home.s}</span>
                <span style={{ color: "var(--fg-3)", fontSize: 16 }}>:</span>
                <span>{r.away.s}</span>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "flex-end",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--fg-1)",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  {r.away.n}
                </span>
                <span style={{ fontSize: 22 }}>{r.away.f}</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid var(--line)",
              }}
            >
              <span style={{ fontSize: 13 }} aria-hidden="true">⚡</span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--fg-2)",
                  fontWeight: 600,
                  fontFamily: "var(--font-ui)",
                }}
              >
                Tu 11 sumó
              </span>
              <span
                style={{
                  fontFamily: "var(--font-stat)",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "var(--gold)",
                }}
              >
                +{r.myPts} pts
              </span>
              {r.fav && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 9,
                    fontWeight: 800,
                    color: "var(--gold)",
                    background: "rgba(244,200,74,.14)",
                    border: "1px solid var(--line-gold)",
                    borderRadius: 99,
                    padding: "2px 7px",
                    letterSpacing: ".04em",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  TU SELECCIÓN 🇨🇱
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Firestore persistence helpers
// ---------------------------------------------------------------------------

/**
 * Loads squad from Firestore for the given uid.
 * Returns null if the document does not exist or Firebase is unavailable.
 */
async function loadSquadFromFirestore(uid: string): Promise<SavedSquad | null> {
  const fb = getFirebase();
  if (!fb) return null;
  try {
    const ref = doc(fb.db, "users", uid, "squad", "current");
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as SavedSquad;
  } catch {
    return null;
  }
}

/**
 * Writes squad to Firestore. Adds migrated_at timestamp when migrating from
 * localStorage (migration = true).
 */
async function saveSquadToFirestore(
  uid: string,
  data: SavedSquad,
  migration = false,
): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  const payload: Record<string, unknown> = {
    formation: data.formation,
    lineup: data.lineup,
    updated_at: new Date().toISOString(),
  };
  if (migration) payload.migrated_at = new Date().toISOString();
  await setDoc(doc(fb.db, "users", uid, "squad", "current"), payload, { merge: true });
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type TabKey = "equipo" | "puntos" | "resultados";

export default function SquadPage() {
  const { user } = useAuth();

  const [formation, setFormation] = useState<FormationKey>("4-3-3");
  const [lineup, setLineup] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<{ slotId: string; pos: Position } | null>(null);
  const [drag, setDrag] = useState<{ slotId: string; x: number; y: number } | null>(null);
  const [tab, setTab] = useState<TabKey>("equipo");
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const dragRef = useRef<{ slotId: string; moved: boolean } | null>(null);
  const slots = FORMATIONS[formation];

  // ---- Load on mount / auth change: Firestore (authed) or localStorage (anon) ----
  useEffect(() => {
    let unsubFirestore: Unsubscribe | null = null;
    let cancelled = false;

    (async () => {
      if (user) {
        // --- Authenticated path ---
        const remote = await loadSquadFromFirestore(user.uid);

        if (cancelled) return;

        if (remote) {
          // Firestore has data — use it as source of truth
          setFormation(remote.formation as FormationKey);
          setLineup(remote.lineup);
        } else {
          // No Firestore doc yet — check for localStorage to migrate
          const local = loadSavedSquad();
          if (local) {
            // Migrate localStorage → Firestore (one-shot)
            setFormation(local.formation as FormationKey);
            setLineup(local.lineup);
            await saveSquadToFirestore(user.uid, local, true);
            // Clear localStorage after successful migration
            try { localStorage.removeItem("albumix.miOnce"); } catch { /* noop */ }
          } else {
            // Fresh authenticated user — auto-fill
            const filled = doAutoFill(FORMATIONS["4-3-3"]);
            setLineup(filled);
          }
        }

        // Set up real-time listener for cross-device sync
        const fb = getFirebase();
        if (fb && !cancelled) {
          const ref = doc(fb.db, "users", user.uid, "squad", "current");
          unsubFirestore = onSnapshot(ref, (snap) => {
            if (!snap.exists() || cancelled) return;
            const data = snap.data() as SavedSquad;
            setFormation(data.formation as FormationKey);
            setLineup(data.lineup);
          });
        }
      } else {
        // --- Anonymous path (localStorage) ---
        const saved = loadSavedSquad();
        if (saved) {
          setFormation(saved.formation as FormationKey);
          setLineup(saved.lineup);
        } else {
          setLineup(doAutoFill(FORMATIONS["4-3-3"]));
        }
      }

      if (!cancelled) setHydrated(true);
    })();

    return () => {
      cancelled = true;
      if (unsubFirestore) unsubFirestore();
    };
    // Re-run when auth state changes (user signs in / out)
  }, [user?.uid]);

  // ---- Toast helper ----
  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  // ---- Formation change: remap lineup by line pool (squad.jsx lines 113-136) ----
  const handleFormationChange = useCallback(
    (newFk: FormationKey) => {
      setFormation(newFk);
      setLineup((prev) => {
        const newSlots = FORMATIONS[newFk];
        const pool: Record<string, string[]> = {};
        Object.entries(prev).forEach(([sid, pid]) => {
          const line = sid.replace(/\d/g, "");
          (pool[line] = pool[line] ?? []).push(pid);
        });
        const next: Record<string, string> = {};
        newSlots.forEach((s) => {
          const arr = pool[s.pos];
          if (arr?.length) next[s.id] = arr.shift()!;
        });
        // Top up empties
        const used = new Set(Object.values(next));
        newSlots.forEach((s) => {
          if (!next[s.id]) {
            const pick = ownedByPos(s.pos).filter((p) => !used.has(p.id))[0];
            if (pick) {
              next[s.id] = pick.id;
              used.add(pick.id);
            }
          }
        });
        return next;
      });
    },
    []
  );

  // ---- Assign player to slot ----
  const assign = useCallback((slotId: string, pid: string) => {
    setLineup((prev) => {
      const next = { ...prev };
      // If already placed elsewhere, swap
      const otherSlot = Object.keys(next).find((k) => next[k] === pid && k !== slotId);
      if (otherSlot !== undefined) {
        const swapVal = prev[slotId];
        if (swapVal) next[otherSlot] = swapVal;
        else delete next[otherSlot];
      }
      next[slotId] = pid;
      Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
      return next;
    });
    setPicker(null);
  }, []);

  const removeSlot = useCallback((slotId: string) => {
    setLineup((prev) => {
      const n = { ...prev };
      delete n[slotId];
      return n;
    });
    setPicker(null);
  }, []);

  // ---- Auto-fill ----
  const autoFill = useCallback(() => {
    setLineup(doAutoFill(slots));
    flash("11 ideal armado ⚡");
  }, [slots, flash]);

  // ---- Save squad — Firestore for authed users, localStorage for anonymous ----
  const saveSquad = useCallback(async () => {
    const data: SavedSquad = { formation, lineup };
    if (user) {
      await saveSquadToFirestore(user.uid, data);
    } else {
      persistSquad(data);
    }
    flash("11 guardado 🔥");
  }, [formation, lineup, user, flash]);

  // ---- Drag-to-swap (pointer events — ANDY's Rule) ----
  const onPointerDown = useCallback(
    (e: React.PointerEvent, slotId: string) => {
      if (!lineup[slotId]) return;
      e.preventDefault();
      dragRef.current = { slotId, moved: false };
      setDrag({ slotId, x: e.clientX, y: e.clientY });

      const onMove = (ev: PointerEvent) => {
        if (dragRef.current) dragRef.current.moved = true;
        setDrag((d) => d && { ...d, x: ev.clientX, y: ev.clientY });
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const cur = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (!cur) return;
        if (!cur.moved) {
          // tap: open picker
          const s = slots.find((x) => x.id === cur.slotId);
          if (s) setPicker({ slotId: cur.slotId, pos: s.pos });
          return;
        }
        // drop: find target slot
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const target = el?.closest("[data-slot]");
        if (target) {
          const destId = target.getAttribute("data-slot");
          if (destId && destId !== cur.slotId) {
            setLineup((prev) => {
              const n = { ...prev };
              const a = n[cur.slotId];
              const b = n[destId];
              if (b) n[cur.slotId] = b;
              else delete n[cur.slotId];
              if (a) n[destId] = a;
              return n;
            });
          }
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [lineup, slots]
  );

  // ---- Slot renderer ----
  const renderSlot = useCallback(
    (s: Slot, size: number) => {
      const pid = lineup[s.id];
      const isDragging = drag?.slotId === s.id;
      if (!pid) {
        return (
          <EmptySlot
            pos={s.pos}
            size={size}
            onClick={() => setPicker({ slotId: s.id, pos: s.pos })}
          />
        );
      }
      const player = byId(pid);
      if (!player) return null;
      return (
        <div
          data-slot={s.id}
          onPointerDown={(e) => onPointerDown(e, s.id)}
          style={{
            touchAction: "none",
            cursor: "grab",
            opacity: isDragging ? 0.25 : 1,
          }}
        >
          <SquadToken player={player} size={size} posColor={POS_COLOR[s.pos]} dragging={isDragging} />
        </div>
      );
    },
    [lineup, drag, onPointerDown]
  );

  // ---- Derived stats ----
  const ovr = useMemo(() => calcOVR(lineup, slots), [lineup, slots]);
  const chem = useMemo(() => calcChem(lineup, slots), [lineup, slots]);
  const teamPts = useMemo(() => calcPoints(lineup, slots), [lineup, slots]);

  // ---- Drag ghost player ----
  const dragPlayer = drag ? byId(lineup[drag.slotId] ?? "") : null;
  const dragSlot = drag ? slots.find((s) => s.id === drag.slotId) : null;

  if (!hydrated) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-1)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "4px solid var(--green)",
            borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 w-full max-w-lg mx-auto"
      style={{ backgroundColor: "var(--bg-1)", color: "var(--fg-1)" }}
    >
      {/* ---- Header ---- */}
      <div
        className="sticky top-[54px] z-20 px-[18px] pt-4 pb-3"
        style={{
          background: "linear-gradient(180deg,var(--bg-1) 80%,rgba(13,15,19,0) 100%)",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: ".12em",
            color: "var(--gold)",
            textTransform: "uppercase",
            fontFamily: "var(--font-ui)",
          }}
        >
          Tu equipo
        </div>

        {/* Title + Auto button */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: 2,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              color: "var(--fg-1)",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            Mi 11
          </h1>
          {tab === "equipo" && (
            <button
              onClick={autoFill}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--bg-2)",
                border: "1px solid var(--line-strong)",
                borderRadius: 99,
                padding: "7px 13px",
                color: "var(--fg-1)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
              }}
            >
              ⚡ Auto
            </button>
          )}
        </div>

        {/* Tab segmented control */}
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 4,
            marginTop: 14,
          }}
        >
          {(
            [
              { k: "equipo" as TabKey, label: "Equipo" },
              { k: "puntos" as TabKey, label: "Puntos" },
              { k: "resultados" as TabKey, label: "Resultados" },
            ]
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                border: "none",
                background: tab === t.k ? "var(--bg-4)" : "transparent",
                color: tab === t.k ? "var(--fg-1)" : "var(--fg-3)",
                fontFamily: "var(--font-ui)",
                transition: "all .15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stat pods + formation chips — only in Equipo tab */}
        {tab === "equipo" && (
          <>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <StatPod label="OVR equipo" value={ovr || "—"} big />
              <StatPod
                label="Química"
                value={chem || "—"}
                suffix={chem ? "%" : ""}
                chemValue={chem}
              />
              <StatPod label="Puntos" value={teamPts} />
            </div>

            {/* Formation chips */}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {FORMATION_KEYS.map((f) => {
                const active = f === formation;
                return (
                  <button
                    key={f}
                    onClick={() => handleFormationChange(f)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      borderRadius: 10,
                      fontFamily: "var(--font-stat)",
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: "pointer",
                      border: `1px solid ${active ? "transparent" : "var(--line-strong)"}`,
                      background: active ? "var(--gold)" : "var(--bg-2)",
                      color: active ? "var(--fg-onlight)" : "var(--fg-2)",
                      transition: "all .15s",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            {/* Position color legend */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {(
                [
                  ["POR", "Arquero"] as const,
                  ["DEF", "Defensa"] as const,
                  ["MED", "Medio"] as const,
                  ["DEL", "Delantero"] as const,
                ]
              ).map(([pos, label]) => (
                <div
                  key={pos}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: POS_COLOR[pos],
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--fg-2)",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---- Main content ---- */}
      <div className="flex-1 overflow-y-auto px-[18px] pb-4" style={{ paddingTop: 4 }}>
        {tab === "equipo" && (
          <>
            <PitchView slots={slots} renderSlot={renderSlot} />

            {/* Save button */}
            <button
              onClick={saveSquad}
              style={{
                width: "100%",
                marginTop: 16,
                padding: "15px 0",
                borderRadius: 14,
                background: "var(--foil-gold)",
                color: "var(--fg-onlight)",
                fontWeight: 900,
                fontSize: 15,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                letterSpacing: ".04em",
                boxShadow: "var(--glow-gold)",
              }}
            >
              Guardar 11
            </button>
          </>
        )}

        {tab === "puntos" && (
          <PointsView lineup={lineup} slots={slots} teamPts={teamPts} />
        )}

        {tab === "resultados" && <ResultsView />}
      </div>

      {/* ---- Drag ghost ---- */}
      {drag && dragPlayer && dragSlot && (
        <div
          style={{
            position: "fixed",
            left: drag.x,
            top: drag.y,
            transform: "translate(-50%,-50%)",
            zIndex: 300,
            pointerEvents: "none",
          }}
        >
          <SquadToken
            player={dragPlayer}
            size={64}
            dragging
            posColor={POS_COLOR[dragSlot.pos]}
          />
        </div>
      )}

      {/* ---- Picker sheet ---- */}
      {picker && (
        <PickerSheet
          slotId={picker.slotId}
          pos={picker.pos}
          lineup={lineup}
          onAssign={(pid) => assign(picker.slotId, pid)}
          onRemove={() => removeSlot(picker.slotId)}
          onClose={() => setPicker(null)}
        />
      )}

      {/* ---- Toast ---- */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 400,
            background: "var(--bg-3)",
            border: "1px solid var(--line-gold)",
            borderRadius: 99,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--fg-1)",
            fontFamily: "var(--font-ui)",
            boxShadow: "var(--sh-3)",
            whiteSpace: "nowrap",
            animation: "sheetup .25s var(--ease-pop)",
          }}
        >
          {toast}
        </div>
      )}

      {/* ---- Bottom nav ---- */}
      <BottomNav active="once" />
    </div>
  );
}

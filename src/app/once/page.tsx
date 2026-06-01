"use client";

/**
 * /once — Mi Once: Squad Builder
 *
 * Features:
 *   - Formations: 4-3-3 / 4-4-2 / 3-5-2
 *   - Variants: pitch (green field) | board (chalkboard) | lines (grouped rows)
 *   - Live OVR + Chemistry calculation
 *   - Auto-fill best XI per formation
 *   - Tap slot → bottom-sheet picker filtered by position
 *   - Drag slot onto another → swap
 *   - State persisted to IndexedDB (formation + lineup + variant)
 *
 * Design source: squad.jsx from Albumix design bundle
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getNickname, getSquad, saveSquad, getAllStickers } from "@/lib/db";
import type { Formation, SquadVariant } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import {
  getPlayerMeta,
  buildCatalogMap,
  calcOVR,
  calcChem,
} from "@/lib/player-meta";
import type { Position } from "@/lib/player-meta";
import BottomNav from "@/components/BottomNav";

// ---------------------------------------------------------------------------
// Constants / colors
// ---------------------------------------------------------------------------

const GREEN = "#006847";
const LIME = "#c2ef4e";
const GOLD = "#F4C84A";

// ---------------------------------------------------------------------------
// Formation geometry (x%, y% inside pitch; attack = top)
// Verbatim from squad.jsx
// ---------------------------------------------------------------------------

interface Slot {
  id: string;
  pos: Position;
  x: number;
  y: number;
}

const FORMATIONS: Record<Formation, Slot[]> = {
  "4-3-3": [
    { id: "POR0", pos: "POR", x: 50, y: 90 },
    { id: "DEF0", pos: "DEF", x: 15, y: 71 },
    { id: "DEF1", pos: "DEF", x: 38, y: 74 },
    { id: "DEF2", pos: "DEF", x: 62, y: 74 },
    { id: "DEF3", pos: "DEF", x: 85, y: 71 },
    { id: "MED0", pos: "MED", x: 27, y: 49 },
    { id: "MED1", pos: "MED", x: 50, y: 45 },
    { id: "MED2", pos: "MED", x: 73, y: 49 },
    { id: "DEL0", pos: "DEL", x: 22, y: 21 },
    { id: "DEL1", pos: "DEL", x: 50, y: 15 },
    { id: "DEL2", pos: "DEL", x: 78, y: 21 },
  ],
  "4-4-2": [
    { id: "POR0", pos: "POR", x: 50, y: 90 },
    { id: "DEF0", pos: "DEF", x: 15, y: 71 },
    { id: "DEF1", pos: "DEF", x: 38, y: 74 },
    { id: "DEF2", pos: "DEF", x: 62, y: 74 },
    { id: "DEF3", pos: "DEF", x: 85, y: 71 },
    { id: "MED0", pos: "MED", x: 15, y: 49 },
    { id: "MED1", pos: "MED", x: 38, y: 47 },
    { id: "MED2", pos: "MED", x: 62, y: 47 },
    { id: "MED3", pos: "MED", x: 85, y: 49 },
    { id: "DEL0", pos: "DEL", x: 34, y: 19 },
    { id: "DEL1", pos: "DEL", x: 66, y: 19 },
  ],
  "3-5-2": [
    { id: "POR0", pos: "POR", x: 50, y: 90 },
    { id: "DEF0", pos: "DEF", x: 26, y: 73 },
    { id: "DEF1", pos: "DEF", x: 50, y: 75 },
    { id: "DEF2", pos: "DEF", x: 74, y: 73 },
    { id: "MED0", pos: "MED", x: 12, y: 52 },
    { id: "MED1", pos: "MED", x: 33, y: 47 },
    { id: "MED2", pos: "MED", x: 50, y: 43 },
    { id: "MED3", pos: "MED", x: 67, y: 47 },
    { id: "MED4", pos: "MED", x: 88, y: 52 },
    { id: "DEL0", pos: "DEL", x: 34, y: 19 },
    { id: "DEL1", pos: "DEL", x: 66, y: 19 },
  ],
};

const FORMATION_KEYS: Formation[] = ["4-3-3", "4-4-2", "3-5-2"];

const LINE_LABEL: Record<Position, string> = {
  POR: "Arco",
  DEF: "Defensa",
  MED: "Mediocampo",
  DEL: "Ataque",
};

// ---------------------------------------------------------------------------
// Rarity colors
// ---------------------------------------------------------------------------
const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  common:    { bg: "#1b1f27", border: "#3a3f4c", text: "#c8cdd9" },
  rare:      { bg: "#0f2033", border: "#2563eb", text: "#60a5fa" },
  epic:      { bg: "#241433", border: "#9333ea", text: "#c084fc" },
  legendary: { bg: "#2b2410", border: GOLD, text: GOLD },
};

// ---------------------------------------------------------------------------
// SquadToken — mini player card
// ---------------------------------------------------------------------------
interface SquadTokenProps {
  sticker: Sticker;
  ovr: number;
  rarity: string;
  size?: number;
  dragging?: boolean;
}

function SquadToken({ sticker, ovr, rarity, size = 60, dragging = false }: SquadTokenProps) {
  const c = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const height = Math.round(size * 1.18);

  // Derive country flag emoji from team_code (best-effort)
  const flagMap: Record<string, string> = {
    MEX: "🇲🇽", ARG: "🇦🇷", BRA: "🇧🇷", FRA: "🇫🇷", ESP: "🇪🇸",
    GER: "🇩🇪", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", ITA: "🇮🇹", POR: "🇵🇹", USA: "🇺🇸",
    CHI: "🇨🇱", COL: "🇨🇴", URU: "🇺🇾", ECU: "🇪🇨", PER: "🇵🇪",
    VEN: "🇻🇪", BOL: "🇧🇴", PAR: "🇵🇾", CAN: "🇨🇦", CRC: "🇨🇷",
    PAN: "🇵🇦", HON: "🇭🇳", JAM: "🇯🇲", CUB: "🇨🇺", TRI: "🇹🇹",
    MAR: "🇲🇦", SEN: "🇸🇳", NGA: "🇳🇬", CMR: "🇨🇲", CIV: "🇨🇮",
    GHA: "🇬🇭", TUN: "🇹🇳", DRC: "🇨🇩", ALG: "🇩🇿", EGY: "🇪🇬",
    RSA: "🇿🇦", MAD: "🇲🇬", MOR: "🇲🇦", JPN: "🇯🇵", KOR: "🇰🇷",
    AUS: "🇦🇺", NZL: "🇳🇿", IRN: "🇮🇷", SAU: "🇸🇦", QAT: "🇶🇦",
    SUI: "🇨🇭", NED: "🇳🇱", BEL: "🇧🇪", POL: "🇵🇱", CZE: "🇨🇿",
    SRB: "🇷🇸", CRO: "🇭🇷", SLO: "🇸🇮", SVK: "🇸🇰", AUT: "🇦🇹",
    SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", IRL: "🇮🇪", UKR: "🇺🇦",
  };
  const flag = flagMap[sticker.team_code] ?? "🏳️";

  return (
    <div
      style={{
        width: size,
        height,
        borderRadius: 11,
        padding: "5px 4px 6px",
        position: "relative",
        overflow: "hidden",
        backgroundColor: c.bg,
        border: `1.5px solid ${c.border}`,
        boxShadow: dragging
          ? `0 0 0 2px ${c.border}, 0 14px 26px -8px rgba(0,0,0,0.7)`
          : `0 0 0 1px ${c.border}`,
        transform: dragging ? "scale(1.08)" : "none",
        transition: "transform 0.12s",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        flexShrink: 0,
      }}
    >
      {/* OVR + flag row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 18,
            fontWeight: 900,
            lineHeight: 0.8,
            color: c.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {ovr}
        </span>
        <span style={{ fontSize: 13 }}>{flag}</span>
      </div>

      {/* Photo placeholder */}
      <div
        style={{
          flex: 1,
          borderRadius: 5,
          background:
            "repeating-linear-gradient(45deg,#0d0f13,#0d0f13 5px,#12151c 5px,#12151c 10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 18,
        }}
      />

      {/* Name */}
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 800,
          color: "#e5e7eb",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: 1,
          letterSpacing: "0.02em",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {sticker.display_name.split(" ").at(-1) ?? sticker.display_name}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptySlot
// ---------------------------------------------------------------------------
function EmptySlot({
  pos,
  size = 60,
  onClick,
}: {
  pos: Position;
  size?: number;
  onClick: () => void;
}) {
  const height = Math.round(size * 1.18);
  return (
    <button
      onClick={onClick}
      style={{
        width: size,
        height,
        borderRadius: 11,
        background: "rgba(13,15,19,0.5)",
        border: `1.5px dashed ${GREEN}66`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        cursor: "pointer",
        flexShrink: 0,
      }}
      aria-label={`Agregar ${LINE_LABEL[pos]}`}
    >
      <span style={{ fontSize: 14, color: GREEN }}>+</span>
      <span
        style={{
          fontSize: 8,
          fontWeight: 800,
          color: "#9ca3af",
          letterSpacing: "0.08em",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {pos}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// PitchLines SVG
// ---------------------------------------------------------------------------
function PitchLines({ board }: { board: boolean }) {
  const stroke = board ? "rgba(244,200,74,0.22)" : "rgba(255,255,255,0.18)";
  return (
    <svg
      viewBox="0 0 100 135"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <g fill="none" stroke={stroke} strokeWidth="0.5">
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
// PitchView
// ---------------------------------------------------------------------------
interface PitchViewProps {
  variant: SquadVariant;
  slots: Slot[];
  renderSlot: (slot: Slot, size: number) => React.ReactNode;
}

function PitchView({ variant, slots, renderSlot }: PitchViewProps) {
  const board = variant === "board";
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "0.74",
        borderRadius: 20,
        overflow: "hidden",
        background: board
          ? "radial-gradient(120% 80% at 50% 0%, #11151c, #0a0c10)"
          : "linear-gradient(180deg, #0f3d24, #0a2d1a 55%, #082616)",
        border: board
          ? "1px solid rgba(244,200,74,0.3)"
          : "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px -8px rgba(0,0,0,0.5)",
      }}
    >
      <PitchLines board={board} />
      {board && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg,transparent,transparent 26px,rgba(255,255,255,0.018) 26px,rgba(255,255,255,0.018) 27px)",
          }}
        />
      )}
      {slots.map((s) => (
        <div
          key={s.id}
          data-slot={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 3,
          }}
        >
          {renderSlot(s, 58)}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinesView
// ---------------------------------------------------------------------------
function LinesView({
  slots,
  renderSlot,
}: {
  slots: Slot[];
  renderSlot: (slot: Slot, size: number) => React.ReactNode;
}) {
  const lines: Position[] = ["DEL", "MED", "DEF", "POR"];
  const grouped = lines
    .map((ln) => ({ ln, items: slots.filter((s) => s.pos === ln) }))
    .filter((g) => g.items.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {grouped.map(({ ln, items }) => (
        <div
          key={ln}
          style={{
            background: "#1a1e29",
            border: "1px solid #2d3344",
            borderRadius: 16,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: GREEN,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#9ca3af",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {LINE_LABEL[ln as Position]}
            </span>
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>
              · {items.length}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: items.length > 3 ? "space-between" : "flex-start",
              flexWrap: "wrap",
            }}
          >
            {items.map((s) => (
              <div key={s.id}>{renderSlot(s, 62)}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PickerSheet — bottom sheet for slot assignment
// ---------------------------------------------------------------------------
interface PickerSheetProps {
  slotId: string;
  pos: Position;
  lineup: Record<string, string>;
  ownedPlayersByPos: Map<Position, Sticker[]>;
  onAssign: (stickerId: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

function PickerSheet({
  slotId,
  pos,
  lineup,
  ownedPlayersByPos,
  onAssign,
  onRemove,
  onClose,
}: PickerSheetProps) {
  const usedElsewhere = new Set(
    Object.entries(lineup)
      .filter(([k]) => k !== slotId)
      .map(([, v]) => v)
  );
  const current = lineup[slotId];
  const options = (ownedPlayersByPos.get(pos) ?? []).slice().sort((a, b) => {
    const ma = getPlayerMeta(a)?.ovr ?? 75;
    const mb = getPlayerMeta(b)?.ovr ?? 75;
    return mb - ma;
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(7,8,10,0.7)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "72%",
          background: "#0d0f13",
          borderRadius: "22px 22px 0 0",
          border: `1px solid ${GOLD}44`,
          borderBottom: "none",
          padding: "14px 18px 32px",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 99,
            background: "#3a3f4c",
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
                fontSize: 20,
                fontWeight: 900,
                color: "#f3f4f6",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Elige {LINE_LABEL[pos]}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
              {options.length} cartas disponibles
            </div>
          </div>
          {current && (
            <button
              onClick={onRemove}
              style={{
                background: "transparent",
                border: "1px solid #3a3f4c",
                borderRadius: 99,
                padding: "7px 12px",
                color: "#9ca3af",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
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
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            justifyItems: "center",
          }}
        >
          {options.map((p) => {
            const meta = getPlayerMeta(p);
            const ovr = meta?.ovr ?? 75;
            const rarity = meta?.rarity ?? "common";
            const inUse = usedElsewhere.has(p.id);
            const selected = p.id === current;
            return (
              <div
                key={p.id}
                onClick={() => !inUse && onAssign(p.id)}
                style={{
                  cursor: inUse ? "default" : "pointer",
                  position: "relative",
                  opacity: inUse ? 0.5 : 1,
                }}
              >
                <SquadToken
                  sticker={p}
                  ovr={ovr}
                  rarity={rarity}
                  size={68}
                />
                {selected && (
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: GOLD,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
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
                      fontSize: 7,
                      fontWeight: 800,
                      color: "#9ca3af",
                      background: "#0d0f13",
                      padding: "1px 5px",
                      borderRadius: 99,
                      whiteSpace: "nowrap",
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
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              No tenés cartas de {LINE_LABEL[pos]}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatPod
// ---------------------------------------------------------------------------
function StatPod({
  label,
  value,
  suffix = "",
  big = false,
  chemValue,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  big?: boolean;
  chemValue?: number;
}) {
  const textColor =
    chemValue != null
      ? chemValue >= 70
        ? "#4ade80"
        : chemValue >= 45
        ? GOLD
        : "#f3f4f6"
      : big
      ? LIME
      : "#f3f4f6";

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
          fontSize: big ? 28 : 22,
          color: textColor,
          lineHeight: 1,
        }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: 13 }}>{suffix}</span>
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
// Main page component
// ---------------------------------------------------------------------------
export default function OncePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [catalogMap, setCatalogMap] = useState<Map<string, Sticker>>(new Map());
  const [ownedPlayersByPos, setOwnedPlayersByPos] = useState<Map<Position, Sticker[]>>(new Map());
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [lineup, setLineup] = useState<Record<string, string>>({});
  const [variant, setVariant] = useState<SquadVariant>("pitch");
  const [picker, setPicker] = useState<{ slotId: string; pos: Position } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState<{
    slotId: string;
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<{
    slotId: string;
    moved: boolean;
  } | null>(null);

  // ---- Toast helper ----
  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  // ---- Load catalog + owned + saved squad on mount ----
  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) { router.replace("/"); return; }

      const [cat, allEntries, savedSquad] = await Promise.all([
        getCatalog(),
        getAllStickers(),
        getSquad(),
      ]);

      const ownedIds = new Set(allEntries.filter((e) => e.count > 0).map((e) => e.sticker_id));
      const map = buildCatalogMap(cat);
      setCatalogMap(map);

      // Build owned-players-by-position map
      const byPos = new Map<Position, Sticker[]>();
      const positions: Position[] = ["POR", "DEF", "MED", "DEL"];
      positions.forEach((p) => byPos.set(p, []));

      cat.forEach((s) => {
        if (s.type !== "player") return;
        if (!ownedIds.has(s.id)) return;
        const meta = getPlayerMeta(s);
        if (!meta) return;
        byPos.get(meta.position)?.push(s);
      });

      setOwnedPlayersByPos(byPos);

      // Restore saved squad
      setFormation(savedSquad.formation);
      setVariant(savedSquad.variant);

      // Validate saved lineup — remove stickers no longer owned
      const validLineup: Record<string, string> = {};
      Object.entries(savedSquad.lineup).forEach(([slotId, stickerId]) => {
        if (ownedIds.has(stickerId)) validLineup[slotId] = stickerId;
      });
      setLineup(validLineup);

      setLoading(false);
    })();
  }, [router]);

  const slots = FORMATIONS[formation];
  const slotIds = slots.map((s) => s.id);

  // ---- Auto-fill best XI ----
  const autoFill = useCallback(() => {
    const used = new Set<string>();
    const next: Record<string, string> = {};
    slots.forEach((s) => {
      const candidates = (ownedPlayersByPos.get(s.pos) ?? [])
        .filter((p) => !used.has(p.id))
        .sort((a, b) => (getPlayerMeta(b)?.ovr ?? 75) - (getPlayerMeta(a)?.ovr ?? 75));
      if (candidates[0]) {
        next[s.id] = candidates[0].id;
        used.add(candidates[0].id);
      }
    });
    setLineup(next);
    flash("Once ideal armado ⚡");
  }, [slots, ownedPlayersByPos, flash]);

  // ---- Formation change: remap lineup preserving positions ----
  const handleFormationChange = useCallback(
    (newFormation: Formation) => {
      setFormation(newFormation);
      setLineup((prev) => {
        const newSlots = FORMATIONS[newFormation];
        // Group current lineup by position
        const pool: Record<string, string[]> = {};
        Object.entries(prev).forEach(([sid, pid]) => {
          const line = sid.replace(/[0-9]/g, "");
          (pool[line] = pool[line] ?? []).push(pid);
        });
        const next: Record<string, string> = {};
        newSlots.forEach((s) => {
          const arr = pool[s.pos];
          if (arr?.length) next[s.id] = arr.shift()!;
        });
        // Top up empties with best available
        const used = new Set(Object.values(next));
        newSlots.forEach((s) => {
          if (!next[s.id]) {
            const pick = (ownedPlayersByPos.get(s.pos) ?? [])
              .filter((p) => !used.has(p.id))
              .sort((a, b) => (getPlayerMeta(b)?.ovr ?? 75) - (getPlayerMeta(a)?.ovr ?? 75))[0];
            if (pick) { next[s.id] = pick.id; used.add(pick.id); }
          }
        });
        return next;
      });
    },
    [ownedPlayersByPos]
  );

  // ---- Assign player to slot ----
  const assign = useCallback((slotId: string, pid: string) => {
    setLineup((prev) => {
      const next = { ...prev };
      // if pid already placed elsewhere, swap
      const otherSlot = Object.keys(next).find(
        (k) => next[k] === pid && k !== slotId
      );
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

  // ---- Drag-to-swap (pointer events) ----
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
          // treat as tap → open picker
          const s = slots.find((x) => x.id === cur.slotId);
          if (s) setPicker({ slotId: cur.slotId, pos: s.pos });
          return;
        }
        // find drop target
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

  // ---- Save squad ----
  const saveAndFlash = useCallback(async () => {
    await saveSquad({ formation, lineup, variant });
    flash("Once guardado ⚽");
  }, [formation, lineup, variant, flash]);

  // ---- Calculations ----
  const ovr = calcOVR(lineup, slotIds, catalogMap);
  const chem = calcChem(lineup, slotIds, catalogMap);
  const filled = slotIds.filter((sid) => lineup[sid]).length;

  // ---- Slot renderer (shared between pitch & lines views) ----
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

      const sticker = catalogMap.get(pid);
      if (!sticker) return null;
      const meta = getPlayerMeta(sticker);
      const ovrVal = meta?.ovr ?? 75;
      const rarityVal = meta?.rarity ?? "common";

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
          <SquadToken
            sticker={sticker}
            ovr={ovrVal}
            rarity={rarityVal}
            size={size}
          />
        </div>
      );
    },
    [lineup, catalogMap, drag, onPointerDown]
  );

  // ---- Loading state ----
  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: "#0d0f13" }}
      >
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: GREEN, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 w-full max-w-lg mx-auto"
      style={{ backgroundColor: "#0d0f13", color: "#f3f4f6" }}
    >
      {/* ---- Header ---- */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{
          background:
            "linear-gradient(180deg, #0d0f13 80%, rgba(13,15,19,0) 100%)",
        }}
      >
        {/* Kicker */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: LIME,
            textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif",
            marginBottom: 2,
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
          }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#f3f4f6",
              lineHeight: 1,
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Mi once
          </h1>
          <button
            onClick={autoFill}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#1a1e29",
              border: "1px solid #3a3f4c",
              borderRadius: 99,
              padding: "7px 13px",
              color: "#f3f4f6",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            ⚡ Auto
          </button>
        </div>

        {/* Stat pods */}
        <div
          style={{ display: "flex", gap: 10, marginTop: 12 }}
        >
          <StatPod label="OVR equipo" value={ovr || "—"} big />
          <StatPod label="Química" value={chem || "—"} suffix={chem ? "%" : ""} chemValue={chem} />
          <StatPod label="Titulares" value={`${filled}/${slots.length}`} />
        </div>

        {/* Formation chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {FORMATION_KEYS.map((f) => {
            const active = f === formation;
            return (
              <button
                key={f}
                onClick={() => handleFormationChange(f)}
                data-testid={`formation-${f}`}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  border: `1px solid ${active ? "transparent" : "#3a3f4c"}`,
                  background: active ? LIME : "#1a1e29",
                  color: active ? "#0d0f13" : "#9ca3af",
                  fontFamily: "system-ui, sans-serif",
                  transition: "all 0.15s",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Variant switcher */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 10,
            background: "#1a1e29",
            border: "1px solid #2d3344",
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(
            [
              { id: "pitch" as SquadVariant, label: "Cancha" },
              { id: "board" as SquadVariant, label: "Pizarra" },
              { id: "lines" as SquadVariant, label: "Líneas" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              onClick={() => setVariant(v.id)}
              data-testid={`variant-${v.id}`}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 7,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                border: "none",
                background: variant === v.id ? "#2d3344" : "transparent",
                color: variant === v.id ? "#f3f4f6" : "#6b7280",
                fontFamily: "system-ui, sans-serif",
                transition: "all 0.15s",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Main area: pitch / lines ---- */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-4"
        style={{ paddingTop: 4 }}
      >
        {(variant === "pitch" || variant === "board") ? (
          <PitchView variant={variant} slots={slots} renderSlot={renderSlot} />
        ) : (
          <LinesView slots={slots} renderSlot={renderSlot} />
        )}

        {/* Save button */}
        <button
          onClick={saveAndFlash}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "16px 0",
            borderRadius: 14,
            background: GREEN,
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            border: "none",
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          Guardar once
        </button>
      </div>

      {/* ---- Drag ghost ---- */}
      {drag && lineup[drag.slotId] && (() => {
        const sticker = catalogMap.get(lineup[drag.slotId]);
        const meta = sticker ? getPlayerMeta(sticker) : null;
        return sticker ? (
          <div
            style={{
              position: "fixed",
              left: drag.x,
              top: drag.y,
              transform: "translate(-50%, -50%)",
              zIndex: 300,
              pointerEvents: "none",
            }}
          >
            <SquadToken
              sticker={sticker}
              ovr={meta?.ovr ?? 75}
              rarity={meta?.rarity ?? "common"}
              size={64}
              dragging
            />
          </div>
        ) : null;
      })()}

      {/* ---- Picker sheet ---- */}
      {picker && (
        <PickerSheet
          slotId={picker.slotId}
          pos={picker.pos}
          lineup={lineup}
          ownedPlayersByPos={ownedPlayersByPos}
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
            bottom: 110,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 250,
            background: "#1a1e29",
            border: `1px solid ${GOLD}66`,
            color: "#f3f4f6",
            padding: "12px 20px",
            borderRadius: 99,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            whiteSpace: "nowrap",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {toast}
        </div>
      )}

      <BottomNav active="once" />

      {/* Limpiar button floated */}
      <button
        onClick={() => { setLineup({}); flash("Plantel limpiado"); }}
        style={{
          position: "fixed",
          bottom: 90,
          right: 16,
          zIndex: 30,
          background: "#1a1e29",
          border: "1px solid #3a3f4c",
          borderRadius: 99,
          padding: "8px 14px",
          color: "#9ca3af",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Limpiar
      </button>
    </div>
  );
}

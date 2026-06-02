"use client";

/**
 * StickerDetailModal — Full-screen sticker/player detail overlay.
 *
 * Design reference: screens2.jsx CardDetail (lines 16-52).
 * Opened when the user taps any sticker on /album.
 *
 * Features:
 *   - Card rendered in size="lg" (StickerCardPanini)
 *   - Flag + name header with Anton display font
 *   - Stats table: Selección, Posición, Nacimiento, Estatura, Peso, Club
 *     (non-player stickers show Selección + Tipo only)
 *   - Duplicate banner when count > 1
 *   - CAMBIAR gold-foil CTA → navigates to /market
 *   - Secondary ownership control: Marcar mía / +Sumar repetida / −Quitar + +Repetida
 *   - Favorite star toggle (local UI state only — no persistence)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Star,
  Sparkles,
  ArrowLeftRight,
  Plus,
  Minus,
} from "lucide-react";
import type { Sticker } from "@/lib/catalog";
import { toggleSticker } from "@/lib/db";
import { getBio } from "@/lib/sticker-bio";
import { TEAM_CATALOG } from "@/lib/team-catalog";
import StickerCardPanini from "@/components/StickerCardPanini";

// ---------------------------------------------------------------------------
// Position full names
// ---------------------------------------------------------------------------

const POS_FULL: Record<string, string> = {
  DEL: "Delantero",
  MED: "Mediocampo",
  DEF: "Defensa",
  POR: "Arquero",
  FWD: "Delantero",
  MID: "Mediocampo",
  DF: "Defensa",
  GK: "Arquero",
};

// ---------------------------------------------------------------------------
// Non-player type labels
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<string, string> = {
  team_logo: "Escudo del equipo",
  team_photo: "Foto del equipo",
  fwc: "Especial Mundial",
  panini_special: "Especial Panini",
  extra: "Carta especial",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StickerDetailModalProps {
  sticker: Sticker;
  count: number;
  onClose: () => void;
  onCountChange: (newCount: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StickerDetailModal({
  sticker,
  count: initialCount,
  onClose,
  onCountChange,
}: StickerDetailModalProps) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [fav, setFav] = useState(false);

  // Sync prop → local if parent updates (e.g. another modal opens same sticker)
  // We purposely DON'T re-sync mid-session: local state is authoritative while open.

  const isPlayer = sticker.type === "player";
  const teamEntry = TEAM_CATALOG[sticker.team_code] ?? TEAM_CATALOG["_PANINI"];
  const flag = teamEntry?.flag ?? "";
  const displayName = teamEntry?.display_name ?? sticker.team;
  const bio = isPlayer ? getBio(sticker.id, sticker.team_code) : null;

  // Determine position for stats table only (not rendered in header)
  const posKey = (() => {
    if (!isPlayer) return null;
    const n = sticker.number;
    if (n === null || n === undefined) return "MED";
    if (n === 2) return "POR";
    if (n <= 5) return "DEF";
    if (n <= 11) return "MED";
    return "DEL";
  })();
  const posLabel = posKey ? (POS_FULL[posKey] ?? posKey) : null;

  // ---------------------------------------------------------------------------
  // Count mutation handlers
  // ---------------------------------------------------------------------------

  async function applyToggle() {
    const updated = await toggleSticker(sticker.id);
    setCount(updated.count);
    onCountChange(updated.count);
    return updated.count;
  }

  async function handleDecrement() {
    // toggleSticker cycles 0→1→2→...→0, we need to decrement.
    // The DB cycles through toggleSticker — to reduce by 1 we must read count
    // and cycle until we hit count-1. For simplicity: if count >= 2, we cycle
    // (the cycle increments; at any count toggleSticker adds 1; wrap to 0 at max).
    // Direct approach: call the API-level decrement path if available.
    // Since toggleSticker only increments (wraps to 0), we do a direct IDB write.
    const { openDB } = await import("idb");
    const db = await openDB("mundial-2026", undefined);
    const tx = db.transaction("collection", "readwrite");
    const store = tx.objectStore("collection");
    const entry = await store.get(sticker.id);
    const newCount = entry ? Math.max(0, entry.count - 1) : 0;
    if (newCount === 0) {
      await store.delete(sticker.id);
    } else {
      await store.put({ sticker_id: sticker.id, count: newCount, acquired_at: Date.now() });
    }
    await tx.done;
    setCount(newCount);
    onCountChange(newCount);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const dupCount = count > 1 ? count - 1 : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "var(--bg-1)",
        overflowY: "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle: ${sticker.display_name}`}
      data-testid="sticker-detail-modal"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Content container                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          position: "relative",
          padding: `calc(60px + env(safe-area-inset-top, 0px)) 22px 40px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Radial halo */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 300,
            background:
              "radial-gradient(circle at 50% 0,rgba(111,208,230,.28),transparent 60%)",
            pointerEvents: "none",
          }}
          aria-hidden
        />

        {/* ---- Back button ---- */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "calc(56px + env(safe-area-inset-top, 0px))",
            left: 18,
            width: 40,
            height: 40,
            borderRadius: 99,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            color: "var(--fg-2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
          aria-label="Volver"
        >
          <ChevronLeft size={20} />
        </button>

        {/* ---- Favorite star button ---- */}
        <button
          onClick={() => setFav((f) => !f)}
          style={{
            position: "absolute",
            top: "calc(56px + env(safe-area-inset-top, 0px))",
            right: 18,
            width: 40,
            height: 40,
            borderRadius: 99,
            background: fav ? "rgba(244,200,74,.14)" : "var(--bg-2)",
            border: `1px solid ${fav ? "var(--line-gold)" : "var(--line)"}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
          aria-label={fav ? "Quitar de favoritas" : "Agregar a favoritas"}
          aria-pressed={fav}
        >
          <Star
            size={20}
            strokeWidth={fav ? 0 : 2}
            color={fav ? "var(--gold)" : "var(--fg-2)"}
            fill={fav ? "var(--gold)" : "transparent"}
          />
        </button>

        {/* ---- Card (lg size — enlarged to ~72% vw) ---- */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "min(72vw, 280px)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <StickerCardPanini
            sticker={sticker}
            count={count}
            size="lg"
          />
        </div>

        {/* ---- Stats table (max-w-sm, centered) ---- */}
        <div
          style={{
            width: "100%",
            maxWidth: 384,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: 6,
            marginTop: 22,
            overflow: "hidden",
          }}
        >
          {isPlayer && bio ? (
            // Player stats: 6 rows
            [
              ["Selección", `${flag} ${displayName}`],
              ["Posición", posLabel ?? "—"],
              ["Nacimiento", bio.born],
              ["Estatura", `${bio.height} cm`],
              ["Peso", `${bio.weight} kg`],
              ["Club", bio.club],
            ].map(([k, v], i) => (
              <StatRow key={k} label={k} value={v} hasBorder={i > 0} />
            ))
          ) : (
            // Non-player: Selección + Tipo
            [
              ["Selección", `${flag} ${displayName}`],
              ["Tipo", TYPE_LABEL[sticker.type] ?? sticker.type],
            ].map(([k, v], i) => (
              <StatRow key={k} label={k} value={v} hasBorder={i > 0} />
            ))
          )}
        </div>

        {/* ---- Duplicate banner (count > 1, max-w-sm) ---- */}
        {count > 1 && (
          <div
            style={{
              width: "100%",
              maxWidth: 384,
              marginTop: 14,
              padding: "12px 16px",
              borderRadius: 14,
              background: "rgba(244,200,74,.1)",
              border: "1px solid var(--line-gold)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sparkles size={18} color="var(--gold)" />
            <span
              style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700 }}
            >
              Tienes {dupCount} repetida{dupCount !== 1 ? "s" : ""} — cámbialas
              en el mercado
            </span>
          </div>
        )}

        {/* ---- Bottom action area (max-w-sm, centered) ---- */}
        <div
          style={{
            width: "100%",
            maxWidth: 384,
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Primary CTA — CAMBIAR */}
          <button
            onClick={() => router.push("/market")}
            className="active:scale-95 active:opacity-80 transition-transform duration-100"
            data-testid="btn-cambiar"
            style={{
              width: "100%",
              padding: "16px 0",
              borderRadius: "var(--r-pill)",
              background:
                "linear-gradient(135deg,#FFE9A8 0%,#F4C84A 38%,#C2913A 62%,#FFE9A8 100%)",
              color: "var(--fg-onlight)",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
              boxShadow: "var(--glow-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <ArrowLeftRight size={18} />
            Cambiar
          </button>

          {/* Secondary ownership control */}
          {count === 0 && (
            <button
              onClick={applyToggle}
              className="active:scale-95 active:opacity-80 transition-transform duration-100"
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: "var(--r-pill)",
                background: "transparent",
                border: "1px solid var(--line-gold)",
                color: "var(--fg-1)",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                letterSpacing: ".02em",
              }}
            >
              Marcar como mía
            </button>
          )}

          {count === 1 && (
            <button
              onClick={applyToggle}
              className="active:scale-95 active:opacity-80 transition-transform duration-100"
              data-testid="btn-sumar-repetida"
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: "var(--r-pill)",
                background:
                  "linear-gradient(135deg,#FFE9A8 0%,#F4C84A 38%,#C2913A 62%,#FFE9A8 100%)",
                border: "none",
                color: "#111111",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "var(--glow-gold)",
                letterSpacing: ".02em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Plus size={16} />
              Sumar repetida
            </button>
          )}

          {count >= 2 && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleDecrement}
                className="active:scale-95 active:opacity-80 transition-transform duration-100"
                style={{
                  flex: 1,
                  padding: "14px 0",
                  borderRadius: "var(--r-pill)",
                  background: "transparent",
                  border: "1px solid var(--line-gold)",
                  color: "var(--fg-1)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Minus size={16} />
                Quitar
              </button>
              <button
                onClick={applyToggle}
                className="active:scale-95 active:opacity-80 transition-transform duration-100"
                style={{
                  flex: 1,
                  padding: "14px 0",
                  borderRadius: "var(--r-pill)",
                  background:
                    "linear-gradient(135deg,#FFE9A8 0%,#F4C84A 38%,#C2913A 62%,#FFE9A8 100%)",
                  border: "none",
                  color: "#111111",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow: "var(--glow-gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Plus size={16} />
                Repetida
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatRow — single row in the stats table
// ---------------------------------------------------------------------------

function StatRow({
  label,
  value,
  hasBorder,
}: {
  label: string;
  value: string;
  hasBorder: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 12px",
        borderTop: hasBorder ? "1px solid var(--line)" : "none",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--fg-3)", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: "var(--fg-1)", fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}

"use client";

/**
 * /reglas — Fantasy scoring rules + tournament calendar.
 *
 * Visible to both modes; linked from BottomNav tab 2 in Fantasy mode.
 * Collector mode can also reach it via a future link in /squad.
 *
 * Design: matches /scoreboard palette (GREEN #006847, LIME #c2ef4e,
 * GOLD #F4C84A, dark bg #0d0f13 via --bg-1 token).
 *
 * Sections:
 *   1. Header — "FANTASY" kicker + "Reglas" H1
 *   2. Scoring table SUMAN / RESTAN
 *   3. Tournament calendar (MD phases from LOCK_PHASES)
 *   4. LockBanner — reused from /squad
 *   5. Footer link to official FIFA Fantasy rules
 */

import BottomNav from "@/components/BottomNav";
import { isLocked, lockEngagesAt, nextUnlockAt, LOCK_PHASES } from "@/lib/userXI";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIME = "#c2ef4e";
const GREEN = "#006847";
const GOLD = "#F4C84A";

// ---------------------------------------------------------------------------
// Scoring rows
// ---------------------------------------------------------------------------

interface ScoringRow {
  action: string;
  pts: number;
}

const SUMAN: ScoringRow[] = [
  { action: "Jugó 1–59 min",                      pts: 1 },
  { action: "Jugó 60+ min",                        pts: 2 },
  { action: "Gol (delantero)",                     pts: 4 },
  { action: "Gol (mediocampista)",                 pts: 5 },
  { action: "Gol (defensor o arquero)",            pts: 6 },
  { action: "Asistencia",                          pts: 3 },
  { action: "Clean sheet (arq/def, 60+ min)",      pts: 4 },
  { action: "Clean sheet (med, 60+ min)",          pts: 1 },
  { action: "Cada 2 atajadas (arquero)",           pts: 1 },
  { action: "Penal atajado",                       pts: 5 },
  { action: "MOTM (man of the match)",             pts: 3 },
];

const RESTAN: ScoringRow[] = [
  { action: "Tarjeta amarilla",    pts: -1 },
  { action: "Tarjeta roja",       pts: -3 },
  { action: "Penal errado",       pts: -2 },
  { action: "Auto-gol",           pts: -2 },
  { action: "Cada 2 goles rec. (arq/def)", pts: -1 },
];

// ---------------------------------------------------------------------------
// Tournament calendar from LOCK_PHASES
// ---------------------------------------------------------------------------

interface CalendarRow {
  label: string;
  dates: string;
  note: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    month: "short",
    day: "numeric",
    timeZone: "America/Santiago",
  });
}

const CALENDAR: CalendarRow[] = [
  {
    label: "Fase 0 — Armá tu equipo",
    dates: `hasta ${fmtDate(LOCK_PHASES[0].endsAt)}`,
    note: "Ventana inicial abierta",
  },
  {
    label: "MD1 + MD2 — Bloqueado",
    dates: `${fmtDate(LOCK_PHASES[1].startsAt)} → ${fmtDate(LOCK_PHASES[1].endsAt)}`,
    note: "Sin cambios durante estas fechas",
  },
  {
    label: "Ventana MD2 → MD3",
    dates: `${fmtDate(LOCK_PHASES[2].startsAt)} → ${fmtDate(LOCK_PHASES[2].endsAt)}`,
    note: "Podés hacer cambios en tu 11",
  },
  {
    label: "MD3 → Final — Bloqueado",
    dates: `${fmtDate(LOCK_PHASES[3].startsAt)} → ${fmtDate(LOCK_PHASES[3].endsAt)}`,
    note: "Octavos, cuartos, semis y final",
  },
];

// ---------------------------------------------------------------------------
// LockBanner — minimal inline version (scoreboard-style)
// ---------------------------------------------------------------------------

function LockBanner() {
  const now = new Date();
  const locked = isLocked(now);
  const lockAt = lockEngagesAt(now);
  const unlockAt = nextUnlockAt(now);

  const fmtCountdown = (target: Date): string => {
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return "ya";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) {
      const d = Math.floor(h / 24);
      return `${d}d ${h % 24}h`;
    }
    return `${h}h ${m}m`;
  };

  if (locked) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg,rgba(228,0,43,.12),rgba(228,0,43,.06))",
          border: "1px solid rgba(228,0,43,.3)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 20,
        }}
      >
        <span style={{ fontSize: 22 }} aria-hidden>🔒</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#f87171" }}>
            Tu equipo está bloqueado
          </div>
          {unlockAt && (
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
              Ventana de cambios en {fmtCountdown(unlockAt)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg,rgba(194,239,78,.1),rgba(194,239,78,.04))",
        border: `1px solid ${LIME}40`,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 20,
      }}
    >
      <span style={{ fontSize: 22 }} aria-hidden>🔓</span>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: LIME }}>
          Tu equipo está abierto
        </div>
        {lockAt && (
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
            Se bloquea en {fmtCountdown(lockAt)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScoringTable
// ---------------------------------------------------------------------------

interface ScoringTableProps {
  rows: ScoringRow[];
  kind: "suma" | "resta";
}

function ScoringTable({ rows, kind }: ScoringTableProps) {
  const accentColor = kind === "suma" ? LIME : "#f87171";

  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {rows.map((row, i) => (
        <div
          key={row.action}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 14px",
            borderTop: i > 0 ? "1px solid var(--line)" : "none",
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--fg-2)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {row.action}
          </span>
          <span
            style={{
              fontFamily: "var(--font-stat)",
              fontWeight: 800,
              fontSize: 15,
              color: accentColor,
              fontVariantNumeric: "tabular-nums",
              minWidth: 36,
              textAlign: "right",
            }}
          >
            {kind === "suma" ? `+${row.pts}` : `${row.pts}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CalendarTable
// ---------------------------------------------------------------------------

function CalendarTable() {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {CALENDAR.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "12px 14px",
            borderTop: i > 0 ? "1px solid var(--line)" : "none",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, color: "var(--fg-1)", fontFamily: "var(--font-ui)" }}>
            {row.label}
          </div>
          <div style={{ fontSize: 12, color: GOLD, fontWeight: 700, fontFamily: "var(--font-ui)" }}>
            {row.dates}
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>
            {row.note}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header helper
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".1em",
        color: "var(--fg-3)",
        textTransform: "uppercase",
        fontFamily: "var(--font-ui)",
        marginBottom: 10,
        marginTop: 24,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReglasPage() {
  return (
    <div
      className="flex flex-col w-full max-w-lg mx-auto"
      style={{ backgroundColor: "var(--bg-1)", color: "var(--fg-1)", minHeight: "100dvh" }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "18px 18px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Green top glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 340,
            height: 220,
            background: `radial-gradient(circle, ${GREEN}28, transparent 65%)`,
            pointerEvents: "none",
          }}
        />

        {/* Kicker */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".14em",
            color: LIME,
            textTransform: "uppercase",
            fontFamily: "var(--font-ui)",
            position: "relative",
            zIndex: 1,
          }}
        >
          FANTASY
        </div>

        {/* H1 */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 36,
            color: "var(--fg-1)",
            lineHeight: 1,
            textTransform: "uppercase",
            position: "relative",
            zIndex: 1,
            marginBottom: 4,
          }}
        >
          Reglas
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "var(--fg-3)",
            fontWeight: 600,
            fontFamily: "var(--font-ui)",
            position: "relative",
            zIndex: 1,
          }}
        >
          Sistema de puntos FIFA Fantasy · Mundial 2026
        </p>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "8px 18px 120px" }}>

        {/* Lock banner */}
        <LockBanner />

        {/* SUMAN */}
        <SectionHeader>Suman puntos</SectionHeader>
        <ScoringTable rows={SUMAN} kind="suma" />

        {/* RESTAN */}
        <SectionHeader>Restan puntos</SectionHeader>
        <ScoringTable rows={RESTAN} kind="resta" />

        {/* Calendar */}
        <SectionHeader>Calendario del mundial</SectionHeader>
        <CalendarTable />

        {/* Footer link */}
        <p
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 12,
            color: "var(--fg-3)",
            fontWeight: 600,
          }}
        >
          Reglas oficiales:{" "}
          <a
            href="https://play.fifa.com/fantasy/help/rules"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: LIME, textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            play.fifa.com/fantasy/help/rules
          </a>
        </p>
      </div>

      <BottomNav active="reglas" />
    </div>
  );
}

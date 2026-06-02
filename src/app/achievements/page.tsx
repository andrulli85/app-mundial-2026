"use client";

/**
 * /achievements — LOGROS screen.
 *
 * Design source: albumix/project/app/achievements.jsx
 * 9 achievements with progress tracking + XP claim flow.
 *
 * NOTE: The existing badge system (src/lib/achievements.ts) uses a
 * different shape (Badge/BadgeContext — no cur/tgt/reward/tier).
 * This page uses its own achievement catalog and persists claimed
 * state to localStorage under "albumix.achievements.claimed".
 * The existing useAchievements hook (toast queue for badge unlocks)
 * is NOT used here — it is wired in the root layout via AchievementProvider.
 */

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import {
  Sparkles,
  Star,
  Trophy,
  LayoutGrid,
  Shield,
  Flame,
  Repeat2,
  Users,
  Zap,
  Check,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tier = "common" | "rare" | "epic" | "legendary";
type IconName =
  | "sparkles"
  | "star"
  | "trophy"
  | "grid"
  | "shield"
  | "flame"
  | "trade"
  | "users"
  | "zap";

interface Achievement {
  id: string;
  icon: IconName;
  title: string;
  desc: string;
  cur: number;
  tgt: number;
  reward: number;
  tier: Tier;
}

// ---------------------------------------------------------------------------
// Data — 9 achievements from design pack (canonical going forward)
// ---------------------------------------------------------------------------

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "a1",
    icon: "sparkles",
    title: "Primera carta",
    desc: "Consigue tu primera carta",
    cur: 1,
    tgt: 1,
    reward: 50,
    tier: "common",
  },
  {
    id: "a2",
    icon: "star",
    title: "Legendaria",
    desc: "Consigue una carta legendaria",
    cur: 1,
    tgt: 1,
    reward: 200,
    tier: "legendary",
  },
  {
    id: "a3",
    icon: "trophy",
    title: "Podio",
    desc: "Llega al top 3 del ranking",
    cur: 3,
    tgt: 3,
    reward: 150,
    tier: "epic",
  },
  {
    id: "a4",
    icon: "grid",
    title: "Coleccionista",
    desc: "Junta 250 cartas",
    cur: 247,
    tgt: 250,
    reward: 120,
    tier: "rare",
  },
  {
    id: "a5",
    icon: "shield",
    title: "Chile completo",
    desc: "Completa el equipo de Chile",
    cur: 17,
    tgt: 23,
    reward: 180,
    tier: "rare",
  },
  {
    id: "a6",
    icon: "flame",
    title: "En racha",
    desc: "7 días seguidos conectado",
    cur: 5,
    tgt: 7,
    reward: 90,
    tier: "common",
  },
  {
    id: "a7",
    icon: "trade",
    title: "Buen mercader",
    desc: "Completa 10 cambios",
    cur: 6,
    tgt: 10,
    reward: 100,
    tier: "rare",
  },
  {
    id: "a8",
    icon: "users",
    title: "11 ideal",
    desc: "Arma tu primer 11 completo",
    cur: 1,
    tgt: 1,
    reward: 130,
    tier: "epic",
  },
  {
    id: "a9",
    icon: "zap",
    title: "Colección veloz",
    desc: "Consigue 25 cartas nuevas",
    cur: 14,
    tgt: 25,
    reward: 110,
    tier: "common",
  },
];

// ---------------------------------------------------------------------------
// Tier color map
// ---------------------------------------------------------------------------

const TIER_COLOR: Record<Tier, string> = {
  common: "var(--rarity-common)",
  rare: "var(--rarity-rare)",
  epic: "var(--rarity-epic)",
  legendary: "var(--gold)",
};

// ---------------------------------------------------------------------------
// Icon component
// ---------------------------------------------------------------------------

type LucideIconComponent = React.ComponentType<{ size: number; color: string }>;

const ICON_MAP: Record<IconName, LucideIconComponent> = {
  sparkles: Sparkles as LucideIconComponent,
  star: Star as LucideIconComponent,
  trophy: Trophy as LucideIconComponent,
  grid: LayoutGrid as LucideIconComponent,
  shield: Shield as LucideIconComponent,
  flame: Flame as LucideIconComponent,
  trade: Repeat2 as LucideIconComponent,
  users: Users as LucideIconComponent,
  zap: Zap as LucideIconComponent,
};

function AchievementIcon({
  name,
  size,
  color,
}: {
  name: IconName;
  size: number;
  color: string;
}) {
  const Icon = ICON_MAP[name];
  return <Icon size={size} color={color} />;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const LS_KEY = "albumix.achievements.claimed";

function loadClaimed(): Set<string> {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed as string[]);
  } catch {
    // ignore parse errors
  }
  return new Set();
}

function saveClaimed(claimed: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...claimed]));
  } catch {
    // ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// XP Flash toast (inline — separate from the badge-unlock toast system)
// ---------------------------------------------------------------------------

function XpToast({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9998,
        background: "var(--foil-gold)",
        color: "var(--gold-ink)",
        fontFamily: "var(--font-stat)",
        fontWeight: 800,
        fontSize: 15,
        padding: "10px 22px",
        borderRadius: 999,
        boxShadow: "var(--glow-gold)",
        animation: "popin .3s var(--ease-pop)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AchievementRow
// ---------------------------------------------------------------------------

type RowState = "claimed" | "claim" | "progress";

function AchievementRow({
  a,
  claimed,
  onClaim,
}: {
  a: Achievement;
  claimed: boolean;
  onClaim: (a: Achievement) => void;
}) {
  const done = a.cur >= a.tgt;
  const pct = Math.min(100, Math.round((a.cur / a.tgt) * 100));
  const col = TIER_COLOR[a.tier];
  const state: RowState = claimed ? "claimed" : done ? "claim" : "progress";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: 14,
        borderRadius: 16,
        background:
          state === "claim" ? "rgba(244,200,74,.08)" : "var(--bg-2)",
        border:
          "1px solid " +
          (state === "claim" ? "var(--line-gold)" : "var(--line)"),
        opacity: state === "claimed" ? 0.62 : 1,
        transition: "opacity .3s",
      }}
    >
      {/* 48×48 medal icon */}
      <div
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: done
            ? a.tier === "legendary"
              ? "var(--foil-gold)"
              : col
            : "var(--bg-3)",
          boxShadow: done ? `0 0 18px -6px ${col}` : "none",
          border: done ? "none" : "1px solid var(--line-strong)",
        }}
      >
        <AchievementIcon
          name={a.icon}
          size={23}
          color={
            done
              ? a.tier === "legendary"
                ? "var(--fg-onlight)"
                : "#fff"
              : "var(--fg-3)"
          }
        />
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: "var(--fg-1)" }}>
            {a.title}
          </span>
          {state === "claimed" && <Check size={14} color="var(--green-bright)" />}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 1 }}>
          {a.desc}
        </div>

        {/* Progress bar — only when state=progress */}
        {state === "progress" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 6,
                borderRadius: 99,
                background: "var(--bg-3)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: pct + "%",
                  borderRadius: 99,
                  background: col,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-stat)",
                fontWeight: 800,
                fontSize: 11,
                color: "var(--fg-2)",
              }}
            >
              {a.cur}/{a.tgt}
            </span>
          </div>
        )}
      </div>

      {/* Right: Reclamar button or XP badge */}
      {state === "claim" ? (
        <button
          onClick={() => onClaim(a)}
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
            background: "var(--foil-gold)",
            border: "none",
            borderRadius: 12,
            padding: "8px 12px",
            boxShadow: "var(--glow-gold)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: ".04em",
              color: "var(--fg-onlight)",
              textTransform: "uppercase",
            }}
          >
            Reclamar
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontFamily: "var(--font-stat)",
              fontWeight: 800,
              fontSize: 12,
              color: "var(--gold-ink)",
            }}
          >
            <Zap size={11} color="var(--gold-ink)" />
            {a.reward} XP
          </span>
        </button>
      ) : (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-stat)",
            fontWeight: 800,
            fontSize: 13,
            color: state === "claimed" ? "var(--fg-3)" : "var(--gold)",
          }}
        >
          <Zap
            size={13}
            color={state === "claimed" ? "var(--fg-3)" : "var(--gold)"}
          />
          {a.reward} XP
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AchievementsPage() {
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [xpToast, setXpToast] = useState<string | null>(null);

  // Hydrate claimed state from localStorage on client mount
  useEffect(() => {
    setClaimed(loadClaimed());
  }, []);

  const claimable = ACHIEVEMENTS.filter(
    (a) => a.cur >= a.tgt && !claimed.has(a.id)
  ).length;
  const doneCount = ACHIEVEMENTS.filter((a) => a.cur >= a.tgt).length;
  const total = ACHIEVEMENTS.length;

  function handleClaim(a: Achievement) {
    setClaimed((prev) => {
      const next = new Set(prev);
      next.add(a.id);
      saveClaimed(next);
      return next;
    });
    setXpToast(`+${a.reward} XP ⚡`);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        maxWidth: 480,
        margin: "0 auto",
        width: "100%",
        paddingBottom: 80,
      }}
    >
      {/* Page header */}
      <div style={{ padding: "16px 18px 0" }}>
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: ".12em",
            color: "var(--gold)",
            textTransform: "uppercase",
          }}
        >
          Recompensas
        </div>

        {/* Display title */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            color: "var(--fg-1)",
            lineHeight: 1,
            margin: "2px 0 14px",
            textTransform: "uppercase",
          }}
        >
          Logros
        </h1>

        {/* Summary pods row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
          {/* Completados */}
          <div
            style={{
              flex: 1,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "13px 14px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-stat)",
                fontWeight: 800,
                fontSize: 24,
                color: "var(--fg-1)",
                lineHeight: 1,
              }}
            >
              {doneCount}
              <span style={{ color: "var(--fg-3)", fontSize: 15 }}>
                /{total}
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-3)",
                fontWeight: 700,
                marginTop: 3,
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              Completados
            </div>
          </div>

          {/* Por reclamar */}
          <div
            style={{
              flex: 1,
              background: claimable ? "rgba(244,200,74,.08)" : "var(--bg-2)",
              border:
                "1px solid " +
                (claimable ? "var(--line-gold)" : "var(--line)"),
              borderRadius: 14,
              padding: "13px 14px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-stat)",
                fontWeight: 800,
                fontSize: 24,
                color: claimable ? "var(--gold)" : "var(--fg-1)",
                lineHeight: 1,
              }}
            >
              {claimable}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-3)",
                fontWeight: 700,
                marginTop: 3,
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              Por reclamar
            </div>
          </div>
        </div>
      </div>

      {/* Achievement rows */}
      <div
        style={{
          padding: "12px 18px 0",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {ACHIEVEMENTS.map((a) => (
          <AchievementRow
            key={a.id}
            a={a}
            claimed={claimed.has(a.id)}
            onClaim={handleClaim}
          />
        ))}
      </div>

      {/* Inline XP flash toast */}
      {xpToast && (
        <XpToast message={xpToast} onDone={() => setXpToast(null)} />
      )}
      <BottomNav active="perfil" />
    </div>
  );
}

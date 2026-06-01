/**
 * Achievement badge system — App Mundial 2026.
 *
 * 15 badges across 3 tiers (common / rare / legendary).
 * All evaluation is client-side — no server, no Firebase.
 *
 * Usage:
 *   const ctx = await buildBadgeContext();
 *   const newlyUnlocked = await syncUnlocks(ctx);
 *   // newlyUnlocked contains ids of badges just unlocked for the first time
 */

import type { Sticker } from "@/lib/catalog";
import type { TradeLogEntry } from "@/lib/db";
import {
  getUnlockedBadges,
  markBadgeUnlocked,
  getAllStickers,
  getRecentTrades,
} from "@/lib/db";
import { getCatalog } from "@/lib/catalog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Rarity = "common" | "rare" | "legendary";

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: Rarity;
  /** Pure predicate — no async, no side-effects. */
  unlockedWhen: (ctx: BadgeContext) => boolean;
}

export interface BadgeContext {
  /** Map of sticker_id → count (only entries with count > 0 are present) */
  owned: Map<string, number>;
  /** Full catalog for lookups */
  catalog: Sticker[];
  /** All completed trades */
  tradeLog: TradeLogEntry[];
  /** True when the user triggered the import flow (profile key "imported_from_app" === "1") */
  hasImported: boolean;
  /** True when the user tapped the easter egg (profile key "easter_egg_tapped" === "1") */
  easterEggTriggered: boolean;
}

// ---------------------------------------------------------------------------
// Helper predicates
// ---------------------------------------------------------------------------

/** Count stickers that are owned (count >= 1) */
function ownedCount(ctx: BadgeContext): number {
  return ctx.owned.size;
}

/** Count stickers that are duplicates (count >= 2) */
function repeCount(ctx: BadgeContext): number {
  let n = 0;
  ctx.owned.forEach((c) => { if (c >= 2) n++; });
  return n;
}

/** Fraction of the full catalog that is owned (0–1) */
function albumFraction(ctx: BadgeContext): number {
  if (ctx.catalog.length === 0) return 0;
  return ownedCount(ctx) / ctx.catalog.length;
}

/** Teams in the catalog (excluding _fwc / _end pseudo-teams) */
function teamStickers(ctx: BadgeContext): Map<string, { total: number; owned: number }> {
  const map = new Map<string, { total: number; owned: number }>();
  for (const s of ctx.catalog) {
    if (s.group === "_fwc" || s.group === "_end") continue;
    if (!map.has(s.team_code)) {
      map.set(s.team_code, { total: 0, owned: 0 });
    }
    const entry = map.get(s.team_code)!;
    entry.total++;
    if (ctx.owned.has(s.id)) entry.owned++;
  }
  return map;
}

/** Number of teams where every sticker is owned */
function completedTeamsCount(ctx: BadgeContext): number {
  const teams = teamStickers(ctx);
  let n = 0;
  teams.forEach(({ total, owned }) => { if (owned === total && total > 0) n++; });
  return n;
}

/** Teams in a specific FIFA group */
function teamsInGroup(ctx: BadgeContext, group: string): string[] {
  const codes = new Set<string>();
  ctx.catalog.forEach((s) => { if (s.group === group) codes.add(s.team_code); });
  return [...codes];
}

/** Whether all stickers for every team in a given group are owned */
function groupComplete(ctx: BadgeContext, group: string): boolean {
  const teams = teamStickers(ctx);
  const codes = teamsInGroup(ctx, group);
  if (codes.length === 0) return false;
  return codes.every((code) => {
    const t = teams.get(code);
    return t && t.owned === t.total && t.total > 0;
  });
}

/** FWC special stickers — group === "_fwc" */
function fwcStickers(ctx: BadgeContext): { total: number; owned: number } {
  const fwc = ctx.catalog.filter((s) => s.group === "_fwc");
  const owned = fwc.filter((s) => ctx.owned.has(s.id)).length;
  return { total: fwc.length, owned };
}

// ---------------------------------------------------------------------------
// Badge catalog (15 badges)
// ---------------------------------------------------------------------------

export const BADGES: Badge[] = [
  // ── Tier 1: First steps (common) ─────────────────────────────────────────
  {
    id: "first-sticker",
    name: "Primer cromo",
    description: "Marcaste tu primera figurita",
    emoji: "🌟",
    rarity: "common",
    unlockedWhen: (ctx) => ownedCount(ctx) >= 1,
  },
  {
    id: "first-team-complete",
    name: "Primer equipo",
    description: "Completaste tu primer país del Mundial",
    emoji: "🏆",
    rarity: "common",
    unlockedWhen: (ctx) => completedTeamsCount(ctx) >= 1,
  },
  {
    id: "first-repe",
    name: "Primera repe",
    description: "Marcaste tu primera repetida",
    emoji: "🔁",
    rarity: "common",
    unlockedWhen: (ctx) => repeCount(ctx) >= 1,
  },
  {
    id: "hundred-stickers",
    name: "Centena",
    description: "100 figuritas en tu álbum",
    emoji: "💯",
    rarity: "common",
    unlockedWhen: (ctx) => ownedCount(ctx) >= 100,
  },
  {
    id: "first-import",
    name: "Migrante",
    description: "Importaste tu lista desde Figuritas",
    emoji: "📥",
    rarity: "common",
    unlockedWhen: (ctx) => ctx.hasImported,
  },

  // ── Tier 2: Progress milestones (rare) ───────────────────────────────────
  {
    id: "quarter-album",
    name: "Cuarto del mundo",
    description: "25% del álbum completo",
    emoji: "🌎",
    rarity: "rare",
    unlockedWhen: (ctx) => albumFraction(ctx) >= 0.25,
  },
  {
    id: "half-album",
    name: "Mitad de camino",
    description: "50% del álbum completo",
    emoji: "🌗",
    rarity: "rare",
    unlockedWhen: (ctx) => albumFraction(ctx) >= 0.5,
  },
  {
    id: "three-quarters",
    name: "Tres cuartos",
    description: "75% del álbum completo",
    emoji: "🎯",
    rarity: "rare",
    unlockedWhen: (ctx) => albumFraction(ctx) >= 0.75,
  },
  {
    id: "five-teams",
    name: "Cinco banderas",
    description: "Completaste 5 países distintos",
    emoji: "🚩",
    rarity: "rare",
    unlockedWhen: (ctx) => completedTeamsCount(ctx) >= 5,
  },
  {
    id: "group-complete-a",
    name: "Maestro del Grupo A",
    description: "Completaste los 4 equipos del Grupo A",
    emoji: "🅰️",
    rarity: "rare",
    unlockedWhen: (ctx) => groupComplete(ctx, "A"),
  },

  // ── Tier 3: Trading & specials (legendary) ───────────────────────────────
  {
    id: "first-trade",
    name: "Primer intercambio",
    description: "Hiciste tu primer trade en Albumix",
    emoji: "🤝",
    rarity: "legendary",
    unlockedWhen: (ctx) => ctx.tradeLog.length >= 1,
  },
  {
    id: "ten-trades",
    name: "Negociador",
    description: "10 trades completados",
    emoji: "💼",
    rarity: "legendary",
    unlockedWhen: (ctx) => ctx.tradeLog.length >= 10,
  },
  {
    id: "fwc-complete",
    name: "Coleccionista FWC",
    description: "Completaste todas las figuritas Especiales del Mundial",
    emoji: "✨",
    rarity: "legendary",
    unlockedWhen: (ctx) => {
      const { total, owned } = fwcStickers(ctx);
      return total > 0 && owned === total;
    },
  },
  {
    id: "full-album",
    name: "Álbum completo",
    description: "Tenés las 660 figuritas. Sos leyenda.",
    emoji: "👑",
    rarity: "legendary",
    unlockedWhen: (ctx) => {
      if (ctx.catalog.length === 0) return false;
      // Every sticker in the catalog must be owned (count >= 1)
      return ctx.catalog.every((s) => (ctx.owned.get(s.id) ?? 0) >= 1);
    },
  },
  {
    id: "hidden-easter-egg",
    name: "???",
    description: "Encontraste algo escondido. Tapeá el logo de Albumix 5 veces en Opciones.",
    emoji: "🎁",
    rarity: "legendary",
    unlockedWhen: (ctx) => ctx.easterEggTriggered,
  },
];

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Returns all badge IDs that SHOULD be unlocked given the current context.
 * Pure — no DB access.
 */
export function checkUnlocks(ctx: BadgeContext): string[] {
  return BADGES.filter((b) => b.unlockedWhen(ctx)).map((b) => b.id);
}

/**
 * Builds a BadgeContext from IndexedDB.
 * Call before syncUnlocks whenever you need a fresh snapshot.
 */
export async function buildBadgeContext(overrides?: Partial<BadgeContext>): Promise<BadgeContext> {
  const [stickers, catalog, tradeLog] = await Promise.all([
    getAllStickers(),
    getCatalog(),
    getRecentTrades(200),
  ]);

  // Build owned map — only stickers with count > 0
  const owned = new Map<string, number>();
  stickers.forEach((s) => { if (s.count > 0) owned.set(s.sticker_id, s.count); });

  // Read profile keys — lazy import to avoid circular deps
  const { getProfile } = await import("@/lib/db");
  const [importedFlag, easterFlag] = await Promise.all([
    getProfile("imported_from_app"),
    getProfile("easter_egg_tapped"),
  ]);

  return {
    owned,
    catalog,
    tradeLog,
    hasImported: importedFlag === "1",
    easterEggTriggered: easterFlag === "1",
    ...overrides,
  };
}

/**
 * Computes which badges should be unlocked, diffs against previously-unlocked,
 * persists new ones, and returns ONLY the newly-unlocked IDs.
 *
 * This is the main entry point — call on every state change.
 */
export async function syncUnlocks(ctx: BadgeContext): Promise<string[]> {
  const [shouldBeUnlocked, alreadyUnlocked] = await Promise.all([
    Promise.resolve(checkUnlocks(ctx)),
    getUnlockedBadges(),
  ]);

  const alreadySet = new Set(alreadyUnlocked);
  const newlyUnlocked = shouldBeUnlocked.filter((id) => !alreadySet.has(id));

  if (newlyUnlocked.length > 0) {
    await Promise.all(newlyUnlocked.map((id) => markBadgeUnlocked(id)));
  }

  return newlyUnlocked;
}

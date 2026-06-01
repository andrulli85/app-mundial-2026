/**
 * trade-stats.ts — Analytics computed from the local trade_log IndexedDB store.
 *
 * Pure read-only. No schema changes. Uses getRecentTrades() + getDB() from db.ts.
 * All heavy computation runs client-side once per page load.
 */

import { getDB, TradeLogEntry } from "@/lib/db";
import { getCatalog, Sticker, StickerType } from "@/lib/catalog";

// --------------------------------------------------------------------------
// Raw data fetch — reads ALL trades (no limit) for aggregate analytics
// --------------------------------------------------------------------------

export async function getAllTrades(): Promise<TradeLogEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("trade_log", "by_ts");
  return all.reverse(); // newest first
}

// --------------------------------------------------------------------------
// Header summary stats
// --------------------------------------------------------------------------

export interface TradeSummary {
  totalTrades: number;
  totalGave: number;
  totalReceived: number;
  uniquePartners: number;
}

export function computeSummary(trades: TradeLogEntry[]): TradeSummary {
  const partnerSet = new Set<string>();
  let totalGave = 0;
  let totalReceived = 0;

  for (const t of trades) {
    totalGave += t.gave.length;
    totalReceived += t.received.length;
    if (t.partner) partnerSet.add(t.partner);
  }

  return {
    totalTrades: trades.length,
    totalGave,
    totalReceived,
    uniquePartners: partnerSet.size,
  };
}

// --------------------------------------------------------------------------
// Top 5 partners by trade count
// --------------------------------------------------------------------------

export interface PartnerStat {
  partner: string;
  tradeCount: number;
  initials: string;
}

export function computeTopPartners(trades: TradeLogEntry[], limit = 5): PartnerStat[] {
  const counts = new Map<string, number>();
  for (const t of trades) {
    if (!t.partner) continue;
    counts.set(t.partner, (counts.get(t.partner) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([partner, tradeCount]) => ({
      partner,
      tradeCount,
      initials: partner.slice(0, 2).toUpperCase(),
    }));
}

// --------------------------------------------------------------------------
// Top 10 most exchanged sticker IDs (gave + received combined)
// --------------------------------------------------------------------------

export interface StickerFrequency {
  stickerId: string;
  count: number;
  sticker?: Sticker; // enriched from catalog if found
}

export function computeTopStickers(trades: TradeLogEntry[], limit = 10): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of trades) {
    for (const id of [...t.gave, ...t.received]) {
      freq.set(id, (freq.get(id) ?? 0) + 1);
    }
  }
  // Return top N as sorted map (caller converts to array)
  const sorted = new Map(
    Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
  );
  return sorted;
}

export async function computeTopStickersEnriched(
  trades: TradeLogEntry[],
  limit = 10
): Promise<StickerFrequency[]> {
  const freq = computeTopStickers(trades, limit);
  const catalog = await getCatalog();
  const catalogMap = new Map(catalog.map((s) => [s.id, s]));

  return Array.from(freq.entries()).map(([stickerId, count]) => ({
    stickerId,
    count,
    sticker: catalogMap.get(stickerId),
  }));
}

// --------------------------------------------------------------------------
// By sticker type breakdown
// --------------------------------------------------------------------------

export interface TypeBreakdown {
  type: StickerType | "unknown";
  label: string;
  count: number;
}

const TYPE_LABELS: Record<string, string> = {
  player: "Jugadores",
  team_logo: "Escudos",
  team_photo: "Fotos de equipo",
  fwc: "FWC especiales",
  panini_special: "Panini especiales",
  unknown: "Otros",
};

export async function computeTypeBreakdown(
  trades: TradeLogEntry[]
): Promise<TypeBreakdown[]> {
  const catalog = await getCatalog();
  const catalogMap = new Map(catalog.map((s) => [s.id, s]));

  const counts = new Map<string, number>();
  const ALL_TYPES: Array<StickerType | "unknown"> = [
    "player",
    "team_logo",
    "team_photo",
    "fwc",
    "panini_special",
    "unknown",
  ];
  for (const t of ALL_TYPES) counts.set(t, 0);

  for (const trade of trades) {
    for (const id of [...trade.gave, ...trade.received]) {
      const sticker = catalogMap.get(id);
      const key = sticker?.type ?? "unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return ALL_TYPES.map((type) => ({
    type,
    label: TYPE_LABELS[type] ?? type,
    count: counts.get(type) ?? 0,
  })).filter((row) => row.count > 0);
}

// --------------------------------------------------------------------------
// 30-day timeline — trades per day
// --------------------------------------------------------------------------

export interface DayBucket {
  dateLabel: string; // "lun 26" style
  count: number;
}

export function computeTimeline(trades: TradeLogEntry[], days = 30): DayBucket[] {
  const now = Date.now();
  const buckets: Map<string, number> = new Map();

  // Build a day key → label map for the last N days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    buckets.set(key, 0);
  }

  const cutoff = now - days * 86400000;
  for (const t of trades) {
    if (t.ts < cutoff) continue;
    const key = new Date(t.ts).toISOString().slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([key, count]) => ({
    dateLabel: new Date(key + "T00:00:00").toLocaleDateString("es-CL", {
      weekday: "short",
      day: "numeric",
    }),
    count,
  }));
}

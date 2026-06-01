"use client";

/**
 * /trade/history — Chronological trade log (DESC).
 *
 * F.2=α + F.3 (S124):
 *   - Lists last 50 trades with gave/received chips
 *   - Revertir button + confirm modal → inverse operation on collection + delete log entry
 *   - Empty state with call-to-action back to /trade
 *
 * Privacy: trade_log stores only trade_id / ts / partner / gave / received.
 * The `want` array from the proposal is never persisted (F.1=α).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRecentTrades,
  getDB,
  getSticker,
  bulkSetStickers,
  TradeLogEntry,
  StickerEntry,
} from "@/lib/db";

// ── Relative time helper ─────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return new Date(ts).toLocaleDateString("es-CL");
}

// ── Chip component ───────────────────────────────────────────────────

function Chip({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

// ── Revert confirm modal ─────────────────────────────────────────────

interface RevertModalProps {
  entry: TradeLogEntry;
  onConfirm: () => void;
  onCancel: () => void;
}

function RevertModal({ entry, onConfirm, onCancel }: RevertModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl px-5 py-6 flex flex-col gap-4"
        style={{ backgroundColor: "#131519", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-black" style={{ color: "#f5f5f5" }}>
          Revertir intercambio?
        </h2>

        <div className="text-sm flex flex-col gap-1.5" style={{ color: "#9ca3af" }}>
          {entry.gave.length > 0 && (
            <p>
              <span className="font-semibold" style={{ color: "#f5f5f5" }}>+ Volvés a tener:</span>{" "}
              {entry.gave.join(", ")}
            </p>
          )}
          {entry.received.length > 0 && (
            <p>
              <span className="font-semibold" style={{ color: "#f5f5f5" }}>− Perdés:</span>{" "}
              {entry.received.join(", ")}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
            Este intercambio va a desaparecer del historial.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-sm border"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              color: "#9ca3af",
              backgroundColor: "transparent",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-black text-sm text-white"
            style={{ backgroundColor: "#c8102e" }}
          >
            Revertir
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trade card ───────────────────────────────────────────────────────

interface TradeCardProps {
  entry: TradeLogEntry;
  onRevert: (entry: TradeLogEntry) => void;
}

function TradeCard({ entry, onRevert }: TradeCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: "rgba(26,26,26,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs" style={{ color: "#6b7280" }}>{relativeTime(entry.ts)}</p>
        <p className="text-xs font-semibold truncate max-w-[160px]" style={{ color: "#9ca3af" }}>
          con {entry.partner}
        </p>
      </div>

      {/* Gave section */}
      {entry.gave.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "#f87171" }}
          >
            Diste
          </p>
          <div className="flex flex-wrap gap-1.5">
            {entry.gave.map((id) => (
              <Chip key={id} label={id} color="#c8102e" />
            ))}
          </div>
        </div>
      )}

      {/* Received section */}
      {entry.received.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "#4ade80" }}
          >
            Recibiste
          </p>
          <div className="flex flex-wrap gap-1.5">
            {entry.received.map((id) => (
              <Chip key={id} label={id} color="#006847" />
            ))}
          </div>
        </div>
      )}

      {/* Revert button */}
      <div className="flex justify-end">
        <button
          onClick={() => onRevert(entry)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
          style={{
            borderColor: "#c8102e",
            color: "#f87171",
            backgroundColor: "rgba(200,16,46,0.08)",
          }}
        >
          Revertir
        </button>
      </div>
    </div>
  );
}

// ── Revert logic ────────────────────────────────────────────────────

async function revertTrade(entry: TradeLogEntry): Promise<void> {
  const db = await getDB();
  const ops: StickerEntry[] = [];

  for (const id of entry.gave) {
    const current = await getSticker(id);
    ops.push({
      sticker_id: id,
      count: (current?.count ?? 0) + 1,
      acquired_at: Date.now(),
    });
  }
  for (const id of entry.received) {
    const current = await getSticker(id);
    const newCount = Math.max(0, (current?.count ?? 0) - 1);
    ops.push({
      sticker_id: id,
      count: newCount,
      acquired_at: Date.now(),
    });
  }

  await bulkSetStickers(ops);
  await db.delete("trade_log", entry.trade_id);
}

// ── Main page ────────────────────────────────────────────────────────

export default function TradeHistoryPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<TradeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRevert, setPendingRevert] = useState<TradeLogEntry | null>(null);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    getRecentTrades(50)
      .then(setTrades)
      .finally(() => setLoading(false));
  }, []);

  const handleRevertConfirm = async () => {
    if (!pendingRevert || reverting) return;
    setReverting(true);
    try {
      await revertTrade(pendingRevert);
      setTrades((prev) =>
        prev.filter((t) => t.trade_id !== pendingRevert.trade_id)
      );
    } finally {
      setReverting(false);
      setPendingRevert(null);
    }
  };

  return (
    <div
      className="home-dark flex flex-col flex-1 max-w-lg mx-auto w-full"
    >
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3"
        style={{
          background: "linear-gradient(180deg, #111827 0%, #0d1117 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="text-xl leading-none"
          style={{ color: "#f5f5f5" }}
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-lg font-black leading-none flex-1" style={{ color: "#f5f5f5" }}>
          Historial
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div
              className="w-8 h-8 rounded-full border-4 animate-spin"
              style={{
                borderColor: "#c2ef4e",
                borderTopColor: "transparent",
              }}
            />
          </div>
        ) : trades.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-4">
            <span className="text-5xl leading-none">📭</span>
            <div>
              <p className="font-bold mb-1" style={{ color: "#f5f5f5" }}>
                Todavía no hiciste ningún intercambio
              </p>
              <p className="text-sm" style={{ color: "#9ca3af" }}>
                Cuando hagas uno, va a aparecer acá.
              </p>
            </div>
            <button
              onClick={() => router.push("/trade")}
              className="mt-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ backgroundColor: "#006847" }}
            >
              Volver a intercambiar
            </button>
          </div>
        ) : (
          trades.map((entry) => (
            <TradeCard
              key={entry.trade_id}
              entry={entry}
              onRevert={setPendingRevert}
            />
          ))
        )}
      </main>

      {/* Confirm modal */}
      {pendingRevert && (
        <RevertModal
          entry={pendingRevert}
          onConfirm={handleRevertConfirm}
          onCancel={() => !reverting && setPendingRevert(null)}
        />
      )}
    </div>
  );
}

"use client";

/**
 * /trade — Initiator picker.
 *
 * Decision #9 / Fase 3A (S124):
 *   "Yo propongo" → /trade/propose  (I build the proposal and show QR_A1)
 *   "Yo recibo"   → /trade/receive  (I scan a friend's QR_A1 and respond)
 *
 * Dark theme: FUT dark palette matching /inicio + /album
 */

import { useRouter } from "next/navigation";

const _BG = "#0a0a0a";
const SURFACE = "rgba(26,26,26,0.95)";
const BORDER = "rgba(255,255,255,0.08)";
const GREEN = "#006847";
const GOLD = "#F4C84A";
const TEXT_PRIMARY = "#f5f5f5";
const TEXT_MUTED = "#9ca3af";

export default function TradePage() {
  const router = useRouter();

  return (
    <div
      className="home-dark flex flex-col flex-1 max-w-lg mx-auto w-full"
    >
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3"
        style={{
          background: "linear-gradient(180deg, #111827 0%, #0d1117 100%)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <a
          href="/album"
          style={{ color: TEXT_PRIMARY, fontSize: 20, lineHeight: 1 }}
          aria-label="Volver al álbum"
        >
          ←
        </a>
        <h1 className="text-lg font-black leading-none flex-1" style={{ color: TEXT_PRIMARY }}>
          Intercambiar
        </h1>
      </header>

      <main className="flex-1 flex flex-col justify-center px-5 gap-5 py-8">
        {/* F.4 — links to trade history and analytics */}
        <div className="flex justify-end gap-4">
          <a
            href="/trade/stats"
            className="text-sm underline"
            style={{ color: GOLD }}
            data-testid="trade-stats-link"
          >
            Análisis
          </a>
          <a
            href="/trade/history"
            className="text-sm underline"
            style={{ color: GOLD }}
          >
            Ver historial
          </a>
        </div>
        <p className="text-sm text-center mb-2" style={{ color: TEXT_MUTED }}>
          ¿Cómo arrancamos este intercambio?
        </p>

        {/* Yo propongo */}
        <button
          onClick={() => router.push("/trade/propose")}
          className="w-full rounded-2xl p-6 text-left flex flex-col gap-1 transition-all active:scale-[0.98]"
          style={{
            backgroundColor: GREEN,
            minHeight: 120,
          }}
        >
          <span className="text-2xl leading-none" style={{ color: "#fff" }}>↗</span>
          <span className="text-xl font-black text-white leading-snug mt-1">
            Yo propongo
          </span>
          <span className="text-sm leading-snug" style={{ color: "rgba(255,255,255,0.75)" }}>
            Le voy a ofrecer algo a alguien
          </span>
        </button>

        {/* Yo recibo */}
        <button
          onClick={() => router.push("/trade/receive")}
          className="w-full rounded-2xl p-6 text-left flex flex-col gap-1 transition-all active:scale-[0.98]"
          style={{
            backgroundColor: SURFACE,
            border: `2px solid ${BORDER}`,
            minHeight: 120,
          }}
        >
          <span className="text-2xl leading-none" style={{ color: GOLD }}>↙</span>
          <span
            className="text-xl font-black leading-snug mt-1"
            style={{ color: TEXT_PRIMARY }}
          >
            Yo recibo
          </span>
          <span className="text-sm leading-snug" style={{ color: TEXT_MUTED }}>
            Alguien me va a mostrar su QR
          </span>
        </button>
      </main>
    </div>
  );
}

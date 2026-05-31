"use client";

/**
 * /trade — Initiator picker.
 *
 * Decision #9 / Fase 3A (S124):
 *   "Yo propongo" → /trade/propose  (I build the proposal and show QR_A1)
 *   "Yo recibo"   → /trade/receive  (I scan a friend's QR_A1 and respond)
 */

import { useRouter } from "next/navigation";

export default function TradePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <a
          href="/album"
          className="text-white text-xl leading-none"
          aria-label="Volver al álbum"
        >
          ←
        </a>
        <h1 className="text-lg font-black text-white leading-none flex-1">
          Intercambiar
        </h1>
      </header>

      <main className="flex-1 flex flex-col justify-center px-5 gap-5 py-8">
        <p className="text-sm text-gray-500 text-center mb-2">
          ¿Cómo arrancamos este intercambio?
        </p>

        {/* Yo propongo */}
        <button
          onClick={() => router.push("/trade/propose")}
          className="w-full rounded-2xl p-6 text-left flex flex-col gap-1 transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "#006847",
            minHeight: 120,
          }}
        >
          <span className="text-2xl leading-none">↗</span>
          <span className="text-xl font-black text-white leading-snug mt-1">
            Yo propongo
          </span>
          <span className="text-sm text-white/75 leading-snug">
            Le voy a ofrecer algo a alguien
          </span>
        </button>

        {/* Yo recibo */}
        <button
          onClick={() => router.push("/trade/receive")}
          className="w-full rounded-2xl p-6 text-left flex flex-col gap-1 transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "transparent",
            border: "2px solid #006847",
            minHeight: 120,
          }}
        >
          <span className="text-2xl leading-none">↙</span>
          <span
            className="text-xl font-black leading-snug mt-1"
            style={{ color: "#006847" }}
          >
            Yo recibo
          </span>
          <span className="text-sm leading-snug" style={{ color: "#444" }}>
            Alguien me va a mostrar su QR
          </span>
        </button>
      </main>
    </div>
  );
}

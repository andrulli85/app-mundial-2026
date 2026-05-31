"use client";

/**
 * /trade/receive/confirm — renders QR_B2 (type="acc") for the acceptor (B).
 *
 * Receives ?payload=<encoded>&gave=<csv>&received=<csv> from /trade/receive.
 * Shows QR for proposer (A) to scan, then "Listo, ir al álbum".
 */

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QrRenderer from "@/components/QrRenderer";

function ReceiveConfirmInner() {
  const params = useSearchParams();
  const router = useRouter();

  const qrString = params.get("payload") ?? "";
  const gaveParam = params.get("gave") ?? "";
  const receivedParam = params.get("received") ?? "";

  const gaveList = gaveParam.split(",").filter(Boolean);
  const receivedList = receivedParam.split(",").filter(Boolean);

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <h1 className="text-lg font-black text-white leading-none flex-1">
          Confirmá con el otro
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 items-center">
        {/* Big QR */}
        <div className="flex justify-center">
          <QrRenderer payload={qrString} size={300} />
        </div>

        {/* Instruction */}
        <div
          className="w-full rounded-xl p-4 text-center text-sm"
          style={{ backgroundColor: "#fff", border: "1px solid #e5e0d6" }}
        >
          <p className="text-gray-700 leading-snug">
            Mostrá este QR para que tu amigo confirme que el intercambio se hizo.
          </p>
        </div>

        {/* Summary */}
        <div
          className="w-full rounded-xl p-4"
          style={{ backgroundColor: "#fff", border: "1px solid #e5e0d6" }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-start">
              <span
                className="text-xs font-bold uppercase tracking-wide mt-0.5"
                style={{ color: "#c8102e", minWidth: 64 }}
              >
                Vos das:
              </span>
              <span className="text-sm text-gray-700 leading-snug">
                {gaveList.join(", ") || "—"}
              </span>
            </div>
            <div className="flex gap-2 items-start">
              <span
                className="text-xs font-bold uppercase tracking-wide mt-0.5"
                style={{ color: "#006847", minWidth: 64 }}
              >
                Recibís:
              </span>
              <span className="text-sm text-gray-700 leading-snug">
                {receivedList.join(", ") || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push("/album")}
          className="w-full py-3.5 rounded-xl font-black text-lg text-white transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#006847" }}
        >
          Listo, ir al álbum
        </button>
      </main>
    </div>
  );
}

export default function ReceiveConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "#006847", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <ReceiveConfirmInner />
    </Suspense>
  );
}

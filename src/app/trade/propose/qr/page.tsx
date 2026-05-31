"use client";

/**
 * /trade/propose/qr — renders QR_A1 (type="req") for the proposer.
 *
 * Receives ?payload=<encoded>&give=<csv>&want=<csv> from /trade/propose.
 * Shows the big QR + summary, then offers "Escanear su QR" → /trade/receive?mode=confirm
 */

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
import QrRenderer from "@/components/QrRenderer";

function ProposeQrInner() {
  const params = useSearchParams();
  const router = useRouter();

  const qrString = params.get("payload") ?? "";
  const giveParam = params.get("give") ?? "";
  const wantParam = params.get("want") ?? "";

  const giveList = useMemo(
    () => giveParam.split(",").filter(Boolean),
    [giveParam]
  );
  const wantList = useMemo(
    () => wantParam.split(",").filter(Boolean),
    [wantParam]
  );

  const giveSummary = giveList.join(", ");
  const wantSummary = wantList.join(", ");

  const handleScanConfirm = () => {
    // Pass the proposer's payload so /trade/receive can log the trade on A's side
    router.push(
      `/trade/receive?mode=confirm&proposerPayload=${encodeURIComponent(qrString)}`
    );
  };

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <button
          onClick={() => router.back()}
          className="text-white text-xl leading-none"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-lg font-black text-white leading-none flex-1">
          Tu propuesta
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
            Mostrá este QR a tu amigo. Cuando él escanee y acepte, te va a mostrar su QR de vuelta.
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
                style={{ color: "#006847", minWidth: 48 }}
              >
                Doy:
              </span>
              <span className="text-sm text-gray-700 leading-snug">{giveSummary || "—"}</span>
            </div>
            <div className="flex gap-2 items-start">
              <span
                className="text-xs font-bold uppercase tracking-wide mt-0.5"
                style={{ color: "#c8102e", minWidth: 48 }}
              >
                Quiero:
              </span>
              <span className="text-sm text-gray-700 leading-snug">{wantSummary || "—"}</span>
            </div>
          </div>
        </div>

        {/* CTA — scan friend's acceptance QR */}
        <button
          onClick={handleScanConfirm}
          className="w-full py-3.5 rounded-xl font-black text-lg text-white transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#006847" }}
        >
          Escanear su QR
        </button>

        <button
          onClick={() => router.push("/trade/propose")}
          className="text-sm text-gray-400 underline"
        >
          Cambiar propuesta
        </button>
      </main>
    </div>
  );
}

export default function ProposeQrPage() {
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
      <ProposeQrInner />
    </Suspense>
  );
}

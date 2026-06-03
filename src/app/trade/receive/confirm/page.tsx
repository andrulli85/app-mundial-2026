"use client";

/**
 * /trade/receive/confirm — renders QR_B2 (type="acc") for the acceptor (B).
 *
 * Receives ?payload=<encoded>&gave=<csv>&received=<csv> from /trade/receive.
 * Shows QR for proposer (A) to scan, then "Listo, ir al álbum".
 *
 * E.3 (S124): Web Share API button — generates deep link /scan?p=<payload>
 * so acceptor can also share via WhatsApp. Falls back to clipboard copy.
 */

import { Suspense, useState } from "react";
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

  const [toastMsg, setToastMsg] = useState("");

  // E.3 — Web Share API: generate deep link and share/copy
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/scan?p=${encodeURIComponent(qrString)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Albumix · Intercambio de figuritas",
          text: "Acepté tu intercambio. Tap el link para confirmar:",
          url: shareUrl,
        });
      } catch {
        // user cancelled — ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToastMsg("Link copiado al portapapeles");
        setTimeout(() => setToastMsg(""), 3000);
      } catch {
        setToastMsg("No se pudo copiar el link");
        setTimeout(() => setToastMsg(""), 3000);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full" style={{ backgroundColor: "var(--bg-1)" }}>
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "var(--bg-1)", borderBottom: "1px solid var(--line)" }}
      >
        <h1 className="text-lg font-black leading-none flex-1" style={{ color: "var(--fg-1)" }}>
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
          style={{ backgroundColor: "var(--bg-2)", border: "1px solid var(--line)" }}
        >
          <p className="leading-snug" style={{ color: "var(--fg-2)" }}>
            Mostrá este QR para que tu amigo confirme que el intercambio se hizo.
          </p>
        </div>

        {/* Summary — 2-pane trade preview */}
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--line-gold)" }}
        >
          <div className="p-4" style={{ backgroundColor: "var(--bg-2)" }}>
            <div className="flex gap-2 items-start">
              <span
                className="text-xs font-bold uppercase tracking-wide mt-0.5"
                style={{ color: "var(--red)", minWidth: 64 }}
              >
                Vos das:
              </span>
              <span className="text-sm leading-snug" style={{ color: "var(--fg-1)" }}>
                {gaveList.join(", ") || "—"}
              </span>
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: "var(--line-gold)" }} />
          <div className="p-4" style={{ backgroundColor: "var(--bg-2)" }}>
            <div className="flex gap-2 items-start">
              <span
                className="text-xs font-bold uppercase tracking-wide mt-0.5"
                style={{ color: "var(--green-bright)", minWidth: 64 }}
              >
                Recibís:
              </span>
              <span className="text-sm leading-snug" style={{ color: "var(--fg-1)" }}>
                {receivedList.join(", ") || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* E.3 — Share button */}
        <button
          onClick={handleShare}
          className="w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "var(--bg-2)",
            border: "1.5px solid var(--line-gold)",
            color: "var(--fg-1)",
          }}
        >
          Compartir por WhatsApp
        </button>

        {/* Toast */}
        {toastMsg && (
          <p className="text-xs text-center" style={{ color: "var(--gold)" }}>
            {toastMsg}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={() => router.push("/album")}
          className="w-full py-3.5 rounded-xl font-black text-lg transition-all active:scale-[0.98] active:opacity-80"
          style={{ background: "var(--foil-gold)", color: "#111111" }}
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
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "var(--bg-1)" }}>
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <ReceiveConfirmInner />
    </Suspense>
  );
}

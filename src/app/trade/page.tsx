"use client";

/**
 * Trade screen — 3-step QR exchange flow.
 *
 * Step 1 — Propose:  select what I give (from my duplicates) + what I want
 *                    → Generar QR → renders QR_A1
 * Step 2 — Scan:     camera opens, scans friend's QR
 *                    If QR_A1 (req) → show proposal + Accept button
 *                    If QR_B2 (acc) → confirm trade, update IndexedDB
 * Step 3 — Confirm:  render QR_B2 with my updated state
 *
 * QR engine is placeholder (Stream C fills it in).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QrRenderer from "@/components/QrRenderer";
import QrScanner from "@/components/QrScanner";
import {
  getNickname,
  getAllStickers,
  getSticker,
  setSticker,
  logTrade,
} from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import {
  encodeTradePayload,
  decodeTradePayload,
  TradePayload,
} from "@/lib/qr-engine";

type Step = "propose" | "scan" | "confirm";

export default function TradePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("propose");
  const [catalog, setCatalog] = useState<Sticker[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedGive, setSelectedGive] = useState<Set<string>>(new Set());
  const [selectedWant, setSelectedWant] = useState<Set<string>>(new Set());

  // QR state
  const [myQrPayload, setMyQrPayload] = useState("");
  const [scannedPayload, setScannedPayload] = useState<TradePayload | null>(null);
  const [tradeError, setTradeError] = useState("");

  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }
      setNickname(nick);

      const [cat, entries] = await Promise.all([
        getCatalog(),
        getAllStickers(),
      ]);

      const cm: Record<string, number> = {};
      entries.forEach((e) => (cm[e.sticker_id] = e.count));
      setCatalog(cat);
      setCounts(cm);
      setLoading(false);
    })();
  }, [router]);

  // Stickers I can offer (duplicates: count >= 2)
  const offerableStickers = useMemo(
    () => catalog.filter((s) => (counts[s.id] ?? 0) >= 2),
    [catalog, counts]
  );

  // Stickers I want (missing: count == 0)
  const wantableStickers = useMemo(
    () => catalog.filter((s) => (counts[s.id] ?? 0) === 0),
    [catalog, counts]
  );

  const toggleSelect = (
    id: string,
    set: Set<string>,
    setter: (s: Set<string>) => void
  ) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const handleGenerateQr = useCallback(() => {
    if (selectedGive.size === 0 || selectedWant.size === 0) {
      setTradeError("Seleccioná al menos una figurita para dar y una para pedir.");
      return;
    }
    setTradeError("");

    const payload: TradePayload = {
      v: 1,
      type: "req",
      uid: nickname,
      ts: Date.now(),
      have: "",  // Stream C fills compact bitsets
      repes: "", // Stream C fills
      give: Array.from(selectedGive),
      want: Array.from(selectedWant),
    };

    setMyQrPayload(encodeTradePayload(payload));
    setStep("scan");
  }, [selectedGive, selectedWant, nickname]);

  const handleScanned = useCallback(
    async (text: string) => {
      const payload = decodeTradePayload(text);
      if (!payload) {
        setTradeError("QR no reconocido. Pedile a tu amigo que lo muestre de nuevo.");
        return;
      }
      setTradeError("");

      if (payload.type === "req") {
        // Friend wants to trade — show proposal to accept
        setScannedPayload(payload);
      } else if (payload.type === "acc") {
        // Friend accepted — apply trade to my collection
        await applyAcceptedTrade(payload);
      }
    },
    // deps intentionally limited — applyAcceptedTrade is stable
    [counts]
  );

  const applyAcceptedTrade = async (accepted: TradePayload) => {
    // accepted.give = what friend is giving me (I receive)
    // accepted.want = what friend wants from me (I give)
    const received = accepted.give;
    const gave = accepted.want;

    // Update my collection
    for (const id of received) {
      const current = await getSticker(id);
      await setSticker({
        sticker_id: id,
        count: (current?.count ?? 0) + 1,
        acquired_at: Date.now(),
      });
    }
    for (const id of gave) {
      const current = await getSticker(id);
      const newCount = Math.max(0, (current?.count ?? 0) - 1);
      await setSticker({
        sticker_id: id,
        count: newCount,
        acquired_at: Date.now(),
      });
    }

    // Log trade
    await logTrade({
      trade_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ts: Date.now(),
      partner: accepted.uid,
      gave,
      received,
    });

    // Refresh counts
    const entries = await getAllStickers();
    const cm: Record<string, number> = {};
    entries.forEach((e) => (cm[e.sticker_id] = e.count));
    setCounts(cm);

    setStep("confirm");
    setMyQrPayload(""); // reset
  };

  const handleAcceptProposal = useCallback(async () => {
    if (!scannedPayload) return;

    // Build acceptance QR_B2
    const acceptPayload: TradePayload = {
      v: 1,
      type: "acc",
      uid: nickname,
      ts: Date.now(),
      have: "",
      repes: "",
      give: scannedPayload.want,    // I give what they want
      want: scannedPayload.give,    // I receive what they give
    };

    // Apply to my collection immediately
    await applyAcceptedTrade({
      ...acceptPayload,
      give: scannedPayload.give,  // what I receive = what they offered
      want: scannedPayload.want,  // what I give = what they requested
    });

    setMyQrPayload(encodeTradePayload(acceptPayload));
    setStep("confirm");
  }, [scannedPayload, nickname]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: "#006847", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

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
          Intercambio
        </h1>
        {/* Step indicator */}
        <div className="flex gap-1.5">
          {(["propose", "scan", "confirm"] as Step[]).map((s, i) => (
            <div
              key={s}
              className="w-2 h-2 rounded-full transition-colors"
              style={{
                backgroundColor:
                  step === s
                    ? "#c2ef4e"
                    : ["propose", "scan", "confirm"].indexOf(step) > i
                    ? "rgba(255,255,255,0.6)"
                    : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {/* STEP 1 — Propose */}
        {step === "propose" && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-gray-500 text-center">
              Seleccioná qué dar y qué querés. Después generamos un QR para tu amigo.
            </p>

            {/* Give section */}
            <section>
              <h2 className="font-bold text-gray-700 mb-2">
                Yo doy ({selectedGive.size} seleccionadas)
              </h2>
              {offerableStickers.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No tenés figuritas repetidas para ofrecer.
                </p>
              ) : (
                <div className="grid grid-cols-5 gap-1.5">
                  {offerableStickers.map((s) => (
                    <button
                      key={s.id}
                      onClick={() =>
                        toggleSelect(s.id, selectedGive, setSelectedGive)
                      }
                      className="relative rounded text-[0.5rem] font-semibold py-1 text-center transition-all"
                      style={{
                        backgroundColor: selectedGive.has(s.id)
                          ? s.team_color
                          : "#f0ece3",
                        color: selectedGive.has(s.id) ? "#fff" : "#555",
                        border: selectedGive.has(s.id)
                          ? `2px solid ${s.team_color}`
                          : "2px solid #d1c9b8",
                      }}
                    >
                      {s.code}
                      <span className="absolute -top-1 -right-1 bg-gray-600 text-white rounded-full text-[0.5rem] w-3.5 h-3.5 flex items-center justify-center">
                        {counts[s.id]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Want section */}
            <section>
              <h2 className="font-bold text-gray-700 mb-2">
                Quiero ({selectedWant.size} seleccionadas)
              </h2>
              {wantableStickers.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Tenés todas las figuritas. ¡Álbum completo!
                </p>
              ) : (
                <div className="grid grid-cols-5 gap-1.5">
                  {wantableStickers.slice(0, 100).map((s) => (
                    <button
                      key={s.id}
                      onClick={() =>
                        toggleSelect(s.id, selectedWant, setSelectedWant)
                      }
                      className="relative rounded text-[0.5rem] font-semibold py-1 text-center transition-all"
                      style={{
                        backgroundColor: selectedWant.has(s.id)
                          ? s.team_color
                          : "#f0ece3",
                        color: selectedWant.has(s.id) ? "#fff" : "#555",
                        border: selectedWant.has(s.id)
                          ? `2px solid ${s.team_color}`
                          : "2px solid #d1c9b8",
                      }}
                    >
                      {s.code}
                    </button>
                  ))}
                  {wantableStickers.length > 100 && (
                    <p className="col-span-5 text-xs text-gray-400 text-center mt-1">
                      +{wantableStickers.length - 100} más...
                    </p>
                  )}
                </div>
              )}
            </section>

            {tradeError && (
              <p className="text-sm text-red-600 text-center">{tradeError}</p>
            )}

            <button
              onClick={handleGenerateQr}
              disabled={selectedGive.size === 0 || selectedWant.size === 0}
              className="w-full py-3.5 rounded-xl font-black text-lg text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#006847" }}
            >
              Generar QR
            </button>
          </div>
        )}

        {/* STEP 2 — Scan / Show QR */}
        {step === "scan" && (
          <div className="flex flex-col gap-5 items-center">
            {!scannedPayload ? (
              <>
                {/* Show MY QR first */}
                <div className="text-center">
                  <p className="font-bold text-gray-700 mb-1">Mostrá este QR a tu amigo</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Tu amigo lo escanea, ve tu propuesta y puede aceptar.
                  </p>
                  <div className="flex justify-center">
                    <QrRenderer payload={myQrPayload} size={240} />
                  </div>
                </div>

                <div className="w-full border-t my-1" style={{ borderColor: "#d1c9b8" }} />

                {/* Then scan theirs */}
                <div className="w-full">
                  <p className="font-bold text-gray-700 mb-1 text-center">
                    Después escaneá el QR de tu amigo
                  </p>
                  <QrScanner onResult={handleScanned} />
                </div>

                {tradeError && (
                  <p className="text-sm text-red-600 text-center">{tradeError}</p>
                )}

                <button
                  onClick={() => setStep("propose")}
                  className="text-sm text-gray-500 underline"
                >
                  Volver a la propuesta
                </button>
              </>
            ) : (
              // Show received proposal
              <div className="w-full">
                <p className="font-bold text-gray-700 text-center mb-1">
                  Propuesta de {scannedPayload.uid}
                </p>
                <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "#fff" }}>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-green-700 mb-1">
                        Ellos dan
                      </p>
                      {scannedPayload.give.map((id) => (
                        <p key={id} className="text-xs text-gray-600">
                          {id}
                        </p>
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-red-600 mb-1">
                        Ellos piden
                      </p>
                      {scannedPayload.want.map((id) => (
                        <p key={id} className="text-xs text-gray-600">
                          {id}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAcceptProposal}
                  className="w-full py-3.5 rounded-xl font-black text-lg text-white"
                  style={{ backgroundColor: "#006847" }}
                >
                  Aceptar intercambio
                </button>
                <button
                  onClick={() => {
                    setScannedPayload(null);
                    setStep("propose");
                  }}
                  className="w-full mt-2 py-2 text-sm text-gray-500 underline"
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Confirm */}
        {step === "confirm" && (
          <div className="flex flex-col gap-5 items-center text-center">
            <p className="text-5xl" aria-hidden="true">
              ✅
            </p>
            <h2 className="text-xl font-black text-gray-800">
              ¡Intercambio listo!
            </h2>
            <p className="text-sm text-gray-500 max-w-xs">
              Tu colección se actualizó. Si sos vos el que inició, mostrá el QR
              de confirmación para que tu amigo lo escanee.
            </p>

            {myQrPayload && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  QR de confirmación (para tu amigo)
                </p>
                <QrRenderer payload={myQrPayload} size={220} />
              </div>
            )}

            <button
              onClick={() => {
                setStep("propose");
                setSelectedGive(new Set());
                setSelectedWant(new Set());
                setMyQrPayload("");
                setScannedPayload(null);
              }}
              className="w-full py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: "#006847" }}
            >
              Nuevo intercambio
            </button>
            <a
              href="/album"
              className="text-sm text-gray-500 underline"
            >
              Volver al álbum
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

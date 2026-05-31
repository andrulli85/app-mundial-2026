"use client";

/**
 * /trade/receive — QR scanner + proposal display.
 *
 * mode=initial (default, "Yo recibo" entry):
 *   Scan → if type="req" → show proposal + Accept / Decline
 *
 * mode=confirm ("Escanear su QR" from proposer flow):
 *   Scan → if type="acc" → apply trade to A's IndexedDB → /album
 *
 * Decision #9 / Fase 3 (S124).
 */

import {
  ChangeEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QrScanner from "@/components/QrScanner";
import {
  getNickname,
  getAllStickers,
  getSticker,
  setSticker,
  logTrade,
  collectionBitset,
  collectionRepeBitset,
} from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import {
  decodeTradePayload,
  encodeTradePayload,
  TradePayload,
} from "@/lib/qr-engine";

// ── helpers ─────────────────────────────────────────────────────────

function bytesToB64(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

// ── main component ──────────────────────────────────────────────────

function ReceiveInner() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = (params.get("mode") ?? "initial") as "initial" | "confirm";
  // proposerPayload is the original QR_A1 string — used in confirm mode to apply trade to A's side
  const proposerPayloadStr = params.get("proposerPayload") ?? "";

  const [nickname, setNickname] = useState("");
  const [scanned, setScanned] = useState<TradePayload | null>(null);
  const [scanError, setScanError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);

  // manual paste fallback
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");

  // active state — stop scanner once we have a result
  const [scanActive, setScanActive] = useState(true);

  // raw QR string from scanner — preserved for "Ver inventario" navigation
  const [rawQrString, setRawQrString] = useState("");

  // gallery fallback
  const fileInputRef = useRef<HTMLInputElement>(null);

  // prevent double-scan
  const processedRef = useRef(false);

  useEffect(() => {
    getNickname().then((n) => {
      if (!n) router.replace("/");
      else setNickname(n);
    });
  }, [router]);

  const handleScanResult = useCallback(
    (text: string) => {
      if (processedRef.current) return;
      const payload = decodeTradePayload(text);
      if (!payload) {
        setScanError("QR no reconocido. Pedile a tu amigo que lo muestre de nuevo.");
        return;
      }
      setScanError("");

      if (mode === "initial") {
        if (payload.type !== "req") {
          setScanError(
            "Ese QR no es de propuesta, es de confirmación. Usá 'Yo recibo' solo cuando tu amigo te muestra el primer QR."
          );
          return;
        }
      } else {
        // confirm mode
        if (payload.type !== "acc") {
          setScanError(
            "Ese QR no es de confirmación. Esperá el QR de aceptación de tu amigo."
          );
          return;
        }
      }

      processedRef.current = true;
      setScanActive(false);
      setRawQrString(text);
      setScanned(payload);
    },
    [mode]
  );

  const handleScanError = useCallback((err: Error) => {
    // camera permission denied
    if (
      err.name === "NotAllowedError" ||
      err.message.toLowerCase().includes("permission")
    ) {
      setShowPaste(true);
    }
  }, []);

  // E.2 — deep-link payload: auto-decode without opening camera
  useEffect(() => {
    const payloadParam = params.get("payload");
    if (!payloadParam) return;
    if (processedRef.current) return;
    try {
      const decoded = decodeTradePayload(decodeURIComponent(payloadParam));
      if (!decoded) {
        setScanError("El link es inválido o está corrupto");
        return;
      }
      processedRef.current = true;
      setScanActive(false);
      setRawQrString(decodeURIComponent(payloadParam));
      setScanned(decoded);
    } catch {
      setScanError("El link es inválido o está corrupto");
    }
  // Only run once on mount — params is stable enough for this
  }, []);

  // E.4 — gallery upload fallback
  const triggerGalleryPicker = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((r) => {
        img.onload = () => r();
      });

      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        const result = await reader.decodeFromImageElement(img);
        const qrString = result.getText();
        handleScanResult(qrString);
      } catch {
        setScanError(
          "No se pudo leer el QR de la imagen. Asegurate que esté nítido."
        );
      } finally {
        URL.revokeObjectURL(img.src);
        // reset input so the same file can be retried
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [handleScanResult]
  );

  const handlePasteSubmit = () => {
    setPasteError("");
    const payload = decodeTradePayload(pasteText.trim());
    if (!payload) {
      setPasteError("Código no válido. Revisá que lo copiaste completo.");
      return;
    }
    processedRef.current = true;
    setScanActive(false);
    setRawQrString(pasteText.trim());
    setScanned(payload);
  };

  // ── validate: do I have everything the proposer wants? ──
  const validateProposal = useCallback(
    async (proposal: TradePayload) => {
      const entries = await getAllStickers();
      const counts: Record<string, number> = {};
      entries.forEach((e) => (counts[e.sticker_id] = e.count));
      // want = what the proposer wants (= what I need to give)
      const missing = proposal.want.filter((id) => (counts[id] ?? 0) === 0);
      setMissingItems(missing);
    },
    []
  );

  useEffect(() => {
    if (scanned && mode === "initial") {
      validateProposal(scanned);
    }
  }, [scanned, mode, validateProposal]);

  // ── accept proposal (initial mode) ──
  const handleAccept = useCallback(async () => {
    if (!scanned || accepting) return;
    setAccepting(true);
    try {
      // scanned.give = what proposer gives me (I receive)
      // scanned.want = what proposer wants from me (I give)
      const received = scanned.give;
      const gave = scanned.want;

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
        await setSticker({ sticker_id: id, count: newCount, acquired_at: Date.now() });
      }

      await logTrade({
        trade_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ts: Date.now(),
        partner: scanned.uid,
        gave,
        received,
      });

      // Build QR_B2
      const cat = await getCatalog();
      const orderedIds = cat.map((s) => s.id);
      const [haveBuf, repesBuf] = await Promise.all([
        collectionBitset(orderedIds),
        collectionRepeBitset(orderedIds),
      ]);

      const acceptPayload: TradePayload = {
        v: 1,
        type: "acc",
        uid: nickname,
        ts: Date.now(),
        have: bytesToB64(haveBuf),
        repes: bytesToB64(repesBuf),
        give: gave,   // confirming what I give
        want: received, // confirming what I receive
      };

      const qrB2 = encodeTradePayload(acceptPayload);
      router.push(
        `/trade/receive/confirm?payload=${encodeURIComponent(qrB2)}&gave=${encodeURIComponent(gave.join(","))}&received=${encodeURIComponent(received.join(","))}`
      );
    } finally {
      setAccepting(false);
    }
  }, [scanned, accepting, nickname, router]);

  // ── confirm mode: apply trade to proposer's (A's) side ──
  const handleConfirmTrade = useCallback(async () => {
    if (!scanned || accepting) return;
    setAccepting(true);
    try {
      // scanned is type="acc"; scanned.give = what B gives A; scanned.want = what A gives B
      // But we are A here: received = scanned.give (what I receive from B)
      //                               gave = scanned.want (what I gave B)
      // Actually the proposer payload holds the original give/want from A's perspective.
      // Use the proposer payload if available, otherwise rely on scanned.
      let received: string[];
      let gave: string[];

      if (proposerPayloadStr) {
        const original = decodeTradePayload(proposerPayloadStr);
        if (original) {
          gave = original.give;     // what A originally offered
          received = original.want; // what A originally wanted
        } else {
          gave = scanned.want;
          received = scanned.give;
        }
      } else {
        gave = scanned.want;
        received = scanned.give;
      }

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
        await setSticker({ sticker_id: id, count: newCount, acquired_at: Date.now() });
      }

      await logTrade({
        trade_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ts: Date.now(),
        partner: scanned.uid,
        gave,
        received,
      });

      router.push("/album");
    } finally {
      setAccepting(false);
    }
  }, [scanned, accepting, proposerPayloadStr, router]);

  // ── render ──────────────────────────────────────────────────────

  const headerTitle = mode === "confirm" ? "Confirmar intercambio" : "Escanear propuesta";

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
          {headerTitle}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        {!scanned ? (
          <>
            {/* Camera view */}
            {!showPaste ? (
              <div className="flex flex-col gap-3">
                <QrScanner
                  onResult={handleScanResult}
                  onError={handleScanError}
                  active={scanActive}
                />
                <p className="text-sm text-gray-500 text-center">
                  {mode === "initial"
                    ? "Apuntá al QR que generó tu amigo."
                    : "Apuntá al QR de aceptación de tu amigo."}
                </p>
                {scanError && (
                  <p className="text-sm text-red-600 text-center bg-red-50 rounded-lg px-3 py-2">
                    {scanError}
                  </p>
                )}
                {/* E.4 — gallery upload fallback */}
                <button
                  onClick={triggerGalleryPicker}
                  className="text-xs text-gray-500 underline text-center"
                >
                  Subir QR desde galería
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <button
                  onClick={() => setShowPaste(true)}
                  className="text-xs text-gray-400 underline text-center"
                >
                  No tengo acceso a la cámara, pegar QR de texto
                </button>
              </div>
            ) : (
              /* Manual paste fallback */
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-600">
                  No tenemos acceso a la cámara. Pegá el texto del QR de tu amigo:
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={5}
                  className="w-full border rounded-lg p-3 text-sm font-mono focus:outline-none"
                  style={{ borderColor: "#d1c9b8", backgroundColor: "#fff" }}
                  placeholder="Pegá el código QR acá..."
                />
                {pasteError && (
                  <p className="text-sm text-red-600">{pasteError}</p>
                )}
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                  className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40"
                  style={{ backgroundColor: "#006847" }}
                >
                  Continuar
                </button>
                <button
                  onClick={() => setShowPaste(false)}
                  className="text-sm text-gray-400 underline text-center"
                >
                  Intentar con cámara
                </button>
              </div>
            )}
          </>
        ) : mode === "initial" ? (
          /* ── Proposal display (initial mode) ── */
          <ProposalDisplay
            payload={scanned}
            missingItems={missingItems}
            accepting={accepting}
            rawQrString={rawQrString}
            onAccept={handleAccept}
            onDecline={() => {
              processedRef.current = false;
              setScanned(null);
              setScanActive(true);
            }}
          />
        ) : (
          /* ── Confirm mode: scan succeeded ── */
          <div className="flex flex-col gap-5 items-center text-center">
            <div
              className="w-full rounded-xl p-5"
              style={{ backgroundColor: "#fff", border: "1px solid #e5e0d6" }}
            >
              <p className="font-bold text-gray-700 mb-1">
                QR de {scanned.uid} recibido
              </p>
              <p className="text-sm text-gray-500">
                El intercambio se confirmó. Tu colección está actualizada.
              </p>
            </div>
            <button
              onClick={handleConfirmTrade}
              disabled={accepting}
              className="w-full py-3.5 rounded-xl font-black text-lg text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#006847" }}
            >
              {accepting ? "Actualizando..." : "Listo, ir al álbum"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ── ProposalDisplay sub-component ──────────────────────────────────

interface ProposalDisplayProps {
  payload: TradePayload;
  missingItems: string[];
  accepting: boolean;
  rawQrString: string;
  onAccept: () => void;
  onDecline: () => void;
}

function ProposalDisplay({
  payload,
  missingItems,
  accepting,
  rawQrString,
  onAccept,
  onDecline,
}: ProposalDisplayProps) {
  const router = useRouter();
  const canAccept = missingItems.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="font-bold text-gray-700 text-center">
        Propuesta de <span style={{ color: "#006847" }}>{payload.uid}</span>
      </p>

      {/* What they give / want */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #e5e0d6" }}
      >
        <div className="p-4 bg-white">
          <p
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: "#006847" }}
          >
            Te ofrece
          </p>
          <div className="flex flex-wrap gap-1.5">
            {payload.give.map((id) => (
              <span
                key={id}
                className="px-2 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#006847" }}
              >
                {id}
              </span>
            ))}
          </div>
        </div>

        <div className="h-px" style={{ backgroundColor: "#e5e0d6" }} />

        <div className="p-4 bg-white">
          <p
            className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{ color: "#c8102e" }}
          >
            Quiere
          </p>
          <div className="flex flex-wrap gap-1.5">
            {payload.want.map((id) => (
              <span
                key={id}
                className="px-2 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#c8102e" }}
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Validation message */}
      {missingItems.length > 0 && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "#fff3cd", border: "1px solid #ffc107", color: "#664d03" }}
        >
          <p className="font-semibold mb-1">No podés aceptar esta propuesta</p>
          <p>
            No tenés:{" "}
            <span className="font-mono">{missingItems.join(", ")}</span>
          </p>
        </div>
      )}

      {/* Accept / Decline */}
      <div className="flex gap-3">
        <button
          onClick={onDecline}
          className="flex-1 py-3 rounded-xl font-bold text-sm border transition-colors"
          style={{ borderColor: "#d1c9b8", color: "#555", backgroundColor: "#fff" }}
        >
          Rechazar
        </button>
        <button
          onClick={onAccept}
          disabled={!canAccept || accepting}
          className="flex-1 py-3 rounded-xl font-black text-sm text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "#006847" }}
        >
          {accepting ? "Procesando..." : "Aceptar"}
        </button>
      </div>

      {/* Browse partner inventory */}
      {rawQrString && (
        <button
          onClick={() =>
            router.push(
              `/trade/browse?payload=${encodeURIComponent(rawQrString)}`
            )
          }
          className="w-full py-3 rounded-xl font-bold text-sm border transition-colors"
          style={{ borderColor: "#006847", color: "#006847", backgroundColor: "#fff" }}
        >
          Ver inventario de {payload.uid}
        </button>
      )}
    </div>
  );
}

// ── page export ─────────────────────────────────────────────────────

export default function ReceivePage() {
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
      <ReceiveInner />
    </Suspense>
  );
}

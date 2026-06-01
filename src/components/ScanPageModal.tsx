"use client";

/**
 * ScanPageModal — CV scan entry point for the physical Panini album.
 *
 * Flow:
 *   1. User taps "📸 Escanear página" → file picker opens (camera on mobile)
 *   2. Photo selected → preview + team hint dropdown shown
 *   3. POST /api/scan-page → Gemini detects filled slots
 *   4. Results modal: grid overlay, confidence pills, confirmation CTA
 *   5. "✓ Sí, marcarlas" → bulkSetStickers for confirmed IDs
 *   6. Toast + "Escanear otra página" option
 *
 * Hard constraints:
 *   - All text inputs font-size ≥ 16px (iOS zoom guard)
 *   - Max image 4 MB validated client-side before POST
 *   - Confidence threshold 0.7 — below → uncertain bucket
 */

import { useCallback, useRef, useState } from "react";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import { bulkSetStickers } from "@/lib/db";
import { slotsToStickerIds, resolutionToStickerEntries } from "@/lib/scan-resolution";
import type { ScanPageResponse } from "@/app/api/scan-page/route";
import { TEAM_CATALOG } from "@/lib/team-catalog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — mirrored from route.ts
const CONFIDENCE_THRESHOLD = 0.7;

// All team codes in display order (alphabetical by display name)
const TEAM_OPTIONS = [
  { value: "", label: "🔍 Auto-detectar" },
  ...Object.values(TEAM_CATALOG)
    .filter((t) => t.code !== "_PANINI")
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "es"))
    .map((t) => ({ value: t.code, label: `${t.flag} ${t.display_name}` })),
];

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

type ScanState = "idle" | "preview" | "scanning" | "results" | "done";

interface ScanResults {
  apiResponse: ScanPageResponse;
  confirmed: string[];
  uncertain: string[];
  unmapped: number[];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScanPageModalProps {
  /** Current sticker counts — needed to avoid downgrading existing counts */
  counts: Record<string, number>;
  /** Callback after stickers are marked — parent can refresh counts */
  onStickersBulkAdded: (ids: string[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScanPageModal({
  counts,
  onStickersBulkAdded,
}: ScanPageModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [teamCode, setTeamCode] = useState<string>("");
  const [gridHint, setGridHint] = useState<"4x4" | "4x5">("4x4");
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // ── Open file picker ────────────────────────────────────────────────────

  const openPicker = useCallback(() => {
    setErrorMsg(null);
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size guard — mirrors route.ts MAX_BYTES
    if (file.size > MAX_BYTES) {
      setErrorMsg(`La imagen es muy grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo 4 MB.`);
      e.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setScanResults(null);
    setErrorMsg(null);
    setState("preview");
    // Reset input so user can re-select same file
    e.target.value = "";
  }, []);

  // ── POST to /api/scan-page ──────────────────────────────────────────────

  const runScan = useCallback(async () => {
    if (!imageFile) return;
    setState("scanning");
    setErrorMsg(null);

    const form = new FormData();
    form.append("image", imageFile);
    if (teamCode) form.append("team_code", teamCode);
    form.append("expected_grid", gridHint);

    let apiResponse: ScanPageResponse;
    try {
      const res = await fetch("/api/scan-page", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          json?.message ?? `Error del servidor (${res.status})`;
        setErrorMsg(msg);
        setState("preview");
        return;
      }
      apiResponse = json as ScanPageResponse;
    } catch {
      setErrorMsg("No se pudo conectar al servidor. Revisá tu conexión.");
      setState("preview");
      return;
    }

    // Resolve detections → sticker IDs
    const catalog: Sticker[] = await getCatalog();
    const effectiveTeam = apiResponse.team_code ?? teamCode ?? "";

    const { confirmed, uncertain, unmapped } = slotsToStickerIds(
      effectiveTeam,
      apiResponse.detections,
      catalog,
      CONFIDENCE_THRESHOLD,
    );

    setScanResults({ apiResponse, confirmed, uncertain, unmapped });
    setState("results");
  }, [imageFile, teamCode, gridHint]);

  // ── Apply confirmed stickers ────────────────────────────────────────────

  const applyStickers = useCallback(async () => {
    if (!scanResults) return;

    const allIds = [...scanResults.confirmed, ...scanResults.uncertain];
    if (allIds.length === 0) {
      setState("done");
      return;
    }

    const entries = resolutionToStickerEntries(allIds, counts);
    await bulkSetStickers(entries);
    onStickersBulkAdded(allIds);

    setToastMsg(`✓ ${allIds.length} figuritas agregadas`);
    setTimeout(() => setToastMsg(null), 3500);
    setState("done");
  }, [scanResults, counts, onStickersBulkAdded]);

  // ── Reset for another scan ──────────────────────────────────────────────

  const reset = useCallback(() => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setScanResults(null);
    setErrorMsg(null);
    setTeamCode("");
    setGridHint("4x4");
    setState("idle");
  }, [imagePreviewUrl]);

  // ── Helpers ────────────────────────────────────────────────────────────

  const detectedTeamLabel = (): string => {
    const code = scanResults?.apiResponse.team_code ?? teamCode;
    if (!code) return "equipo desconocido";
    const entry = TEAM_CATALOG[code];
    return entry ? `${entry.flag} ${entry.display_name}` : code;
  };

  const confirmedCount = scanResults
    ? scanResults.confirmed.length + scanResults.uncertain.length
    : 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input — capture="environment" = rear camera on iOS */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileSelected}
        data-testid="scan-file-input"
        aria-label="Seleccionar foto de página del álbum"
      />

      {/* ── FAB — Scan button ── */}
      <button
        onClick={openPicker}
        data-testid="scan-page-btn"
        aria-label="Escanear página del álbum con cámara"
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold shadow-lg transition-transform active:scale-95"
        style={{
          background: "linear-gradient(135deg, #facc15 0%, #f59e0b 100%)",
          color: "#0a0a0a",
          boxShadow: "0 4px 16px rgba(250,204,21,0.4)",
        }}
      >
        <span aria-hidden="true">📸</span>
        Escanear página
      </button>

      {/* ── Modal overlay — visible in preview / scanning / results / done states ── */}
      {state !== "idle" && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
          data-testid="scan-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Escanear página del álbum"
        >
          {/* Close button */}
          <button
            onClick={reset}
            className="absolute top-4 right-4 text-2xl leading-none z-10"
            style={{ color: "#9ca3af" }}
            aria-label="Cerrar"
          >
            ×
          </button>

          {/* ── PREVIEW STATE ── */}
          {(state === "preview" || state === "scanning") && imagePreviewUrl && (
            <div className="flex flex-col h-full overflow-y-auto px-4 pt-12 pb-8 gap-4">
              <h2
                className="text-center font-black text-lg uppercase tracking-wider"
                style={{ color: "#facc15" }}
              >
                📸 Escanear página
              </h2>

              {/* Photo preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Foto de la página del álbum"
                className="w-full max-h-64 object-contain rounded-xl"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              />

              {/* Team hint selector */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="scan-team-select"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#9ca3af" }}
                >
                  ¿De qué equipo es esta página?
                </label>
                <select
                  id="scan-team-select"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  data-testid="scan-team-select"
                  className="rounded-xl px-3 py-2 outline-none"
                  style={{
                    fontSize: "16px", // iOS zoom guard
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#f5f5f5",
                  }}
                >
                  {TEAM_OPTIONS.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      style={{ backgroundColor: "#1a1a1a", color: "#f5f5f5" }}
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid hint selector */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="scan-grid-select"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#9ca3af" }}
                >
                  Disposición de la grilla
                </label>
                <select
                  id="scan-grid-select"
                  value={gridHint}
                  onChange={(e) => setGridHint(e.target.value as "4x4" | "4x5")}
                  data-testid="scan-grid-select"
                  className="rounded-xl px-3 py-2 outline-none"
                  style={{
                    fontSize: "16px", // iOS zoom guard
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#f5f5f5",
                  }}
                >
                  <option value="4x4" style={{ backgroundColor: "#1a1a1a" }}>4×4 (16 figuritas — estándar)</option>
                  <option value="4x5" style={{ backgroundColor: "#1a1a1a" }}>4×5 (20 figuritas)</option>
                </select>
              </div>

              {/* Error message */}
              {errorMsg && (
                <p
                  className="text-sm text-center rounded-xl px-3 py-2"
                  style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
                  role="alert"
                >
                  {errorMsg}
                </p>
              )}

              {/* Scan CTA */}
              <button
                onClick={runScan}
                disabled={state === "scanning"}
                data-testid="scan-submit-btn"
                className="w-full rounded-xl py-3.5 font-bold text-base transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #facc15 0%, #f59e0b 100%)",
                  color: "#0a0a0a",
                  fontSize: "16px",
                }}
              >
                {state === "scanning" ? (
                  <>
                    <span
                      className="w-5 h-5 rounded-full border-2 animate-spin inline-block"
                      style={{ borderColor: "#0a0a0a", borderTopColor: "transparent" }}
                    />
                    Detectando figuritas...
                  </>
                ) : (
                  "🔍 Detectar figuritas"
                )}
              </button>

              <button
                onClick={reset}
                className="text-sm text-center"
                style={{ color: "#6b7280" }}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* ── RESULTS STATE ── */}
          {state === "results" && scanResults && (
            <div className="flex flex-col h-full overflow-y-auto px-4 pt-12 pb-8 gap-4">
              <h2
                className="text-center font-black text-lg uppercase tracking-wider"
                style={{ color: "#facc15" }}
              >
                Resultado del escaneo
              </h2>

              {/* Photo with slot overlay */}
              <div className="relative rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl!}
                  alt="Foto escaneada"
                  className="w-full object-contain"
                  style={{ maxHeight: "220px" }}
                />

                {/* Grid overlay — absolute positioned on top of photo */}
                <div
                  className="absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: `repeat(${scanResults.apiResponse.grid.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${scanResults.apiResponse.grid.rows}, 1fr)`,
                    gap: "2px",
                    padding: "2px",
                  }}
                >
                  {scanResults.apiResponse.detections.map((d) => {
                    const isConfirmed = scanResults.confirmed.some(
                      (_, i) => {
                        // Map back: confirmed[i] corresponds to sorted confirmed detections
                        // We use slot position color logic directly from detection
                        return false; // placeholder — visual is done by detection directly
                      }
                    );
                    void isConfirmed;
                    const inConfirmed =
                      d.filled && d.confidence >= CONFIDENCE_THRESHOLD;
                    const inUncertain =
                      d.filled && d.confidence < CONFIDENCE_THRESHOLD;

                    return (
                      <div
                        key={d.slot}
                        className="rounded flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: inConfirmed
                            ? "rgba(34,197,94,0.35)"
                            : inUncertain
                            ? "rgba(251,191,36,0.3)"
                            : "rgba(0,0,0,0.15)",
                          border: inConfirmed
                            ? "1px solid rgba(34,197,94,0.7)"
                            : inUncertain
                            ? "1px solid rgba(251,191,36,0.6)"
                            : "1px solid rgba(255,255,255,0.08)",
                          color: inConfirmed ? "#4ade80" : inUncertain ? "#fde68a" : "transparent",
                        }}
                      >
                        {inConfirmed ? "✓" : inUncertain ? "?" : ""}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 justify-center text-xs" style={{ color: "#9ca3af" }}>
                <span className="flex items-center gap-1">
                  <span style={{ color: "#4ade80" }}>✓</span> Con figurita
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ color: "#fde68a" }}>?</span> Incierta
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ color: "#6b7280" }}>□</span> Vacía
                </span>
              </div>

              {/* Summary */}
              <div
                className="rounded-xl px-4 py-3 text-center"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="font-bold text-base" style={{ color: "#f5f5f5" }}>
                  Detectamos {confirmedCount} figuritas de{" "}
                  <span style={{ color: "#facc15" }}>{detectedTeamLabel()}</span>
                </p>
                {scanResults.uncertain.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                    ({scanResults.confirmed.length} seguras + {scanResults.uncertain.length} inciertas incluidas)
                  </p>
                )}
                {scanResults.unmapped.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
                    {scanResults.unmapped.length} slots no encontrados en el catálogo
                  </p>
                )}
              </div>

              {/* Confidence pills */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {scanResults.apiResponse.detections
                  .filter((d) => d.filled)
                  .map((d) => (
                    <span
                      key={d.slot}
                      className="text-xs rounded-full px-2 py-0.5 font-mono"
                      style={{
                        backgroundColor:
                          d.confidence >= CONFIDENCE_THRESHOLD
                            ? "rgba(34,197,94,0.2)"
                            : "rgba(251,191,36,0.2)",
                        color:
                          d.confidence >= CONFIDENCE_THRESHOLD ? "#4ade80" : "#fde68a",
                        border: `1px solid ${d.confidence >= CONFIDENCE_THRESHOLD ? "rgba(34,197,94,0.4)" : "rgba(251,191,36,0.4)"}`,
                      }}
                    >
                      #{d.slot} {Math.round(d.confidence * 100)}%
                    </span>
                  ))}
              </div>

              {/* CTAs */}
              {confirmedCount > 0 ? (
                <button
                  onClick={applyStickers}
                  data-testid="scan-confirm-btn"
                  className="w-full rounded-xl py-3.5 font-bold transition-opacity flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #facc15 0%, #f59e0b 100%)",
                    color: "#0a0a0a",
                    fontSize: "16px",
                  }}
                >
                  ✓ Sí, marcarlas
                </button>
              ) : (
                <p className="text-center text-sm" style={{ color: "#9ca3af" }}>
                  No detectamos figuritas con confianza suficiente
                </p>
              )}

              <button
                onClick={reset}
                data-testid="scan-discard-btn"
                className="text-sm text-center"
                style={{ color: "#6b7280" }}
              >
                ↺ Volver
              </button>
            </div>
          )}

          {/* ── DONE STATE ── */}
          {state === "done" && (
            <div className="flex flex-col h-full items-center justify-center gap-6 px-4">
              <span className="text-6xl" aria-hidden="true">✅</span>
              <p className="text-xl font-bold text-center" style={{ color: "#facc15" }}>
                {toastMsg ?? "¡Listo!"}
              </p>
              <button
                onClick={reset}
                data-testid="scan-another-btn"
                className="rounded-xl px-6 py-3 font-bold"
                style={{
                  background: "linear-gradient(135deg, #facc15 0%, #f59e0b 100%)",
                  color: "#0a0a0a",
                  fontSize: "16px",
                }}
              >
                📸 Escanear otra página
              </button>
              <button
                onClick={reset}
                className="text-sm"
                style={{ color: "#6b7280" }}
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Toast — shown even outside modal (after done, modal closes) ── */}
      {toastMsg && state !== "done" && (
        <div
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-bold shadow-lg"
          style={{
            backgroundColor: "#052e16",
            border: "1px solid #166534",
            color: "#4ade80",
            whiteSpace: "nowrap",
          }}
          role="status"
          aria-live="polite"
        >
          {toastMsg}
        </div>
      )}
    </>
  );
}

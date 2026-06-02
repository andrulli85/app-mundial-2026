"use client";

/**
 * Import from Figuritas.app
 *
 * Lets users paste their "Me faltan" WhatsApp export from Figuritas.app
 * and migrate their collection to Albumix in one shot.
 *
 * Flow: paste → parse preview → confirm → write to IndexedDB → /album
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { previewImport, executeImport } from "@/lib/figuritas-import";
import type { ImportPreview } from "@/lib/figuritas-import";

type Step = "paste" | "preview" | "done";

const PLACEHOLDER = `Figuritas App - Lista
Usa Méx Can 26
Me faltan
FWC 🏆: 1
FWC 🌎: 8
MEX 🇲🇽: 1, 2, 5, 6
RSA 🇿🇦: 2, 3, 6, 7...`;

export default function ImportPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("paste");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await previewImport(text);
      setPreview(result);
      setStep("preview");
    } catch (err) {
      setError("Error al procesar la lista. Verificá que el texto sea correcto.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      await executeImport(text);
      setStep("done");
      // Small delay so user sees the "done" state before redirect
      setTimeout(() => {
        router.push("/album?imported=true");
      }, 1200);
    } catch (err) {
      setError("Error al importar. Intentá de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col flex-1 max-w-lg mx-auto w-full"
      style={{ background: "var(--bg-1)" }}
    >
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "var(--bg-1)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          onClick={() => {
            if (step === "preview") {
              setStep("paste");
            } else {
              router.back();
            }
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--fg-2)",
            fontSize: 20,
            lineHeight: 1,
            padding: "4px 8px",
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Volver"
        >
          ←
        </button>
        <h1
          style={{
            fontSize: 17,
            fontWeight: 900,
            color: "var(--fg-1)",
            fontFamily: "var(--font-ui)",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Importar desde Figuritas.app
        </h1>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-5">
        {step === "paste" && (
          <>
            {/* Instructions */}
            <section
              style={{
                backgroundColor: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                padding: "var(--s-4)",
                boxShadow: "var(--sh-2)",
              }}
            >
              <h2
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--fg-1)",
                  marginBottom: 8,
                  fontFamily: "var(--font-ui)",
                }}
              >
                Cómo importar
              </h2>
              <ol
                className="flex flex-col gap-1.5 list-decimal list-inside"
                style={{ fontSize: 13, color: "var(--fg-2)" }}
              >
                <li>Abrí la app Figuritas en tu celular.</li>
                <li>Entrá a tu lista "Me faltan" y usá el botón compartir.</li>
                <li>Copiá el texto completo que empieza con "Figuritas App - Lista".</li>
                <li>Pegalo en el campo de abajo y tocá Parsear lista.</li>
              </ol>
            </section>

            {/* Textarea drop zone */}
            <section
              style={{
                backgroundColor: "var(--bg-2)",
                border: "1px solid var(--line-gold)",
                borderRadius: "var(--r-lg)",
                padding: "var(--s-4)",
                boxShadow: "var(--sh-2)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <label
                htmlFor="figuritas-text"
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--fg-1)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                Pegá tu lista "Me faltan"
              </label>
              <textarea
                id="figuritas-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={10}
                className="w-full resize-none font-mono"
                style={{
                  backgroundColor: "var(--bg-3)",
                  border: "1.5px solid var(--line-strong)",
                  borderRadius: "var(--r-md)",
                  padding: "12px 14px",
                  fontSize: "16px", // Prevents iOS zoom on focus
                  lineHeight: "1.4",
                  color: "var(--fg-1)",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {error && (
                <p style={{ fontSize: 13, color: "var(--red-bright)" }}>{error}</p>
              )}
              <button
                onClick={handleParse}
                disabled={!text.trim() || loading}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: "var(--r-md)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: ".04em",
                  background: loading || !text.trim() ? "var(--bg-3)" : "var(--foil-gold-soft)",
                  color: loading || !text.trim() ? "var(--fg-3)" : "var(--fg-onlight)",
                  border: loading || !text.trim() ? "1px solid var(--line-strong)" : "none",
                  cursor: loading || !text.trim() ? "default" : "pointer",
                  opacity: loading || !text.trim() ? 0.5 : 1,
                  minHeight: 44,
                  textTransform: "uppercase",
                  transition: "opacity 0.15s",
                }}
              >
                {loading ? "Procesando..." : "Parsear lista"}
              </button>
            </section>
          </>
        )}

        {step === "preview" && preview && (
          <>
            {/* Summary card */}
            <section
              style={{
                backgroundColor: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                padding: "var(--s-4)",
                boxShadow: "var(--sh-2)",
              }}
            >
              <h2
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--fg-1)",
                  marginBottom: 12,
                  fontFamily: "var(--font-ui)",
                }}
              >
                Resumen de la importación
              </h2>

              <div className="flex flex-col gap-2">
                <div
                  className="flex justify-between text-sm"
                  style={{ color: "var(--fg-2)" }}
                >
                  <span>Equipos reconocidos</span>
                  <span style={{ fontWeight: 700, color: "var(--fg-1)" }}>
                    {preview.affectedTeamCodes.length}
                  </span>
                </div>
                <div
                  className="flex justify-between text-sm"
                  style={{ color: "var(--fg-2)" }}
                >
                  <span>Figuritas reconocidas en total</span>
                  <span style={{ fontWeight: 700, color: "var(--fg-1)" }}>
                    {preview.totalResolved}
                  </span>
                </div>
                <div
                  className="flex justify-between text-sm py-2 px-3 rounded-xl"
                  style={{
                    backgroundColor: "rgba(228,0,43,0.1)",
                    border: "1px solid rgba(228,0,43,0.2)",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--red-bright)" }}>
                    Te faltan
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--red-bright)" }}>
                    {preview.missingCount}
                  </span>
                </div>
                <div
                  className="flex justify-between text-sm py-2 px-3 rounded-xl"
                  style={{
                    backgroundColor: "rgba(0,162,75,0.1)",
                    border: "1px solid rgba(0,162,75,0.2)",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--green-bright)" }}>
                    Se marcarán como tenidas
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--green-bright)" }}>
                    {preview.ownedCount}
                  </span>
                </div>
              </div>
            </section>

            {/* Warnings */}
            {preview.unknownTeamCodes.length > 0 && (
              <section
                style={{
                  backgroundColor: "rgba(244,200,74,0.08)",
                  border: "1px solid rgba(244,200,74,0.25)",
                  borderRadius: "var(--r-lg)",
                  padding: "var(--s-4)",
                }}
              >
                <h3 style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 4, fontSize: 13 }}>
                  Equipos no reconocidos (se ignoran)
                </h3>
                <p style={{ fontSize: 12, color: "var(--fg-3)" }}>
                  {preview.unknownTeamCodes.join(", ")}
                </p>
              </section>
            )}

            {preview.unmatchedLines.length > 0 && (
              <section
                style={{
                  backgroundColor: "rgba(244,200,74,0.08)",
                  border: "1px solid rgba(244,200,74,0.25)",
                  borderRadius: "var(--r-lg)",
                  padding: "var(--s-4)",
                }}
              >
                <h3 style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 4, fontSize: 13 }}>
                  Líneas no parseadas
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {preview.unmatchedLines.map((line, i) => (
                    <li key={i} className="font-mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Untouched teams */}
            {preview.untouchedTeamCodes.length > 0 && (
              <section
                style={{
                  backgroundColor: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg)",
                  padding: "var(--s-4)",
                }}
              >
                <h3 style={{ fontWeight: 700, color: "var(--fg-3)", marginBottom: 4, fontSize: 13 }}>
                  Equipos no afectados ({preview.untouchedTeamCodes.length})
                </h3>
                <p style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.6 }}>
                  {preview.untouchedTeamCodes.join(", ")}
                </p>
              </section>
            )}

            {error && (
              <p style={{ fontSize: 13, color: "var(--red-bright)", padding: "0 4px" }}>{error}</p>
            )}

            {/* Confirm button */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                disabled={loading || preview.affectedTeamCodes.length === 0}
                style={{
                  width: "100%",
                  padding: "16px 0",
                  borderRadius: "var(--r-lg)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 900,
                  fontSize: 17,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  background: loading || preview.affectedTeamCodes.length === 0 ? "var(--bg-3)" : "var(--foil-gold-soft)",
                  color: loading || preview.affectedTeamCodes.length === 0 ? "var(--fg-3)" : "var(--fg-onlight)",
                  border: loading || preview.affectedTeamCodes.length === 0 ? "1px solid var(--line-strong)" : "none",
                  cursor: loading || preview.affectedTeamCodes.length === 0 ? "default" : "pointer",
                  opacity: loading || preview.affectedTeamCodes.length === 0 ? 0.5 : 1,
                  minHeight: 54,
                  boxShadow: "var(--sh-2)",
                }}
              >
                {loading ? "Importando..." : "Confirmar e importar"}
              </button>
              <p
                className="text-center"
                style={{ fontSize: 12, color: "var(--fg-3)" }}
              >
                Esta acción sobreescribirá los {preview.affectedTeamCodes.length} equipos importados.
              </p>
              <button
                onClick={() => setStep("paste")}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: "var(--r-md)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: 14,
                  backgroundColor: "var(--bg-3)",
                  color: "var(--fg-2)",
                  border: "1px solid var(--line-strong)",
                  cursor: loading ? "default" : "pointer",
                  minHeight: 44,
                }}
              >
                Editar texto
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <section
            style={{
              backgroundColor: "var(--bg-2)",
              border: "1px solid var(--line-gold)",
              borderRadius: "var(--r-xl)",
              padding: "var(--s-8)",
              boxShadow: "var(--sh-3), var(--glow-gold)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--r-pill)",
                background: "rgba(0,162,75,0.15)",
                border: "1px solid rgba(0,162,75,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green-bright)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2
              style={{
                fontWeight: 900,
                fontSize: 20,
                color: "var(--fg-1)",
                fontFamily: "var(--font-ui)",
              }}
            >
              Importado correctamente
            </h2>
            <p style={{ fontSize: 14, color: "var(--fg-3)" }}>
              Redirigiendo al álbum...
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

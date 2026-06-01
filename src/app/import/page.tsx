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
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <button
          onClick={() => {
            if (step === "preview") {
              setStep("paste");
            } else {
              router.back();
            }
          }}
          className="text-white text-xl leading-none"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-lg font-black text-white leading-none">
          Importar desde Figuritas.app
        </h1>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-5">
        {step === "paste" && (
          <>
            {/* Instructions */}
            <section
              className="rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: "#ffffff" }}
            >
              <h2 className="font-bold text-gray-700 mb-2">Cómo importar</h2>
              <ol className="text-sm text-gray-600 flex flex-col gap-1.5 list-decimal list-inside">
                <li>Abrí la app Figuritas en tu celular.</li>
                <li>Entrá a tu lista "Me faltan" y usá el botón compartir.</li>
                <li>Copiá el texto completo que empieza con "Figuritas App - Lista".</li>
                <li>Pegalo en el campo de abajo y tocá Parsear lista.</li>
              </ol>
            </section>

            {/* Textarea */}
            <section
              className="rounded-2xl p-4 shadow-sm flex flex-col gap-3"
              style={{ backgroundColor: "#ffffff" }}
            >
              <label
                htmlFor="figuritas-text"
                className="font-bold text-gray-700"
              >
                Pegá tu lista "Me faltan"
              </label>
              <textarea
                id="figuritas-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={10}
                className="w-full rounded-xl border-2 px-3 py-2 focus:outline-none resize-none font-mono"
                style={{
                  borderColor: "#d1c9b8",
                  backgroundColor: "#fafaf8",
                  fontSize: "16px", // Prevents iOS zoom on focus
                  lineHeight: "1.4",
                  color: "#333",
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                onClick={handleParse}
                disabled={!text.trim() || loading}
                className="w-full py-3 rounded-xl font-bold text-white text-base disabled:opacity-40"
                style={{ backgroundColor: "#006847" }}
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
              className="rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: "#ffffff" }}
            >
              <h2 className="font-bold text-gray-700 mb-3">Resumen de la importación</h2>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Equipos reconocidos</span>
                  <span className="font-bold text-gray-800">
                    {preview.affectedTeamCodes.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Figuritas reconocidas en total</span>
                  <span className="font-bold text-gray-800">
                    {preview.totalResolved}
                  </span>
                </div>
                <div
                  className="flex justify-between text-sm py-2 px-3 rounded-xl"
                  style={{ backgroundColor: "#fff4e5" }}
                >
                  <span className="font-semibold" style={{ color: "#b45309" }}>
                    Te faltan
                  </span>
                  <span className="font-bold" style={{ color: "#b45309" }}>
                    {preview.missingCount}
                  </span>
                </div>
                <div
                  className="flex justify-between text-sm py-2 px-3 rounded-xl"
                  style={{ backgroundColor: "#f0fdf4" }}
                >
                  <span className="font-semibold" style={{ color: "#166534" }}>
                    Se marcarán como tenidas
                  </span>
                  <span className="font-bold" style={{ color: "#166534" }}>
                    {preview.ownedCount}
                  </span>
                </div>
              </div>
            </section>

            {/* Warnings */}
            {preview.unknownTeamCodes.length > 0 && (
              <section
                className="rounded-2xl p-4 shadow-sm"
                style={{ backgroundColor: "#fff4e5" }}
              >
                <h3 className="font-bold text-amber-700 mb-1 text-sm">
                  Equipos no reconocidos (se ignoran)
                </h3>
                <p className="text-xs text-amber-600">
                  {preview.unknownTeamCodes.join(", ")}
                </p>
              </section>
            )}

            {preview.unmatchedLines.length > 0 && (
              <section
                className="rounded-2xl p-4 shadow-sm"
                style={{ backgroundColor: "#fff4e5" }}
              >
                <h3 className="font-bold text-amber-700 mb-1 text-sm">
                  Líneas no parseadas
                </h3>
                <ul className="text-xs text-amber-600 flex flex-col gap-0.5">
                  {preview.unmatchedLines.map((line, i) => (
                    <li key={i} className="font-mono">
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Untouched teams */}
            {preview.untouchedTeamCodes.length > 0 && (
              <section
                className="rounded-2xl p-4 shadow-sm"
                style={{ backgroundColor: "#f8f8f6" }}
              >
                <h3 className="font-bold text-gray-500 mb-1 text-sm">
                  Equipos no afectados ({preview.untouchedTeamCodes.length})
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {preview.untouchedTeamCodes.join(", ")}
                </p>
              </section>
            )}

            {error && (
              <p className="text-sm text-red-600 px-1">{error}</p>
            )}

            {/* Confirm button */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                disabled={loading || preview.affectedTeamCodes.length === 0}
                className="w-full py-4 rounded-2xl font-black text-white text-lg disabled:opacity-40 shadow"
                style={{ backgroundColor: "#c8102e" }}
              >
                {loading ? "Importando..." : "Confirmar e importar"}
              </button>
              <p className="text-center text-xs text-gray-400">
                Esta acción sobreescribirá los {preview.affectedTeamCodes.length} equipos importados.
              </p>
              <button
                onClick={() => setStep("paste")}
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm"
                style={{
                  backgroundColor: "#f0ece3",
                  color: "#555",
                  border: "2px solid #d1c9b8",
                }}
              >
                Editar texto
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <section
            className="rounded-2xl p-6 shadow-sm flex flex-col items-center gap-3 text-center"
            style={{ backgroundColor: "#ffffff" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ backgroundColor: "#f0fdf4" }}
            >
              ✓
            </div>
            <h2 className="font-black text-xl text-gray-800">
              Importado correctamente
            </h2>
            <p className="text-sm text-gray-600">
              Redirigiendo al álbum...
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

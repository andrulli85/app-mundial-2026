/**
 * /install — Tutorial page for adding Albumix (Cromos 2026) to the home screen.
 * Covers iOS Safari (step-by-step) and Android Chrome (quick instructions).
 * Screenshot placeholders are <div> blocks — Andy can swap in real images later.
 */

import Link from "next/link";

export default function InstallPage() {
  return (
    <div className="flex flex-col min-h-full max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <Link
          href="/album"
          aria-label="Volver al álbum"
          className="flex items-center justify-center w-8 h-8 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="flex-1 text-center text-base font-black text-white leading-none pr-8">
          Cómo instalar Albumix
        </h1>
      </header>

      {/* Body */}
      <main className="flex-1 px-4 py-6 space-y-10" style={{ backgroundColor: "#f9f5ee" }}>

        {/* ── iOS Safari section ── */}
        <section aria-labelledby="ios-heading">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl" aria-hidden="true">🍎</span>
            <h2
              id="ios-heading"
              className="text-lg font-black"
              style={{ color: "#006847" }}
            >
              En iPhone (Safari)
            </h2>
          </div>

          <ol className="space-y-6">
            {/* Step 1 */}
            <li className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-white flex-shrink-0"
                  style={{ backgroundColor: "#006847" }}
                >
                  1
                </span>
                <p className="text-sm font-semibold text-gray-800">
                  Tocá el botón &ldquo;Compartir&rdquo;
                </p>
              </div>
              {/* Screenshot placeholder */}
              <div
                className="w-full rounded-xl flex items-center justify-center text-xs font-medium"
                style={{
                  height: "140px",
                  backgroundColor: "#e8e0d5",
                  color: "#9ca3af",
                  border: "1px dashed #c9bfb0",
                }}
              >
                [screenshot placeholder — botón Compartir de Safari]
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                El cuadrado con flecha hacia arriba está en la barra inferior del
                navegador (en iPhone más nuevos) o arriba a la derecha (iPhone SE).
              </p>
            </li>

            {/* Step 2 */}
            <li className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-white flex-shrink-0"
                  style={{ backgroundColor: "#006847" }}
                >
                  2
                </span>
                <p className="text-sm font-semibold text-gray-800">
                  Tocá &ldquo;Añadir a pantalla de inicio&rdquo;
                </p>
              </div>
              {/* Screenshot placeholder */}
              <div
                className="w-full rounded-xl flex items-center justify-center text-xs font-medium"
                style={{
                  height: "140px",
                  backgroundColor: "#e8e0d5",
                  color: "#9ca3af",
                  border: "1px dashed #c9bfb0",
                }}
              >
                [screenshot placeholder — opción &ldquo;Añadir a pantalla de inicio&rdquo;]
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                En el menú que aparece, deslizá hacia arriba y buscá la opción
                <strong className="text-gray-800"> &ldquo;Añadir a pantalla de inicio&rdquo;</strong>.
              </p>
            </li>

            {/* Step 3 */}
            <li className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-white flex-shrink-0"
                  style={{ backgroundColor: "#006847" }}
                >
                  3
                </span>
                <p className="text-sm font-semibold text-gray-800">
                  Tocá &ldquo;Añadir&rdquo; arriba a la derecha
                </p>
              </div>
              {/* Screenshot placeholder */}
              <div
                className="w-full rounded-xl flex items-center justify-center text-xs font-medium"
                style={{
                  height: "140px",
                  backgroundColor: "#e8e0d5",
                  color: "#9ca3af",
                  border: "1px dashed #c9bfb0",
                }}
              >
                [screenshot placeholder — confirmar con &ldquo;Añadir&rdquo;]
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Confirmá con <strong className="text-gray-800">&ldquo;Añadir&rdquo;</strong> arriba
                a la derecha. ¡Listo! El ícono de Albumix aparece en tu pantalla de inicio.
              </p>
            </li>
          </ol>
        </section>

        {/* Divider */}
        <hr style={{ borderColor: "#d1c9b8" }} />

        {/* ── Android Chrome section ── */}
        <section aria-labelledby="android-heading">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl" aria-hidden="true">🤖</span>
            <h2
              id="android-heading"
              className="text-lg font-black"
              style={{ color: "#006847" }}
            >
              En Android (Chrome)
            </h2>
          </div>

          <div
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: "#eef7f2", border: "1px solid #b8deca" }}
          >
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>Opción 1 — Banner automático:</strong> Chrome muestra un banner azul
              en la parte inferior de la pantalla. Tocá <strong>&ldquo;Instalar&rdquo;</strong> y listo.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>Opción 2 — Menú manual:</strong> Tocá los tres puntos ⋮ arriba a la
              derecha → <strong>&ldquo;Añadir a pantalla de inicio&rdquo;</strong> o{" "}
              <strong>&ldquo;Instalar aplicación&rdquo;</strong>.
            </p>
          </div>
        </section>

        {/* CTA back */}
        <div className="pb-6">
          <Link
            href="/album"
            className="flex items-center justify-center w-full py-3 rounded-xl font-black text-white text-base"
            style={{ backgroundColor: "#006847" }}
          >
            Volver al álbum
          </Link>
        </div>
      </main>
    </div>
  );
}

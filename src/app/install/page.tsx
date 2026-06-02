/**
 * /install — Tutorial page for adding Albumix (Cromos 2026) to the home screen.
 * Covers iOS Safari (step-by-step) and Android Chrome (quick instructions).
 * Screenshot placeholders are <div> blocks — Andy can swap in real images later.
 */

import Link from "next/link";

export default function InstallPage() {
  return (
    <div
      className="flex flex-col min-h-full max-w-lg mx-auto w-full"
      style={{ background: "var(--bg-1)" }}
    >
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 flex items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: "var(--bg-1)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link
          href="/album"
          aria-label="Volver al álbum"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "var(--r-sm)",
            backgroundColor: "var(--bg-3)",
            color: "var(--fg-2)",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1
          className="flex-1 text-center pr-8"
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: "var(--fg-1)",
            fontFamily: "var(--font-ui)",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Cómo instalar Albumix
        </h1>
      </header>

      {/* Body */}
      <main
        className="flex-1 px-4 py-6 space-y-10"
        style={{ backgroundColor: "var(--bg-1)" }}
      >
        {/* ── iOS Safari section ── */}
        <section aria-labelledby="ios-heading">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl" aria-hidden="true">🍎</span>
            <h2
              id="ios-heading"
              className="t-h3"
            >
              En iPhone (Safari)
            </h2>
          </div>

          <ol className="space-y-6">
            {/* Step 1 */}
            <li className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-black flex-shrink-0"
                  style={{
                    background: "var(--foil-gold-soft)",
                    color: "var(--fg-onlight)",
                  }}
                >
                  1
                </span>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--fg-1)",
                    fontFamily: "var(--font-ui)",
                    margin: 0,
                  }}
                >
                  Tocá el botón &ldquo;Compartir&rdquo;
                </p>
              </div>
              {/* Screenshot placeholder */}
              <div
                className="w-full rounded-xl flex items-center justify-center text-xs font-medium"
                style={{
                  height: "140px",
                  backgroundColor: "var(--bg-3)",
                  color: "var(--fg-3)",
                  border: "1px dashed var(--line-gold)",
                }}
              >
                [screenshot placeholder — botón Compartir de Safari]
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--fg-2)",
                  lineHeight: 1.6,
                  fontFamily: "var(--font-ui)",
                }}
              >
                El cuadrado con flecha hacia arriba está en la barra inferior del
                navegador (en iPhone más nuevos) o arriba a la derecha (iPhone SE).
              </p>
            </li>

            {/* Step 2 */}
            <li className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-black flex-shrink-0"
                  style={{
                    background: "var(--foil-gold-soft)",
                    color: "var(--fg-onlight)",
                  }}
                >
                  2
                </span>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--fg-1)",
                    fontFamily: "var(--font-ui)",
                    margin: 0,
                  }}
                >
                  Tocá &ldquo;Añadir a pantalla de inicio&rdquo;
                </p>
              </div>
              {/* Screenshot placeholder */}
              <div
                className="w-full rounded-xl flex items-center justify-center text-xs font-medium"
                style={{
                  height: "140px",
                  backgroundColor: "var(--bg-3)",
                  color: "var(--fg-3)",
                  border: "1px dashed var(--line-gold)",
                }}
              >
                [screenshot placeholder — opción &ldquo;Añadir a pantalla de inicio&rdquo;]
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--fg-2)",
                  lineHeight: 1.6,
                  fontFamily: "var(--font-ui)",
                }}
              >
                En el menú que aparece, deslizá hacia arriba y buscá la opción{" "}
                <strong style={{ color: "var(--fg-1)" }}>&ldquo;Añadir a pantalla de inicio&rdquo;</strong>.
              </p>
            </li>

            {/* Step 3 */}
            <li className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-black flex-shrink-0"
                  style={{
                    background: "var(--foil-gold-soft)",
                    color: "var(--fg-onlight)",
                  }}
                >
                  3
                </span>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--fg-1)",
                    fontFamily: "var(--font-ui)",
                    margin: 0,
                  }}
                >
                  Tocá &ldquo;Añadir&rdquo; arriba a la derecha
                </p>
              </div>
              {/* Screenshot placeholder */}
              <div
                className="w-full rounded-xl flex items-center justify-center text-xs font-medium"
                style={{
                  height: "140px",
                  backgroundColor: "var(--bg-3)",
                  color: "var(--fg-3)",
                  border: "1px dashed var(--line-gold)",
                }}
              >
                [screenshot placeholder — confirmar con &ldquo;Añadir&rdquo;]
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--fg-2)",
                  lineHeight: 1.6,
                  fontFamily: "var(--font-ui)",
                }}
              >
                Confirmá con <strong style={{ color: "var(--fg-1)" }}>&ldquo;Añadir&rdquo;</strong> arriba
                a la derecha. ¡Listo! El ícono de Albumix aparece en tu pantalla de inicio.
              </p>
            </li>
          </ol>
        </section>

        {/* Divider */}
        <hr style={{ borderColor: "var(--line-strong)" }} />

        {/* ── Android Chrome section ── */}
        <section aria-labelledby="android-heading">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl" aria-hidden="true">🤖</span>
            <h2
              id="android-heading"
              className="t-h3"
            >
              En Android (Chrome)
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              padding: "var(--s-4)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: "var(--fg-2)",
                lineHeight: 1.6,
                fontFamily: "var(--font-ui)",
              }}
            >
              <strong style={{ color: "var(--fg-1)" }}>Opción 1 — Banner automático:</strong> Chrome muestra un banner
              en la parte inferior de la pantalla. Tocá <strong style={{ color: "var(--fg-1)" }}>&ldquo;Instalar&rdquo;</strong> y listo.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--fg-2)",
                lineHeight: 1.6,
                fontFamily: "var(--font-ui)",
              }}
            >
              <strong style={{ color: "var(--fg-1)" }}>Opción 2 — Menú manual:</strong> Tocá los tres puntos ⋮ arriba a la
              derecha → <strong style={{ color: "var(--fg-1)" }}>&ldquo;Añadir a pantalla de inicio&rdquo;</strong> o{" "}
              <strong style={{ color: "var(--fg-1)" }}>&ldquo;Instalar aplicación&rdquo;</strong>.
            </p>
          </div>
        </section>

        {/* CTA back */}
        <div className="pb-6">
          <Link
            href="/album"
            className="flex items-center justify-center w-full rounded-xl font-black text-base"
            style={{
              background: "var(--foil-gold-soft)",
              color: "var(--fg-onlight)",
              padding: "14px 0",
              borderRadius: "var(--r-md)",
              fontFamily: "var(--font-ui)",
              fontWeight: 900,
              fontSize: 15,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              textDecoration: "none",
              minHeight: 54,
            }}
          >
            Volver al álbum
          </Link>
        </div>
      </main>
    </div>
  );
}

"use client";

/**
 * /invite — Albumix email whitelist gate.
 *
 * States:
 *  - "form"        → email input + submit button (default)
 *  - "loading"     → spinner while POSTing
 *  - "not_invited" → friendly rejection + WhatsApp CTA
 *  - "error"       → unexpected error (server 500, network, rate-limit)
 *
 * On success the server sets the HttpOnly cookie and this page redirects to /.
 */

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";

// ── Design tokens (Albumix palette) ──────────────────────────────────────────
const GREEN = "#006847";
const LIME = "#c2ef4e";
const CARD_BG = "#ffffff";
const TEXT_DARK = "#1a1a1a";
const TEXT_MUTED = "#5a5a5a";

// ── Sub-components ────────────────────────────────────────────────────────────

function BallIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {/* Main ball */}
      <circle cx="32" cy="32" r="28" fill={GREEN} />
      {/* Classic soccer pentagon pattern */}
      <circle cx="32" cy="32" r="28" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3" />
      {/* Center pentagon */}
      <polygon
        points="32,18 42,26 38,38 26,38 22,26"
        fill="none"
        stroke="white"
        strokeWidth="2"
        opacity="0.8"
      />
      <polygon
        points="32,18 42,26 38,38 26,38 22,26"
        fill="rgba(255,255,255,0.15)"
      />
      {/* Top seam */}
      <line x1="32" y1="4" x2="32" y2="18" stroke="white" strokeWidth="1.5" opacity="0.5" />
      {/* Side seams */}
      <line x1="60" y1="32" x2="42" y2="26" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="4" y1="32" x2="22" y2="26" stroke="white" strokeWidth="1.5" opacity="0.5" />
      {/* Bottom seams */}
      <line x1="50" y1="55" x2="38" y2="38" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="14" y1="55" x2="26" y2="38" stroke="white" strokeWidth="1.5" opacity="0.5" />
      {/* Shine */}
      <circle cx="24" cy="22" r="5" fill="white" opacity="0.2" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="25 15" />
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type PageState = "form" | "loading" | "not_invited" | "error";

export default function InvitePage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>("form");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const whatsappNumber = process.env.NEXT_PUBLIC_ANDY_WHATSAPP ?? "+56912345678";
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    "Hola! Me gustaría entrar a Albumix del Mundial 2026 🌍⚽"
  )}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setState("loading");

    try {
      const res = await fetch("/api/invite/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        // Cookie was set server-side — redirect to app root
        router.push("/");
        return;
      }

      if (res.status === 403) {
        setState("not_invited");
        return;
      }

      if (res.status === 429) {
        setErrorMsg("Demasiados intentos. Esperá 5 minutos e intentá de nuevo.");
        setState("error");
        return;
      }

      // Any other error
      const data = await res.json().catch(() => ({}));
      setErrorMsg(
        (data as { error?: string }).error ?? "Error inesperado. Intentá de nuevo."
      );
      setState("error");
    } catch {
      setErrorMsg("No se pudo conectar. Verificá tu conexión e intentá de nuevo.");
      setState("error");
    }
  }

  function handleTryAgain() {
    setState("form");
    setEmail("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // ── Not invited screen ──────────────────────────────────────────────────────
  if (state === "not_invited") {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: `linear-gradient(160deg, ${GREEN} 0%, #003d2a 100%)` }}
        data-testid="not-invited-screen"
      >
        <div
          className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center gap-5 shadow-xl"
          style={{ backgroundColor: CARD_BG }}
        >
          {/* Sad ball */}
          <div className="text-5xl" aria-hidden="true">😕</div>

          <div>
            <h1
              className="text-xl font-bold mb-2"
              style={{ color: TEXT_DARK, fontFamily: "inherit" }}
            >
              Aún no estás invitado
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              Albumix es por invitación. Pedile el acceso a Andy para entrar.
            </p>
          </div>

          {/* WhatsApp CTA */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 px-6 font-semibold text-sm transition-opacity active:opacity-75"
            style={{
              backgroundColor: "#25d366",
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: "0.2px",
              minHeight: "44px",
            }}
            data-testid="whatsapp-cta"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 1C5.03 1 1 5.03 1 10c0 1.63.44 3.15 1.2 4.46L1 19l4.68-1.17A9 9 0 1010 1zm0 16.5a7.5 7.5 0 01-3.89-1.09l-.28-.17-2.77.69.71-2.7-.18-.29A7.5 7.5 0 1110 17.5zm4.06-5.51c-.22-.11-1.3-.64-1.5-.71-.2-.07-.34-.11-.49.11-.14.22-.56.71-.69.86-.13.14-.25.16-.47.05-.22-.11-.93-.34-1.76-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45l.33-.38c.11-.13.14-.22.21-.36.07-.14.03-.27-.02-.38-.05-.11-.49-1.17-.67-1.61-.18-.42-.36-.36-.49-.37H7.5c-.14 0-.36.05-.55.27-.19.22-.72.7-.72 1.72 0 1.01.74 1.99.84 2.13.11.14 1.45 2.22 3.51 3.11.49.21.87.34 1.17.43.49.16.94.14 1.29.08.39-.06 1.3-.53 1.48-1.04.18-.51.18-.95.13-1.04-.06-.09-.2-.14-.42-.25z"
                fill="currentColor"
              />
            </svg>
            Pedirle acceso a Andy
          </a>

          <button
            onClick={handleTryAgain}
            className="text-sm underline"
            style={{ color: TEXT_MUTED }}
          >
            Usar otro email
          </button>
        </div>
      </main>
    );
  }

  // ── Error screen ──────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: `linear-gradient(160deg, ${GREEN} 0%, #003d2a 100%)` }}
        data-testid="error-screen"
      >
        <div
          className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center gap-5 shadow-xl"
          style={{ backgroundColor: CARD_BG }}
        >
          <div className="text-5xl" aria-hidden="true">⚠️</div>
          <div>
            <h1 className="text-xl font-bold mb-2" style={{ color: TEXT_DARK }}>
              Algo salió mal
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              {errorMsg}
            </p>
          </div>
          <button
            onClick={handleTryAgain}
            className="w-full rounded-2xl py-3 font-semibold text-sm transition-opacity active:opacity-75"
            style={{
              backgroundColor: GREEN,
              color: "#ffffff",
              minHeight: "44px",
              textTransform: "uppercase",
              letterSpacing: "0.2px",
            }}
          >
            Volver a intentar
          </button>
        </div>
      </main>
    );
  }

  // ── Form screen (default + loading) ─────────────────────────────────────────
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: `linear-gradient(160deg, ${GREEN} 0%, #003d2a 100%)` }}
      data-testid="invite-form"
    >
      <div
        className="w-full max-w-sm rounded-3xl shadow-xl overflow-hidden"
        style={{ backgroundColor: CARD_BG }}
      >
        {/* Hero header */}
        <div
          className="flex flex-col items-center pt-8 pb-6 px-8"
          style={{
            background: `linear-gradient(180deg, ${GREEN}22 0%, ${CARD_BG} 100%)`,
          }}
        >
          <BallIcon />
          <h1
            className="mt-4 text-2xl font-bold text-center leading-tight"
            style={{ color: TEXT_DARK }}
          >
            Albumix
          </h1>
          <p
            className="mt-1 text-sm text-center"
            style={{ color: TEXT_MUTED }}
          >
            Tu álbum digital del Mundial 2026
          </p>

          {/* Gold "acceso restringido" badge */}
          <span
            className="mt-3 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: "#FFF3CD",
              color: "#856404",
              letterSpacing: "0.5px",
            }}
          >
            Acceso por invitación
          </span>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="px-8 pb-8 pt-2 flex flex-col gap-4"
          noValidate
        >
          <p className="text-sm text-center" style={{ color: TEXT_MUTED }}>
            Ingresá el email con el que te invitaron para entrar.
          </p>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="invite-email"
              className="text-xs font-semibold uppercase"
              style={{ color: TEXT_MUTED, letterSpacing: "0.5px" }}
            >
              Tu email
            </label>
            <input
              ref={inputRef}
              id="invite-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === "loading"}
              required
              className="w-full rounded-xl border px-4 py-3 outline-none transition-shadow"
              style={{
                fontSize: "16px", // a11y: prevents iOS auto-zoom on focus
                borderColor: "#d1c9b8",
                backgroundColor: "#fafaf8",
                color: TEXT_DARK,
                boxShadow: "none",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = GREEN;
                (e.target as HTMLInputElement).style.boxShadow =
                  "0 0 0 3px rgba(0,104,71,0.12)";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "#d1c9b8";
                (e.target as HTMLInputElement).style.boxShadow = "none";
              }}
              data-testid="invite-email-input"
            />
          </div>

          <button
            type="submit"
            disabled={state === "loading" || !email.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-sm transition-opacity disabled:opacity-60"
            style={{
              backgroundColor: LIME,
              color: TEXT_DARK,
              minHeight: "44px",
              textTransform: "uppercase",
              letterSpacing: "0.2px",
            }}
            data-testid="invite-submit"
          >
            {state === "loading" ? (
              <>
                <Spinner />
                Verificando...
              </>
            ) : (
              "Entrar al álbum"
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p
        className="mt-6 text-xs text-center"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Solo para invitados — Mundial 2026
      </p>
    </main>
  );
}

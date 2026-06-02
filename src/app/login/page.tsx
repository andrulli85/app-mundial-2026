"use client";

/**
 * /login — Albumix Google SSO + Whitelist gate.
 *
 * Flow:
 *  1. User lands here (no cookie, or redirected by middleware).
 *  2. Clicks "Continuar con Google" → Firebase Auth (popup/redirect).
 *  3. On Firebase sign-in, we get an ID token and POST it to /api/auth/whitelist-check.
 *  4. Server verifies token via JWKS + checks whitelist + sets HMAC cookie.
 *  5. On 200 → router.push("/") → app loads normally.
 *  6. On 403 not_invited → rejection screen + WhatsApp CTA + Firebase signOut.
 *  7. On 403 email_not_verified → "necesitás email verificado" screen + signOut.
 *  8. On 401 → "no pudimos verificar tu identidad" error screen.
 *  9. On 429 → rate-limit message.
 *
 * States: "idle" | "signing_in" | "verifying" | "not_invited" | "email_not_verified" | "error"
 *
 * Design tokens: same palette as the old /invite page (GREEN, LIME, CARD_BG).
 * BallIcon and layout preserved for visual continuity.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import { signOut } from "@/lib/auth";

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
      <circle cx="32" cy="32" r="28" fill={GREEN} />
      <circle cx="32" cy="32" r="28" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3" />
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
      <line x1="32" y1="4" x2="32" y2="18" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="60" y1="32" x2="42" y2="26" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="4" y1="32" x2="22" y2="26" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="50" y1="55" x2="38" y2="38" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="14" y1="55" x2="26" y2="38" stroke="white" strokeWidth="1.5" opacity="0.5" />
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

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState =
  | "idle"
  | "signing_in"
  | "verifying"
  | "not_invited"
  | "email_not_verified"
  | "error";

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const [state, setState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const whatsappNumber = process.env.NEXT_PUBLIC_ANDY_WHATSAPP ?? "+56912345678";
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    "Hola! Me gustaria entrar a Albumix del Mundial 2026"
  )}`;

  /**
   * Performs the server-side whitelist handshake once Firebase has a signed-in user.
   * Gets the ID token, POSTs it to /api/auth/whitelist-check, and handles responses.
   *
   * Called by the unified useEffect below — handles both desktop popup and mobile
   * redirect flows without duplicating logic.
   */
  const performHandshake = useCallback(async () => {
    const fb = getFirebase();
    if (!fb?.auth.currentUser) return;

    // Mark this Firebase session as "handshake attempted" before the network call
    // so that if the page remounts (e.g. React strict-mode double-invoke) we don't
    // fire twice. Cleared on sign-out and on terminal error recovery.
    sessionStorage.setItem("albumix_handshake_attempted", "1");

    setState("verifying");

    let idToken: string;
    try {
      idToken = await fb.auth.currentUser.getIdToken();
    } catch {
      setErrorMsg("No se pudo obtener tu token de identidad. Intentá de nuevo.");
      setState("error");
      return;
    }

    try {
      const res = await fetch("/api/auth/whitelist-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        // Cookie set server-side — navigate to app root
        router.push("/");
        return;
      }

      const data = await res.json().catch(() => ({})) as { error?: string };

      if (res.status === 403) {
        if (data.error === "not_invited") {
          await signOut();
          // Clear the flag so a retry with a different account works cleanly
          sessionStorage.removeItem("albumix_handshake_attempted");
          setState("not_invited");
          return;
        }
        if (data.error === "email_not_verified") {
          await signOut();
          sessionStorage.removeItem("albumix_handshake_attempted");
          setState("email_not_verified");
          return;
        }
      }

      if (res.status === 401) {
        setErrorMsg("No pudimos verificar tu identidad. Intentá de nuevo.");
        sessionStorage.removeItem("albumix_handshake_attempted");
        setState("error");
        return;
      }

      if (res.status === 429) {
        setErrorMsg("Demasiados intentos. Esperá 5 minutos e intentá de nuevo.");
        sessionStorage.removeItem("albumix_handshake_attempted");
        setState("error");
        return;
      }

      // Unexpected error
      setErrorMsg(data.error ?? "Error inesperado. Intentá de nuevo.");
      sessionStorage.removeItem("albumix_handshake_attempted");
      setState("error");
    } catch {
      setErrorMsg("No se pudo conectar. Verificá tu conexion e intentá de nuevo.");
      sessionStorage.removeItem("albumix_handshake_attempted");
      setState("error");
    }
  }, [router]);

  /**
   * Unified handshake trigger — covers both flows:
   *   - Desktop popup: user becomes non-null while state === "signing_in"
   *   - Mobile redirect: page remounts fresh (state === "idle"), but Firebase
   *     delivers the user from handleRedirectResult → we detect user non-null
   *     with no prior attempt and fire the handshake automatically.
   *
   * Guard logic (in order):
   *   1. No user yet → wait.
   *   2. Already in flight or past terminal state → skip.
   *   3. sessionStorage flag set → previous attempt in this session; skip to
   *      avoid thrash. Safety valve below lets the user manually reset.
   *   4. Otherwise → fire.
   */
  useEffect(() => {
    if (!user) return;

    // Already processing or at a terminal rejection state — let those UI branches handle it
    if (
      state === "verifying" ||
      state === "not_invited" ||
      state === "email_not_verified"
    ) {
      return;
    }

    // Previous attempt in this Firebase session — the cookie either made it
    // (middleware would have redirected us away from /login) or something went
    // wrong. Either way, don't thrash. The safety valve below lets the user reset.
    if (sessionStorage.getItem("albumix_handshake_attempted") === "1") {
      return;
    }

    // Fire: covers both "user arrived via desktop popup" (state === "signing_in")
    // and "user arrived via mobile redirect" (state === "idle" on remount)
    performHandshake();
  }, [user, state, performHandshake]);

  async function handleSignIn() {
    setState("signing_in");
    try {
      await signIn();
      // On desktop (popup): signIn() resolves after the popup closes.
      // user will be set by AuthProvider → the useEffect above fires.
      // On mobile (redirect): page navigates away; on return AuthProvider
      // calls handleRedirectResult and sets the user → useEffect fires.
    } catch {
      setErrorMsg("No se pudo iniciar sesion con Google. Intentá de nuevo.");
      setState("error");
    }
  }

  /**
   * Safety valve — clears the sessionStorage flag + Firebase session so the user
   * can start over. Visible in signing_in / verifying states as an escape hatch
   * for edge-cases where the automatic flow gets stuck.
   */
  async function handleForceReset() {
    sessionStorage.removeItem("albumix_handshake_attempted");
    await signOut();
    setState("idle");
    setErrorMsg("");
  }

  function handleTryAgain() {
    sessionStorage.removeItem("albumix_handshake_attempted");
    setState("idle");
    setErrorMsg("");
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
          <div className="text-5xl" aria-hidden="true">😕</div>

          <div>
            <h1
              className="text-xl font-bold mb-2"
              style={{ color: TEXT_DARK }}
            >
              Aun no estas invitado
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              Albumix es por invitacion. Pedle el acceso a Andy para entrar.
            </p>
          </div>

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
            Usar otra cuenta
          </button>
        </div>
      </main>
    );
  }

  // ── Email not verified screen ───────────────────────────────────────────────
  if (state === "email_not_verified") {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: `linear-gradient(160deg, ${GREEN} 0%, #003d2a 100%)` }}
        data-testid="email-not-verified-screen"
      >
        <div
          className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center gap-5 shadow-xl"
          style={{ backgroundColor: CARD_BG }}
        >
          <div className="text-5xl" aria-hidden="true">📧</div>

          <div>
            <h1
              className="text-xl font-bold mb-2"
              style={{ color: TEXT_DARK }}
            >
              Email sin verificar
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              Necesitas una cuenta Google con email verificado para entrar a Albumix.
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
            Intentar con otra cuenta
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
          <div className="text-5xl" aria-hidden="true">!</div>
          <div>
            <h1 className="text-xl font-bold mb-2" style={{ color: TEXT_DARK }}>
              Algo salio mal
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

  // ── Default: idle or signing_in or verifying ────────────────────────────────
  const isLoading = state === "signing_in" || state === "verifying";
  const loadingLabel = state === "verifying" ? "Verificando acceso..." : "Iniciando sesion...";

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: `linear-gradient(160deg, ${GREEN} 0%, #003d2a 100%)` }}
      data-testid="login-form"
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
            Tu album digital del Mundial 2026
          </p>

          <span
            className="mt-3 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: "#FFF3CD",
              color: "#856404",
              letterSpacing: "0.5px",
            }}
          >
            Acceso por invitacion
          </span>
        </div>

        {/* Sign in body */}
        <div className="px-8 pb-8 pt-2 flex flex-col gap-4">
          <p className="text-sm text-center" style={{ color: TEXT_MUTED }}>
            Inicia sesion con tu cuenta Google para entrar.
          </p>

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl py-3 font-semibold text-sm transition-opacity disabled:opacity-60"
            style={{
              backgroundColor: isLoading ? "#f0f0f0" : LIME,
              color: TEXT_DARK,
              border: "none",
              minHeight: "44px",
              textTransform: "uppercase",
              letterSpacing: "0.2px",
            }}
            data-testid="login-google-btn"
          >
            {isLoading ? (
              <>
                <Spinner />
                {loadingLabel}
              </>
            ) : (
              <>
                {/* Google logo */}
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                    fill="#EA4335"
                  />
                </svg>
                Continuar con Google
              </>
            )}
          </button>
        </div>
      </div>

      <p
        className="mt-6 text-xs text-center"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Solo para invitados — Mundial 2026
      </p>

      {/* Safety valve: shown when in-flight so mobile users can escape a stuck loop */}
      {isLoading && (
        <button
          onClick={handleForceReset}
          className="mt-3 text-xs underline"
          style={{ color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer" }}
        >
          Problemas? Cerrar sesion e intentar de nuevo
        </button>
      )}
    </main>
  );
}

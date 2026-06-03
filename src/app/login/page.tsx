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
 * Design: premium black+gold dark theme — same as the rest of the app.
 * Tokens from globals.css: --bg-1, --bg-2, --bg-3, --gold, --foil-gold, --fg-1/2/3.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import { signOut } from "@/lib/auth";

// ── Sub-components ────────────────────────────────────────────────────────────

/** Gold ring spinner — uses --gold color token via currentColor trick */
function Spinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
      style={{ color: "var(--gold)" }}
    >
      <circle
        cx="10"
        cy="10"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="25 15"
      />
    </svg>
  );
}

/** Google "G" multi-color logo — official brand asset */
function GoogleIcon() {
  return (
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
  );
}

/** Shared page wrapper — dark bg with subtle radial depth */
function PageShell({
  children,
  testId,
}: {
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center px-6 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, var(--bg-2) 0%, var(--bg-1) 100%)",
      }}
      data-testid={testId}
    >
      {children}
    </main>
  );
}

/** Dark card surface with gold border glow */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-sm flex flex-col items-center text-center gap-5"
      style={{
        backgroundColor: "var(--bg-2)",
        border: "1px solid var(--line-gold)",
        borderRadius: "var(--r-xl)",
        padding: "var(--s-8) var(--s-8) var(--s-8)",
        boxShadow: "var(--sh-4), var(--glow-gold)",
      }}
    >
      {children}
    </div>
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
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "unknown";
      const msg = (e as Error)?.message ?? String(e);
      console.error("[login] signIn failed:", { code, message: msg, err: e });
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
      <PageShell testId="not-invited-screen">
        <Card>
          {/* Warning icon in gold */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--r-pill)",
              background: "rgba(244,200,74,0.12)",
              border: "1px solid rgba(244,200,74,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <div>
            <h1 className="t-h3 mb-2">Aun no estas invitado</h1>
            <p className="t-body">
              Albumix es por invitacion. Pedle el acceso a Andy para entrar.
            </p>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 transition-opacity active:opacity-75"
            style={{
              backgroundColor: "#25d366",
              color: "#ffffff",
              borderRadius: "var(--r-lg)",
              padding: "12px 24px",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              minHeight: "44px",
              textDecoration: "none",
            }}
            data-testid="whatsapp-cta"
          >
            {/* WhatsApp icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 1C5.03 1 1 5.03 1 10c0 1.63.44 3.15 1.2 4.46L1 19l4.68-1.17A9 9 0 1010 1zm0 16.5a7.5 7.5 0 01-3.89-1.09l-.28-.17-2.77.69.71-2.7-.18-.29A7.5 7.5 0 1110 17.5zm4.06-5.51c-.22-.11-1.3-.64-1.5-.71-.2-.07-.34-.11-.49.11-.14.22-.56.71-.69.86-.13.14-.25.16-.47.05-.22-.11-.93-.34-1.76-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45l.33-.38c.11-.13.14-.22.21-.36.07-.14.03-.27-.02-.38-.05-.11-.49-1.17-.67-1.61-.18-.42-.36-.36-.49-.37H7.5c-.14 0-.36.05-.55.27-.19.22-.72.7-.72 1.72 0 1.01.74 1.99.84 2.13.11.14 1.45 2.22 3.51 3.11.49.21.87.34 1.17.43.49.16.94.14 1.29.08.39-.06 1.3-.53 1.48-1.04.18-.51.18-.95.13-1.04-.06-.09-.2-.14-.42-.25z"
                fill="currentColor"
              />
            </svg>
            Pedirle acceso a Andy
          </a>

          <button
            onClick={handleForceReset}
            className="t-small underline transition-opacity active:opacity-75"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--fg-3)",
            }}
          >
            Usar otra cuenta
          </button>
        </Card>
      </PageShell>
    );
  }

  // ── Email not verified screen ───────────────────────────────────────────────
  if (state === "email_not_verified") {
    return (
      <PageShell testId="email-not-verified-screen">
        <Card>
          {/* Email icon in gold */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--r-pill)",
              background: "rgba(244,200,74,0.12)",
              border: "1px solid rgba(244,200,74,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          <div>
            <h1 className="t-h3 mb-2">Email sin verificar</h1>
            <p className="t-body">
              Necesitas una cuenta Google con email verificado para entrar a Albumix.
            </p>
          </div>

          <button
            onClick={handleTryAgain}
            className="w-full transition-opacity active:opacity-75"
            style={{
              background: "var(--foil-gold-soft)",
              color: "var(--fg-onlight)",
              borderRadius: "var(--r-lg)",
              padding: "12px 24px",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              minHeight: "44px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Intentar con otra cuenta
          </button>
        </Card>
      </PageShell>
    );
  }

  // ── Error screen ──────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <PageShell testId="error-screen">
        <Card>
          {/* Error icon in red */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--r-pill)",
              background: "rgba(228,0,43,0.1)",
              border: "1px solid rgba(228,0,43,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div>
            <h1 className="t-h3 mb-2">Algo salio mal</h1>
            <p className="t-body">{errorMsg}</p>
          </div>

          <button
            onClick={handleTryAgain}
            className="w-full transition-opacity active:opacity-75"
            style={{
              background: "var(--foil-gold-soft)",
              color: "var(--fg-onlight)",
              borderRadius: "var(--r-lg)",
              padding: "12px 24px",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              minHeight: "44px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Volver a intentar
          </button>
        </Card>
      </PageShell>
    );
  }

  // ── Default: idle | signing_in | verifying ──────────────────────────────────
  const isLoading = state === "signing_in" || state === "verifying";
  const loadingLabel =
    state === "verifying" ? "Verificando acceso..." : "Iniciando sesion...";

  return (
    <PageShell testId="login-form">
      {/* Login card */}
      <div
        className="w-full max-w-sm overflow-hidden"
        style={{
          backgroundColor: "var(--bg-2)",
          border: "1px solid var(--line-gold)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--sh-4), var(--glow-gold)",
        }}
      >
        {/* Hero header — logomark + wordmark + badge */}
        <div
          className="flex flex-col items-center pt-8 pb-6 px-8 gap-3"
          style={{
            background:
              "linear-gradient(180deg, rgba(244,200,74,0.07) 0%, transparent 100%)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          {/* Logomark */}
          <Image
            src="/assets/logomark.svg"
            width={56}
            height={56}
            alt="Albumix"
            priority
          />

          {/* Wordmark — ALBUMI + X in gold, matching TopBar pattern */}
          <h1
            style={{
              fontFamily:
                "var(--font-display, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: ".02em",
              color: "var(--fg-1)",
              lineHeight: 1,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            ALBUMI
            <span style={{ color: "var(--gold)" }}>X</span>
          </h1>

          {/* Subtitle */}
          <p className="t-body" style={{ marginTop: -4, color: "var(--fg-3)" }}>
            Tu album digital del Mundial 2026
          </p>

          {/* "ACCESO POR INVITACION" pill */}
          <span
            className="t-eyebrow"
            style={{
              background: "var(--foil-gold-soft)",
              color: "var(--fg-onlight)",
              borderRadius: "var(--r-pill)",
              padding: "4px 14px",
              letterSpacing: ".1em",
            }}
          >
            Acceso por invitacion
          </span>
        </div>

        {/* Sign-in body */}
        <div className="px-8 pb-8 pt-6 flex flex-col gap-4">
          <p className="t-body text-center">
            Inicia sesion con tu cuenta Google para entrar.
          </p>

          {/* CTA button — foil gold when idle, muted dark when loading */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 transition-opacity disabled:opacity-60"
            style={{
              background: isLoading
                ? "var(--bg-3)"
                : "var(--foil-gold-soft)",
              color: isLoading ? "var(--fg-2)" : "var(--fg-onlight)",
              borderRadius: "var(--r-lg)",
              padding: "12px 24px",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              minHeight: "44px",
              border: isLoading ? "1px solid var(--line-strong)" : "none",
              cursor: isLoading ? "default" : "pointer",
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
                <GoogleIcon />
                Continuar con Google
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer copy */}
      <p
        className="t-small text-center mt-6"
        style={{ color: "var(--fg-3)" }}
      >
        Solo para invitados — Mundial 2026
      </p>

      {/* Safety valve: escape hatch when stuck in signing_in / verifying */}
      {isLoading && (
        <button
          onClick={handleForceReset}
          className="mt-3 t-small underline transition-opacity active:opacity-75"
          style={{
            color: "var(--fg-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Problemas? Cerrar sesion e intentar de nuevo
        </button>
      )}
    </PageShell>
  );
}

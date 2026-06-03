"use client";

/**
 * /invite — Self-serve access request page.
 *
 * Anyone can submit their email + name here to request access to Albumix.
 * On submit, POSTs to /api/invite which sends a Slack message to Andy.
 * Andy approves with one tap from Slack; the email lands in the KV whitelist.
 *
 * Design: matches /login — premium black + gold Albumix palette.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ── Sub-components (shared with /login) ───────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center px-6 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, var(--bg-2) 0%, var(--bg-1) 100%)",
      }}
    >
      {children}
    </main>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = "idle" | "submitting" | "error";

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Ingresá un email válido.");
      setState("error");
      return;
    }

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, name: trimmedName || null }),
      });

      const data = await res.json().catch(() => ({})) as { error?: string; status?: string };

      if (res.ok) {
        if (data.status === "already_approved") {
          setErrorMsg("Este email ya tiene acceso aprobado. Podés iniciar sesión directamente.");
          setState("error");
          return;
        }
        router.push("/invite/sent");
        return;
      }

      if (res.status === 503) {
        setErrorMsg("El sistema de invitaciones no está configurado todavía. Contactá a Andy directamente.");
        setState("error");
        return;
      }

      setErrorMsg(data.error ?? "Algo salió mal. Intentá de nuevo.");
      setState("error");
    } catch {
      setErrorMsg("No se pudo conectar. Verificá tu conexión e intentá de nuevo.");
      setState("error");
    }
  }

  function handleReset() {
    setState("idle");
    setErrorMsg("");
  }

  const isLoading = state === "submitting";

  // Shared input style — font-size 16px to prevent iOS zoom
  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "var(--bg-3)",
    border: "1px solid var(--line-strong)",
    borderRadius: "var(--r-md, 10px)",
    padding: "12px 14px",
    fontFamily: "var(--font-ui)",
    fontSize: 16,
    color: "var(--fg-1)",
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <PageShell>
      {/* Card */}
      <div
        className="w-full max-w-sm overflow-hidden"
        style={{
          backgroundColor: "var(--bg-2)",
          border: "1px solid var(--line-gold)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--sh-4), var(--glow-gold, 0 0 24px -4px rgba(244,200,74,.3))",
        }}
      >
        {/* Header */}
        <div
          className="flex flex-col items-center pt-8 pb-6 px-8 gap-3"
          style={{
            background:
              "linear-gradient(180deg, rgba(244,200,74,0.07) 0%, transparent 100%)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Image
            src="/assets/logomark.svg"
            width={48}
            height={48}
            alt="Albumix"
            priority
          />
          <h1
            style={{
              fontFamily:
                "var(--font-display, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: ".02em",
              color: "var(--fg-1)",
              lineHeight: 1,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            ALBUMI<span style={{ color: "var(--gold)" }}>X</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--fg-3)",
              margin: 0,
              textAlign: "center",
            }}
          >
            Pedir acceso
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 pt-6 flex flex-col gap-4">
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--fg-2)",
              textAlign: "center",
              margin: 0,
            }}
          >
            Si querés jugar al Fantasy del Mundial 2026, mandanos tu email y te aprobamos.
          </p>

          {/* Email input */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="invite-email"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "var(--fg-3)",
              }}
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              style={inputStyle}
            />
          </div>

          {/* Name input */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="invite-name"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "var(--fg-3)",
              }}
            >
              Tu nombre{" "}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>
                (opcional)
              </span>
            </label>
            <input
              id="invite-name"
              type="text"
              autoComplete="name"
              placeholder="¿Cómo te llamas?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              style={inputStyle}
            />
          </div>

          {/* Error message */}
          {state === "error" && errorMsg && (
            <p
              role="alert"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--red, #E4002B)",
                margin: 0,
                textAlign: "center",
              }}
            >
              {errorMsg}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{
              background: isLoading ? "var(--bg-3)" : "var(--foil-gold-soft)",
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
          >
            {isLoading ? "Enviando..." : "Pedir acceso"}
          </button>

          {state === "error" && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--fg-3)",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                textDecoration: "underline",
              }}
            >
              Limpiar
            </button>
          )}
        </form>
      </div>

      {/* Footer */}
      <p
        className="text-center mt-6"
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--fg-3)",
        }}
      >
        ¿Ya tenés acceso?{" "}
        <a
          href="/login"
          style={{ color: "var(--gold)", textDecoration: "none" }}
        >
          Iniciá sesión
        </a>
      </p>
    </PageShell>
  );
}

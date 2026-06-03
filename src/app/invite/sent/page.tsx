"use client";

/**
 * /invite/sent — Confirmation screen shown after a successful invite request.
 *
 * Static page — no data needed. Shown after /api/invite responds 200.
 */

import Image from "next/image";

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

export default function InviteSentPage() {
  return (
    <PageShell>
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
        </div>

        {/* Body */}
        <div className="px-8 pb-8 pt-6 flex flex-col items-center gap-5 text-center">
          {/* Success icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--r-pill)",
              background: "rgba(0,162,75,0.12)",
              border: "1px solid rgba(0,162,75,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--green, #00A24B)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--fg-1)",
                margin: "0 0 8px",
              }}
            >
              Pedido enviado
            </p>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--fg-2)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Andy te avisa cuando aprueben tu email. En cuanto este aprobado, podés entrar con Google.
            </p>
          </div>

          <a
            href="/login"
            style={{
              background: "none",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--r-lg)",
              padding: "10px 24px",
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--fg-2)",
              textDecoration: "none",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </PageShell>
  );
}

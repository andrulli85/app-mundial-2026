"use client";

/**
 * Onboarding screen — first launch only.
 *
 * Steps 0-2: premium dark tutorial carousel (3 slides, skippable).
 * Step 3: nickname input form.
 *
 * Visual: premium black & gold from design pack (intro.jsx).
 * Dark radial gradient bg, foil gold CTA, floating sticker cards.
 *
 * State: step 0..3 via useState — no DB persistence, first-visit only.
 * Redirects to /inicio if nickname already set.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getNickname, setNickname } from "@/lib/db";
import Image from "next/image";

// ── Tutorial content ─────────────────────────────────────────────────────────

interface Slide {
  visual: "fan" | "mark" | "trade";
  title: React.ReactNode;
  body: string;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    visual: "fan",
    title: (
      <>
        Colecciona
        <br />
        <span className="text-foil">el Mundial 2026</span>
      </>
    ),
    body: "Tu álbum digital del Mundial 2026. Junta todas tus cartas y completa la colección.",
    cta: "Siguiente →",
  },
  {
    visual: "mark",
    title: (
      <>
        Marca{" "}
        <span className="text-foil">tus cartas</span>
      </>
    ),
    body: "Toca una carta para marcarla como tuya. Tócala de nuevo para sumar tus repetidas.",
    cta: "Siguiente →",
  },
  {
    visual: "trade",
    title: (
      <>
        Cambia{" "}
        <span className="text-foil">con amigos</span>
      </>
    ),
    body: "Propón cambios con tus amigos, acepta sus ofertas y completen el álbum juntos.",
    cta: "¡Empezar!",
  },
];

// ── Medallion icon wrapper ────────────────────────────────────────────────────

function Medallion({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", width: 92, height: 92, margin: "0 auto" }}>
      {/* Glow halo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -18,
          background: "radial-gradient(circle, rgba(244,200,74,.28), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          width: 92,
          height: 92,
          borderRadius: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg,#211b08,#0d0f13)",
          border: "1px solid var(--line-gold)",
          boxShadow: "var(--glow-gold)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Mini sticker card (matches TradingCard sm from cards.jsx) ─────────────────

interface MiniCardProps {
  accentColor: string;
  rotate: number;
  translateX: number;
  zIndex?: number;
  animationDelay?: string;
}

function MiniCard({ accentColor, rotate, translateX, zIndex = 1, animationDelay = "0s" }: MiniCardProps) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        transform: `translateX(calc(-50% + ${translateX}px)) rotate(${rotate}deg)`,
        zIndex,
        width: 104,
        height: 146,
        borderRadius: "var(--r-card)",
        overflow: "hidden",
        background: "linear-gradient(180deg,#8fe0ef 0%,#6fd0e6 60%,#58c2dc 100%)",
        boxShadow: "var(--sh-3)",
        animation: `floaty 3s ease-in-out ${animationDelay} infinite`,
        flexShrink: 0,
      }}
    >
      {/* Giant "26" */}
      <span
        style={{
          position: "absolute",
          left: -70 * 0.12,
          top: -70 * 0.06,
          fontFamily: "var(--font-display)",
          fontSize: 70,
          lineHeight: 0.8,
          color: "rgba(13,20,24,.9)",
          letterSpacing: "-.04em",
          userSelect: "none",
        }}
      >
        2
      </span>
      <span
        style={{
          position: "absolute",
          right: -70 * 0.14,
          top: 70 * 0.18,
          fontFamily: "var(--font-display)",
          fontSize: 70,
          lineHeight: 0.8,
          color: accentColor,
          opacity: 0.92,
          letterSpacing: "-.04em",
          userSelect: "none",
        }}
      >
        6
      </span>
      {/* Name plate */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: accentColor,
          padding: "5px 7px 6px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            lineHeight: 0.95,
            color: "#fff",
            textTransform: "uppercase",
          }}
        >
          FIGURITA
        </div>
      </div>
    </div>
  );
}

// ── Card fan visual ───────────────────────────────────────────────────────────

function CardFan() {
  return (
    <div style={{ position: "relative", height: 168, width: "100%" }}>
      <MiniCard accentColor="#E4002B" rotate={-15} translateX={-68} animationDelay="0.4s" />
      <MiniCard accentColor="#1466FF" rotate={15} translateX={68} animationDelay="0.8s" />
      <MiniCard accentColor="#00A24B" rotate={0} translateX={0} zIndex={2} animationDelay="0s" />
    </div>
  );
}

// ── Slide visual ──────────────────────────────────────────────────────────────

function SlideVisual({ kind }: { kind: "fan" | "mark" | "trade" }) {
  if (kind === "fan") return <CardFan />;

  if (kind === "mark") {
    return (
      <Medallion>
        <div style={{ position: "relative" }}>
          {/* Grid icon */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {/* Check badge */}
          <div
            style={{
              position: "absolute",
              bottom: -10,
              right: -14,
              width: 30,
              height: 30,
              borderRadius: 99,
              background: "var(--foil-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--sh-2)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fg-onlight)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </Medallion>
    );
  }

  // trade
  return (
    <Medallion>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    </Medallion>
  );
}

// ── Tutorial carousel ─────────────────────────────────────────────────────────

interface CarouselProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}

function TutorialCarousel({ step, onNext, onSkip }: CarouselProps) {
  const s = SLIDES[step];

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "0 24px 36px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Radial gold glow at top */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -20,
          left: "50%",
          transform: "translateX(-50%)",
          width: 360,
          height: 360,
          background: "radial-gradient(circle, rgba(244,200,74,.16), transparent 62%)",
          pointerEvents: "none",
        }}
      />

      {/* Progress segments */}
      <div
        style={{
          display: "flex",
          gap: 7,
          justifyContent: "center",
          paddingTop: 24,
          position: "relative",
          zIndex: 1,
        }}
        role="tablist"
        aria-label="Progreso del tutorial"
      >
        {SLIDES.map((_, i) => (
          <span
            key={i}
            role="tab"
            aria-selected={i === step}
            style={{
              height: 5,
              width: i === step ? 26 : 18,
              borderRadius: 99,
              background: i === step
                ? "linear-gradient(135deg,#FFE9A8 0%,#F4C84A 38%,#C2913A 62%,#FFE9A8 100%)"
                : "var(--bg-4)",
              transition: "all .3s var(--ease-out)",
              display: "inline-block",
            }}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Slide body */}
      <div
        key={step}
        style={{
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          animation: "popcard .35s var(--ease-pop)",
        }}
      >
        <SlideVisual kind={s.visual} />
        <h1
          className="t-display"
          style={{ margin: "26px 0 0" }}
        >
          {s.title}
        </h1>
        <p
          className="t-body"
          style={{ margin: "14px auto 0", maxWidth: 300 }}
        >
          {s.body}
        </p>
      </div>

      <div style={{ flex: 1.4 }} />

      {/* CTA button — foil gold pill */}
      <button
        onClick={onNext}
        style={{
          width: "100%",
          border: "none",
          borderRadius: "var(--r-pill)",
          padding: "16px 0",
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: ".04em",
          textTransform: "uppercase",
          background: "linear-gradient(135deg,#FFE9A8 0%,#F4C84A 38%,#C2913A 62%,#FFE9A8 100%)",
          color: "var(--fg-onlight)",
          boxShadow: "var(--glow-gold)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {s.cta}
      </button>

      <button
        onClick={onSkip}
        style={{
          background: "none",
          border: "none",
          color: "var(--fg-3)",
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: 14,
          marginTop: 16,
          cursor: "pointer",
          position: "relative",
          zIndex: 1,
          textDecoration: "underline",
          textUnderlineOffset: 3,
        }}
      >
        Saltar tutorial
      </button>
    </div>
  );
}

// ── Nickname form (step 3) ────────────────────────────────────────────────────

interface NicknameFormProps {
  onDone: (name: string) => void;
  onBack: () => void;
}

function NicknameForm({ onDone, onBack }: NicknameFormProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const valid = /^[\p{L}\p{N} ]{3,16}$/u.test(name.trim());

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    onDone(name.trim());
  };

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "0 24px 40px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -40,
          left: "50%",
          transform: "translateX(-50%)",
          width: 340,
          height: 320,
          background: "radial-gradient(circle, rgba(244,200,74,.18), transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ flex: 1 }} />

      {/* Brand */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <Medallion>
          <Image
            src="/assets/logomark.svg"
            width={50}
            height={50}
            alt="Albumix"
          />
        </Medallion>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 38,
            letterSpacing: ".02em",
            color: "var(--fg-1)",
            marginTop: 16,
          }}
        >
          ALBUMI<span style={{ color: "var(--gold)" }}>X</span>
        </div>
        <p
          className="t-body"
          style={{ margin: "6px auto 0", maxWidth: 280 }}
        >
          Arma tu álbum del Mundial y cambia cartas con tus amigos.
        </p>
      </div>

      {/* Name card */}
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: 20,
          marginTop: 28,
          position: "relative",
          zIndex: 1,
          boxShadow: "var(--sh-card)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 23,
            color: "var(--fg-1)",
            textTransform: "uppercase",
            letterSpacing: ".01em",
            lineHeight: 1,
          }}
        >
          ¿Cómo te llamás?
        </div>
        <div
          className="t-small"
          style={{ margin: "4px 0 14px" }}
        >
          Esto aparece cuando cambias con un amigo.
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) handleSubmit();
          }}
          placeholder="Domi Reyman"
          maxLength={16}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="text"
          aria-label="Ingresá tu nombre de jugador"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "var(--bg-3)",
            border: `1px solid ${name && !valid ? "var(--red)" : "var(--line-strong)"}`,
            borderRadius: 12,
            padding: "14px 16px",
            color: "var(--fg-1)",
            fontFamily: "var(--font-ui)",
            // 16px floor — prevents iOS Safari auto-zoom on input focus
            fontSize: 16,
            fontWeight: 600,
            outline: "none",
          }}
        />

        <div
          className="t-small"
          style={{ margin: "10px 0 16px" }}
        >
          Solo letras y números, 3-16 caracteres.
        </div>

        <button
          onClick={handleSubmit}
          disabled={!valid || saving}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "var(--r-pill)",
            padding: "15px 0",
            cursor: valid && !saving ? "pointer" : "default",
            fontFamily: "var(--font-ui)",
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: ".04em",
            textTransform: "uppercase",
            background: valid
              ? "linear-gradient(135deg,#FFE9A8 0%,#F4C84A 38%,#C2913A 62%,#FFE9A8 100%)"
              : "var(--bg-4)",
            color: valid ? "var(--fg-onlight)" : "var(--fg-3)",
            boxShadow: valid ? "var(--glow-gold)" : "none",
            transition: "all .2s",
          }}
        >
          {saving ? "Guardando..." : "¡Empezar!"}
        </button>
      </div>

      <div style={{ flex: 1.3 }} />

      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--fg-3)",
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          position: "relative",
          zIndex: 1,
        }}
      >
        ← Ver tutorial
      </button>
    </div>
  );
}

// ── Main onboarding page ──────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0); // 0-2 = carousel, 3 = nickname form

  useEffect(() => {
    getNickname().then((name) => {
      if (name) {
        router.replace("/inicio");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      setStep((s) => s + 1);
    } else {
      setStep(SLIDES.length); // → nickname form
    }
  };

  const handleSkip = () => {
    setStep(SLIDES.length); // → nickname form
  };

  const handleDone = async (name: string) => {
    await setNickname(name.toLowerCase());
    router.replace("/inicio");
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (checking) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 0%, #14110a 0%, #07080a 60%)",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "4px solid rgba(244,200,74,.3)",
            borderTopColor: "var(--gold)",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "radial-gradient(circle at 50% 0%, #14110a 0%, #07080a 60%)",
      }}
    >
      {/* Nickname form */}
      {step >= SLIDES.length ? (
        <NicknameForm
          onDone={handleDone}
          onBack={() => setStep(0)}
        />
      ) : (
        /* Tutorial carousel */
        <TutorialCarousel
          step={step}
          onNext={handleNext}
          onSkip={handleSkip}
        />
      )}
    </main>
  );
}

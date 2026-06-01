"use client";

/**
 * Onboarding screen — first launch only.
 *
 * Steps 0-2: kid-friendly micro-tutorial (3 slides, skippable via "Saltar").
 * Step 3: nickname input form (existing flow, Bundle A iOS-zoom fix preserved).
 *
 * State: step 0..3 via useState — no DB persistence, first-visit only.
 * Redirects to /album if nickname already set (skips everything).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getNickname, setNickname } from "@/lib/db";
import { isValidNickname } from "@/lib/qr-engine";

// ── Tutorial content ─────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    emoji: "⚽",
    title: "¡Bienvenido a Albumix!",
    body: "Tu álbum digital del Mundial 2026. Juntá todas las figuritas y completá tu colección.",
  },
  {
    emoji: "👆",
    title: "Marcá tus figuritas",
    body: "Tocá una lámina para marcarla como tuya. Tocala de nuevo para agregar repetidas (repes).",
  },
  {
    emoji: "🔄",
    title: "Intercambiá con amigos",
    body: "Usá códigos QR para proponer intercambios con tus amigos. ¡Completá tu álbum juntos!",
  },
] as const;

// ── Tutorial slide ────────────────────────────────────────────────────────────

interface TutorialSlideProps {
  step: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}

function TutorialSlide({ step, total, onNext, onSkip }: TutorialSlideProps) {
  const slide = TUTORIAL_STEPS[step];
  const isLast = step === total - 1;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8" role="tablist" aria-label="Progreso del tutorial">
        {TUTORIAL_STEPS.map((_, i) => (
          <div
            key={i}
            role="tab"
            aria-selected={i === step}
            aria-label={`Paso ${i + 1} de ${total}`}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i === step ? 24 : 8,
              backgroundColor: i === step ? "#006847" : "#d1c9b8",
            }}
          />
        ))}
      </div>

      {/* Slide card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-lg flex flex-col items-center text-center gap-4"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Big emoji */}
        <div
          className="text-6xl select-none leading-none"
          aria-hidden="true"
          style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.12))" }}
        >
          {slide.emoji}
        </div>

        <h1 className="text-2xl font-black leading-tight" style={{ color: "#006847" }}>
          {slide.title}
        </h1>

        <p className="text-base text-gray-700 leading-relaxed">
          {slide.body}
        </p>
      </div>

      {/* Navigation */}
      <div className="w-full max-w-sm mt-6 flex flex-col gap-3">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-xl font-black text-white text-lg transition-opacity focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2"
          style={{
            backgroundColor: "#006847",
            // @ts-expect-error custom CSS property for focus ring color
            "--tw-ring-color": "#006847",
          }}
        >
          {isLast ? "¡Empezar! 🚀" : "Siguiente →"}
        </button>

        <button
          onClick={onSkip}
          className="w-full py-2 text-sm font-medium text-gray-600 underline underline-offset-2 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded"
          style={{ textDecorationColor: "#9ca3af" }}
        >
          Saltar tutorial
        </button>
      </div>
    </main>
  );
}

// ── Main onboarding page ──────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0); // 0-2 = tutorial, 3 = nickname form
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Check if nickname already set → skip onboarding entirely
  useEffect(() => {
    getNickname().then((name) => {
      if (name) {
        // Redirect to FUT-style home (redesigned 2026-06-01)
        router.replace("/inicio");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleNext = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setStep(TUTORIAL_STEPS.length); // → nickname form
    }
  };

  const handleSkip = () => {
    setStep(TUTORIAL_STEPS.length); // → nickname form
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim().toLowerCase();
    if (!isValidNickname(trimmed)) {
      setError(
        "Usá solo letras y números, entre 3 y 16 caracteres. Ejemplo: lautaro12"
      );
      return;
    }
    setSaving(true);
    await setNickname(trimmed);
    // Go to FUT-style home after completing onboarding (redesigned 2026-06-01)
    router.replace("/inicio");
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: "#006847", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // ── Tutorial slides (steps 0-2) ────────────────────────────────────
  if (step < TUTORIAL_STEPS.length) {
    return (
      <TutorialSlide
        step={step}
        total={TUTORIAL_STEPS.length}
        onNext={handleNext}
        onSkip={handleSkip}
      />
    );
  }

  // ── Nickname form (step 3) ─────────────────────────────────────────
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {/* Trophy icon */}
      <div
        className="text-6xl mb-6 select-none"
        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))" }}
        aria-hidden="true"
      >
        🏆
      </div>

      <h1
        className="text-3xl font-black text-center mb-2 leading-tight"
        style={{ color: "#006847" }}
      >
        Albumix
      </h1>
      <p className="text-center text-gray-600 text-sm mb-8 max-w-xs">
        Armá tu álbum del Mundial e intercambiá figuritas con tus amigos
      </p>

      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-lg"
        style={{ backgroundColor: "#ffffff" }}
      >
        <h2 className="text-xl font-bold mb-1 text-gray-800">
          ¿Cómo te llamás?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Esto aparece cuando intercambiás con un amigo.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value.toLowerCase());
              setError("");
            }}
            placeholder="lautaro12"
            maxLength={16}
            className="w-full rounded-xl border-2 px-4 py-3 text-lg font-medium focus:outline-none transition-colors"
            style={{
              borderColor: error ? "#c8102e" : "#d1c9b8",
              backgroundColor: "#fafaf8",
              // Explicit 16px floor prevents iOS Safari auto-zoom on input focus.
              // text-lg (18px) already satisfies this, but the inline rule makes
              // the intent clear and guards against config overrides.
              fontSize: "16px",
            }}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="text"
            aria-label="Ingresá tu nombre de jugador"
          />

          {error && (
            <p className="text-xs text-red-600 -mt-1">{error}</p>
          )}

          <p className="text-sm text-gray-600">
            Solo letras y números, 3-16 caracteres.
          </p>

          <button
            type="submit"
            disabled={saving || input.trim().length < 3}
            className="w-full py-3 rounded-xl font-bold text-white text-lg transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2"
            style={{ backgroundColor: "#006847" }}
          >
            {saving ? "Guardando..." : "¡Empezar!"}
          </button>
        </form>
      </div>
    </main>
  );
}

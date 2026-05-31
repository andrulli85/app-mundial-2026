"use client";

/**
 * Onboarding screen — first launch only.
 * Asks for a nickname (regex [a-z0-9]{3,16}), stores it in IndexedDB.
 * Redirects to /album if nickname already set.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getNickname, setNickname } from "@/lib/db";
import { isValidNickname } from "@/lib/qr-engine";

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Check if nickname already set → skip onboarding
  useEffect(() => {
    getNickname().then((name) => {
      if (name) {
        router.replace("/album");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

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
    router.replace("/album");
  };

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

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {/* Trophy icon — simple CSS version, no external asset needed at launch */}
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
        Cromos 2026
      </h1>
      <p className="text-center text-gray-500 text-sm mb-8 max-w-xs">
        Armá tu álbum del Mundial e intercambiá figuritas con tus amigos
      </p>

      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-lg"
        style={{ backgroundColor: "#ffffff" }}
      >
        <h2 className="text-xl font-bold mb-1 text-gray-800">
          ¿Cómo te llamás?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
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

          <p className="text-xs text-gray-400">
            Solo letras y números, 3-16 caracteres.
          </p>

          <button
            type="submit"
            disabled={saving || input.trim().length < 3}
            className="w-full py-3 rounded-xl font-bold text-white text-lg transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#006847" }}
          >
            {saving ? "Guardando..." : "Empezar"}
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";

/**
 * Coachmark — first-visit section tutorial overlay.
 *
 * Design source: coachmarks.jsx (read in Fase 3 design sources).
 * Shows a centered modal overlay with icon, title, body, bullet points
 * and a dismiss button. Never shown again after first dismiss.
 *
 * Usage:
 *   import Coachmark from "@/components/Coachmark";
 *   <Coachmark section="inicio" />
 *
 * The component self-manages its visibility via localStorage.
 */

import { useEffect, useState } from "react";
import { shouldShowCoachmark, dismissCoachmark } from "@/lib/coachmark-state";
import type { CoachSection } from "@/lib/coachmark-state";

const GOLD = "#F4C84A";

interface CoachData {
  icon: string;
  title: string;
  body: string;
  points: string[];
  highlight?: string; // element description to point at (informational)
}

const COACH: Record<CoachSection, CoachData> = {
  inicio: {
    icon: "🏠",
    title: "Inicio",
    body: "Tu centro de mando. Acá ves tu racha, los últimos puntos que ganó tu 11 y un acceso rápido para mejorarlo.",
    points: [
      "Revisa cuántos puntos sumaste la última fecha",
      "Sigue el avance de tu álbum por selección",
    ],
    highlight: "Carta de la semana",
  },
  album: {
    icon: "📚",
    title: "Álbum",
    body: "Tu colección completa. Las cartas que ya tenés se marcan en dorado, con su cantidad (x1, x2, x3…).",
    points: [
      "Marcá tus favoritas con la estrella",
      "Tu selección favorita es fija y te da puntos extra si avanza",
    ],
    highlight: "chip strip (filtra por país, grupo o favoritas)",
  },
  once: {
    icon: "⚽",
    title: "Mi 11",
    body: "Armá tu equipo por posición: arquero, defensas, mediocampistas y delanteros. Cada zona tiene su color.",
    points: [
      "Cada jugador suma puntos según su desempeño real",
      "Competí con tus amigos en la tabla de puntos",
    ],
    highlight: "primer slot (toca para agregar un jugador)",
  },
};

interface CoachmarkProps {
  section: CoachSection;
}

export default function Coachmark({ section }: CoachmarkProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only check on client — avoids SSR mismatch
    setVisible(shouldShowCoachmark(section));
  }, [section]);

  if (!visible) return null;

  const c = COACH[section];

  function handleDismiss() {
    dismissCoachmark(section);
    setVisible(false);
  }

  return (
    <div
      onClick={handleDismiss}
      data-testid={`coachmark-${section}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(7,8,10,0.78)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#0d0f13",
          border: `1px solid ${GOLD}44`,
          borderRadius: 22,
          padding: 24,
          boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${GOLD}22`,
          textAlign: "center",
          animation: "coachPop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto",
            borderRadius: 18,
            background: "linear-gradient(160deg,#211b08,#0d0f13)",
            border: `1px solid ${GOLD}44`,
            boxShadow: `0 0 24px -8px ${GOLD}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}
          aria-hidden="true"
        >
          {c.icon}
        </div>

        {/* Kicker */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.14em",
            color: GOLD,
            textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif",
            marginTop: 16,
          }}
        >
          Cómo funciona
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: "#f3f4f6",
            textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif",
            margin: "4px 0 10px",
            lineHeight: 1,
          }}
        >
          {c.title}
        </h2>

        {/* Body */}
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: "#9ca3af",
            margin: "0 0 16px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {c.body}
        </p>

        {/* Bullet points */}
        <div
          style={{
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 22,
          }}
        >
          {c.points.map((pt, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: `${GOLD}18`,
                  border: `1px solid ${GOLD}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                  fontSize: 12,
                  color: GOLD,
                }}
                aria-hidden="true"
              >
                ✓
              </div>
              <span
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.4,
                  color: "#f3f4f6",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {pt}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleDismiss}
          data-testid={`coachmark-dismiss-${section}`}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 14,
            background: GOLD,
            color: "#0d0f13",
            fontWeight: 900,
            fontSize: 15,
            border: "none",
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          Entendido
        </button>
      </div>

      <style>{`
        @keyframes coachPop {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

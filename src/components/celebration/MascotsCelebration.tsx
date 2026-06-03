"use client";

/**
 * MascotsCelebration — FWC-only overlay with the 3 World Cup 2026 mascotas.
 *
 * Maple (Canada) flies from bottom-left with a slight right tilt.
 * Zayu (Mexico) flies from bottom-center straight up.
 * Clutch (USA) flies from bottom-right with a slight left tilt.
 *
 * Fires once per session (caller responsibility via celebration-store).
 * Dismisses on tap anywhere, Escape key, or after 3.5s total.
 *
 * IP posture: images animated as opaque sprites with translate/scale/opacity only.
 * No hue-rotate, blend-mode, or filter. Same legal basis as album sticker artwork.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import ConfettiBurst from "./ConfettiBurst";

interface MascotsCelebrationProps {
  onDismiss: () => void;
}

interface MascotDef {
  src: string;
  alt: string;
  /** horizontal origin offset before flying in (px) */
  originX: number;
  /** slight tilt at rest (deg); negative = tilt left */
  tiltDeg: number;
  /** stagger delay (s) */
  delay: number;
}

const MASCOTAS: MascotDef[] = [
  {
    src: "/assets/mascots/maple.jpg",
    alt: "Maple, mascota de Canadá",
    originX: -80,
    tiltDeg: 6,
    delay: 0,
  },
  {
    src: "/assets/mascots/zayu.jpg",
    alt: "Zayu, mascota de México",
    originX: 0,
    tiltDeg: 0,
    delay: 0.08,
  },
  {
    src: "/assets/mascots/clutch.jpg",
    alt: "Clutch, mascota de Estados Unidos",
    originX: 80,
    tiltDeg: -6,
    delay: 0.16,
  },
];

/** Gentle idle float — 3px Y oscillation */
const FLOAT_Y = [0, -3, 0, -3, 0];
const FLOAT_DURATION = 2.4;

export default function MascotsCelebration({ onDismiss }: MascotsCelebrationProps) {
  const [visible, setVisible] = useState(true);
  const [confettiDone, setConfettiDone] = useState(false);
  const dismissedRef = useRef(false);
  // Store onDismiss in a ref so effects that run once on mount still call the
  // latest version without needing it in the dependency array.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Stable dismiss callback — safe to call from any effect without re-binding.
  const triggerDismissRef = useRef(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setVisible(false);
    setTimeout(() => onDismissRef.current(), 400);
  });

  // Auto-dismiss after 3.5s — runs once on mount
  useEffect(() => {
    const dismiss = triggerDismissRef.current;
    const t = setTimeout(dismiss, 3500);
    return () => clearTimeout(t);
  }, []);

  // Keyboard dismiss (Escape) — runs once on mount
  useEffect(() => {
    const dismiss = triggerDismissRef.current;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="mascots-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="¡Especiales completados!"
          onClick={triggerDismissRef.current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: "env(safe-area-inset-bottom, 24px)",
            background: "rgba(0,0,0,0.72)",
            cursor: "pointer",
          }}
        >
          {/* Dense confetti anchored near the top-center of the overlay */}
          <div
            style={{
              position: "absolute",
              top: "30%",
              left: "50%",
              pointerEvents: "none",
            }}
          >
            <ConfettiBurst
              active={!confettiDone}
              onDone={() => setConfettiDone(true)}
              dense
            />
          </div>

          {/* Caption */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            style={{
              color: "#F4C84A",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 12,
              textShadow: "0 2px 12px rgba(0,0,0,0.9)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            ¡Especiales completados!
          </motion.p>

          {/* Mascot trio */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              paddingBottom: 16,
              pointerEvents: "none",
            }}
          >
            {MASCOTAS.map((m) => (
              <motion.div
                key={m.src}
                initial={{
                  y: 160,
                  x: m.originX,
                  scale: 0,
                  rotate: m.tiltDeg * 2,
                }}
                animate={{
                  y: [160, 0, 0],
                  x: [m.originX, 0, 0],
                  scale: [0, 1.05, 1.0],
                  rotate: [m.tiltDeg * 2, m.tiltDeg, m.tiltDeg],
                }}
                transition={{
                  delay: m.delay,
                  duration: 0.65,
                  times: [0, 0.85, 1],
                  ease: ["easeOut", "easeOut", "easeOut"],
                }}
                exit={{
                  y: 120,
                  scale: 0,
                  opacity: 0,
                  transition: { duration: 0.35, ease: "easeIn" },
                }}
              >
                {/* Idle float after fly-in completes */}
                <motion.div
                  animate={{ y: FLOAT_Y }}
                  transition={{
                    duration: FLOAT_DURATION,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: m.delay + 0.75,
                  }}
                >
                  <img
                    src={m.src}
                    alt={m.alt}
                    width={90}
                    height={300}
                    style={{
                      objectFit: "cover",
                      objectPosition: "top",
                      borderRadius: 12,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
                      display: "block",
                    }}
                    draggable={false}
                  />
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Tap-to-dismiss hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            style={{
              color: "#fff",
              fontSize: 11,
              marginTop: 0,
              marginBottom: 8,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            Toca para cerrar
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

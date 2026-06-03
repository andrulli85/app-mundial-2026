"use client";

/**
 * ConfettiBurst — CSS-only confetti anchored to the team header.
 *
 * Fire-and-forget: unmounts itself after the animation completes (~1.2s).
 * Reduced-motion: skips entirely, caller passes reducedMotion prop.
 *
 * Usage:
 *   <ConfettiBurst active={true} onDone={() => setActive(false)} dense={false} />
 */

import { useEffect, useRef } from "react";

interface ConfettiBurstProps {
  /** Trigger the burst */
  active: boolean;
  /** Called after animation completes — use to remove the component */
  onDone: () => void;
  /** Dense mode (FWC overlay) uses more particles */
  dense?: boolean;
  /** prefers-reduced-motion — if true, skip animation */
  reducedMotion?: boolean;
}

// Each particle gets a random hue from this palette (brand gold + WC tri-color)
const COLORS = [
  "#F4C84A", "#FFE17A", "#C2913A",   // gold range
  "#E4002B", "#FF274F",              // red (CAN)
  "#00A24B", "#2BD46F",              // green (MEX)
  "#1466FF", "#4F8DFF",              // blue (USA)
  "#FFFFFF",                         // white highlight
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Particle {
  id: number;
  color: string;
  x: number;       // vw offset from center (-50vw to 50vw)
  y: number;       // final Y translate (negative = up)
  rotation: number;
  size: number;
  delay: number;
  shape: "rect" | "circle";
}

function buildParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: randomPick(COLORS),
    x: (Math.random() - 0.5) * 180,     // spread ±90px
    y: -(60 + Math.random() * 80),       // fly 60-140px up
    rotation: (Math.random() - 0.5) * 720,
    size: 5 + Math.random() * 5,
    delay: Math.random() * 0.3,
    shape: Math.random() > 0.4 ? "rect" : "circle",
  }));
}

export default function ConfettiBurst({
  active,
  onDone,
  dense = false,
  reducedMotion = false,
}: ConfettiBurstProps) {
  const doneRef = useRef(false);
  const particleCount = dense ? 30 : 16;
  const duration = 1200; // ms — matches CSS animation

  useEffect(() => {
    if (!active || doneRef.current) return;
    if (reducedMotion) {
      // skip animation — fire onDone immediately
      doneRef.current = true;
      onDone();
      return;
    }
    const timer = setTimeout(() => {
      doneRef.current = true;
      onDone();
    }, duration + 400); // +buffer for stagger
    return () => clearTimeout(timer);
  }, [active, onDone, reducedMotion]);

  if (!active || reducedMotion) return null;

  const particles = buildParticles(particleCount);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 0,
        height: 0,
        pointerEvents: "none",
        zIndex: 30,
        overflow: "visible",
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            width: p.shape === "rect" ? p.size : p.size,
            height: p.shape === "rect" ? p.size * 2.2 : p.size,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            backgroundColor: p.color,
            top: 0,
            left: 0,
            transform: "translate(-50%, -50%)",
            animation: `confetti-fly ${duration}ms cubic-bezier(0.22, 0.61, 0.36, 1) ${p.delay}s both`,
            "--tx": `${p.x}px`,
            "--ty": `${p.y}px`,
            "--rot": `${p.rotation}deg`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes confetti-fly {
          0%   { transform: translate(-50%,-50%) translateX(0) translateY(0) rotate(0deg) scale(1); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translate(-50%,-50%) translateX(var(--tx)) translateY(var(--ty)) rotate(var(--rot)) scale(0.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

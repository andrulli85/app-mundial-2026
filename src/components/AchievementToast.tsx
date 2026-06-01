"use client";

/**
 * AchievementToast — celebratory toast shown when a new badge is unlocked.
 *
 * - Slides in from the top-right (desktop) / bottom-center (mobile)
 * - Auto-dismisses after 4s
 * - Queues multiple unlocks sequentially (1s gap between each)
 * - Tap → navigate to /achievements
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BADGES } from "@/lib/achievements";

interface Props {
  toastQueue: string[];
  onDismiss: (id: string) => void;
}

export default function AchievementToast({ toastQueue, onDismiss }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  // Pick the next toast from the queue
  useEffect(() => {
    if (toastQueue.length > 0 && !currentId) {
      // Small delay between sequential toasts
      const delay = 400;
      const timer = setTimeout(() => {
        setCurrentId(toastQueue[0]);
        setVisible(true);
        setIsExiting(false);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [toastQueue, currentId]);

  // Auto-dismiss after 4s
  useEffect(() => {
    if (!visible || !currentId) return;
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 4000);
    return () => clearTimeout(dismissTimer);
  }, [visible, currentId]); // handleDismiss is stable — defined in same component scope

  function handleDismiss() {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      if (currentId) onDismiss(currentId);
      setCurrentId(null);
      setIsExiting(false);
    }, 300);
  }

  function handleTap() {
    handleDismiss();
    router.push("/achievements");
  }

  if (!visible || !currentId) return null;

  const badge = BADGES.find((b) => b.id === currentId);
  if (!badge) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Logro desbloqueado: ${badge.name}`}
      onClick={handleTap}
      style={{
        position: "fixed",
        // Bottom-center on mobile (<= 640px), top-right on larger screens
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        left: "50%",
        transform: isExiting
          ? "translateX(-50%) translateY(120%)"
          : "translateX(-50%) translateY(0)",
        zIndex: 9999,
        cursor: "pointer",
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        opacity: isExiting ? 0 : 1,
        maxWidth: "320px",
        width: "calc(100vw - 32px)",
      }}
      className="achievement-toast"
    >
      <div
        style={{
          background: "linear-gradient(135deg, #006847 0%, #004d33 100%)",
          border: "2px solid #c2d5c2",
          borderRadius: "16px",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.16)",
        }}
      >
        {/* Rarity glow ring around emoji */}
        <div
          style={{
            fontSize: "2rem",
            lineHeight: 1,
            flexShrink: 0,
            background:
              badge.rarity === "legendary"
                ? "radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)"
                : badge.rarity === "rare"
                ? "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)"
                : "none",
            borderRadius: "50%",
            padding: "4px",
          }}
        >
          {badge.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              color: "#c2d5c2",
              lineHeight: 1,
              marginBottom: "3px",
            }}
          >
            Logro desbloqueado
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {badge.name}
          </p>
        </div>

        {/* Rarity pill */}
        <div
          style={{
            flexShrink: 0,
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            padding: "3px 8px",
            borderRadius: "999px",
            background:
              badge.rarity === "legendary"
                ? "linear-gradient(135deg, #d4af37, #b8860b)"
                : badge.rarity === "rare"
                ? "#3b82f6"
                : "#6b7280",
            color: "#ffffff",
          }}
        >
          {badge.rarity === "legendary"
            ? "Legendario"
            : badge.rarity === "rare"
            ? "Raro"
            : "Común"}
        </div>
      </div>
    </div>
  );
}

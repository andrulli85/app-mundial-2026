"use client";

/**
 * BadgeCard — single achievement card for the /achievements grid.
 *
 * Locked state: grayscale + opacity-50 + lock overlay
 * Unlocked state: full color + shimmer ring
 */

import type { Badge } from "@/lib/achievements";

interface Props {
  badge: Badge;
  unlocked: boolean;
  unlockedAt?: number; // unix ms
}

const RARITY_COLORS: Record<string, { bg: string; border: string; pill: string; text: string }> = {
  common: {
    bg: "#f9f9f9",
    border: "#d1d5db",
    pill: "#6b7280",
    text: "Común",
  },
  rare: {
    bg: "#eff6ff",
    border: "#93c5fd",
    pill: "#3b82f6",
    text: "Raro",
  },
  legendary: {
    bg: "#fffbeb",
    border: "#fcd34d",
    pill: "#d4af37",
    text: "Legendario",
  },
};

export default function BadgeCard({ badge, unlocked, unlockedAt }: Props) {
  const colors = RARITY_COLORS[badge.rarity];

  const formattedDate = unlockedAt
    ? new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "short",
      }).format(new Date(unlockedAt))
    : null;

  return (
    <div
      title={unlocked ? badge.description : `Completá el requisito: ${badge.description}`}
      style={{
        position: "relative",
        borderRadius: "16px",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        backgroundColor: unlocked ? colors.bg : "#f3f4f6",
        border: `2px solid ${unlocked ? colors.border : "#e5e7eb"}`,
        filter: unlocked ? "none" : "grayscale(1)",
        opacity: unlocked ? 1 : 0.55,
        transition: "opacity 0.25s ease, filter 0.25s ease",
        // Shimmer ring for unlocked legendary/rare
        boxShadow:
          unlocked && badge.rarity === "legendary"
            ? `0 0 0 3px ${colors.border}, 0 4px 16px rgba(212,175,55,0.2)`
            : unlocked && badge.rarity === "rare"
            ? `0 0 0 2px ${colors.border}`
            : "none",
      }}
    >
      {/* Lock overlay for locked badges */}
      {!unlocked && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "6px",
            right: "8px",
            fontSize: "14px",
            opacity: 0.6,
          }}
        >
          🔒
        </div>
      )}

      {/* Rarity pill */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          fontSize: "9px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          padding: "2px 6px",
          borderRadius: "999px",
          background: unlocked ? colors.pill : "#9ca3af",
          color: "#ffffff",
        }}
      >
        {colors.text}
      </div>

      {/* Emoji */}
      <span
        style={{
          fontSize: "2.5rem",
          lineHeight: 1,
          marginTop: "12px",
          display: "block",
        }}
        aria-hidden="true"
      >
        {badge.emoji}
      </span>

      {/* Name */}
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          fontWeight: 700,
          textAlign: "center",
          color: unlocked ? "#1f2937" : "#6b7280",
          lineHeight: 1.25,
        }}
      >
        {badge.name}
      </p>

      {/* Description */}
      <p
        style={{
          margin: 0,
          fontSize: "11px",
          textAlign: "center",
          color: unlocked ? "#6b7280" : "#9ca3af",
          lineHeight: 1.4,
        }}
      >
        {badge.description}
      </p>

      {/* Unlock date */}
      {unlocked && formattedDate && (
        <p
          style={{
            margin: 0,
            fontSize: "10px",
            color: "#9ca3af",
            fontWeight: 500,
          }}
        >
          {formattedDate}
        </p>
      )}
    </div>
  );
}

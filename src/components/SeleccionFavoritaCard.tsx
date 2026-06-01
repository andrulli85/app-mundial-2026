"use client";

/**
 * SeleccionFavoritaCard — Favorite national team bonus card.
 *
 * Shows the FIJA team with tournament tier bonuses.
 * Design source: data.jsx FAV_TEAM + market.jsx visual language.
 *
 * Props:
 *   compact — renders a slightly smaller card suitable for /inicio
 */

import { FAV_TEAM } from "@/lib/fav-team";

const GOLD = "#F4C84A";
const BG_CARD = "linear-gradient(135deg,#1b1606,#0d0f13)";

interface Props {
  compact?: boolean;
}

export default function SeleccionFavoritaCard({ compact = false }: Props) {
  const totalReached = FAV_TEAM.tiers
    .filter((t) => t.reached)
    .reduce((sum, t) => sum + t.pts, 0);

  return (
    <section
      aria-label="Selección Favorita"
      data-testid="seleccion-favorita-card"
      style={{
        background: BG_CARD,
        border: `1px solid ${GOLD}55`,
        borderRadius: 18,
        padding: compact ? "14px 16px" : "18px 18px",
        boxShadow: `0 0 24px -8px ${GOLD}33`,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: compact ? 28 : 34, lineHeight: 1 }} aria-hidden="true">
            {FAV_TEAM.flag}
          </span>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: GOLD,
                textTransform: "uppercase",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Selección Favorita
            </div>
            <div
              style={{
                fontSize: compact ? 17 : 20,
                fontWeight: 900,
                color: "#f3f4f6",
                textTransform: "uppercase",
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.1,
              }}
              data-testid="fav-team-name"
            >
              {FAV_TEAM.name}
            </div>
          </div>
        </div>

        {/* FIJA badge */}
        <span
          data-testid="fija-badge"
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: GOLD,
            background: `${GOLD}18`,
            border: `1px solid ${GOLD}44`,
            borderRadius: 99,
            padding: "4px 10px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          FIJA
        </span>
      </div>

      {/* Points earned so far */}
      {totalReached > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            fontWeight: 600,
            marginBottom: 10,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Ya ganaste{" "}
          <span style={{ color: GOLD, fontWeight: 800 }}>+{totalReached} pts</span>{" "}
          por tu selección
        </div>
      )}

      {/* Tier list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FAV_TEAM.tiers.map((tier) => (
          <div
            key={tier.stage}
            data-testid={`tier-${tier.reached ? "reached" : "pending"}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: tier.reached
                ? `${GOLD}12`
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${tier.reached ? GOLD + "44" : "rgba(255,255,255,0.07)"}`,
              opacity: tier.reached ? 1 : 0.65,
            }}
          >
            {/* Status icon */}
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: tier.reached
                  ? `${GOLD}25`
                  : "rgba(255,255,255,0.05)",
                border: `1px solid ${tier.reached ? GOLD + "55" : "rgba(255,255,255,0.1)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {tier.reached ? "✓" : "·"}
            </div>

            {/* Stage info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: tier.reached ? "#f3f4f6" : "#9ca3af",
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1.2,
                }}
              >
                {tier.stage}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#6b7280",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {tier.detail}
              </div>
            </div>

            {/* Points pill */}
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: tier.reached ? GOLD : "#6b7280",
                fontFamily: "system-ui, sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              +{tier.pts} pts
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

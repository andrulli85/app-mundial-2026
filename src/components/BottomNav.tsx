"use client";

/**
 * BottomNav — shared 5-tab navigation bar used across all main pages.
 *
 * Tab order (Fase 1 design alignment 2026-06-01):
 *   Inicio · Mercado · Álbum (CENTER, gold elevated FAB) · Mi 11 · Perfil
 *
 * The central "Álbum" button is elevated 30px above the bar with a gold/green
 * accent background and drop shadow, per Fase 1 design spec.
 * Route /once stays — only the visible label changed ("Mi Once" → "Mi 11").
 */

import Link from "next/link";

type NavTab = "inicio" | "album" | "once" | "mercado" | "perfil";

interface BottomNavProps {
  active: NavTab;
}

const LEFT_TABS = [
  { id: "inicio" as NavTab, href: "/inicio", label: "Inicio", emoji: "📊" },
  { id: "mercado" as NavTab, href: "/mercado", label: "Mercado", emoji: "🤝" },
];

const RIGHT_TABS = [
  { id: "once" as NavTab, href: "/once", label: "Mi 11", emoji: "⚽" },
  { id: "perfil" as NavTab, href: "/perfil", label: "Perfil", emoji: "👤" },
];

const GREEN = "#006847";
const GOLD = "#F4C84A";
const INACTIVE = "#9ca3af";

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <nav
      className="flex items-start border-t"
      style={{
        backgroundColor: "#0d0f13",
        borderColor: "rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        paddingTop: 10,
        paddingLeft: 6,
        paddingRight: 6,
        position: "relative",
        zIndex: 40,
      }}
      aria-label="Navegación principal"
    >
      {/* Left two tabs: Inicio, Mercado */}
      {LEFT_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="flex-1 flex flex-col items-center gap-1 py-1"
            style={{ color: isActive ? GREEN : INACTIVE, textDecoration: "none" }}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="text-xl leading-none" aria-hidden="true">
              {tab.emoji}
            </span>
            <span
              className="text-[0.6rem] font-semibold"
              style={{
                fontWeight: isActive ? 800 : 600,
                color: isActive ? GREEN : INACTIVE,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}

      {/* Center: Álbum — elevated FAB */}
      <div className="flex-1 flex flex-col items-center">
        <Link
          href="/album"
          aria-label="Álbum"
          aria-current={active === "album" ? "page" : undefined}
          style={{
            marginTop: -30,
            width: 58,
            height: 58,
            borderRadius: "50%",
            background:
              active === "album"
                ? `linear-gradient(135deg, ${GOLD}, #e6b800)`
                : GREEN,
            boxShadow:
              active === "album"
                ? `0 0 0 3px ${GOLD}55, 0 8px 20px -4px rgba(244,200,74,0.5)`
                : "0 6px 16px -4px rgba(0,0,0,0.25)",
            border: `1px solid ${active === "album" ? GOLD : "#005a3c"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            flexShrink: 0,
            transition: "box-shadow 0.2s",
          }}
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            📕
          </span>
        </Link>
        <span
          className="text-[0.6rem] mt-1"
          style={{
            fontWeight: active === "album" ? 800 : 700,
            color: active === "album" ? GOLD : INACTIVE,
          }}
        >
          Álbum
        </span>
      </div>

      {/* Right two tabs: Mi 11, Perfil */}
      {RIGHT_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="flex-1 flex flex-col items-center gap-1 py-1"
            style={{ color: isActive ? GREEN : INACTIVE, textDecoration: "none" }}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="text-xl leading-none" aria-hidden="true">
              {tab.emoji}
            </span>
            <span
              className="text-[0.6rem] font-semibold"
              style={{
                fontWeight: isActive ? 800 : 600,
                color: isActive ? GREEN : INACTIVE,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

/**
 * BottomNav — shared 5-tab navigation bar used across all main pages.
 *
 * Tabs: Inicio | Álbum | Mi Once (center elevated FAB) | Mercado | Perfil
 *
 * Design source: app.jsx → TabBar from Albumix design bundle
 * The central "Mi Once" button is elevated 30px above the bar with a gold/green
 * accent background and drop shadow, per design spec.
 */

import Link from "next/link";

type NavTab = "inicio" | "album" | "once" | "mercado" | "perfil";

interface BottomNavProps {
  active: NavTab;
}

const LEFT_TABS = [
  { id: "inicio" as NavTab, href: "/inicio", label: "Inicio", emoji: "📊" },
  { id: "album" as NavTab, href: "/album", label: "Álbum", emoji: "📕" },
];

const RIGHT_TABS = [
  { id: "mercado" as NavTab, href: "/mercado", label: "Mercado", emoji: "🤝" },
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
      {/* Left two tabs */}
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

      {/* Center: Mi Once — elevated FAB */}
      <div className="flex-1 flex flex-col items-center">
        <Link
          href="/once"
          aria-label="Mi Once"
          aria-current={active === "once" ? "page" : undefined}
          style={{
            marginTop: -30,
            width: 58,
            height: 58,
            borderRadius: "50%",
            background:
              active === "once"
                ? `linear-gradient(135deg, ${GOLD}, #e6b800)`
                : GREEN,
            boxShadow:
              active === "once"
                ? `0 0 0 3px ${GOLD}55, 0 8px 20px -4px rgba(244,200,74,0.5)`
                : "0 6px 16px -4px rgba(0,0,0,0.25)",
            border: `1px solid ${active === "once" ? GOLD : "#005a3c"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            flexShrink: 0,
            transition: "box-shadow 0.2s",
          }}
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            ⚽
          </span>
        </Link>
        <span
          className="text-[0.6rem] mt-1"
          style={{
            fontWeight: active === "once" ? 800 : 700,
            color: active === "once" ? GOLD : INACTIVE,
          }}
        >
          Mi Once
        </span>
      </div>

      {/* Right two tabs */}
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

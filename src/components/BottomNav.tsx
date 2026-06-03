"use client";

/**
 * BottomNav — 5-tab navigation bar (Stream A, Phase 4.1).
 *
 * Bi-mode (Epic 3): the center FAB and the 2nd tab both swap based on userMode.
 *   Collector: Inicio · Mercado · [FAB Álbum → /album] · Puntos · Perfil
 *   Fantasy:   Inicio · Reglas  · [FAB Mi 11  → /squad] · Puntos · Perfil
 *
 * Mode is read once on mount; a storage event triggers re-read for
 * same-tab mode toggle in /perfil.
 *
 * Active state: --gold fill + weight 800 label
 * Inactive state: --fg-3 icon + --fg-3 label
 * Background: --bg-1 with top hairline border
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, Grid3x3, Users, User, BookOpen, ArrowLeftRight } from "lucide-react";
import { getUserMode } from "@/lib/db";
import type { UserMode } from "@/lib/db";

export type NavTab = "inicio" | "album" | "once" | "mercado" | "perfil" | "scoreboard" | "reglas";

interface BottomNavProps {
  active: NavTab;
}

const GOLD = "#F4C84A";
const INACTIVE = "#6B7382"; // --fg-3

export default function BottomNav({ active }: BottomNavProps) {
  const [mode, setMode] = useState<UserMode | null>(null);

  useEffect(() => {
    getUserMode().then(setMode);

    // Re-read mode when storage changes (same-tab toggle from /perfil)
    const handler = () => { getUserMode().then(setMode); };
    window.addEventListener("albumix:modechange", handler);
    return () => window.removeEventListener("albumix:modechange", handler);
  }, []);

  const isFantasy = mode === "fantasy";

  return (
    <>
      {/* Spacer — reserves layout space equal to nav height so content isn't hidden */}
      <div aria-hidden style={{ height: 88, flexShrink: 0 }} />
      <nav
        aria-label="Navegación principal"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "flex-end",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
          paddingTop: 8,
          paddingLeft: 4,
          paddingRight: 4,
          background: "var(--bg-1)",
          borderTop: "1px solid var(--line)",
        }}
      >
      {/* ── Inicio ── */}
      <NavItem
        href="/inicio"
        label="Inicio"
        active={active === "inicio"}
        activeColor={GOLD}
        inactiveColor={INACTIVE}
      >
        <Home size={22} strokeWidth={active === "inicio" ? 2.4 : 1.8} />
      </NavItem>

      {/* ── Tab 2: Álbum (collector) or Reglas (fantasy) ── */}
      {isFantasy ? (
        <NavItem
          href="/reglas"
          label="Reglas"
          active={active === "reglas"}
          activeColor={GOLD}
          inactiveColor={INACTIVE}
        >
          <BookOpen size={22} strokeWidth={active === "reglas" ? 2.4 : 1.8} />
        </NavItem>
      ) : (
        <NavItem
          href="/mercado"
          label="Mercado"
          active={active === "mercado"}
          activeColor={GOLD}
          inactiveColor={INACTIVE}
        >
          <ArrowLeftRight size={22} strokeWidth={active === "mercado" ? 2.4 : 1.8} />
        </NavItem>
      )}

      {/* ── Center FAB: Álbum (collector) or Mi 11 (fantasy) ── */}
      {(() => {
        const fabHref        = isFantasy ? "/squad" : "/album";
        const fabLabel       = isFantasy ? "Mi 11"  : "Álbum";
        const fabActiveMatch = isFantasy ? "once"   : "album";
        const fabActive      = active === fabActiveMatch;
        return (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              marginTop: -14,
            }}
          >
            <Link
              href={fabHref}
              aria-label={fabLabel}
              aria-current={fabActive ? "page" : undefined}
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                flexShrink: 0,
                background: "linear-gradient(135deg,#FFE9A8 0%,#F4C84A 38%,#C2913A 62%,#FFE9A8 100%)",
                boxShadow: fabActive
                  ? `0 0 0 3px var(--bg-1), 0 0 20px -2px rgba(244,200,74,.7), var(--sh-3)`
                  : `0 0 0 3px var(--bg-1), 0 0 12px -4px rgba(244,200,74,.4), var(--sh-2)`,
                transition: "box-shadow 0.2s var(--ease-out)",
              }}
            >
              <Grid3x3
                size={24}
                strokeWidth={2}
                color="var(--fg-onlight)"
              />
            </Link>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                color: GOLD,
                fontFamily: "var(--font-ui)",
              }}
            >
              {fabLabel}
            </span>
          </div>
        );
      })()}

      {/* ── Puntos ── */}
      <NavItem
        href="/scoreboard"
        label="Puntos"
        active={active === "scoreboard"}
        activeColor={GOLD}
        inactiveColor={INACTIVE}
      >
        <Users size={22} strokeWidth={active === "scoreboard" ? 2.4 : 1.8} />
      </NavItem>

      {/* ── Perfil ── */}
      <NavItem
        href="/perfil"
        label="Perfil"
        active={active === "perfil"}
        activeColor={GOLD}
        inactiveColor={INACTIVE}
      >
        <User size={22} strokeWidth={active === "perfil" ? 2.4 : 1.8} />
      </NavItem>
    </nav>
    </>
  );
}

// ── Shared tab item ──────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  label: string;
  active: boolean;
  activeColor: string;
  inactiveColor: string;
  children: React.ReactNode;
}

function NavItem({ href, label, active, activeColor, inactiveColor, children }: NavItemProps) {
  const color = active ? activeColor : inactiveColor;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "4px 2px",
        color,
        textDecoration: "none",
        transition: "color 0.15s",
      }}
    >
      {children}
      <span
        style={{
          fontSize: 10,
          fontWeight: active ? 800 : 600,
          letterSpacing: ".02em",
          color,
          fontFamily: "var(--font-ui)",
        }}
      >
        {label}
      </span>
    </Link>
  );
}

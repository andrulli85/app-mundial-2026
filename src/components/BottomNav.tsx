"use client";

/**
 * BottomNav — shared 5-tab navigation bar (Fase 2.5, 2026-06-01).
 *
 * Tab order per canonical design (app.jsx lines 28-34):
 *   Inicio · Mercado · Álbum (CENTER hero pill) · Mi 11 · Perfil
 *
 * Icons match ICONS map in ui.jsx exactly (Lucide equivalents):
 *   home  → Home
 *   trade → ArrowLeftRight
 *   grid  → Grid3x3
 *   users → Users
 *   user  → User
 *
 * Hero "Álbum" pill (center):
 *   - 40×40 rounded-full
 *   - Inactive: gold border, dark bg
 *   - Active: var(--foil-gold) gradient bg + glow shadow
 *   - Icon size 22 active / 23 inactive, strokeWidth 2 / 2.4
 */

import Link from "next/link";
import { Home, ArrowLeftRight, Grid3x3, Users, User } from "lucide-react";

type NavTab = "inicio" | "album" | "once" | "mercado" | "perfil" | "scoreboard";

interface BottomNavProps {
  active: NavTab;
}

const GOLD = "#F4C84A";
const INACTIVE = "#9ca3af";
const ACTIVE_FG = "#f5f5f5";

export default function BottomNav({ active }: BottomNavProps) {
  const isAlbumActive = active === "album";

  return (
    <nav
      aria-label="Navegación principal"
      style={{
        position: "relative",
        zIndex: 40,
        display: "flex",
        alignItems: "flex-end",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
        paddingTop: 10,
        paddingLeft: 4,
        paddingRight: 4,
        background: "linear-gradient(0deg,rgba(7,8,10,0.98) 60%,transparent)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Inicio */}
      <Link
        href="/inicio"
        aria-current={active === "inicio" ? "page" : undefined}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 2px", color: active === "inicio" ? GOLD : INACTIVE, textDecoration: "none" }}
      >
        <Home size={23} strokeWidth={active === "inicio" ? 2.4 : 2} />
        <span style={{ fontSize: 10, fontWeight: active === "inicio" ? 800 : 600, letterSpacing: ".02em", color: active === "inicio" ? GOLD : INACTIVE }}>
          Inicio
        </span>
      </Link>

      {/* Mercado */}
      <Link
        href="/mercado"
        aria-current={active === "mercado" ? "page" : undefined}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 2px", color: active === "mercado" ? GOLD : INACTIVE, textDecoration: "none" }}
      >
        <ArrowLeftRight size={23} strokeWidth={active === "mercado" ? 2.4 : 2} />
        <span style={{ fontSize: 10, fontWeight: active === "mercado" ? 800 : 600, letterSpacing: ".02em", color: active === "mercado" ? GOLD : INACTIVE }}>
          Mercado
        </span>
      </Link>

      {/* Álbum — hero pill */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Link
          href="/album"
          aria-label="Álbum"
          aria-current={isAlbumActive ? "page" : undefined}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            flexShrink: 0,
            transition: "box-shadow 0.2s",
            background: isAlbumActive
              ? `linear-gradient(135deg, ${GOLD}, #d4a017)`
              : "var(--bg-3, #1a1d22)",
            border: isAlbumActive ? "none" : `1px solid ${GOLD}`,
            boxShadow: isAlbumActive
              ? `0 0 14px -2px ${GOLD}88, 0 4px 12px rgba(0,0,0,0.4)`
              : "none",
          }}
        >
          <Grid3x3
            size={isAlbumActive ? 22 : 23}
            strokeWidth={isAlbumActive ? 2 : 2.4}
            color={isAlbumActive ? "#0d0f13" : GOLD}
          />
        </Link>
        <span
          style={{
            fontSize: 10,
            fontWeight: isAlbumActive ? 800 : 700,
            letterSpacing: ".02em",
            marginTop: 4,
            color: isAlbumActive ? GOLD : ACTIVE_FG,
          }}
        >
          Álbum
        </span>
      </div>

      {/* Mi 11 */}
      <Link
        href="/once"
        aria-current={active === "once" ? "page" : undefined}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 2px", color: active === "once" ? GOLD : INACTIVE, textDecoration: "none" }}
      >
        <Users size={23} strokeWidth={active === "once" ? 2.4 : 2} />
        <span style={{ fontSize: 10, fontWeight: active === "once" ? 800 : 600, letterSpacing: ".02em", color: active === "once" ? GOLD : INACTIVE }}>
          Mi 11
        </span>
      </Link>

      {/* Perfil */}
      <Link
        href="/perfil"
        aria-current={active === "perfil" ? "page" : undefined}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 2px", color: active === "perfil" ? GOLD : INACTIVE, textDecoration: "none" }}
      >
        <User size={23} strokeWidth={active === "perfil" ? 2.4 : 2} />
        <span style={{ fontSize: 10, fontWeight: active === "perfil" ? 800 : 600, letterSpacing: ".02em", color: active === "perfil" ? GOLD : INACTIVE }}>
          Perfil
        </span>
      </Link>
    </nav>
  );
}

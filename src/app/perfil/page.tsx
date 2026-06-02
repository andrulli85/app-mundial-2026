"use client";

/**
 * /perfil — User space aggregator (Albumix dark/gold redesign).
 *
 * Sections (top → bottom):
 *   - Header: radial glow halo, 88px foil avatar, Anton name, División Oro · Nivel 14,
 *             Conectar con Google button (when signed out) or email (when signed in)
 *   - Mi Colección stat card: owned / total · pct% · foil gold progress bar
 *   - ProfileTile list: Wishlist · Logros · Estadísticas · Mapa · Importar (×2) · Config
 *   - Footer: "Albumix · Mundial 2026" muted text
 *
 * Data plumbing (unchanged):
 *   - getNickname / getAllStickers / getCatalog drive owned + total
 *   - useAuth drives user / authLoading / signIn
 *   - Missing nickname → router.replace("/")
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Star,
  BarChart3,
  Map,
  Upload,
  Settings,
  Shield,
  ChevronRight,
  Users,
} from "lucide-react";
import { getNickname, getAllStickers } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import { useAuth } from "@/components/AuthProvider";
import BottomNav from "@/components/BottomNav";

// ---------------------------------------------------------------------------
// Google "G" multicolor SVG (verbatim from profile_screens.jsx lines 6-15)
// ---------------------------------------------------------------------------
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ProfileTile
// ---------------------------------------------------------------------------
interface ProfileTileProps {
  icon: React.ReactNode;
  color?: string;
  title: string;
  sub: string;
  badge?: number;
  featured?: boolean;
  href: string;
}

function ProfileTile({ icon, color = "var(--gold)", title, sub, badge, featured, href }: ProfileTileProps) {
  return (
    <Link
      href={href}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: 14,
        borderRadius: 16,
        background: "var(--bg-2)",
        border: `1px solid ${featured ? "var(--line-gold)" : "var(--line)"}`,
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      {/* Icon slot */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: "var(--bg-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--fg-1)" }}>{title}</div>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-3)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sub}
        </div>
      </div>

      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            borderRadius: 99,
            background: "var(--red, #FF3B5C)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badge}
        </span>
      )}

      {/* Chevron */}
      <ChevronRight size={20} color="var(--fg-3)" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PerfilPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn } = useAuth();
  const [nickname, setNickname] = useState<string>("");
  const [owned, setOwned] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // claimable achievements — stubbed 0 until achievements store exposes a helper
  const claimable = 0;

  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }
      setNickname(nick);

      const [cat, entries] = await Promise.all([getCatalog(), getAllStickers()]);
      setTotal(cat.length);
      setOwned(entries.filter((e) => e.count > 0).length);
      setLoading(false);
    })();
  }, [router]);

  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  // Loading skeleton
  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "var(--bg-1)" }}
      >
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const initial = (nickname[0] ?? "?").toUpperCase();

  return (
    <div className="home-dark flex flex-col flex-1 w-full max-w-lg mx-auto">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "4px 18px 0",
          overflow: "hidden",
        }}
      >
        {/* Radial gold glow halo */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -70,
            left: "50%",
            transform: "translateX(-50%)",
            width: 320,
            height: 240,
            background: "radial-gradient(circle, rgba(244,200,74,.18), transparent 65%)",
            pointerEvents: "none",
          }}
        />

        {/* 88px foil avatar */}
        <div
          style={{
            position: "relative",
            width: 88,
            height: 88,
            borderRadius: 99,
            background: "var(--foil-gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontSize: 38,
            color: "var(--fg-onlight)",
            boxShadow: "var(--glow-gold)",
          }}
        >
          {initial}
        </div>

        {/* Name */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            color: "var(--fg-1)",
            marginTop: 14,
            textTransform: "uppercase",
            position: "relative",
            margin: "14px 0 0",
          }}
        >
          {nickname}
        </h1>

        {/* División Oro · Nivel 14 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
            position: "relative",
          }}
        >
          <Shield size={15} color="#3b9ae1" />
          <span style={{ fontSize: 13, color: "var(--fg-2)", fontWeight: 600 }}>
            División Oro · Nivel 14
          </span>
        </div>

        {/* Auth row */}
        {authLoading ? null : user ? (
          <span
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "var(--fg-3)",
              position: "relative",
            }}
          >
            {user.email}
          </span>
        ) : (
          <button
            onClick={signIn}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
              padding: "9px 16px",
              borderRadius: "var(--r-pill)",
              background: "var(--bg-2)",
              border: "1px solid var(--line-gold)",
              color: "var(--fg-1)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              position: "relative",
            }}
          >
            <GoogleG size={16} />
            Conectar con Google
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Mi Colección stat card                                               */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ padding: "22px 18px 0" }}>
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: 16,
          }}
          aria-label="Mi colección"
        >
          {/* Eyebrow */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".1em",
              color: "var(--fg-3)",
              textTransform: "uppercase",
            }}
          >
            MI COLECCIÓN
          </div>

          {/* Owned / total + pct row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              margin: "6px 0 4px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 34,
                color: "var(--fg-1)",
                lineHeight: 1,
              }}
            >
              {owned}
              <span style={{ color: "var(--fg-3)", fontSize: 20 }}> / {total}</span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-stat, 'Archivo', monospace)",
                fontWeight: 800,
                fontSize: 26,
                color: "var(--gold)",
              }}
            >
              {pct}%
            </div>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 12,
              color: "var(--fg-3)",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            cartas · {pct}% completado
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 8,
              borderRadius: 99,
              background: "var(--bg-3)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: "var(--foil-gold)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tile list                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "14px 18px 0",
        }}
      >
        <ProfileTile
          href="/wishlist"
          icon={<Heart size={21} />}
          title="Mi Wishlist"
          sub="Tus 10 cartas más buscadas"
        />
        <ProfileTile
          href="/friends"
          icon={<Users size={21} />}
          title="Amigos"
          sub="Ver quién está conectado para intercambiar"
        />
        <ProfileTile
          href="/achievements"
          icon={<Star size={21} />}
          title="Logros"
          sub="Coleccionables y recompensas"
          badge={claimable || undefined}
          featured={claimable > 0}
        />
        <ProfileTile
          href="/stats"
          icon={<BarChart3 size={21} />}
          title="Estadísticas"
          sub="Progreso detallado de tu álbum"
        />
        <ProfileTile
          href="/album/map"
          icon={<Map size={21} />}
          title="Mapa del Mundial"
          sub="Grupos y clasificación"
        />
        <ProfileTile
          href="/perfil/importar"
          icon={<Upload size={21} />}
          title="Importar inventario"
          sub="Seed rápido desde lista de Andy"
        />
        <ProfileTile
          href="/settings"
          icon={<Settings size={21} />}
          title="Configuración"
          sub="Apodo, cuenta, exportar datos"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          textAlign: "center",
          padding: "24px 18px 0",
          color: "var(--fg-3)",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Albumix · Mundial 2026
      </div>

      <BottomNav active="perfil" />
    </div>
  );
}

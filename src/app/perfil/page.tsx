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
  Upload,
  Settings,
  Shield,
  ChevronRight,
  Users,
  Gamepad2,
} from "lucide-react";
import { getNickname, getAllStickers, getUserMode, setUserMode } from "@/lib/db";
import type { UserMode } from "@/lib/db";
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
  const [useInitial, setUseInitial] = useState(false);
  const [currentMode, setCurrentMode] = useState<UserMode | null>(null);
  const [switchModal, setSwitchModal] = useState(false);
  const [modeSaving, setModeSaving] = useState(false);
  const [modeToast, setModeToast] = useState<string | null>(null);

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

      const [cat, entries, mode] = await Promise.all([
        getCatalog(),
        getAllStickers(),
        getUserMode(),
      ]);
      setTotal(cat.length);
      setOwned(entries.filter((e) => e.count > 0).length);
      setCurrentMode(mode);
      setLoading(false);
    })();
  }, [router]);

  const flashModeToast = (msg: string) => {
    setModeToast(msg);
    setTimeout(() => setModeToast(null), 2200);
  };

  const handleModeSelect = async (mode: UserMode) => {
    if (mode === currentMode) return;
    if (mode === "collector") {
      // Show warning modal before switching to collector
      setSwitchModal(true);
      return;
    }
    // Switching to fantasy — no confirmation needed
    setModeSaving(true);
    await setUserMode("fantasy");
    setCurrentMode("fantasy");
    window.dispatchEvent(new Event("albumix:modechange"));
    setModeSaving(false);
    flashModeToast("Modo Fantasy activo — ahora podés elegir cualquier jugador");
  };

  const confirmSwitchToCollector = async () => {
    setSwitchModal(false);
    setModeSaving(true);
    await setUserMode("collector");
    setCurrentMode("collector");
    window.dispatchEvent(new Event("albumix:modechange"));
    setModeSaving(false);
    router.push("/album");
  };

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
  const photoURL = user?.photoURL ?? null;

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

        {/* 88px avatar — Google photo when available, foil initial as fallback */}
        {photoURL && !useInitial ? (
          <img
            src={photoURL}
            alt="Profile photo"
            onError={() => setUseInitial(true)}
            data-testid="avatar-photo"
            style={{
              width: 88,
              height: 88,
              borderRadius: 99,
              objectFit: "cover",
              boxShadow: "var(--glow-gold)",
              border: "2px solid var(--line-gold)",
            }}
          />
        ) : (
          <div
            aria-label={`Avatar inicial ${initial}`}
            data-testid="avatar-initial"
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
        )}

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
      {/* Modo de juego — bi-mode toggle (Epic 3)                             */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ padding: "14px 18px 0" }}>
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Gamepad2 size={16} color="var(--fg-3)" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".1em",
              color: "var(--fg-3)",
              textTransform: "uppercase",
            }}
          >
            Modo de juego
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Collector chip */}
          <button
            onClick={() => handleModeSelect("collector")}
            disabled={modeSaving}
            aria-pressed={currentMode === "collector"}
            style={{
              width: "100%",
              border: `2px solid ${currentMode === "collector" ? "var(--gold)" : "var(--line)"}`,
              borderRadius: 16,
              padding: "14px 16px",
              cursor: modeSaving ? "default" : "pointer",
              background: currentMode === "collector"
                ? "linear-gradient(135deg,rgba(244,200,74,.12),rgba(244,200,74,.04))"
                : "var(--bg-2)",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: currentMode === "collector" ? "var(--glow-gold)" : "none",
              transition: "all .15s",
            }}
          >
            <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>🎴</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: currentMode === "collector" ? "var(--gold)" : "var(--fg-1)" }}>
                Tengo el álbum Panini
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                Marcá figuritas · intercambiá · Mi 11 de tus cartas
              </div>
            </div>
            {currentMode === "collector" && (
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 99,
                  background: "var(--foil-gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "var(--fg-onlight)",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
            )}
          </button>

          {/* Fantasy chip */}
          <button
            onClick={() => handleModeSelect("fantasy")}
            disabled={modeSaving}
            aria-pressed={currentMode === "fantasy"}
            style={{
              width: "100%",
              border: `2px solid ${currentMode === "fantasy" ? "var(--gold)" : "var(--line)"}`,
              borderRadius: 16,
              padding: "14px 16px",
              cursor: modeSaving ? "default" : "pointer",
              background: currentMode === "fantasy"
                ? "linear-gradient(135deg,rgba(244,200,74,.12),rgba(244,200,74,.04))"
                : "var(--bg-2)",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: currentMode === "fantasy" ? "var(--glow-gold)" : "none",
              transition: "all .15s",
            }}
          >
            <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>⚽</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: currentMode === "fantasy" ? "var(--gold)" : "var(--fg-1)" }}>
                Solo Fantasy
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                Armá tu 11 gratis — sin álbum, sin figuritas
              </div>
            </div>
            {currentMode === "fantasy" && (
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 99,
                  background: "var(--foil-gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "var(--fg-onlight)",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
            )}
          </button>
        </div>
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

      {/* ---- Mode toast ---- */}
      {modeToast && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 400,
            background: "var(--bg-3)",
            border: "1px solid var(--line-gold)",
            borderRadius: 99,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--fg-1)",
            fontFamily: "var(--font-ui)",
            boxShadow: "var(--sh-3)",
            whiteSpace: "nowrap",
            animation: "sheetup .25s var(--ease-pop)",
            maxWidth: "calc(100vw - 48px)",
            textAlign: "center",
          }}
        >
          {modeToast}
        </div>
      )}

      {/* ---- Collector switch confirmation modal ---- */}
      {switchModal && (
        <div
          onClick={() => setSwitchModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(7,8,10,.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "var(--bg-1)",
              borderRadius: "22px 22px 0 0",
              border: "1px solid var(--line-gold)",
              borderBottom: "none",
              padding: "24px 24px 40px",
              animation: "sheetup .3s var(--ease-out)",
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--line-strong)", margin: "0 auto 20px" }} />
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                color: "var(--fg-1)",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Cambiar a modo coleccionista
            </div>
            <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5, marginBottom: 24 }}>
              Vas a necesitar marcar tus stickers en Mi Álbum para que aparezcan en el picker.
              Serás redirigido a Mi Álbum ahora. ¿Confirmás?
            </p>
            <button
              onClick={confirmSwitchToCollector}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "var(--r-pill)",
                padding: "15px 0",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                background: "linear-gradient(135deg,#FFE9A8 0%,#F4C84A 38%,#C2913A 62%,#FFE9A8 100%)",
                color: "var(--fg-onlight)",
                boxShadow: "var(--glow-gold)",
                marginBottom: 12,
              }}
            >
              Confirmar
            </button>
            <button
              onClick={() => setSwitchModal(false)}
              style={{
                width: "100%",
                border: "1px solid var(--line-strong)",
                borderRadius: "var(--r-pill)",
                padding: "14px 0",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 14,
                background: "transparent",
                color: "var(--fg-2)",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <BottomNav active="perfil" />
    </div>
  );
}

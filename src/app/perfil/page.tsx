"use client";

/**
 * /perfil — User space aggregator.
 *
 * - Avatar + nickname + login state
 * - Mi colección stat card: X / 660 · YY%
 * - Nav tiles: Logros, Estadísticas, Mapa, Amigos, Importar, Configuración
 * - Sign-in widget if not signed in
 *
 * Dark theme: FUT dark palette matching /inicio + /album
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNickname, getAllStickers } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import { useAuth } from "@/components/AuthProvider";
import BottomNav from "@/components/BottomNav";

const GOLD = "#F4C84A";
const GREEN = "#006847";
const LIME = "#c2ef4e";
const BG = "#0a0a0a";
const SURFACE = "rgba(26,26,26,0.95)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT_PRIMARY = "#f5f5f5";
const TEXT_MUTED = "#9ca3af";

// ---------------------------------------------------------------------------
// Row tile component
// ---------------------------------------------------------------------------
function NavTile({
  href,
  emoji,
  label,
  sublabel,
  badge,
}: {
  href: string;
  emoji: string;
  label: string;
  sublabel?: string;
  badge?: string | number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl p-4 transition-colors"
      style={{
        backgroundColor: SURFACE,
        border: `1.5px solid ${BORDER}`,
        textDecoration: "none",
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        aria-hidden="true"
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm" style={{ color: TEXT_PRIMARY }}>{label}</div>
        {sublabel && (
          <div className="text-xs mt-0.5 truncate" style={{ color: TEXT_MUTED }}>{sublabel}</div>
        )}
      </div>
      {badge !== undefined && (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: GREEN, color: "#fff", minWidth: 20, textAlign: "center" }}
        >
          {badge}
        </span>
      )}
      <span className="text-sm" style={{ color: TEXT_MUTED }} aria-hidden="true">›</span>
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

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: BG }}
      >
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: GREEN, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div
      className="home-dark flex flex-col flex-1 w-full max-w-lg mx-auto"
    >
      {/* ---- Header with avatar ---- */}
      <header
        className="px-5 pt-6 pb-6 flex flex-col items-center text-center"
        style={{
          background: "linear-gradient(180deg, #111827 0%, #0d1117 100%)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black text-white uppercase mb-3"
          style={{
            background: `linear-gradient(135deg, ${GOLD}44, ${GOLD}22)`,
            border: `2px solid ${GOLD}66`,
            boxShadow: `0 0 24px ${GOLD}33`,
          }}
        >
          {nickname[0] ?? "?"}
        </div>
        <h1 className="text-xl font-black capitalize" style={{ color: TEXT_PRIMARY }}>{nickname}</h1>
        {authLoading ? null : user ? (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs font-medium" style={{ color: TEXT_MUTED }}>{user.email}</span>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="mt-2 text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: LIME, color: "#0d0f13" }}
          >
            Conectar con Google
          </button>
        )}
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-3 overflow-y-auto">
        {/* ---- Mi colección stat card ---- */}
        <section
          className="rounded-2xl p-4"
          style={{ backgroundColor: SURFACE, border: `1.5px solid ${BORDER}` }}
          aria-label="Mi colección"
        >
          <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: TEXT_MUTED }}>
            Mi colección
          </div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div
                className="text-3xl font-black leading-none"
                style={{ color: LIME }}
              >
                {owned}
                <span className="text-base font-semibold" style={{ color: TEXT_MUTED }}>
                  &nbsp;/ {total}
                </span>
              </div>
              <div className="text-xs mt-1" style={{ color: TEXT_MUTED }}>figuritas · {pct}% completado</div>
            </div>
            <div
              className="text-2xl font-black"
              style={{ color: pct >= 100 ? GOLD : LIME }}
            >
              {pct}%
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: LIME }}
            />
          </div>
        </section>

        {/* ---- Nav tiles ---- */}
        <div className="flex flex-col gap-2">
          <NavTile
            href="/wishlist"
            emoji="⭐"
            label="Mi Wishlist"
            sublabel="Tus 10 láminas más buscadas"
          />
          <NavTile
            href="/achievements"
            emoji="🏆"
            label="Logros"
            sublabel="Coleccionables y recompensas"
          />
          <NavTile
            href="/stats"
            emoji="📊"
            label="Estadísticas"
            sublabel="Progreso detallado de tu álbum"
          />
          <NavTile
            href="/album/map"
            emoji="🗺️"
            label="Mapa del Mundial"
            sublabel="Grupos y clasificación"
          />
          {user && (
            <NavTile
              href="/friends"
              emoji="👥"
              label="Amigos"
              sublabel="Conectá con tus amigos"
            />
          )}
          <NavTile
            href="/perfil/importar"
            emoji="📥"
            label="Importar inventario"
            sublabel="Seed rápido desde lista de Andy"
          />
          <NavTile
            href="/import"
            emoji="📲"
            label="Importar de Figuritas"
            sublabel="Traé tu colección desde otra app"
          />
          <NavTile
            href="/settings"
            emoji="⚙️"
            label="Configuración"
            sublabel="Apodo, cuenta, exportar datos"
          />
        </div>

        {/* ---- Sign-in CTA (if not signed in) ---- */}
        {!authLoading && !user && (
          <section
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: SURFACE, border: `1.5px solid ${BORDER}` }}
          >
            <p className="text-2xl mb-2" aria-hidden="true">🔐</p>
            <p className="text-sm font-bold mb-1" style={{ color: TEXT_PRIMARY }}>Conectá tu cuenta</p>
            <p className="text-xs mb-4" style={{ color: TEXT_MUTED }}>
              Guardá tu progreso en la nube y jugá con amigos
            </p>
            <button
              onClick={signIn}
              className="w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ backgroundColor: GREEN }}
            >
              Iniciar sesión con Google
            </button>
          </section>
        )}

        {/* Version footer */}
        <div className="text-center text-xs pt-2 pb-4" style={{ color: TEXT_MUTED }}>
          Albumix · Mundial 2026
          <span className="mx-2">·</span>
          <Link
            href="/legal/disclaimer"
            className="underline"
            style={{ color: TEXT_MUTED }}
          >
            Legal
          </Link>
        </div>
      </main>

      <BottomNav active="perfil" />
    </div>
  );
}

"use client";

/**
 * Settings screen — dark/gold redesign.
 *
 * Sections (top → bottom):
 *   - Sticky header (dark, back arrow, "Configuración" title w/ easter-egg)
 *   - Cuenta card   : signed-in user (avatar + name + email) + Cerrar sesión
 *   - Perfil card   : Cambiar apodo form
 *   - Datos card    : Exportar / Importar JSON backup
 *   - Links group   : Amigos · Logros · Importar desde otra app (rows)
 *   - Acerca de card: version + figuritas count + storage note
 *   - BottomNav active="perfil"
 *
 * Logic preserved verbatim:
 *   - handleLogout (POST /api/auth/logout + signOut + sessionStorage clear)
 *   - handleEasterTap (5 rapid taps on h1 → hidden achievement)
 *   - handleSaveNick + isValidNickname validation
 *   - handleExport / handleImport
 *
 * Design tokens: globals.css — --bg-1/2/3/4, --fg-1/2/3, --gold, --foil-gold-soft,
 *   --line, --line-strong, --line-gold, --r-*, --s-*, --sh-2.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download } from "lucide-react";
import {
  getNickname,
  setNickname,
  setProfile,
  exportCollection,
  importCollection,
} from "@/lib/db";
import { isValidNickname } from "@/lib/qr-engine";
import { useAuth } from "@/components/AuthProvider";
import SignInButton from "@/components/SignInButton";
import BottomNav from "@/components/BottomNav";
import { triggerAchievementCheck } from "@/hooks/useAchievements";

const APP_VERSION = "0.1.0";

// ── Shared section card shell ─────────────────────────────────────────────────

function SettingsCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        boxShadow: "var(--sh-2)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section eyebrow label ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color: "var(--gold)",
        fontFamily: "var(--font-ui)",
        padding: "0 0 8px 0",
      }}
    >
      {children}
    </div>
  );
}

// ── Link row (Amigos / Logros / Importar desde otra app) ─────────────────────

function LinkRow({
  href,
  icon,
  title,
  sub,
  testId,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  testId?: string;
}) {
  return (
    <a
      href={href}
      data-testid={testId}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "14px 16px",
        textDecoration: "none",
        transition: "opacity 0.15s",
      }}
      onTouchStart={(e) =>
        ((e.currentTarget as HTMLElement).style.opacity = "0.7")
      }
      onTouchEnd={(e) =>
        ((e.currentTarget as HTMLElement).style.opacity = "1")
      }
    >
      {/* Icon slot */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--r-sm)",
          background: "var(--bg-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "var(--gold)",
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: "var(--fg-1)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-3)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sub}
        </div>
      </div>

      <ChevronRight size={18} color="var(--fg-3)" />
    </a>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn: _signIn, signOut } = useAuth();

  // Full logout: Firebase signOut + clear server-side HMAC cookie + clear the
  // handshake guard so a re-login on the same device works cleanly.
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Network failure shouldn't block the client-side signOut path.
    }
    await signOut();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("albumix_handshake_attempted");
    }
    router.push("/login");
  }

  const [nickname, setLocalNickname] = useState("");
  const [newNick, setNewNick] = useState("");
  const [nickError, setNickError] = useState("");
  const [nickSaved, setNickSaved] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");

  // Easter egg: tap the header title 5 times rapidly to unlock hidden badge
  const easterTaps = useRef(0);
  const easterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEasterTap = async () => {
    easterTaps.current += 1;
    if (easterTimer.current) clearTimeout(easterTimer.current);
    if (easterTaps.current >= 5) {
      easterTaps.current = 0;
      await setProfile("easter_egg_tapped", "1");
      triggerAchievementCheck();
    } else {
      // Reset count if user stops tapping for 2s
      easterTimer.current = setTimeout(() => {
        easterTaps.current = 0;
      }, 2000);
    }
  };

  useEffect(() => {
    getNickname().then((n) => {
      if (!n) {
        router.replace("/");
        return;
      }
      setLocalNickname(n);
      setNewNick(n);
    });
  }, [router]);

  const handleSaveNick = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNick.trim().toLowerCase();
    if (!isValidNickname(trimmed)) {
      setNickError("Solo letras y números, 3-16 caracteres.");
      return;
    }
    await setNickname(trimmed);
    setLocalNickname(trimmed);
    setNickError("");
    setNickSaved(true);
    setTimeout(() => setNickSaved(false), 2000);
  };

  const handleExport = async () => {
    try {
      const json = await exportCollection();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `albumix-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus("Backup descargado.");
      setTimeout(() => setExportStatus(""), 3000);
    } catch (err) {
      setExportStatus("Error al exportar.");
      console.error(err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importCollection(text);
      // Mark that user has imported, then trigger achievement check
      await setProfile("imported_from_app", "1");
      triggerAchievementCheck();
      setImportStatus("Colección importada correctamente.");
      setTimeout(() => setImportStatus(""), 3000);
    } catch (err) {
      setImportStatus("Archivo inválido. Usá un backup de esta app.");
      console.error(err);
    }
    e.target.value = "";
  };

  return (
    <div
      className="flex flex-col flex-1 max-w-lg mx-auto w-full"
      style={{ background: "var(--bg-1)" }}
    >
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4"
        style={{
          height: 54,
          background: "var(--bg-1)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <a
          href="/perfil"
          aria-label="Volver al perfil"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "var(--r-sm)",
            color: "var(--fg-2)",
            textDecoration: "none",
            fontSize: 20,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ←
        </a>

        {/* Tap 5× to unlock the hidden easter egg badge */}
        <h1
          className="t-h3"
          onClick={handleEasterTap}
          style={{
            cursor: "default",
            WebkitUserSelect: "none",
            userSelect: "none",
            flex: 1,
          }}
          aria-label="Configuración"
        >
          Configuración
        </h1>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col gap-6"
        style={{ padding: "var(--s-5) var(--s-4) var(--s-4)" }}
      >

        {/* ── CUENTA ───────────────────────────────────────────────────────── */}
        {!authLoading && (
          <section>
            <SectionLabel>Cuenta</SectionLabel>
            <SettingsCard>
              {user ? (
                <div style={{ padding: 16 }}>
                  {/* Avatar + name + email row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName ?? "Avatar"}
                        width={48}
                        height={48}
                        referrerPolicy="no-referrer"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid var(--line-gold)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        aria-hidden
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "var(--foil-gold-soft)",
                          border: "2px solid var(--line-gold)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--fg-onlight)",
                          fontSize: 20,
                          fontWeight: 800,
                          fontFamily: "var(--font-wide)",
                          flexShrink: 0,
                        }}
                      >
                        {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "var(--fg-1)",
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.displayName}
                      </p>
                      {user.email && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--fg-3)",
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cerrar sesión */}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      padding: "12px 0",
                      borderRadius: "var(--r-md)",
                      fontFamily: "var(--font-ui)",
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: ".04em",
                      backgroundColor: "var(--bg-3)",
                      color: "var(--red-bright)",
                      border: "1px solid var(--line-strong)",
                      cursor: "pointer",
                      minHeight: 44,
                      transition: "opacity 0.15s",
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                /* Logged-out state — defensive path (middleware normally redirects) */
                <div style={{ padding: 16 }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--fg-2)",
                      marginBottom: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    Conectate con Google para ver a tus amigos y sus figuritas en tiempo real.
                  </p>
                  <SignInButton />
                </div>
              )}
            </SettingsCard>
          </section>
        )}

        {/* ── LINKS group (Importar desde otra app) ──────────────────────────
            Amigos + Logros moved to /perfil (social/self-display belongs there;
            /settings stays focused on config/data actions). */}
        <SettingsCard>
          <LinkRow
            href="/import"
            icon={<Download size={20} />}
            title="Importar desde otra app"
            sub="Migrá desde Figuritas.app sin re-marcar todo"
            testId="settings-row-import"
          />
        </SettingsCard>

        {/* ── PERFIL (apodo) ────────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Perfil</SectionLabel>
          <SettingsCard>
            <div style={{ padding: 16 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--fg-2)",
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                Este nombre aparece cuando intercambiás figuritas.{" "}
                <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                  {nickname}
                </span>
              </p>

              <form onSubmit={handleSaveNick} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={newNick}
                  onChange={(e) => {
                    setNewNick(e.target.value.toLowerCase());
                    setNickError("");
                    setNickSaved(false);
                  }}
                  maxLength={16}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="tu apodo"
                  style={{
                    flex: 1,
                    backgroundColor: "var(--bg-3)",
                    color: "var(--fg-1)",
                    border: `1.5px solid ${nickError ? "var(--red-bright)" : "var(--line-strong)"}`,
                    borderRadius: "var(--r-md)",
                    padding: "10px 14px",
                    fontSize: 16, // iOS Safari zoom prevention
                    fontFamily: "var(--font-ui)",
                    outline: "none",
                    minHeight: 44,
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--gold)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = nickError
                      ? "var(--red-bright)"
                      : "var(--line-strong)")
                  }
                />
                <button
                  type="submit"
                  style={{
                    padding: "0 20px",
                    borderRadius: "var(--r-md)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: ".04em",
                    background: "var(--foil-gold-soft)",
                    color: "var(--fg-onlight)",
                    border: "none",
                    cursor: "pointer",
                    minHeight: 44,
                    flexShrink: 0,
                    transition: "opacity 0.15s",
                  }}
                >
                  Guardar
                </button>
              </form>

              {nickError && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--red-bright)",
                    marginTop: 6,
                  }}
                >
                  {nickError}
                </p>
              )}
              {nickSaved && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--green-bright)",
                    marginTop: 6,
                  }}
                >
                  Nombre guardado.
                </p>
              )}
            </div>
          </SettingsCard>
        </section>

        {/* ── DATOS (backup) ────────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Datos</SectionLabel>
          <SettingsCard>
            <div style={{ padding: 16 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--fg-2)",
                  marginBottom: 14,
                  lineHeight: 1.5,
                }}
              >
                Exportá tu colección para hacer un backup o pasarla a otro dispositivo.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Exportar */}
                <button
                  onClick={handleExport}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    borderRadius: "var(--r-md)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: ".04em",
                    background: "var(--foil-gold-soft)",
                    color: "var(--fg-onlight)",
                    border: "none",
                    cursor: "pointer",
                    minHeight: 44,
                    transition: "opacity 0.15s",
                  }}
                >
                  Exportar backup (JSON)
                </button>
                {exportStatus && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--green-bright)",
                      marginTop: -4,
                    }}
                  >
                    {exportStatus}
                  </p>
                )}

                {/* Importar */}
                <label
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "12px 0",
                    borderRadius: "var(--r-md)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: ".04em",
                    textAlign: "center",
                    backgroundColor: "var(--bg-3)",
                    color: "var(--fg-1)",
                    border: "1px solid var(--line-strong)",
                    cursor: "pointer",
                    minHeight: 44,
                    lineHeight: "20px",
                    transition: "opacity 0.15s",
                  }}
                >
                  Importar backup
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
                {importStatus && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--green-bright)",
                      marginTop: -4,
                    }}
                  >
                    {importStatus}
                  </p>
                )}
              </div>
            </div>
          </SettingsCard>
        </section>

        {/* ── ACERCA DE ────────────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Acerca de</SectionLabel>
          <SettingsCard>
            <div style={{ padding: 16 }}>
              {/* Wordmark */}
              <div
                style={{
                  fontSize: 20,
                  fontFamily:
                    "var(--font-display, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
                  fontWeight: 900,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  color: "var(--fg-1)",
                  marginBottom: 12,
                }}
              >
                ALBUMI<span style={{ color: "var(--gold)" }}>X</span>
              </div>

              <dl
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {(
                  [
                    ["Versión", APP_VERSION],
                    ["Figuritas en el álbum", "980"],
                    ["Datos guardados en", "este dispositivo (sin servidor)"],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <dt
                      style={{
                        fontSize: 13,
                        color: "var(--fg-3)",
                        fontFamily: "var(--font-ui)",
                      }}
                    >
                      {label}
                    </dt>
                    <dd
                      style={{
                        fontSize: 13,
                        color: "var(--fg-2)",
                        fontFamily:
                          label === "Versión"
                            ? "var(--font-stat, monospace)"
                            : "var(--font-ui)",
                        fontWeight: 600,
                        textAlign: "right",
                        maxWidth: "55%",
                      }}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </SettingsCard>
        </section>

        {/* Bottom breathing room so last card isn't flush with BottomNav */}
        <div aria-hidden style={{ height: 8 }} />
      </main>

      <BottomNav active="perfil" />
    </div>
  );
}

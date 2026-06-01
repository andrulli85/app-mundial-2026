"use client";

/**
 * Settings screen.
 * - Cuenta section: Google sign-in / signed-in user card (Phase 1)
 * - Amigos link (Phase 2, visible when signed in)
 * - Change nickname
 * - Export / import collection JSON (local backup)
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { triggerAchievementCheck } from "@/hooks/useAchievements";

const APP_VERSION = "0.1.0";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn: _signIn, signOut } = useAuth();
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
      a.download = `cromos-2026-backup-${Date.now()}.json`;
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
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <a
          href="/album"
          className="text-white text-xl leading-none"
          aria-label="Volver al álbum"
        >
          ←
        </a>
        {/* Tap 5× to unlock the hidden easter egg badge */}
        <h1
          className="text-lg font-black text-white leading-none select-none"
          onClick={handleEasterTap}
          style={{ cursor: "default", WebkitUserSelect: "none" }}
          aria-label="Albumix — Opciones"
        >
          Opciones
        </h1>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-6">
        {/* Cuenta */}
        {!authLoading && (
          <section
            className="rounded-2xl p-4 shadow-sm"
            style={{ backgroundColor: "#ffffff" }}
          >
            <h2 className="font-bold text-gray-700 mb-3">Cuenta</h2>
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName ?? "Avatar"}
                      width={32}
                      height={32}
                      className="rounded-full w-8 h-8 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: "#006847" }}
                    >
                      {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
                      {user.displayName}
                    </p>
                    {user.email && (
                      <p className="text-xs text-gray-500 leading-tight truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="w-full py-2 rounded-xl font-semibold text-sm text-center"
                  style={{
                    backgroundColor: "#f0ece3",
                    color: "#c8102e",
                    border: "2px solid #d1c9b8",
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-600 mb-1">
                  Conectate con Google para ver a tus amigos y sus figuritas en tiempo real.
                </p>
                <SignInButton />
              </div>
            )}
          </section>
        )}

        {/* Amigos — visible only when signed in */}
        {user && (
          <section
            className="rounded-2xl shadow-sm overflow-hidden"
            style={{ backgroundColor: "#ffffff" }}
          >
            <a
              href="/friends"
              className="flex items-center gap-3 px-4 py-4 active:opacity-70 transition-opacity"
              style={{ textDecoration: "none" }}
            >
              <span className="text-xl leading-none">👥</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm leading-tight">
                  Amigos
                </p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">
                  Ver quién está conectado para intercambiar
                </p>
              </div>
              <span className="text-gray-400 text-lg leading-none">›</span>
            </a>
          </section>
        )}

        {/* Nickname */}
        <section
          className="rounded-2xl p-4 shadow-sm"
          style={{ backgroundColor: "#ffffff" }}
        >
          <h2 className="font-bold text-gray-700 mb-3">Tu nombre</h2>
          <p className="text-xs text-gray-600 mb-3">
            Este nombre aparece cuando intercambiás figuritas. Actual:{" "}
            <strong>{nickname}</strong>
          </p>
          <form onSubmit={handleSaveNick} className="flex gap-2">
            <input
              type="text"
              value={newNick}
              onChange={(e) => {
                setNewNick(e.target.value.toLowerCase());
                setNickError("");
                setNickSaved(false);
              }}
              maxLength={16}
              className="flex-1 rounded-xl border-2 px-3 py-2 text-sm focus:outline-none"
              style={{
                borderColor: nickError ? "#c8102e" : "#d1c9b8",
                backgroundColor: "#fafaf8",
              }}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl font-bold text-white text-sm"
              style={{ backgroundColor: "#006847" }}
            >
              Guardar
            </button>
          </form>
          {nickError && (
            <p className="text-xs text-red-600 mt-1">{nickError}</p>
          )}
          {nickSaved && (
            <p className="text-xs text-green-600 mt-1">Nombre guardado.</p>
          )}
        </section>

        {/* Backup */}
        <section
          className="rounded-2xl p-4 shadow-sm"
          style={{ backgroundColor: "#ffffff" }}
        >
          <h2 className="font-bold text-gray-700 mb-3">Backup de colección</h2>
          <p className="text-xs text-gray-600 mb-3">
            Exportá tu colección para hacer un backup o pasarla a otro dispositivo.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleExport}
              className="w-full py-2.5 rounded-xl font-semibold text-sm"
              style={{
                backgroundColor: "#f0ece3",
                color: "#006847",
                border: "2px solid #d1c9b8",
              }}
            >
              Exportar backup (JSON)
            </button>
            {exportStatus && (
              <p className="text-xs text-green-600">{exportStatus}</p>
            )}

            <label
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-center cursor-pointer"
              style={{
                backgroundColor: "#f0ece3",
                color: "#333",
                border: "2px solid #d1c9b8",
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
              <p className="text-xs text-green-600">{importStatus}</p>
            )}
          </div>
        </section>

        {/* Logros */}
        <section
          className="rounded-2xl shadow-sm overflow-hidden"
          style={{ backgroundColor: "#ffffff" }}
          data-testid="settings-row-logros"
        >
          <a
            href="/achievements"
            className="flex items-center gap-3 px-4 py-4 active:opacity-70 transition-opacity"
            style={{ textDecoration: "none" }}
          >
            <span className="text-xl leading-none">🏆</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm leading-tight">
                Logros
              </p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">
                Tus badges y colecciones desbloqueadas
              </p>
            </div>
            <span className="text-gray-400 text-lg leading-none">›</span>
          </a>
        </section>

        {/* Import from Figuritas.app */}
        <section
          className="rounded-2xl shadow-sm overflow-hidden"
          style={{ backgroundColor: "#ffffff" }}
          data-testid="settings-row-import"
        >
          <a
            href="/import"
            className="flex items-center gap-3 px-4 py-4 active:opacity-70 transition-opacity"
            style={{ textDecoration: "none" }}
          >
            <span className="text-xl leading-none">📥</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm leading-tight">
                Importar desde otra app
              </p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">
                Migrá desde Figuritas.app sin re-marcar todo
              </p>
            </div>
            <span className="text-gray-400 text-lg leading-none">›</span>
          </a>
        </section>

        {/* App info */}
        <section
          className="rounded-2xl p-4 shadow-sm"
          style={{ backgroundColor: "#ffffff" }}
        >
          <h2 className="font-bold text-gray-700 mb-2">Acerca de la app</h2>
          <dl className="text-sm text-gray-600 flex flex-col gap-1">
            <div className="flex justify-between">
              <dt>Versión</dt>
              <dd className="font-mono">{APP_VERSION}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Figuritas en el álbum</dt>
              <dd>980</dd>
            </div>
            <div className="flex justify-between">
              <dt>Datos guardados en</dt>
              <dd>este dispositivo (sin servidor)</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}

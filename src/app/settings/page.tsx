"use client";

/**
 * Settings screen — low priority.
 * - Change nickname
 * - View app version
 * - Export / import collection JSON (local backup)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getNickname,
  setNickname,
  exportCollection,
  importCollection,
} from "@/lib/db";
import { isValidNickname } from "@/lib/qr-engine";

const APP_VERSION = "0.1.0";

export default function SettingsPage() {
  const router = useRouter();
  const [nickname, setLocalNickname] = useState("");
  const [newNick, setNewNick] = useState("");
  const [nickError, setNickError] = useState("");
  const [nickSaved, setNickSaved] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");

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
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <a
          href="/album"
          className="text-white text-xl leading-none"
          aria-label="Volver al álbum"
        >
          ←
        </a>
        <h1 className="text-lg font-black text-white leading-none">
          Opciones
        </h1>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-6">
        {/* Nickname */}
        <section
          className="rounded-2xl p-4 shadow-sm"
          style={{ backgroundColor: "#ffffff" }}
        >
          <h2 className="font-bold text-gray-700 mb-3">Tu nombre</h2>
          <p className="text-xs text-gray-500 mb-3">
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
          <p className="text-xs text-gray-500 mb-3">
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

        {/* App info */}
        <section
          className="rounded-2xl p-4 shadow-sm"
          style={{ backgroundColor: "#ffffff" }}
        >
          <h2 className="font-bold text-gray-700 mb-2">Acerca de la app</h2>
          <dl className="text-sm text-gray-500 flex flex-col gap-1">
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

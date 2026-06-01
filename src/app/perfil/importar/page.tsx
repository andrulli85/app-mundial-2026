"use client";

/**
 * /perfil/importar — 1-click seed of Domi's sticker collection.
 *
 * Reads owned_sticker_ids from /domi-owned-2026-06-01.json (480 stickers),
 * then writes to IndexedDB using set-if-zero pattern (idempotent):
 *   - Stickers already owned (count > 0) are left unchanged.
 *   - Stickers in the JSON but not yet in IDB get count=1.
 *
 * States: idle → loading → done (error on JSON fetch failure).
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNickname, getAllStickers, bulkSetStickers } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import { TEAM_CATALOG } from "@/lib/team-catalog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IMPORT_JSON_PATH = "/domi-owned-2026-06-01.json";
const TOTAL_EXPECTED = 480;

// Dark theme colours (matches .home-dark / inicio)
const BG = "linear-gradient(180deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)";
const CARD_BG = "rgba(26, 26, 26, 0.95)";
const CARD_BORDER = "1px solid rgba(255,255,255,0.08)";
const GOLD = "#facc15";
const GOLD_DIM = "#c9a35a";
const TEXT_PRIMARY = "#f5f5f5";
const TEXT_MUTED = "#9ca3af";

interface DomiJSON {
  generated_at: string;
  source: string;
  count: number;
  owned_sticker_ids: string[];
}

interface TeamRow {
  code: string;       // lowercase (e.g. "fwc")
  upperCode: string;  // "FWC"
  flag: string;
  displayName: string;
  ownedInImport: number;
  totalInCatalog: number;
}

type PageState = "idle" | "loading" | "done" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build per-team preview from the JSON ids list and the catalog. */
function buildTeamRows(ownedIds: string[], teamTotals: Map<string, number>): TeamRow[] {
  // Count per team_code in the import
  const importCounts: Record<string, number> = {};
  for (const id of ownedIds) {
    const parts = id.split("-");
    const tc = parts[0].toUpperCase();
    importCounts[tc] = (importCounts[tc] ?? 0) + 1;
  }

  const rows: TeamRow[] = [];
  for (const [tc, count] of Object.entries(importCounts)) {
    const catalogEntry = TEAM_CATALOG[tc];
    rows.push({
      code: tc.toLowerCase(),
      upperCode: tc,
      flag: catalogEntry?.flag ?? "🏳️",
      displayName: catalogEntry?.display_name ?? tc,
      ownedInImport: count,
      totalInCatalog: teamTotals.get(tc) ?? 0,
    });
  }

  // FWC first, then alphabetical by display name
  rows.sort((a, b) => {
    if (a.upperCode === "FWC") return -1;
    if (b.upperCode === "FWC") return 1;
    return a.displayName.localeCompare(b.displayName, "es");
  });

  return rows;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DomiImportPage() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("idle");
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(TOTAL_EXPECTED);
  const [teamRows, setTeamRows] = useState<TeamRow[]>([]);
  const [importData, setImportData] = useState<DomiJSON | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [addedCount, setAddedCount] = useState(0);
  const [topTeams, setTopTeams] = useState<{ name: string; owned: number; total: number }[]>([]);

  // Redirect to / if no nickname
  useEffect(() => {
    getNickname().then((nick) => {
      if (!nick) router.replace("/");
    });
  }, [router]);

  // Load JSON + build preview on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(IMPORT_JSON_PATH);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DomiJSON = await res.json();
        setImportData(data);

        // Build catalog totals per team
        const catalog = await getCatalog();
        const teamTotals = new Map<string, number>();
        for (const s of catalog) {
          const tc = s.team_code.toUpperCase();
          teamTotals.set(tc, (teamTotals.get(tc) ?? 0) + 1);
        }

        const rows = buildTeamRows(data.owned_sticker_ids, teamTotals);
        setTeamRows(rows);
        setProgressTotal(data.count);
      } catch (e) {
        setErrorMsg((e as Error).message ?? "Error desconocido");
        setPageState("error");
      }
    }
    load();
  }, []);

  const handleImport = useCallback(async () => {
    if (!importData) return;
    setPageState("loading");
    setProgress(0);

    try {
      // Read current IDB state
      const existing = await getAllStickers();
      const existingSet = new Set(
        existing.filter((e) => e.count > 0).map((e) => e.sticker_id)
      );

      // Only add stickers not already owned
      const toAdd = importData.owned_sticker_ids.filter(
        (id) => !existingSet.has(id)
      );

      const BATCH = 20;
      const now = Date.now();
      let processed = 0;

      for (let i = 0; i < toAdd.length; i += BATCH) {
        const chunk = toAdd.slice(i, i + BATCH);
        await bulkSetStickers(
          chunk.map((sticker_id) => ({ sticker_id, count: 1, acquired_at: now }))
        );
        processed += chunk.length;
        setProgress(processed);
      }

      setAddedCount(toAdd.length);

      // Compute top 5 teams by completion after import
      const catalog = await getCatalog();
      const allAfter = await getAllStickers();
      const ownedAfterSet = new Set(
        allAfter.filter((e) => e.count > 0).map((e) => e.sticker_id)
      );

      // Aggregate per team
      const teamOwned: Record<string, number> = {};
      const teamTotal: Record<string, number> = {};
      for (const s of catalog) {
        const tc = s.team_code.toUpperCase();
        teamTotal[tc] = (teamTotal[tc] ?? 0) + 1;
        if (ownedAfterSet.has(s.id)) {
          teamOwned[tc] = (teamOwned[tc] ?? 0) + 1;
        }
      }

      const top5 = Object.entries(teamOwned)
        .filter(([tc]) => tc && tc !== "_PANINI")
        .map(([tc, owned]) => ({
          name: TEAM_CATALOG[tc]?.display_name ?? tc,
          owned,
          total: teamTotal[tc] ?? 0,
        }))
        .sort((a, b) => b.owned - a.owned)
        .slice(0, 5);

      setTopTeams(top5);
      setPageState("done");
    } catch (e) {
      setErrorMsg((e as Error).message ?? "Error al importar");
      setPageState("error");
    }
  }, [importData]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col flex-1 w-full max-w-lg mx-auto min-h-screen"
      style={{ background: BG, color: TEXT_PRIMARY }}
    >
      {/* TopBar */}
      <header
        className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link
          href="/perfil"
          className="text-xl leading-none"
          style={{ color: TEXT_MUTED }}
          aria-label="Volver a perfil"
        >
          ‹
        </Link>
        <h1 className="text-base font-bold flex-1" style={{ color: TEXT_PRIMARY }}>
          Importar inventario
        </h1>
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-4 overflow-y-auto pb-8">
        {/* ── Error banner ── */}
        {pageState === "error" && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <span className="text-lg" aria-hidden="true">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-400">No se pudo cargar la lista</p>
              <p className="text-xs text-red-300 mt-0.5">{errorMsg}</p>
              <button
                onClick={() => {
                  setPageState("idle");
                  setErrorMsg("");
                  window.location.reload();
                }}
                className="mt-2 text-xs font-bold text-red-400 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ── IDLE state — Hero card ── */}
        {(pageState === "idle" || pageState === "error") && importData && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: CARD_BG,
              border: `2px solid ${GOLD_DIM}`,
              boxShadow: `0 0 24px rgba(201,163,90,0.15)`,
            }}
          >
            {/* Card header */}
            <div
              className="px-5 pt-5 pb-4"
              style={{
                background: "linear-gradient(135deg, rgba(201,163,90,0.12) 0%, rgba(26,26,26,0) 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl" aria-hidden="true">📥</span>
                <h2 className="text-lg font-black" style={{ color: GOLD }}>
                  Importar inventario de Domi
                </h2>
              </div>
              <p className="text-xs font-semibold" style={{ color: GOLD_DIM }}>
                Lista de Andy — Junio 2026 ({importData.count} figuritas)
              </p>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: "#d1d5db" }}>
                Esto va a marcar como{" "}
                <strong style={{ color: TEXT_PRIMARY }}>OBTENIDAS</strong> las{" "}
                {importData.count} figuritas que tiene Domi en su álbum físico.
                Vas a poder seguir tachando o agregando manualmente después.
              </p>
            </div>

            {/* Per-country preview */}
            <div className="px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: TEXT_MUTED }}>
                Vista previa por país
              </p>
              <div
                className="grid gap-y-1.5"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                {teamRows.map((row) => (
                  <div key={row.upperCode} className="flex items-center gap-2">
                    <span className="text-base leading-none w-6 text-center flex-shrink-0" aria-hidden="true">
                      {row.flag}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "#d1d5db", minWidth: 36 }}>
                      {row.upperCode}
                    </span>
                    <span className="text-xs" style={{ color: TEXT_MUTED }}>
                      {row.ownedInImport}/{row.totalInCatalog}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pb-5 flex flex-col gap-2">
              <button
                onClick={handleImport}
                disabled={pageState === "error"}
                className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${GOLD_DIM} 0%, ${GOLD} 50%, ${GOLD_DIM} 100%)`,
                  color: "#0a0a0a",
                  boxShadow: `0 4px 20px rgba(250,204,21,0.3)`,
                  fontSize: "16px",
                }}
              >
                Importar {importData.count} figuritas
              </button>
              <Link
                href="/perfil"
                className="text-center text-sm py-2 rounded-xl font-semibold transition-colors"
                style={{ color: TEXT_MUTED }}
              >
                Volver
              </Link>
            </div>
          </div>
        )}

        {/* ── LOADING state ── */}
        {pageState === "loading" && (
          <div
            className="rounded-2xl p-6 flex flex-col items-center gap-4"
            style={{ background: CARD_BG, border: CARD_BORDER }}
          >
            <div
              className="w-12 h-12 rounded-full border-4 animate-spin"
              style={{ borderColor: GOLD, borderTopColor: "transparent" }}
            />
            <div className="w-full text-center">
              <p className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>
                Importando…
              </p>
              <p className="text-sm mt-1" style={{ color: TEXT_MUTED }}>
                {progress} / {progressTotal} figuritas
              </p>
            </div>

            {/* Progress bar */}
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: progressTotal > 0 ? `${Math.round((progress / progressTotal) * 100)}%` : "0%",
                  background: `linear-gradient(90deg, ${GOLD_DIM}, ${GOLD})`,
                }}
              />
            </div>
          </div>
        )}

        {/* ── DONE state ── */}
        {pageState === "done" && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: CARD_BG,
              border: `2px solid rgba(34,197,94,0.4)`,
              boxShadow: "0 0 24px rgba(34,197,94,0.1)",
            }}
          >
            {/* Success header */}
            <div
              className="px-5 pt-6 pb-4 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, transparent 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-4xl mb-2" aria-hidden="true">✅</div>
              <h2 className="text-xl font-black" style={{ color: "#4ade80" }}>
                {TOTAL_EXPECTED} figuritas importadas
              </h2>
              {addedCount < TOTAL_EXPECTED && (
                <p className="text-xs mt-1" style={{ color: TEXT_MUTED }}>
                  ({TOTAL_EXPECTED - addedCount} ya estaban en tu álbum, {addedCount} agregadas)
                </p>
              )}
            </div>

            {/* Top 5 summary */}
            {topTeams.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: TEXT_MUTED }}>
                  Top países completados
                </p>
                <div className="flex flex-col gap-2">
                  {topTeams.map((t) => (
                    <div key={t.name} className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: "#d1d5db" }}>{t.name}</span>
                      <span className="text-sm font-bold" style={{ color: GOLD }}>
                        {t.owned}/{t.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="px-5 pb-5">
              <Link
                href="/inicio"
                className="block w-full py-4 rounded-2xl font-black text-base text-center transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${GOLD_DIM} 0%, ${GOLD} 50%, ${GOLD_DIM} 100%)`,
                  color: "#0a0a0a",
                  boxShadow: "0 4px 20px rgba(250,204,21,0.3)",
                  fontSize: "16px",
                  textDecoration: "none",
                }}
              >
                Ver mi álbum
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

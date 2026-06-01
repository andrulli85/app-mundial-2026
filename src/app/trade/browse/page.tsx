"use client";

/**
 * /trade/browse — B explores A's full inventory before making a counter-proposal.
 *
 * Entry: /trade/browse?payload=<encoded_QR_A1_string>
 *
 * Decodes the partner's QR_A1 payload to reveal their complete sticker state
 * (have bitset + repes bitset). B can tap any sticker A has to add it to their
 * wants list, then tap "Continuar con tu propuesta" to land on /trade/propose
 * pre-filled with those wants.
 *
 * Filter modes:
 *   "repes"      — only A's repes that B is missing (default — actionable)
 *   "all_owned"  — everything A has (with/without repe badge)
 *   "all"        — all 980 slots with A's count overlayed
 *
 * Decision D=γ / Fase 3.2 (S124).
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import EmptySlot from "@/components/EmptySlot";
import TeamHeader from "@/components/TeamHeader";
import { getCatalog } from "@/lib/catalog";
import { getAllStickers } from "@/lib/db";
import {
  decodeTradePayload,
  TradePayload,
  STICKER_COUNT,
  __internal,
} from "@/lib/qr-engine";
import { TEAM_CATALOG } from "@/lib/team-catalog";
import type { Sticker } from "@/lib/catalog";

// ── decoder helpers ─────────────────────────────────────────────────
// qr-engine stores pack/unpack in __internal; re-export stable wrappers here.

function decodeHaveBitset(have: string, totalStickers: number): boolean[] {
  const bytes = __internal.b64ToBytes(have);
  return __internal.unpackBitset(bytes, totalStickers);
}

function decodeRepesBitset(repes: string, totalStickers: number): number[] {
  const bytes = __internal.b64ToBytes(repes);
  return __internal.unpackRepes(bytes, totalStickers);
}

// ── Team grouping (same pattern as /album) ──────────────────────────

interface TeamGroup {
  team_code: string;
  stickers: Sticker[];
  teamColor: string;
}

function groupByTeam(stickers: Sticker[]): TeamGroup[] {
  const groups: TeamGroup[] = [];
  for (const s of stickers) {
    const key = s.team_code || "_PANINI";
    const last = groups[groups.length - 1];
    if (!last || last.team_code !== key) {
      groups.push({ team_code: key, stickers: [s], teamColor: s.team_color });
    } else {
      last.stickers.push(s);
    }
  }
  return groups;
}

// ── Toast ────────────────────────────────────────────────────────────

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), 2000);
  }, []);

  return { message, showToast };
}

// ── Main inner component ─────────────────────────────────────────────

type FilterMode = "repes" | "all_owned" | "all";

function BrowseInner() {
  const params = useSearchParams();
  const router = useRouter();

  const [catalog, setCatalog] = useState<Sticker[]>([]);
  const [myCounts, setMyCounts] = useState<Record<string, number>>({});
  const [partnerPayload, setPartnerPayload] = useState<TradePayload | null>(null);
  const [partnerHave, setPartnerHave] = useState<boolean[]>([]);
  const [partnerRepes, setPartnerRepes] = useState<number[]>([]);
  const [decodeError, setDecodeError] = useState("");

  const [filter, setFilter] = useState<FilterMode>("repes");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [wants, setWants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const { message: toastMessage, showToast } = useToast();

  // ── Decode payload + load my collection ──
  useEffect(() => {
    const raw = params.get("payload");
    if (!raw) {
      setDecodeError("No se recibió el QR del partner.");
      setLoading(false);
      return;
    }

    const decoded = decodeTradePayload(decodeURIComponent(raw));
    if (!decoded) {
      setDecodeError("El QR no se pudo decodificar. Pedile a tu amigo que lo muestre de nuevo.");
      setLoading(false);
      return;
    }

    setPartnerPayload(decoded);
    setPartnerHave(decodeHaveBitset(decoded.have, STICKER_COUNT));
    setPartnerRepes(decodeRepesBitset(decoded.repes, STICKER_COUNT));

    Promise.all([getCatalog(), getAllStickers()]).then(([cat, entries]) => {
      const cm: Record<string, number> = {};
      entries.forEach((e) => (cm[e.sticker_id] = e.count));
      setCatalog(cat);
      setMyCounts(cm);
      setLoading(false);
    });
  }, [params]);

  // ── Stats for header counter ──
  const { partnerOwnedCount, partnerRepesCount } = useMemo(() => {
    const ownedCount = partnerHave.filter(Boolean).length;
    const repesCount = partnerRepes.filter((c) => c >= 2).length;
    return { partnerOwnedCount: ownedCount, partnerRepesCount: repesCount };
  }, [partnerHave, partnerRepes]);

  // ── Build visible sticker list based on filter + team ──
  const visibleStickers = useMemo(() => {
    if (!catalog.length || !partnerHave.length) return [];

    let list: Sticker[];

    switch (filter) {
      case "repes":
        // Only A's repes (count >= 2) — both visible-to-B and greyed-out
        list = catalog.filter((s) => {
          const idx = s.sort_order;
          return partnerRepes[idx] >= 2;
        });
        break;
      case "all_owned":
        list = catalog.filter((s) => partnerHave[s.sort_order]);
        break;
      case "all":
      default:
        list = catalog;
        break;
    }

    if (teamFilter !== "all") {
      list = list.filter((s) => (s.team_code || "_PANINI") === teamFilter);
    }

    return list;
  }, [catalog, partnerHave, partnerRepes, filter, teamFilter]);

  // ── Available teams for filter dropdown ──
  const availableTeams = useMemo(() => {
    const codes = new Set(visibleStickers.map((s) => s.team_code || "_PANINI"));
    // Re-sort by catalog insertion order to match album feel
    const allCodes = catalog.map((s) => s.team_code || "_PANINI");
    const ordered = [...new Set(allCodes)].filter((c) => codes.has(c));
    return ["all", ...ordered];
  }, [visibleStickers, catalog]);

  // Grouped stickers for rendering
  const groups = useMemo(
    () => groupByTeam(visibleStickers),
    [visibleStickers]
  );

  // ── Tap handler ──
  const handleTap = useCallback(
    (sticker: Sticker) => {
      const idx = sticker.sort_order;
      const partnerCount = partnerHave[idx] ? partnerRepes[idx] || 1 : 0;

      if (partnerCount === 0) {
        // Shown in "all" mode — partner doesn't have it
        showToast("Tu amigo no tiene esa figurita.");
        return;
      }

      const myCount = myCounts[sticker.id] ?? 0;

      if (myCount > 0) {
        showToast("Esa ya la tenés.");
        return;
      }

      setWants((prev) => {
        const next = new Set(prev);
        if (next.has(sticker.id)) {
          next.delete(sticker.id);
          showToast(`${sticker.code} removido.`);
        } else {
          next.add(sticker.id);
          showToast(`${sticker.code} agregado.`);
        }
        return next;
      });
    },
    [partnerHave, partnerRepes, myCounts, showToast]
  );

  // ── Continue CTA ──
  const handleContinue = useCallback(() => {
    if (!partnerPayload || wants.size === 0) return;
    const q = new URLSearchParams();
    q.set("wants", Array.from(wants).join(","));
    q.set("partner_uid", partnerPayload.uid);
    router.push(`/trade/propose?${q.toString()}`);
  }, [partnerPayload, wants, router]);

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: "#006847", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (decodeError) {
    return (
      <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
        <header
          className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
          style={{ backgroundColor: "#006847" }}
        >
          <button
            onClick={() => router.back()}
            className="text-white text-xl leading-none"
            aria-label="Volver"
          >
            ←
          </button>
          <h1 className="text-lg font-black text-white leading-none">Error</h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-center text-sm text-gray-600">{decodeError}</p>
        </div>
      </div>
    );
  }

  const partnerNickname = partnerPayload?.uid ?? "partner";

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full pb-safe">
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <button
          onClick={() => router.back()}
          className="text-white text-xl leading-none"
          aria-label="Volver"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-white leading-tight truncate">
            Inventario de {partnerNickname}
          </h1>
          <p className="text-xs text-white/70 leading-tight">
            {partnerOwnedCount}/{STICKER_COUNT} figuritas
            {partnerRepesCount > 0 && ` · ${partnerRepesCount} repes`}
          </p>
        </div>
        {wants.size > 0 && (
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: "#c8102e" }}
          >
            {wants.size} marcadas
          </span>
        )}
      </header>

      {/* Filters */}
      <div
        className="sticky top-[106px] z-10 px-4 py-2 flex gap-2 overflow-x-auto"
        style={{ backgroundColor: "#f9f5ee", borderBottom: "1px solid #e5e0d6" }}
      >
        {/* Mode filter */}
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as FilterMode);
            setTeamFilter("all");
          }}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none shrink-0"
          style={{ borderColor: "#d1c9b8", color: "#333" }}
        >
          <option value="repes">Solo repes</option>
          <option value="all_owned">Todas las que tiene</option>
          <option value="all">Todo el álbum</option>
        </select>

        {/* Team filter */}
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none shrink-0"
          style={{ borderColor: "#d1c9b8", color: "#333" }}
        >
          <option value="all">Todos los equipos</option>
          {availableTeams
            .filter((c) => c !== "all")
            .map((code) => {
              const entry = TEAM_CATALOG[code];
              return (
                <option key={code} value={code}>
                  {entry ? `${entry.flag} ${entry.display_name}` : code}
                </option>
              );
            })}
        </select>
      </div>

      {/* Wants chips */}
      {wants.size > 0 && (
        <div
          className="px-4 py-2 flex flex-wrap gap-1.5 border-b"
          style={{ backgroundColor: "#fff", borderColor: "#e5e0d6" }}
        >
          <p className="w-full text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
            Querés:
          </p>
          {Array.from(wants).map((id) => {
            const s = catalog.find((c) => c.id === id);
            if (!s) return null;
            return (
              <button
                key={id}
                onClick={() =>
                  setWants((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                  })
                }
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: s.team_color }}
                aria-label={`Quitar ${s.code}`}
              >
                {s.code}
                <span className="text-white/80">×</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      <main className="flex-1 overflow-y-auto px-3 py-3 pb-24">
        {visibleStickers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="text-sm text-gray-600 italic text-center px-6">
              {filter === "repes"
                ? `${partnerNickname} no tiene repes en este momento.`
                : "No hay figuritas que mostrar con este filtro."}
            </p>
          </div>
        ) : (
          <>
            {groups.map((group) => {
              const catalogEntry = TEAM_CATALOG[group.team_code] ?? {
                code: group.team_code,
                display_name: group.team_code,
                flag: "",
                group: "",
              };
              return (
                <div key={group.team_code}>
                  {/* Team header — same component as /album */}
                  <TeamHeader
                    entry={catalogEntry}
                    teamColor={group.teamColor}
                  />
                  <div className="grid grid-cols-5 gap-1.5 mb-4">
                    {group.stickers.map((s) => {
                      const idx = s.sort_order;
                      const partnerCount = partnerHave[idx]
                        ? Math.max(1, partnerRepes[idx])
                        : 0;
                      const myCount = myCounts[s.id] ?? 0;
                      const isWanted = wants.has(s.id);

                      return (
                        <BrowseCell
                          key={s.id}
                          sticker={s}
                          partnerCount={partnerCount}
                          myCount={myCount}
                          filter={filter}
                          isWanted={isWanted}
                          onTap={() => handleTap(s)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>

      {/* Toast */}
      {toastMessage && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold text-white shadow-lg pointer-events-none"
          style={{ backgroundColor: "rgba(0,0,0,0.78)" }}
        >
          {toastMessage}
        </div>
      )}

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 border-t"
        style={{
          backgroundColor: "#f9f5ee",
          borderColor: "#e5e0d6",
          paddingBottom: "calc(0.75rem + var(--safe-area-bottom, 0px))",
        }}
      >
        <button
          onClick={handleContinue}
          disabled={wants.size === 0}
          className="w-full py-3.5 rounded-xl font-black text-base text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "#006847" }}
        >
          {wants.size === 0
            ? "Tocá figuritas para agregar a tu propuesta"
            : `Continuar con tu propuesta (${wants.size}) →`}
        </button>
      </div>
    </div>
  );
}

// ── BrowseCell ───────────────────────────────────────────────────────

interface BrowseCellProps {
  sticker: Sticker;
  partnerCount: number;  // how many partner has (0 = doesn't have it)
  myCount: number;       // how many I have
  filter: FilterMode;
  isWanted: boolean;
  onTap: () => void;
}

function BrowseCell({
  sticker,
  partnerCount,
  myCount,
  filter,
  isWanted,
  onTap,
}: BrowseCellProps) {
  const hasPhoto = Boolean(sticker.seed_image);

  // Visual state derivation
  const iHaveIt = myCount > 0;
  const partnerHasIt = partnerCount > 0;
  const isRepe = partnerCount >= 2;

  // In "repes" mode: show repe badge only when count >= 2; if I already have
  // it, render greyed out with "Ya la tenés" overlay
  const showRepeBadge = partnerHasIt && isRepe && !isWanted;
  const showAlreadyHave = iHaveIt && partnerHasIt;

  // Opacity / interactivity
  const isInteractive = partnerHasIt && !iHaveIt;
  const dimmed =
    (filter === "all" && !partnerHasIt) || // partner doesn't own it
    showAlreadyHave; // I already own it

  return (
    <button
      onClick={onTap}
      className={`relative w-full focus:outline-none rounded transition-all active:scale-95 ${
        dimmed ? "opacity-35" : ""
      }`}
      style={{ aspectRatio: "3/4" }}
      aria-label={`${sticker.code} — ${sticker.name}${isWanted ? " — marcada" : ""}`}
      title={sticker.name}
    >
      {/* Card body */}
      {hasPhoto ? (
        <div className="relative w-full h-full rounded overflow-hidden">
          <Image
            src={sticker.seed_image!}
            alt={`${sticker.code} ${sticker.name}`}
            fill
            className="object-cover"
            sizes="20vw"
          />
        </div>
      ) : (
        <EmptySlot
          stickerCode={sticker.code}
          playerName={sticker.name}
          teamColor={sticker.team_color}
        />
      )}

      {/* "Ya la tenés" overlay */}
      {showAlreadyHave && (
        <div
          className="absolute inset-0 rounded flex items-end justify-center pb-1 pointer-events-none"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <span
            className="text-[0.45rem] font-bold text-white leading-none text-center px-0.5"
            style={{ fontSize: "0.42rem" }}
          >
            Ya la tenés
          </span>
        </div>
      )}

      {/* Repe count badge (partner's duplicates) */}
      {showRepeBadge && (
        <div
          className="absolute top-1 right-1 rounded-full text-white font-bold text-[0.5rem] w-4 h-4 flex items-center justify-center z-10"
          style={{ backgroundColor: sticker.team_color }}
        >
          ×{partnerCount}
        </div>
      )}

      {/* Partner count badge in "all" mode */}
      {filter === "all" && partnerHasIt && !showRepeBadge && (
        <div
          className="absolute top-1 right-1 rounded-full text-white font-bold text-[0.5rem] w-4 h-4 flex items-center justify-center z-10"
          style={{ backgroundColor: "#6b7280" }}
        >
          {partnerCount}
        </div>
      )}

      {/* "Wanted" selection ring */}
      {isWanted && (
        <div
          className="absolute inset-0 rounded pointer-events-none"
          style={{
            boxShadow: `0 0 0 3px #c8102e`,
            backgroundColor: "rgba(200,16,46,0.15)",
          }}
        >
          <div
            className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white z-20"
            style={{
              backgroundColor: "#c8102e",
              fontSize: "0.5rem",
              fontWeight: 900,
            }}
          >
            ✓
          </div>
        </div>
      )}

      {/* Non-interactive indicator: tappable only when partner has it + I don't */}
      {!isInteractive && !iHaveIt && !partnerHasIt && filter !== "all" && (
        <div className="absolute inset-0 rounded" style={{ opacity: 0 }} />
      )}
    </button>
  );
}

// ── Page export ──────────────────────────────────────────────────────

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "#006847", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <BrowseInner />
    </Suspense>
  );
}

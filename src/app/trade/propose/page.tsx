"use client";

/**
 * /trade/propose — 2-pane give/want selection.
 *
 * Fase 3B + F-mini (S124):
 *   Doy   — grid of my repes (count >= 2). Binary tap-toggle. SET — no quantity.
 *   Quiero — grid of my empty slots (count == 0). Filterable by team.
 *   Sticky "Generar QR" disabled until give.size >= 1 && want.size >= 1.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmptySlot from "@/components/EmptySlot";
import Image from "next/image";
import { getCatalog } from "@/lib/catalog";
import { getAllStickers, getNickname, collectionBitset, collectionRepeBitset, getUserMode } from "@/lib/db";
import { encodeTradePayload } from "@/lib/qr-engine";
import { TEAM_CATALOG } from "@/lib/team-catalog";
import type { Sticker } from "@/lib/catalog";

function ProposeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = useState<Sticker[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);

  const [give, setGive] = useState<Set<string>>(new Set());
  const [want, setWant] = useState<Set<string>>(new Set());
  const [wantTeamFilter, setWantTeamFilter] = useState<string>("all");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }

      // Fantasy users can't trade — redirect to scoreboard
      const userMode = await getUserMode();
      if (userMode === "fantasy") {
        router.replace("/scoreboard");
        return;
      }

      setNickname(nick);

      const [cat, entries] = await Promise.all([getCatalog(), getAllStickers()]);
      const cm: Record<string, number> = {};
      entries.forEach((e) => (cm[e.sticker_id] = e.count));
      setCatalog(cat);
      setCounts(cm);
      setLoading(false);
    })();
  }, [router]);

  // Pre-fill wants from ?wants= query param (coming from /trade/browse)
  useEffect(() => {
    const wantsParam = searchParams.get("wants");
    if (wantsParam) {
      const ids = wantsParam.split(",").filter(Boolean);
      setWant(new Set(ids));
    }
  }, [searchParams]);

  // Stickers I can offer — have at least one duplicate (count >= 2)
  const offerableStickers = useMemo(
    () => catalog.filter((s) => (counts[s.id] ?? 0) >= 2),
    [catalog, counts]
  );

  // Stickers I want — completely missing (count == 0)
  const wantableStickers = useMemo(
    () => catalog.filter((s) => (counts[s.id] ?? 0) === 0),
    [catalog, counts]
  );

  // Unique teams present in wantable stickers
  const wantableTeams = useMemo(() => {
    const codes = new Set(wantableStickers.map((s) => s.team_code));
    return ["all", ...Array.from(codes)];
  }, [wantableStickers]);

  const filteredWantable = useMemo(() => {
    if (wantTeamFilter === "all") return wantableStickers;
    return wantableStickers.filter((s) => s.team_code === wantTeamFilter);
  }, [wantableStickers, wantTeamFilter]);

  function toggleGive(id: string) {
    setGive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleWant(id: string) {
    setWant((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleGenerateQr = useCallback(async () => {
    if (give.size === 0 || want.size === 0 || generating) return;
    setGenerating(true);
    try {
      const orderedIds = catalog.map((s) => s.id);
      const [haveBuf, repesBuf] = await Promise.all([
        collectionBitset(orderedIds),
        collectionRepeBitset(orderedIds),
      ]);

      function bytesToB64(buf: Uint8Array): string {
        let binary = "";
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        return btoa(binary);
      }

      const payload = {
        v: 1 as const,
        type: "req" as const,
        uid: nickname,
        ts: Date.now(),
        have: bytesToB64(haveBuf),
        repes: bytesToB64(repesBuf),
        give: Array.from(give),
        want: Array.from(want),
      };

      const qrString = encodeTradePayload(payload);
      router.push(`/trade/propose/qr?payload=${encodeURIComponent(qrString)}&give=${encodeURIComponent(Array.from(give).join(","))}&want=${encodeURIComponent(Array.from(want).join(","))}`);
    } finally {
      setGenerating(false);
    }
  }, [give, want, catalog, nickname, router, generating]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "var(--bg-1)" }}>
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const canGenerate = give.size > 0 && want.size > 0;

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full pb-safe" style={{ backgroundColor: "var(--bg-1)" }}>
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "var(--bg-1)", borderBottom: "1px solid var(--line)" }}
      >
        <button
          onClick={() => router.back()}
          className="text-xl leading-none"
          style={{ color: "var(--fg-2)", background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Volver"
        >
          ‹
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black leading-tight" style={{ color: "var(--fg-1)" }}>
            Proponer intercambio
          </h1>
          {searchParams.get("partner_uid") && (
            <p className="text-xs leading-tight" style={{ color: "var(--fg-3)" }}>
              Contrapropuesta para {searchParams.get("partner_uid")}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* ── DAY SECTION ── */}
        <section className="mb-5">
          <h2 className="font-bold mb-2 text-sm uppercase tracking-wide" style={{ color: "var(--fg-3)" }}>
            Doy
          </h2>

          {/* Selected give chips */}
          {give.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Array.from(give).map((id) => {
                const s = catalog.find((c) => c.id === id);
                if (!s) return null;
                return (
                  <button
                    key={id}
                    onClick={() => toggleGive(id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: s.team_color }}
                  >
                    {s.code}
                    <span className="text-white/80 ml-0.5">×</span>
                  </button>
                );
              })}
            </div>
          )}

          {offerableStickers.length === 0 ? (
            <p className="text-sm italic py-4 text-center" style={{ color: "var(--fg-3)" }}>
              Todavía no tenés repes para ofrecer.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {offerableStickers.map((s) => (
                <TradeSelectCard
                  key={s.id}
                  sticker={s}
                  selected={give.has(s.id)}
                  badge={counts[s.id] !== undefined ? `×${counts[s.id]}` : undefined}
                  onTap={() => toggleGive(s.id)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="border-t my-4" style={{ borderColor: "var(--line)" }} />

        {/* ── WANT SECTION ── */}
        <section className="mb-5">
          <h2 className="font-bold mb-2 text-sm uppercase tracking-wide" style={{ color: "var(--fg-3)" }}>
            Quiero
          </h2>

          {/* Selected want chips */}
          {want.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Array.from(want).map((id) => {
                const s = catalog.find((c) => c.id === id);
                if (!s) return null;
                return (
                  <button
                    key={id}
                    onClick={() => toggleWant(id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: s.team_color }}
                  >
                    {s.code}
                    <span className="text-white/80 ml-0.5">×</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Team filter */}
          {wantableStickers.length > 0 && (
            <div className="mb-3">
              <select
                value={wantTeamFilter}
                onChange={(e) => setWantTeamFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 focus:outline-none"
                style={{ borderColor: "var(--line)", color: "var(--fg-1)", backgroundColor: "var(--bg-2)", fontSize: "16px" }}
              >
                <option value="all">Todos los equipos</option>
                {wantableTeams
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
          )}

          {wantableStickers.length === 0 ? (
            <p className="text-sm italic py-4 text-center" style={{ color: "var(--fg-3)" }}>
              Tu álbum está completo, no falta ninguna figurita.
            </p>
          ) : filteredWantable.length === 0 ? (
            <p className="text-sm italic py-4 text-center" style={{ color: "var(--fg-3)" }}>
              No faltan figuritas de este equipo.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {filteredWantable.map((s) => (
                <TradeSelectCard
                  key={s.id}
                  sticker={s}
                  selected={want.has(s.id)}
                  onTap={() => toggleWant(s.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Sticky bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 border-t"
        style={{
          backgroundColor: "var(--bg-1)",
          borderColor: "var(--line)",
          paddingBottom: "calc(0.75rem + var(--safe-area-bottom, 0px))",
        }}
      >
        <button
          onClick={handleGenerateQr}
          disabled={!canGenerate || generating}
          className="w-full py-3.5 rounded-xl font-black text-lg disabled:opacity-40"
          style={{
            background: canGenerate ? "var(--foil-gold)" : "var(--bg-3)",
            color: canGenerate ? "#111111" : "var(--fg-3)",
            transition: "transform 0.1s, opacity 0.1s",
          }}
        >
          {generating ? "Generando..." : "Generar QR"}
        </button>
      </div>
    </div>
  );
}

// ── TradeSelectCard ─────────────────────────────────────────────────

interface TradeSelectCardProps {
  sticker: Sticker;
  selected: boolean;
  badge?: string;
  onTap: () => void;
}

function TradeSelectCard({ sticker, selected, badge, onTap }: TradeSelectCardProps) {
  const hasPhoto = Boolean(sticker.seed_image);

  return (
    <button
      onClick={onTap}
      className="relative w-full focus:outline-none rounded transition-all active:scale-95"
      style={{ aspectRatio: "3/4" }}
      aria-label={`${sticker.code} — ${sticker.name} — ${selected ? "seleccionada" : "no seleccionada"}`}
      title={`${sticker.code} — ${sticker.name}`}
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

      {/* Selection ring overlay */}
      {selected && (
        <div
          className="absolute inset-0 rounded pointer-events-none"
          style={{
            boxShadow: `0 0 0 3px var(--gold)`,
            backgroundColor: "rgba(244,200,74,0.18)",
          }}
        >
          {/* Checkmark */}
          <div
            className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: "var(--gold)", color: "#111111", fontSize: "0.5rem", fontWeight: 900 }}
          >
            ✓
          </div>
        </div>
      )}

      {/* Duplicate count badge (give pane only) */}
      {badge && !selected && (
        <div
          className="absolute top-1 right-1 rounded-full text-white font-bold text-[0.5rem] w-4 h-4 flex items-center justify-center z-10"
          style={{ backgroundColor: sticker.team_color }}
        >
          {badge}
        </div>
      )}
    </button>
  );
}

// ── Page export ─────────────────────────────────────────────────────

export default function ProposePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "var(--bg-1)" }}>
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <ProposeInner />
    </Suspense>
  );
}

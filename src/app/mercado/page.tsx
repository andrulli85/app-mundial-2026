"use client";

/**
 * /mercado — Full 3-tab marketplace (Phase C).
 *
 * Tab 1: Ofertas  — incoming trade offers (empty state for MVP)
 * Tab 2: Buscar   — search stickers + filter by rarity / position / country
 * Tab 3: Enviadas — sent trade history from trade_log
 *
 * Existing QR trade engine accessible via "Cambiar por QR" button.
 *
 * Design source: market.jsx from Albumix design bundle
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import { getAllStickers, getRecentTrades, getNickname } from "@/lib/db";
import type { TradeLogEntry } from "@/lib/db";
import { getPlayerMeta } from "@/lib/player-meta";
import BottomNav from "@/components/BottomNav";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GREEN = "#006847";
const LIME = "#c2ef4e";
const GOLD = "#F4C84A";
const CREAM = "#f5f0e8";

// Search normalization — same as album page
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Rarity filter options
// ---------------------------------------------------------------------------
type RarityFilter = "all" | "legendary" | "epic" | "rare" | "common";
type CategoryFilter = "all" | "players" | "speciales" | "paises";

const RARITY_FILTERS: { k: RarityFilter; label: string }[] = [
  { k: "all", label: "Todas" },
  { k: "legendary", label: "Legendaria" },
  { k: "epic", label: "Épica" },
  { k: "rare", label: "Rara" },
  { k: "common", label: "Común" },
];

const CATEGORY_FILTERS: { k: CategoryFilter; label: string }[] = [
  { k: "all", label: "Todos" },
  { k: "players", label: "Jugadores" },
  { k: "speciales", label: "Especiales" },
];

// ---------------------------------------------------------------------------
// StickerResultCard — compact card for Buscar tab
// ---------------------------------------------------------------------------
interface StickerResultCardProps {
  sticker: Sticker;
  count: number;
  isWanted: boolean;
  onPropose: (s: Sticker) => void;
}

function StickerResultCard({
  sticker,
  count,
  isWanted,
  onPropose,
}: StickerResultCardProps) {
  const owned = count >= 1;
  const isDupe = count >= 2;
  const meta =
    sticker.type === "player" ? getPlayerMeta(sticker) : null;

  const rarityColors: Record<string, { bg: string; border: string; text: string }> = {
    common:    { bg: "#1b1f27", border: "#3a3f4c", text: "#c8cdd9" },
    rare:      { bg: "#0f2033", border: "#2563eb", text: "#60a5fa" },
    epic:      { bg: "#241433", border: "#9333ea", text: "#c084fc" },
    legendary: { bg: "#2b2410", border: GOLD, text: GOLD },
  };
  const rarity = meta?.rarity ?? "common";
  const c = rarityColors[rarity];

  return (
    <div
      style={{
        borderRadius: 14,
        padding: "10px 10px 12px",
        backgroundColor: owned ? c.bg : "#111318",
        border: `1.5px solid ${owned ? c.border : "#2d3344"}`,
        opacity: owned ? 1 : 0.55,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {/* OVR badge */}
      {meta && (
        <div
          style={{
            fontSize: 17,
            fontWeight: 900,
            color: c.text,
            lineHeight: 1,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {meta.ovr}
        </div>
      )}

      {/* Photo placeholder */}
      <div
        style={{
          flex: 1,
          minHeight: 44,
          borderRadius: 8,
          background:
            "repeating-linear-gradient(45deg,#0d0f13,#0d0f13 4px,#12151c 4px,#12151c 8px)",
        }}
      />

      {/* Name */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: "#e5e7eb",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          letterSpacing: "0.02em",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {sticker.display_name.split(" ").slice(-1)[0]}
      </div>

      {/* Dupe badge */}
      {isDupe && (
        <div
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            background: "#0d0f13",
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontSize: 8,
            fontWeight: 800,
            borderRadius: 99,
            padding: "1px 5px",
          }}
        >
          ×{count}
        </div>
      )}

      {/* LA QUIERO badge */}
      {!owned && isWanted && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1d4ed8",
            color: "#fff",
            fontSize: 7,
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: 99,
            whiteSpace: "nowrap",
            letterSpacing: "0.04em",
          }}
        >
          LA QUIERO
        </div>
      )}

      {/* Propose button — show for owned dupes or for stickers you want */}
      {(isDupe || (!owned && isWanted)) && (
        <button
          onClick={() => onPropose(sticker)}
          style={{
            marginTop: 2,
            padding: "4px 0",
            borderRadius: 6,
            background: isDupe ? GREEN : "#1d4ed8",
            color: "#fff",
            fontWeight: 700,
            fontSize: 8,
            border: "none",
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {isDupe ? "Ofrecer" : "Quiero"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TradeHistoryItem — row in Enviadas tab
// ---------------------------------------------------------------------------
function TradeHistoryItem({ trade }: { trade: TradeLogEntry }) {
  const date = new Date(trade.ts);
  const dateStr = date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });

  return (
    <div
      style={{
        background: "#1a1e29",
        border: "1px solid #2d3344",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: GREEN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            textTransform: "uppercase",
          }}
        >
          {trade.partner[0] ?? "?"}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#f3f4f6",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Con {trade.partner}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{dateStr}</div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 99,
            background: "#14532d",
            color: "#4ade80",
          }}
        >
          Completado
        </span>
      </div>
      <div
        style={{ display: "flex", gap: 16, fontSize: 12, color: "#9ca3af" }}
      >
        <span>
          📤 Diste:{" "}
          <strong style={{ color: "#f87171" }}>
            {trade.gave.length}
          </strong>
        </span>
        <span>
          📥 Recibiste:{" "}
          <strong style={{ color: "#4ade80" }}>
            {trade.received.length}
          </strong>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
type Tab = "ofertas" | "buscar" | "enviadas";

export default function MercadoPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("buscar");
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<Sticker[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [trades, setTrades] = useState<TradeLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) { router.replace("/"); return; }

      const [cat, entries, tradeHistory] = await Promise.all([
        getCatalog(),
        getAllStickers(),
        getRecentTrades(50),
      ]);

      const countMap: Record<string, number> = {};
      entries.forEach((e) => { countMap[e.sticker_id] = e.count; });

      setCatalog(cat);
      setCounts(countMap);
      setTrades(tradeHistory);
      setLoading(false);
    })();
  }, [router]);

  // ---- Filtered stickers for Buscar tab ----
  const filteredStickers = useMemo(() => {
    let stickers = catalog;

    // Category filter
    if (categoryFilter === "players") {
      stickers = stickers.filter((s) => s.type === "player");
    } else if (categoryFilter === "speciales") {
      stickers = stickers.filter(
        (s) => s.type === "fwc" || s.type === "panini_special"
      );
    }

    // Rarity filter (only applies to players)
    if (rarityFilter !== "all") {
      stickers = stickers.filter((s) => {
        if (s.type !== "player") return false;
        const meta = getPlayerMeta(s);
        return meta?.rarity === rarityFilter;
      });
    }

    // Search filter
    if (search.trim()) {
      const q = normalize(search.trim());
      stickers = stickers.filter(
        (s) =>
          normalize(s.code).includes(q) ||
          normalize(s.name).includes(q) ||
          normalize(s.team).includes(q) ||
          normalize(s.display_name).includes(q)
      );
    }

    // Limit results to 60 for performance
    return stickers.slice(0, 60);
  }, [catalog, search, rarityFilter, categoryFilter]);

  const handlePropose = useCallback(
    (sticker: Sticker) => {
      flash(`Propuesta para ${sticker.name} preparada`);
      // TODO: Phase C+ — wire to Firebase trade engine
    },
    [flash]
  );

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: "#0d0f13" }}
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
      className="flex flex-col flex-1 w-full max-w-lg mx-auto"
      style={{ backgroundColor: "#0d0f13", color: "#f3f4f6" }}
    >
      {/* ---- Header ---- */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{
          background:
            "linear-gradient(180deg, #0d0f13 80%, rgba(13,15,19,0) 100%)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: LIME,
            textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif",
            marginBottom: 2,
          }}
        >
          Mercado
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#f3f4f6",
              lineHeight: 1,
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Cambios
          </h1>
          <Link
            href="/trade"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "#1a1e29",
              border: "1px solid #3a3f4c",
              borderRadius: 99,
              padding: "7px 12px",
              color: "#9ca3af",
              fontWeight: 700,
              fontSize: 11,
              textDecoration: "none",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            📷 QR
          </Link>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "#1a1e29",
            border: "1px solid #2d3344",
            borderRadius: 12,
            padding: 4,
            marginTop: 12,
          }}
        >
          {(
            [
              { k: "ofertas" as Tab, label: "Ofertas" },
              { k: "buscar" as Tab, label: "Buscar" },
              { k: "enviadas" as Tab, label: "Enviadas" },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              data-testid={`mercado-tab-${t.k}`}
              onClick={() => setTab(t.k)}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                border: "none",
                background: tab === t.k ? "#2d3344" : "transparent",
                color: tab === t.k ? "#f3f4f6" : "#6b7280",
                fontFamily: "system-ui, sans-serif",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Tab content ---- */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Tab: Ofertas */}
        {tab === "ofertas" && (
          <div style={{ paddingTop: 4 }}>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
              Acá van a aparecer las propuestas de tus amigos.
            </p>
            {/* Empty state */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "50px 20px",
                textAlign: "center",
                background: "#1a1e29",
                borderRadius: 20,
                border: "1px solid #2d3344",
              }}
            >
              <span style={{ fontSize: 40, marginBottom: 12 }}>🤝</span>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#d1d5db",
                  marginBottom: 6,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Aún no tenés ofertas
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  maxWidth: 240,
                  lineHeight: 1.5,
                }}
              >
                Cuando un amigo te proponga un cambio, va a aparecer acá.
              </div>
              <Link
                href="/friends"
                style={{
                  marginTop: 16,
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: GREEN,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: "none",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Buscar amigos
              </Link>
            </div>
          </div>
        )}

        {/* Tab: Buscar */}
        {tab === "buscar" && (
          <div style={{ paddingTop: 4 }}>
            {/* Search field */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: "#1a1e29",
                border: "1px solid #3a3f4c",
                borderRadius: 12,
                padding: "11px 14px",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 16, color: "#6b7280" }}>🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busca jugador o país…"
                data-testid="mercado-search-input"
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "#f3f4f6",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "16px", // iOS zoom guard
                  fontWeight: 600,
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    fontSize: 16,
                    display: "flex",
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category chips */}
            <div
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                paddingBottom: 4,
                marginBottom: 8,
                scrollbarWidth: "none",
              }}
            >
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.k}
                  data-testid={`mercado-cat-${f.k}`}
                  onClick={() => setCategoryFilter(f.k)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 12px",
                    borderRadius: 99,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                    border: `1px solid ${categoryFilter === f.k ? "transparent" : "#3a3f4c"}`,
                    background: categoryFilter === f.k ? GOLD : "#1a1e29",
                    color: categoryFilter === f.k ? "#0d0f13" : "#9ca3af",
                    transition: "all 0.15s",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Rarity chips */}
            <div
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                paddingBottom: 4,
                marginBottom: 10,
                scrollbarWidth: "none",
              }}
            >
              {RARITY_FILTERS.map((f) => (
                <button
                  key={f.k}
                  data-testid={`mercado-rarity-${f.k}`}
                  onClick={() => setRarityFilter(f.k)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 12px",
                    borderRadius: 99,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                    border: `1px solid ${rarityFilter === f.k ? "transparent" : "#3a3f4c"}`,
                    background: rarityFilter === f.k ? LIME : "#1a1e29",
                    color: rarityFilter === f.k ? "#0d0f13" : "#9ca3af",
                    transition: "all 0.15s",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Result count */}
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                fontWeight: 600,
                marginBottom: 12,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {filteredStickers.length}{" "}
              {filteredStickers.length === 1 ? "carta" : "cartas"}
              {filteredStickers.length === 60 && (
                <span style={{ color: "#9ca3af" }}> (mostrando primeras 60)</span>
              )}
            </div>

            {/* Results grid */}
            {filteredStickers.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px 20px",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: 32, marginBottom: 10 }}>🔍</span>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#d1d5db",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  Sin resultados
                </div>
                <div
                  style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}
                >
                  Probá con otro nombre o filtro
                </div>
              </div>
            ) : (
              <div
                data-testid="mercado-results-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                {filteredStickers.map((s) => (
                  <StickerResultCard
                    key={s.id}
                    sticker={s}
                    count={counts[s.id] ?? 0}
                    isWanted={false}
                    onPropose={handlePropose}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Enviadas */}
        {tab === "enviadas" && (
          <div style={{ paddingTop: 4 }}>
            {trades.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "50px 20px",
                  textAlign: "center",
                  background: "#1a1e29",
                  borderRadius: 20,
                  border: "1px solid #2d3344",
                }}
              >
                <span style={{ fontSize: 40, marginBottom: 12 }}>📤</span>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#d1d5db",
                    marginBottom: 6,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  Aún no enviaste propuestas
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#9ca3af",
                    maxWidth: 240,
                    lineHeight: 1.5,
                  }}
                >
                  Andá a{" "}
                  <button
                    onClick={() => setTab("buscar")}
                    style={{
                      background: "none",
                      border: "none",
                      color: GOLD,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 13,
                      padding: 0,
                    }}
                  >
                    Buscar
                  </button>{" "}
                  y ofrecé una repetida
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "#9ca3af",
                    marginBottom: 4,
                  }}
                >
                  {trades.length} intercambios completados
                </p>
                {trades.map((t) => (
                  <TradeHistoryItem key={t.trade_id} trade={t} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- Toast ---- */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 110,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 250,
            background: "#1a1e29",
            border: `1px solid ${GOLD}66`,
            color: "#f3f4f6",
            padding: "12px 20px",
            borderRadius: 99,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            whiteSpace: "nowrap",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {toast}
        </div>
      )}

      <BottomNav active="mercado" />

      {/* Unused vars to suppress TS — CREAM/GOLD used inline */}
      <style>{`/* ${CREAM} */`}</style>
    </div>
  );
}

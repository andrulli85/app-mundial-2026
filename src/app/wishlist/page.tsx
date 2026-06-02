"use client";

/**
 * /wishlist — Mi Wishlist page.
 *
 * Layout:
 *   - TopBar (back button + title)
 *   - Sticky header: "MI WISHLIST · X/10" + subtitle
 *   - Ordered drag-to-reorder list (DnD via pointer events)
 *   - Status line per row: friends online/offline/nadie
 *   - Tap row → sticker detail modal
 *   - "Proponer trade" button per row
 *   - "Agregar lámina" row at bottom → sticker picker modal
 *   - Empty state
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  reorderWishlist,
  swapWishlistItem,
  getWishlistStatus,
  type WishlistItem,
  type WishlistStatus,
  subscribeWishlist,
} from "@/lib/wishlist";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";

// ---------------------------------------------------------------------------
// Constants — map legacy vars to design system tokens
// ---------------------------------------------------------------------------
const BG = "var(--bg-1)";
const SURFACE = "var(--bg-2)";
const SURFACE2 = "var(--bg-3)";
const GOLD = "var(--gold)";
const GREEN = "var(--green)";
const LIME = "#c2ef4e";   // scoring accent — not in design system
const RED = "var(--red-bright)";
const MUTED = "var(--fg-3)";

// ---------------------------------------------------------------------------
// Priority badge
// ---------------------------------------------------------------------------
function PriorityBadge({ priority }: { priority: number }) {
  const medals: Record<number, { emoji: string; color: string }> = {
    1: { emoji: "🥇", color: GOLD },
    2: { emoji: "🥈", color: "#c0c0c0" },
    3: { emoji: "🥉", color: "#cd7f32" },
  };
  if (priority <= 3) {
    return (
      <span style={{ fontSize: 18, lineHeight: 1 }} aria-label={`Prioridad ${priority}`}>
        {medals[priority].emoji}
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: MUTED,
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: `1.5px solid ${MUTED}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      aria-label={`Prioridad ${priority}`}
    >
      {priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status line
// ---------------------------------------------------------------------------
function StatusLine({ status }: { status: WishlistStatus }) {
  if (status.friends_online_have > 0) {
    return (
      <span style={{ fontSize: 11, color: "#4ade80" }}>
        🟢 {status.friends_online_have} amigo{status.friends_online_have > 1 ? "s" : ""} online{status.friends_online_have > 1 ? " la tienen" : " la tiene"}
      </span>
    );
  }
  if (status.friends_offline_have > 0) {
    return (
      <span style={{ fontSize: 11, color: GOLD }}>
        🟡 {status.friends_offline_have} amigo{status.friends_offline_have > 1 ? "s" : ""} offline{status.friends_offline_have > 1 ? " la tienen" : " la tiene"}
      </span>
    );
  }
  return <span style={{ fontSize: 11, color: MUTED }}>⚪ Nadie aún</span>;
}

// ---------------------------------------------------------------------------
// Sticker Picker Modal
// ---------------------------------------------------------------------------
interface StickerPickerProps {
  catalog: Sticker[];
  currentIds: Set<string>;
  onSelect: (sticker: Sticker) => void;
  onClose: () => void;
}

function StickerPickerModal({ catalog, currentIds, onSelect, onClose }: StickerPickerProps) {
  const [query, setQuery] = useState("");

  function normalize(s: string): string {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  const filtered = query.length < 1
    ? catalog.slice(0, 80)
    : catalog.filter((s) => {
        const q = normalize(query);
        return (
          normalize(s.name).includes(q) ||
          normalize(s.display_name).includes(q) ||
          normalize(s.team).includes(q) ||
          s.code.toLowerCase().includes(q)
        );
      }).slice(0, 80);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar lámina para wishlist"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: BG,
          borderRadius: "20px 20px 0 0",
          marginTop: "auto",
          maxHeight: "80dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 16px 8px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <input
            data-testid="wishlist-picker-search"
            type="text"
            placeholder="Buscar lámina..."
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: SURFACE2,
              border: "1px solid var(--line-strong)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "var(--fg-1)",
              fontSize: 16, // iOS zoom prevention
              outline: "none",
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: MUTED,
              fontSize: 22,
              cursor: "pointer",
              padding: "4px 8px",
              minWidth: 44,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Cerrar buscador"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0 env(safe-area-inset-bottom,0)" }}>
          {filtered.map((s) => {
            const already = currentIds.has(s.id);
            return (
              <button
                key={s.id}
                data-testid={`wishlist-picker-item-${s.id}`}
                disabled={already}
                onClick={() => !already && onSelect(s)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--line)",
                  cursor: already ? "default" : "pointer",
                  opacity: already ? 0.4 : 1,
                  textAlign: "left",
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                    backgroundColor: s.team_color + "33",
                    border: `1.5px solid ${s.team_color}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {s.seed_image ? (
                    <Image src={s.seed_image} alt={s.name} width={36} height={36} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                  ) : (
                    <span style={{ fontSize: 16 }}>📷</span>
                  )}
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.display_name}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
                    {s.code} · {s.team_code}
                  </div>
                </div>
                {already && (
                  <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>Ya en lista</span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: MUTED, fontSize: 14 }}>
              Sin resultados para &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full Wishlist Modal — shown when at cap and user wants to add
// ---------------------------------------------------------------------------
interface FullModalProps {
  wishlist: WishlistItem[];
  catalog: Map<string, Sticker>;
  pendingAdd: string; // sticker_id to add after swap
  onSwap: (remove_id: string) => void;
  onClose: () => void;
}

function WishlistFullModal({ wishlist, catalog, pendingAdd, onSwap, onClose }: FullModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wishlist llena"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: BG,
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 480,
          maxHeight: "80dvh",
          display: "flex",
          flexDirection: "column",
          padding: "20px 0 env(safe-area-inset-bottom,12px)",
        }}
      >
        <div style={{ padding: "0 16px 12px", borderBottom: "1px solid var(--line)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--fg-1)" }}>
            Tu wishlist está llena
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: MUTED }}>
            ¿Qué sacamos para agregar{" "}
            <strong style={{ color: GOLD }}>
              {catalog.get(pendingAdd)?.display_name ?? pendingAdd}
            </strong>
            ?
          </p>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {wishlist.map((item) => {
            const s = catalog.get(item.sticker_id);
            return (
              <button
                key={item.sticker_id}
                data-testid={`wishlist-swap-remove-${item.sticker_id}`}
                onClick={() => onSwap(item.sticker_id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--line)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <PriorityBadge priority={item.priority} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s?.display_name ?? item.sticker_id}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
                    {s?.code ?? ""} · {s?.team_code ?? ""}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: RED, fontWeight: 700 }}>Sacar</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wishlist row component
// ---------------------------------------------------------------------------
interface WishlistRowProps {
  item: WishlistItem;
  sticker: Sticker | undefined;
  status: WishlistStatus;
  isDragging: boolean;
  onDragStart: (e: React.PointerEvent, id: string) => void;
  onRemove: (id: string) => void;
  onTrade: (id: string) => void;
}

function WishlistRow({ item, sticker, status, isDragging, onDragStart, onRemove, onTrade }: WishlistRowProps) {
  return (
    <div
      data-testid={`wishlist-item-${item.sticker_id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        backgroundColor: isDragging ? SURFACE2 : SURFACE,
        borderBottom: "1px solid var(--line)",
        opacity: isDragging ? 0.7 : 1,
        transition: "background-color 0.1s",
      }}
    >
      {/* Drag handle */}
      <div
        data-testid={`wishlist-drag-handle-${item.sticker_id}`}
        aria-label={`Arrastrar ${sticker?.display_name ?? item.sticker_id}`}
        role="button"
        tabIndex={0}
        onPointerDown={(e) => onDragStart(e, item.sticker_id)}
        style={{
          cursor: "grab",
          color: MUTED,
          fontSize: 18,
          padding: "4px 2px",
          minWidth: 32,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          touchAction: "none",
        }}
        onKeyDown={(e) => {
          // Keyboard accessibility: arrow keys to move up/down not implemented in Phase A
          if (e.key === "Enter" || e.key === " ") e.preventDefault();
        }}
      >
        ⠿
      </div>

      {/* Priority badge */}
      <PriorityBadge priority={item.priority} />

      {/* Thumbnail */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: (sticker?.team_color ?? "#9ca3af") + "33",
          border: `1.5px solid ${sticker?.team_color ?? "#9ca3af"}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {sticker?.seed_image ? (
          <Image
            src={sticker.seed_image}
            alt={sticker.name}
            width={40}
            height={40}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        ) : (
          <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">📷</span>
        )}
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {sticker?.display_name ?? item.sticker_id}
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
          {sticker?.code ?? ""} {sticker?.team_code ? `· ${sticker.team_code}` : ""}
        </div>
        <div style={{ marginTop: 3 }}>
          <StatusLine status={status} />
        </div>
      </div>

      {/* Trade button */}
      <button
        data-testid={`wishlist-trade-btn-${item.sticker_id}`}
        onClick={() => onTrade(item.sticker_id)}
        aria-label={`Proponer trade para ${sticker?.display_name ?? item.sticker_id}`}
        style={{
          background: "none",
          border: "1px solid var(--line-strong)",
          borderRadius: 8,
          color: LIME,
          fontSize: 11,
          fontWeight: 700,
          padding: "5px 8px",
          cursor: "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        Trade
      </button>

      {/* Remove button */}
      <button
        data-testid={`wishlist-remove-btn-${item.sticker_id}`}
        onClick={() => onRemove(item.sticker_id)}
        aria-label={`Quitar ${sticker?.display_name ?? item.sticker_id} de wishlist`}
        style={{
          background: "none",
          border: "none",
          color: RED,
          fontSize: 18,
          cursor: "pointer",
          padding: "4px",
          minWidth: 32,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [catalog, setCatalog] = useState<Sticker[]>([]);
  const [catalogMap, setCatalogMap] = useState<Map<string, Sticker>>(new Map());
  const [loaded, setLoaded] = useState(false);

  // Modals
  const [showPicker, setShowPicker] = useState(false);
  const [fullModalPendingAdd, setFullModalPendingAdd] = useState<string | null>(null);

  // DnD state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOrderRef = useRef<string[]>([]);

  // Load catalog + wishlist
  useEffect(() => {
    getCatalog().then((cat) => {
      setCatalog(cat);
      setCatalogMap(new Map(cat.map((s) => [s.id, s])));
    });
    setWishlist(getWishlist());
    setLoaded(true);

    const unsub = subscribeWishlist((items) => setWishlist([...items]));
    return unsub;
  }, []);

  // Compute statuses
  const statuses = wishlist.map((item) => getWishlistStatus(item.sticker_id));

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleRemove(sticker_id: string): void {
    removeFromWishlist(sticker_id);
  }

  function handleTrade(sticker_id: string): void {
    router.push(`/mercado?wishlist=${sticker_id}`);
  }

  function handlePickerSelect(sticker: Sticker): void {
    const result = addToWishlist(sticker.id);
    if (result.error === "cap_reached") {
      setFullModalPendingAdd(sticker.id);
    }
    setShowPicker(false);
  }

  function handleSwap(remove_id: string): void {
    if (!fullModalPendingAdd) return;
    swapWishlistItem(remove_id, fullModalPendingAdd);
    setFullModalPendingAdd(null);
  }

  // ---------------------------------------------------------------------------
  // Drag-to-reorder with native pointer events (same pattern as DnD in trade flows)
  // ---------------------------------------------------------------------------

  const dragStartIndexRef = useRef<number>(-1);
  const dragTargetIndexRef = useRef<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (e: React.PointerEvent, sticker_id: string) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraggingId(sticker_id);
      dragOrderRef.current = wishlist.map((i) => i.sticker_id);
      dragStartIndexRef.current = wishlist.findIndex((i) => i.sticker_id === sticker_id);
      dragTargetIndexRef.current = dragStartIndexRef.current;
    },
    [wishlist]
  );

  // We attach pointer move/up on the list container to simplify cleanup
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingId || !listRef.current) return;
      const rows = listRef.current.querySelectorAll<HTMLElement>("[data-wishlist-row]");
      let newTarget = dragTargetIndexRef.current;
      rows.forEach((row, idx) => {
        const rect = row.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
          newTarget = Math.min(idx, newTarget === -1 ? idx : newTarget);
        }
      });
      // Simple heuristic — find which row center is closest to pointer Y
      let closest = dragStartIndexRef.current;
      let closestDist = Infinity;
      rows.forEach((row, idx) => {
        const rect = row.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - mid);
        if (dist < closestDist) {
          closestDist = dist;
          closest = idx;
        }
      });
      dragTargetIndexRef.current = closest;
    },
    [draggingId]
  );

  const handlePointerUp = useCallback(() => {
    if (!draggingId) return;
    const from = dragStartIndexRef.current;
    const to = dragTargetIndexRef.current;
    if (from !== to && from >= 0 && to >= 0) {
      const order = [...dragOrderRef.current];
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);
      reorderWishlist(order);
    }
    setDraggingId(null);
    dragStartIndexRef.current = -1;
    dragTargetIndexRef.current = -1;
  }, [draggingId]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const currentIds = new Set(wishlist.map((i) => i.sticker_id));

  return (
    <div
      style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column" }}
    >
      {/* Sticky header — below global TopBar (top-[54px]) */}
      <div
        style={{
          position: "sticky",
          top: 54,
          zIndex: 30,
          backgroundColor: BG,
          borderBottom: "1px solid var(--line)",
          padding: "12px 16px 10px",
        }}
      >
        <h1
          data-testid="wishlist-header"
          style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--fg-1)", letterSpacing: ".01em" }}
        >
          MI WISHLIST{" "}
          <span style={{ color: wishlist.length >= 10 ? GOLD : GREEN }}>
            {wishlist.length}/10
          </span>
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED }}>
          Marcá tus 10 más buscadas. Tus amigos verán qué querés.
        </p>
      </div>

      <main style={{ flex: 1 }}>
        {!loaded ? (
          // Skeleton
          <div style={{ padding: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 64, borderRadius: 10, backgroundColor: SURFACE, marginBottom: 8, opacity: 0.5 }} />
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          // Empty state
          <div
            data-testid="wishlist-empty"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "64px 24px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 48 }} aria-hidden="true">⭐</span>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--fg-1)" }}>
              Tu wishlist está vacía
            </p>
            <p style={{ margin: 0, fontSize: 13, color: MUTED, maxWidth: 280 }}>
              Marcá tus 10 más buscadas. Tus amigos verán qué querés y vos verás cuándo aparecen.
            </p>
          </div>
        ) : (
          // List
          <div
            ref={listRef}
            data-testid="wishlist-list"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ backgroundColor: SURFACE, margin: "12px 0", borderRadius: 0 }}
          >
            {wishlist.map((item, idx) => (
              <div key={item.sticker_id} data-wishlist-row="true">
                <WishlistRow
                  item={item}
                  sticker={catalogMap.get(item.sticker_id)}
                  status={statuses[idx]}
                  isDragging={draggingId === item.sticker_id}
                  onDragStart={handleDragStart}
                  onRemove={handleRemove}
                  onTrade={handleTrade}
                />
              </div>
            ))}
          </div>
        )}

        {/* Add row */}
        {wishlist.length < 10 && (
          <button
            data-testid="wishlist-add-btn"
            onClick={() => setShowPicker(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "14px 16px",
              backgroundColor: "transparent",
              border: "none",
              borderTop: wishlist.length > 0 ? "1px solid var(--line)" : "none",
              cursor: "pointer",
              color: GREEN,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">+</span>
            Agregar lámina
          </button>
        )}

        {wishlist.length >= 10 && (
          <div style={{ padding: "8px 16px 32px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: MUTED }}>
              Wishlist llena. Tap × en una lámina para hacer espacio.
            </p>
          </div>
        )}
      </main>

      {/* Sticker picker modal */}
      {showPicker && (
        <StickerPickerModal
          catalog={catalog}
          currentIds={currentIds}
          onSelect={handlePickerSelect}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Full wishlist swap modal */}
      {fullModalPendingAdd && (
        <WishlistFullModal
          wishlist={wishlist}
          catalog={catalogMap}
          pendingAdd={fullModalPendingAdd}
          onSwap={handleSwap}
          onClose={() => setFullModalPendingAdd(null)}
        />
      )}
    </div>
  );
}

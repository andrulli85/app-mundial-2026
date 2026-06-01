"use client";

/**
 * /friends/[uid] — Friend profile page.
 *
 * Sections:
 *   - Back button + friend name header
 *   - Su wishlist (X/10) — list of their wishlisted stickers
 *   - Bulk offer button: visible if you own ≥2 of any item in their wishlist
 *     → opens /mercado with pre-selected give items
 */

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getMockPeer, type MockPeer } from "@/lib/peer-mock";
import { getMyMatchedDuplicates, getFriendsWishlist, type WishlistItem } from "@/lib/wishlist";
import { getCatalog } from "@/lib/catalog";
import type { Sticker } from "@/lib/catalog";
import { getAllStickers } from "@/lib/db";

const BG = "#0d0f13";
const SURFACE = "#131519";
const GOLD = "#F4C84A";
const GREEN = "#006847";
const LIME = "#c2ef4e";
const MUTED = "rgba(240,236,227,0.4)";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FriendProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const router = useRouter();
  const [peer, setPeer] = useState<MockPeer | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [catalogMap, setCatalogMap] = useState<Map<string, Sticker>>(new Map());
  const [matchedDupes, setMatchedDupes] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const mockPeer = getMockPeer(uid);
      if (mockPeer) {
        setPeer(mockPeer);
        const friendWishlist = getFriendsWishlist(uid);
        setWishlist(friendWishlist);

        const [cat, entries] = await Promise.all([getCatalog(), getAllStickers()]);
        setCatalogMap(new Map(cat.map((s) => [s.id, s])));

        const myCollection: Record<string, number> = {};
        entries.forEach((e) => { myCollection[e.sticker_id] = e.count; });
        setMatchedDupes(getMyMatchedDuplicates(uid, myCollection));
      }
      setLoaded(true);
    }
    load();
  }, [uid]);

  function handleBulkOffer(): void {
    // Pre-select all matched duplicates as "give" items
    const giveParams = matchedDupes.map((id) => `give=${id}`).join("&");
    router.push(`/mercado?${giveParams}&friend=${uid}`);
  }

  if (!loaded) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: BG }}>
        <div style={{ padding: 32, textAlign: "center", color: MUTED }}>Cargando...</div>
      </div>
    );
  }

  if (!peer) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: BG }}>
        <div style={{ padding: 32, textAlign: "center", color: MUTED }}>
          Amigo no encontrado.
        </div>
      </div>
    );
  }

  const statusDot = peer.status === "online"
    ? <span style={{ fontSize: 11, color: "#4ade80" }}>🟢 En línea</span>
    : <span style={{ fontSize: 11, color: GOLD }}>🟡 Desconectado</span>;

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column" }}>
      {/* Sticky sub-header — sits below the global TopBar (top-[54px]) */}
      <header
        style={{
          position: "sticky",
          top: 54,
          zIndex: 20,
          backgroundColor: BG,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#fff",
            fontSize: 22,
            padding: "4px",
            minWidth: 36,
            minHeight: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ‹
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 800,
            color: "#f0ece3",
          }}
          data-testid="friend-profile-title"
        >
          {peer.displayName}
        </h1>
      </header>

      <main style={{ flex: 1, padding: "16px 16px env(safe-area-inset-bottom,16px)" }}>
        {/* Friend card */}
        <div
          style={{
            backgroundColor: SURFACE,
            borderRadius: 16,
            padding: "16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              backgroundColor: GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {peer.displayName[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#f0ece3" }}>
              {peer.displayName}
            </div>
            <div style={{ marginTop: 2 }}>{statusDot}</div>
          </div>
        </div>

        {/* Bulk offer button — visible only when you have matching dupes */}
        {matchedDupes.length > 0 && (
          <button
            data-testid="friend-bulk-offer-btn"
            onClick={handleBulkOffer}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "none",
              backgroundColor: LIME,
              color: "#0d0f13",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <span aria-hidden="true">🎁</span>
            Ofrecer todas mis repetidas a su wishlist
            <span
              style={{
                backgroundColor: "#0d0f13",
                color: LIME,
                fontSize: 11,
                fontWeight: 800,
                borderRadius: 99,
                padding: "2px 7px",
              }}
            >
              {matchedDupes.length}
            </span>
          </button>
        )}

        {/* Wishlist section */}
        <section>
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: 14,
              fontWeight: 800,
              color: "#f0ece3",
              letterSpacing: ".01em",
            }}
          >
            Su wishlist{" "}
            <span style={{ color: wishlist.length >= 10 ? GOLD : MUTED }}>
              ({wishlist.length}/10)
            </span>
          </h2>

          {wishlist.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: MUTED,
                fontSize: 13,
                backgroundColor: SURFACE,
                borderRadius: 12,
              }}
            >
              {peer.displayName} no tiene láminas en su wishlist aún.
            </div>
          ) : (
            <div
              data-testid="friend-wishlist-list"
              style={{ backgroundColor: SURFACE, borderRadius: 12, overflow: "hidden" }}
            >
              {wishlist.map((item) => {
                const s = catalogMap.get(item.sticker_id);
                const isMatch = matchedDupes.includes(item.sticker_id);
                return (
                  <div
                    key={item.sticker_id}
                    data-testid={`friend-wishlist-item-${item.sticker_id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      backgroundColor: isMatch ? "rgba(194,239,78,0.07)" : "transparent",
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
                        backgroundColor: (s?.team_color ?? "#9ca3af") + "33",
                        border: `1.5px solid ${s?.team_color ?? "#9ca3af"}55`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {s?.seed_image ? (
                        <Image
                          src={s.seed_image}
                          alt={s.name}
                          width={36}
                          height={36}
                          style={{ objectFit: "cover", width: "100%", height: "100%" }}
                        />
                      ) : (
                        <span style={{ fontSize: 16 }} aria-hidden="true">📷</span>
                      )}
                    </div>
                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: isMatch ? LIME : "#f0ece3",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s?.display_name ?? item.sticker_id}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
                        {s?.code ?? ""} {s?.team_code ? `· ${s.team_code}` : ""}
                      </div>
                    </div>
                    {/* Match indicator */}
                    {isMatch && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: LIME,
                          backgroundColor: "rgba(194,239,78,0.15)",
                          padding: "2px 7px",
                          borderRadius: 99,
                          flexShrink: 0,
                        }}
                      >
                        Tenés ×2
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

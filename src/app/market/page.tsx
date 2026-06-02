"use client";

/**
 * /market — Mercado hub (Stream C, Phase 4.2).
 *
 * Design source: market.jsx from the Albumix Claude Design pack.
 * Tabs: Ofertas (incoming offers + badge) · Amigos (browse friend albums) · Enviadas (sent, in-memory).
 *
 * QR engine wired to real QrRenderer + QrScanner from qr-engine.ts.
 * StickerCardPanini replaces TradingCard from design pack.
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import QrRenderer from "@/components/QrRenderer";
import QrScanner from "@/components/QrScanner";
import { encodeTradePayload } from "@/lib/qr-engine";
import { getNickname } from "@/lib/db";
import {
  PLAYERS,
  FRIENDS,
  INCOMING_OFFERS,
  type Player,
  type Friend,
  type IncomingOffer,
} from "@/lib/market/data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOLD = "#F4C84A";

// ---------------------------------------------------------------------------
// Mini TradingCard — used inside offer rows and propose sheet.
// A lightweight inline card that doesn't require a full Sticker object.
// ---------------------------------------------------------------------------

interface MiniCardProps {
  player: Player;
  locked?: boolean;
}

function MiniCard({ player, locked = false }: MiniCardProps) {
  return (
    <div
      style={{
        width: 90,
        height: 126,
        borderRadius: "var(--r-sm, 10px)",
        background: locked
          ? "linear-gradient(180deg,#2a3036,#1b2024)"
          : "linear-gradient(180deg,#8fe0ef 0%,#6fd0e6 60%,#58c2dc 100%)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--sh-2, 0 4px 14px rgba(0,0,0,.45))",
        flexShrink: 0,
        opacity: locked ? 0.5 : 1,
        filter: locked ? "grayscale(0.6)" : "none",
      }}
    >
      {/* Background number decorations */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: -8,
          top: -5,
          fontFamily: "var(--font-display, Impact, sans-serif)",
          fontSize: 60,
          lineHeight: 0.8,
          color: "rgba(13,20,24,.9)",
          letterSpacing: "-.04em",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        2
      </span>
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: -9,
          top: 11,
          fontFamily: "var(--font-display, Impact, sans-serif)",
          fontSize: 60,
          lineHeight: 0.8,
          color: "rgba(0,164,75,0.7)",
          letterSpacing: "-.04em",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        6
      </span>

      {/* Player photo — real photo when available */}
      {!locked && player.photo && !player.photo.endsWith("placeholder.svg") && (
        <img
          src={player.photo}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            zIndex: 1,
          }}
        />
      )}

      {/* Flag + OVR row */}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 6px",
        }}
      >
        <span style={{ fontSize: 14 }}>{player.flag}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 900,
            color: "#0d1418",
            fontFamily: "var(--font-stat, monospace)",
          }}
        >
          {player.ovr}
        </span>
      </div>

      {/* Name plate */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          background: locked ? "#3a4148" : "rgba(0,100,46,0.9)",
          padding: "4px 6px 5px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display, Impact, sans-serif)",
            fontSize: 10,
            lineHeight: 0.95,
            letterSpacing: ".01em",
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textTransform: "uppercase",
          }}
        >
          {locked ? "???" : player.name}
        </div>
        <div
          style={{
            fontSize: 8,
            color: "rgba(255,255,255,.75)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {locked ? "???" : player.team}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SquadTokenMini — 3-col grid thumbnail for ProposeSheet duplicates
// ---------------------------------------------------------------------------

interface SquadTokenMiniProps {
  player: Player;
  selected?: boolean;
  onClick?: () => void;
}

function SquadTokenMini({ player, selected, onClick }: SquadTokenMiniProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        width: 72,
        height: 72,
        borderRadius: "var(--r-sm, 10px)",
        background: "var(--bg-3, #1D212B)",
        border: `1.5px solid ${selected ? GOLD : "var(--line-strong, rgba(255,255,255,0.15))"}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        cursor: "pointer",
        padding: 0,
        transition: "border-color .15s",
        boxShadow: selected ? `0 0 0 2px ${GOLD}44` : "none",
      }}
    >
      <span style={{ fontSize: 22 }}>{player.flag}</span>
      <span
        style={{
          fontSize: 8,
          fontWeight: 800,
          color: "var(--fg-1, #F6F8FB)",
          fontFamily: "var(--font-ui)",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 64,
          lineHeight: 1.2,
          textTransform: "uppercase",
        }}
      >
        {player.name}
      </span>
      {selected && (
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 20,
            height: 20,
            borderRadius: 99,
            background: GOLD,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            boxShadow: "var(--sh-2)",
          }}
        >
          ✓
        </div>
      )}
      {player.dup > 0 && (
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            background: "rgba(13,15,19,.85)",
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontSize: 7,
            fontWeight: 800,
            borderRadius: 99,
            padding: "1px 4px",
          }}
        >
          ×{player.dup + 1}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// OfferRow — incoming trade offer card (market.jsx lines 5-30)
// ---------------------------------------------------------------------------

type OfferDone = "ok" | "no" | null;

interface OfferRowProps {
  offer: IncomingOffer;
  done: OfferDone;
  onAccept: () => void;
  onReject: () => void;
}

function OfferRow({ offer, done, onAccept, onReject }: OfferRowProps) {
  if (done) {
    return (
      <div
        style={{
          background: "var(--bg-2, #15181F)",
          border: "1px solid var(--line, rgba(255,255,255,0.08))",
          borderRadius: "var(--r-lg, 20px)",
          padding: "16px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          opacity: 0.7,
        }}
      >
        <span style={{ fontSize: 18 }}>
          {done === "ok" ? "✓" : "✗"}
        </span>
        <span
          style={{
            fontSize: 13,
            color: done === "ok" ? "var(--green-bright, #2BD46F)" : "var(--fg-3, #6B7382)",
            fontWeight: 600,
            fontFamily: "var(--font-ui)",
          }}
        >
          {done === "ok"
            ? `Cambio con ${offer.them} aceptado`
            : `Oferta de ${offer.them} rechazada`}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--bg-2, #15181F)",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
        borderRadius: "var(--r-lg, 20px)",
        padding: 14,
      }}
    >
      {/* Header: who proposed */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 99,
            background: "var(--bg-4, #272C38)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--fg-1, #F6F8FB)",
            fontFamily: "var(--font-display, Impact, sans-serif)",
            flexShrink: 0,
          }}
        >
          {offer.them[0]}
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "var(--fg-1, #F6F8FB)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {offer.them}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--fg-3, #6B7382)",
            fontFamily: "var(--font-ui)",
          }}
        >
          te propone un cambio
        </span>
      </div>

      {/* Cards preview */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <MiniCard player={offer.theirCard} />
          <div
            style={{
              fontSize: 9,
              color: "var(--green-bright, #2BD46F)",
              fontWeight: 800,
              marginTop: 6,
              fontFamily: "var(--font-ui)",
              letterSpacing: ".04em",
            }}
          >
            TE DA
          </div>
        </div>

        <span
          style={{
            fontSize: 22,
            color: GOLD,
            flexShrink: 0,
          }}
        >
          ⇄
        </span>

        <div style={{ textAlign: "center" }}>
          <MiniCard player={offer.yourCard} />
          <div
            style={{
              fontSize: 9,
              color: "var(--red-bright, #FF274F)",
              fontWeight: 800,
              marginTop: 6,
              fontFamily: "var(--font-ui)",
              letterSpacing: ".04em",
            }}
          >
            TÚ DAS
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          onClick={onAccept}
          style={{
            flex: 1,
            padding: "11px 0",
            borderRadius: "var(--r-md, 14px)",
            background: "var(--green, #00A24B)",
            border: "none",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          ✓ Aceptar
        </button>
        <button
          onClick={onReject}
          style={{
            flex: 1,
            padding: "11px 0",
            borderRadius: "var(--r-md, 14px)",
            background: "var(--bg-3, #1D212B)",
            border: "1px solid var(--line-strong, rgba(255,255,255,0.15))",
            color: "var(--fg-2, #AAB2C0)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
          }}
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FriendsTab — list of friends with avatar, dup count, pts (market.jsx 237-253)
// ---------------------------------------------------------------------------

interface FriendsTabProps {
  onOpenFriend: (f: Friend) => void;
}

function FriendsTab({ onOpenFriend }: FriendsTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p
        style={{
          fontSize: 13,
          color: "var(--fg-2, #AAB2C0)",
          margin: "0 0 4px",
          fontFamily: "var(--font-ui)",
        }}
      >
        Mira el álbum de tus amigos y cámbiense las repetidas.
      </p>
      {FRIENDS.map((f) => (
        <button
          key={f.id}
          onClick={() => onOpenFriend(f)}
          style={{
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 13,
            borderRadius: "var(--r-lg, 20px)",
            background: "var(--bg-2, #15181F)",
            border: "1px solid var(--line, rgba(255,255,255,0.08))",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 99,
              background: "var(--bg-4, #272C38)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display, Impact, sans-serif)",
              fontSize: 19,
              color: "var(--fg-1, #F6F8FB)",
              flexShrink: 0,
            }}
            aria-hidden
          >
            {f.name[0]}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 15,
                color: "var(--fg-1, #F6F8FB)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {f.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--fg-3, #6B7382)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {f.dupIds.length} repetidas · {f.pts.toLocaleString("es-CL")} pts
            </div>
          </div>

          {/* CTA pill */}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: `${GOLD}18`,
              border: `1px solid ${GOLD}55`,
              borderRadius: 99,
              padding: "6px 11px",
              color: GOLD,
              fontWeight: 800,
              fontSize: 12,
              flexShrink: 0,
              fontFamily: "var(--font-ui)",
            }}
          >
            ⇄ Cambiar
          </span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FriendAlbumSheet — bottom sheet: friend's duplicates + wants (market.jsx 192-234)
// ---------------------------------------------------------------------------

interface FriendAlbumSheetProps {
  friend: Friend;
  onPropose: (p: Player) => void;
  onClose: () => void;
}

function FriendAlbumSheet({ friend, onPropose, onClose }: FriendAlbumSheetProps) {
  // Map friend.dupIds / wantIds to PLAYERS by real sticker_id, fallback to index.
  const playerById = (sid: string, fallbackIdx: number) =>
    PLAYERS.find((p) => p.id === sid) ?? PLAYERS[fallbackIdx % PLAYERS.length];

  const dups = friend.dupIds.map((sid, i) => playerById(sid, i)).filter(Boolean);
  const wants = friend.wantIds.map((sid, i) => playerById(sid, i + 4)).filter(Boolean);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 150,
        background: "rgba(7,8,10,.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "82%",
          background: "var(--bg-1, #0D0F13)",
          borderRadius: "22px 22px 0 0",
          border: "1px solid var(--line-gold, rgba(244,200,74,0.35))",
          borderBottom: "none",
          padding: "14px 18px 28px",
          display: "flex",
          flexDirection: "column",
          animation: "sheetup .3s var(--ease-out, cubic-bezier(.16,1,.3,1))",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 99,
            background: "var(--line-strong, rgba(255,255,255,0.15))",
            margin: "0 auto 14px",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 99,
              background: "var(--bg-4, #272C38)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display, Impact, sans-serif)",
              fontSize: 20,
              color: "var(--fg-1, #F6F8FB)",
              flexShrink: 0,
            }}
            aria-hidden
          >
            {friend.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-display, Impact, sans-serif)",
                fontSize: 22,
                color: "var(--fg-1, #F6F8FB)",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              Álbum de {friend.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--fg-3, #6B7382)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {dups.length} repetidas para cambiar
            </div>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* Dups label */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".08em",
              color: "var(--fg-3, #6B7382)",
              textTransform: "uppercase",
              marginBottom: 10,
              fontFamily: "var(--font-ui)",
            }}
          >
            Repetidas de {friend.name}
          </div>

          {/* 3-col dup grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
              justifyItems: "center",
              marginBottom: 18,
            }}
          >
            {dups.map((p, i) => (
              <div
                key={`${p.id}-${i}`}
                onClick={() => onPropose(p)}
                style={{ cursor: "pointer", position: "relative" }}
              >
                <MiniCard player={p} />
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--foil-gold, linear-gradient(135deg,#FFE9A8 0%,#F4C84A 38%,#C2913A 62%,#FFE9A8 100%))",
                    color: "var(--fg-onlight, #0D0F13)",
                    fontSize: 8,
                    fontWeight: 800,
                    padding: "3px 9px",
                    borderRadius: 99,
                    letterSpacing: ".04em",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  PROPONER
                </div>
              </div>
            ))}
          </div>

          {/* Wants */}
          {wants.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  color: "var(--fg-3, #6B7382)",
                  textTransform: "uppercase",
                  marginBottom: 10,
                  fontFamily: "var(--font-ui)",
                }}
              >
                {friend.name} busca
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {wants.map((p, i) => (
                  <div
                    key={`${p.id}-w${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      background: "var(--bg-2, #15181F)",
                      border: "1px solid var(--line, rgba(255,255,255,0.08))",
                      borderRadius: 99,
                      padding: "6px 12px 6px 8px",
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{p.flag}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--fg-1, #F6F8FB)",
                        fontFamily: "var(--font-ui)",
                      }}
                    >
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProposeSheet — pick your dup, confirm trade preview (market.jsx 92-129)
// ---------------------------------------------------------------------------

interface ProposeSheetProps {
  target: Player;
  onSend: (target: Player, give: Player) => void;
  onClose: () => void;
}

function ProposeSheet({ target, onSend, onClose }: ProposeSheetProps) {
  const dups = PLAYERS.filter((p) => p.owned && p.dup > 0);
  const [giveId, setGiveId] = useState<string | null>(
    dups[0]?.id ?? null
  );

  const give = PLAYERS.find((p) => p.id === giveId) ?? null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 160,
        background: "rgba(7,8,10,.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "82%",
          background: "var(--bg-1, #0D0F13)",
          borderRadius: "22px 22px 0 0",
          border: "1px solid var(--line-gold, rgba(244,200,74,0.35))",
          borderBottom: "none",
          padding: "14px 18px 28px",
          display: "flex",
          flexDirection: "column",
          animation: "sheetup .3s var(--ease-out, cubic-bezier(.16,1,.3,1))",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 99,
            background: "var(--line-strong, rgba(255,255,255,0.15))",
            margin: "0 auto 14px",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontFamily: "var(--font-display, Impact, sans-serif)",
            fontSize: 22,
            color: "var(--fg-1, #F6F8FB)",
            textTransform: "uppercase",
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          Proponer cambio
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-3, #6B7382)",
            marginBottom: 16,
            fontFamily: "var(--font-ui)",
          }}
        >
          Ofrece una repetida por esta carta
        </div>

        {/* Trade preview */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <div style={{ textAlign: "center" }}>
            {give ? (
              <MiniCard player={give} />
            ) : (
              <div
                style={{
                  width: 90,
                  height: 126,
                  borderRadius: "var(--r-sm, 10px)",
                  border: "1.5px dashed var(--line-strong, rgba(255,255,255,0.15))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--fg-3, #6B7382)",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "var(--font-ui)",
                }}
              >
                Elige
              </div>
            )}
            <div
              style={{
                fontSize: 9,
                color: "var(--red-bright, #FF274F)",
                fontWeight: 800,
                marginTop: 6,
                fontFamily: "var(--font-ui)",
                letterSpacing: ".04em",
              }}
            >
              TÚ DAS
            </div>
          </div>

          <span style={{ fontSize: 22, color: GOLD, flexShrink: 0 }}>⇄</span>

          <div style={{ textAlign: "center" }}>
            <MiniCard player={target} locked={!target.owned} />
            <div
              style={{
                fontSize: 9,
                color: "var(--green-bright, #2BD46F)",
                fontWeight: 800,
                marginTop: 6,
                fontFamily: "var(--font-ui)",
                letterSpacing: ".04em",
              }}
            >
              RECIBES
            </div>
          </div>
        </div>

        {/* Your duplicates grid */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "var(--fg-3, #6B7382)",
            textTransform: "uppercase",
            marginBottom: 10,
            fontFamily: "var(--font-ui)",
          }}
        >
          Tus repetidas
        </div>
        <div
          style={{
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 8,
            justifyItems: "center",
            marginBottom: 16,
          }}
        >
          {dups.map((p) => (
            <SquadTokenMini
              key={p.id}
              player={p}
              selected={giveId === p.id}
              onClick={() => setGiveId(p.id)}
            />
          ))}
        </div>

        {/* Send button */}
        <button
          disabled={!give}
          onClick={() => give && onSend(target, give)}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: "var(--r-md, 14px)",
            background: give
              ? "var(--foil-gold-soft, linear-gradient(180deg,#FBD867 0%,#E0A937 100%))"
              : "var(--bg-3, #1D212B)",
            border: "none",
            color: give ? "var(--fg-onlight, #0D0F13)" : "var(--fg-3, #6B7382)",
            fontWeight: 800,
            fontSize: 15,
            cursor: give ? "pointer" : "not-allowed",
            fontFamily: "var(--font-ui)",
            transition: "background .2s",
          }}
        >
          Enviar propuesta →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QRSyncSheet — real QrRenderer + QrScanner wired to qr-engine (market.jsx 154-189)
// ---------------------------------------------------------------------------

interface QRSyncSheetProps {
  nickname: string;
  onClose: () => void;
  onConnected: (f: Friend) => void;
}

type QRPhase = "show" | "scanning" | "done";

function QRSyncSheet({ nickname, onClose, onConnected }: QRSyncSheetProps) {
  const [phase, setPhase] = useState<QRPhase>("show");
  const [connectedFriend, setConnectedFriend] = useState<Friend | null>(null);

  // Build a minimal QR payload (req type) with the user's nickname
  const qrPayload = encodeTradePayload({
    v: 1,
    type: "req",
    uid: nickname || "jugador",
    ts: Date.now(),
    have: "",
    repes: "",
    give: [],
    want: [],
  });

  const handleScan = useCallback(
    (text: string) => {
      // Try to find a friend whose name appears in the scanned QR uid
      const decoded = text.toLowerCase();
      const matched =
        FRIENDS.find((f) => decoded.includes(f.name.toLowerCase())) ??
        FRIENDS[0];
      setConnectedFriend(matched);
      setPhase("done");
    },
    []
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 170,
        background: "rgba(7,8,10,.72)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "var(--bg-1, #0D0F13)",
          borderRadius: "22px 22px 0 0",
          border: "1px solid var(--line-gold, rgba(244,200,74,0.35))",
          borderBottom: "none",
          padding: "14px 22px 36px",
          animation: "sheetup .3s var(--ease-out, cubic-bezier(.16,1,.3,1))",
          textAlign: "center",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 99,
            background: "var(--line-strong, rgba(255,255,255,0.15))",
            margin: "0 auto 16px",
          }}
        />

        {/* Show / Scanning phase */}
        {phase !== "done" && (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".14em",
                color: GOLD,
                textTransform: "uppercase",
                fontFamily: "var(--font-ui)",
              }}
            >
              QR Sync
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display, Impact, sans-serif)",
                fontSize: 26,
                color: "var(--fg-1, #F6F8FB)",
                textTransform: "uppercase",
                margin: "4px 0 6px",
                lineHeight: 1,
              }}
            >
              Cambien estando juntos
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--fg-2, #AAB2C0)",
                margin: "0 auto 20px",
                maxWidth: 280,
                fontFamily: "var(--font-ui)",
                lineHeight: 1.5,
              }}
            >
              Mostrá tu QR a tu amigo, o escaneá el suyo para ver qué se pueden cambiar.
            </p>

            {phase === "show" && (
              /* Real QrRenderer */
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 22,
                }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "var(--glow-gold, 0 0 24px -4px rgba(244,200,74,.5))",
                  }}
                >
                  <QrRenderer payload={qrPayload} size={158} />
                </div>
              </div>
            )}

            {phase === "scanning" && (
              /* Real QrScanner */
              <div style={{ marginBottom: 22, borderRadius: 14, overflow: "hidden" }}>
                <QrScanner onResult={handleScan} active={true} />
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--fg-3, #6B7382)",
                    marginTop: 8,
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  Apuntá al QR de tu amigo
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: "var(--r-md, 14px)",
                  background: "var(--bg-3, #1D212B)",
                  border: "1px solid var(--line-strong, rgba(255,255,255,0.15))",
                  color: "var(--fg-2, #AAB2C0)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                }}
              >
                Cerrar
              </button>
              <button
                onClick={() => setPhase(phase === "show" ? "scanning" : "show")}
                style={{
                  flex: 1.4,
                  padding: "13px 0",
                  borderRadius: "var(--r-md, 14px)",
                  background: "var(--foil-gold-soft, linear-gradient(180deg,#FBD867 0%,#E0A937 100%))",
                  border: "none",
                  color: "var(--fg-onlight, #0D0F13)",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                📷 {phase === "scanning" ? "Ver mi QR" : "Escanear QR"}
              </button>
            </div>
          </>
        )}

        {/* Done phase — connected */}
        {phase === "done" && connectedFriend && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                margin: "6px auto 0",
                borderRadius: 99,
                background: "var(--foil-gold-soft, linear-gradient(180deg,#FBD867 0%,#E0A937 100%))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--glow-gold, 0 0 24px -4px rgba(244,200,74,.5))",
                fontSize: 30,
              }}
            >
              ✓
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display, Impact, sans-serif)",
                fontSize: 26,
                color: "var(--fg-1, #F6F8FB)",
                textTransform: "uppercase",
                margin: "14px 0 6px",
                lineHeight: 1,
              }}
            >
              ¡Conectado con {connectedFriend.name}!
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--fg-2, #AAB2C0)",
                margin: "0 0 22px",
                fontFamily: "var(--font-ui)",
              }}
            >
              Encontramos cartas que se pueden cambiar entre ustedes.
            </p>
            <button
              onClick={() => onConnected(connectedFriend)}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: "var(--r-md, 14px)",
                background: "var(--foil-gold-soft, linear-gradient(180deg,#FBD867 0%,#E0A937 100%))",
                border: "none",
                color: "var(--fg-onlight, #0D0F13)",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              ⇄ Ver cambios posibles
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SentRow — outgoing proposal card (Enviadas tab)
// ---------------------------------------------------------------------------

interface SentProposal {
  id: number;
  target: Player;
  give: Player;
}

function SentRow({ proposal }: { proposal: SentProposal }) {
  return (
    <div
      style={{
        background: "var(--bg-2, #15181F)",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
        borderRadius: "var(--r-lg, 20px)",
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <SquadTokenMini player={proposal.give} />
          <div
            style={{
              fontSize: 9,
              color: "var(--red-bright, #FF274F)",
              fontWeight: 800,
              marginTop: 6,
              fontFamily: "var(--font-ui)",
              letterSpacing: ".04em",
            }}
          >
            OFRECES
          </div>
        </div>
        <span style={{ fontSize: 20, color: GOLD, flexShrink: 0 }}>→</span>
        <div style={{ textAlign: "center" }}>
          <SquadTokenMini player={proposal.target} />
          <div
            style={{
              fontSize: 9,
              color: "var(--green-bright, #2BD46F)",
              fontWeight: 800,
              marginTop: 6,
              fontFamily: "var(--font-ui)",
              letterSpacing: ".04em",
            }}
          >
            QUIERES
          </div>
        </div>
      </div>

      {/* Waiting indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          marginTop: 12,
          color: GOLD,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 99,
            background: GOLD,
            display: "inline-block",
            animation: "pulse-dot 1.4s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "var(--font-ui)",
          }}
        >
          Esperando respuesta…
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type Tab = "ofertas" | "amigos" | "enviadas";

export default function MarketPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ofertas");
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("jugador");

  // Offer states: offer id → 'ok' | 'no' | null
  const [offerStates, setOfferStates] = useState<Record<string, "ok" | "no">>({});
  const [sent, setSent] = useState<SentProposal[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Sheet states
  const [friendSheet, setFriendSheet] = useState<Friend | null>(null);
  const [proposeSheet, setProposeSheet] = useState<Player | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    (async () => {
      const nick = await getNickname();
      if (!nick) {
        router.replace("/");
        return;
      }
      setNickname(nick);
      setLoading(false);
    })();
  }, [router]);

  const pendingCount = INCOMING_OFFERS.filter((o) => !offerStates[o.id]).length;
  const sentCount = sent.length;

  const TABS: { k: Tab; label: string; badge?: number }[] = [
    { k: "ofertas",  label: "Ofertas",  badge: pendingCount || undefined },
    { k: "amigos",   label: "Amigos" },
    { k: "enviadas", label: "Enviadas", badge: sentCount || undefined },
  ];

  const handleSendProposal = useCallback(
    (target: Player, give: Player) => {
      setSent((prev) => [{ id: Date.now(), target, give }, ...prev]);
      setProposeSheet(null);
      setFriendSheet(null);
      setTab("enviadas");
      flash("Propuesta enviada ⚡");
    },
    [flash]
  );

  const handleQrConnected = useCallback(
    (f: Friend) => {
      setQrOpen(false);
      setFriendSheet(f);
      setTab("amigos");
    },
    []
  );

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-1, #0D0F13)" }}
      >
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{
            borderColor: GOLD,
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 w-full max-w-lg mx-auto"
      style={{ backgroundColor: "var(--bg-1, #0D0F13)", color: "var(--fg-1, #F6F8FB)", position: "relative" }}
    >
      {/* ---- Header ---- */}
      <div
        className="sticky top-[54px] z-20 px-4 pt-4 pb-3"
        style={{
          background: "linear-gradient(180deg, var(--bg-1, #0D0F13) 80%, rgba(13,15,19,0) 100%)",
        }}
      >
        {/* Eyebrow + QR Sync button row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".12em",
                color: GOLD,
                textTransform: "uppercase",
                fontFamily: "var(--font-ui)",
                marginBottom: 2,
              }}
            >
              Mercado
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display, Impact, sans-serif)",
                fontSize: 30,
                color: "var(--fg-1, #F6F8FB)",
                lineHeight: 1,
                margin: "2px 0 14px",
                textTransform: "uppercase",
              }}
            >
              Cambios
            </h1>
          </div>

          <button
            onClick={() => setQrOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: `${GOLD}18`,
              border: `1px solid ${GOLD}55`,
              borderRadius: 99,
              padding: "9px 13px",
              color: GOLD,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              flexShrink: 0,
            }}
            aria-label="QR Sync"
          >
            📷 QR Sync
          </button>
        </div>

        {/* Segmented control */}
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--bg-2, #15181F)",
            border: "1px solid var(--line, rgba(255,255,255,0.08))",
            borderRadius: "var(--r-sm, 10px)",
            padding: 4,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: "var(--r-xs, 6px)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: tab === t.k ? "var(--bg-4, #272C38)" : "transparent",
                color: tab === t.k ? "var(--fg-1, #F6F8FB)" : "var(--fg-3, #6B7382)",
                transition: "background .15s, color .15s",
              }}
            >
              {t.label}
              {t.badge ? (
                <span
                  style={{
                    minWidth: 17,
                    height: 17,
                    padding: "0 5px",
                    borderRadius: 99,
                    background: "var(--red, #E4002B)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-stat)",
                  }}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Tab content ---- */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ paddingTop: 16 }}>

        {/* Tab: Ofertas */}
        {tab === "ofertas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p
              style={{
                fontSize: 13,
                color: "var(--fg-2, #AAB2C0)",
                margin: "0 0 2px",
                fontFamily: "var(--font-ui)",
              }}
            >
              {pendingCount
                ? `${pendingCount} oferta${pendingCount > 1 ? "s" : ""} de tus amigos esperando`
                : "No tienes ofertas nuevas"}
            </p>
            {INCOMING_OFFERS.map((o) => (
              <OfferRow
                key={o.id}
                offer={o}
                done={offerStates[o.id] ?? null}
                onAccept={() => {
                  setOfferStates((p) => ({ ...p, [o.id]: "ok" }));
                  flash("Cambio aceptado 🔥");
                }}
                onReject={() =>
                  setOfferStates((p) => ({ ...p, [o.id]: "no" }))
                }
              />
            ))}
          </div>
        )}

        {/* Tab: Amigos */}
        {tab === "amigos" && (
          <FriendsTab onOpenFriend={(f) => setFriendSheet(f)} />
        )}

        {/* Tab: Enviadas */}
        {tab === "enviadas" && (
          sent.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px 20px",
                color: "var(--fg-3, #6B7382)",
              }}
            >
              <div style={{ fontSize: 38, marginBottom: 12 }}>⇄</div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--fg-2, #AAB2C0)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                Aún no envías propuestas
              </div>
              <div
                style={{
                  fontSize: 13,
                  marginTop: 4,
                  fontFamily: "var(--font-ui)",
                }}
              >
                Ve a{" "}
                <button
                  onClick={() => setTab("amigos")}
                  style={{
                    background: "none",
                    border: "none",
                    color: GOLD,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                    padding: 0,
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  Amigos
                </button>{" "}
                y propón un cambio
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sent.map((s) => (
                <SentRow key={s.id} proposal={s} />
              ))}
            </div>
          )
        )}
      </div>

      {/* ---- Sheets ---- */}
      {friendSheet && (
        <FriendAlbumSheet
          friend={friendSheet}
          onPropose={(p) => setProposeSheet(p)}
          onClose={() => setFriendSheet(null)}
        />
      )}
      {proposeSheet && (
        <ProposeSheet
          target={proposeSheet}
          onSend={handleSendProposal}
          onClose={() => setProposeSheet(null)}
        />
      )}
      {qrOpen && (
        <QRSyncSheet
          nickname={nickname}
          onClose={() => setQrOpen(false)}
          onConnected={handleQrConnected}
        />
      )}

      {/* ---- Toast ---- */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 250,
            background: "var(--bg-3, #1D212B)",
            border: `1px solid ${GOLD}66`,
            color: "var(--fg-1, #F6F8FB)",
            padding: "12px 20px",
            borderRadius: 99,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "var(--sh-4, 0 24px 60px -12px rgba(0,0,0,.7))",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-ui)",
          }}
        >
          {toast}
        </div>
      )}

      <BottomNav active="mercado" />

      {/* Keyframes not yet in globals.css */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

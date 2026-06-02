"use client";

/**
 * StickerCardPanini — Panini-style TradingCard for /album.
 *
 * Pixel-perfect port of TradingCard from the Albumix design bundle (cards.jsx lines 43-107).
 *
 * Props:
 *   sticker      — Sticker from catalog
 *   size         — 'sm' | 'md' | 'lg'  (default 'md')
 *   locked       — true → greyscale dark gradient, "???" name, "?" photo placeholder
 *   selected     — true → 3px gold ring boxShadow (favorite indicator)
 *   onClick      — tap handler
 *   showXBadge   — override: force-show the ×N badge regardless of dup count
 *   count        — how many copies the user owns (drives ×N badge + owned border)
 *   favorited    — shows ⭐ in top-right corner when true
 *   posColor     — position-coded border color (Fase 2.5); renders as inset ring
 */

import Image from "next/image";
import type { Sticker } from "@/lib/catalog";
import { getAccent } from "@/lib/nation-accent";
import { getBio } from "@/lib/sticker-bio";
import { getFlag } from "@/lib/team-flags";
import { photoUrlFor } from "@/lib/squad/photo";

// ---------------------------------------------------------------------------
// Dimensions (verbatim from cards.jsx)
// ---------------------------------------------------------------------------
interface Dims {
  w: number;
  h: number;
  num: number;   // giant 26 font size
  name: number;  // name font size
  sub: number;   // bio sub-line font size
  pad: number;   // reserved (always 0 in source)
  flag: number;  // flag font size
  plate: number; // name plate height
}

const DIMS: Record<"sm" | "md" | "lg", Dims> = {
  sm: { w: 104, h: 146, num: 70,  name: 11, sub: 6.5, pad: 0, flag: 13, plate: 26 },
  md: { w: 150, h: 210, num: 104, name: 16, sub: 8.5, pad: 0, flag: 18, plate: 38 },
  lg: { w: 230, h: 322, num: 168, name: 26, sub: 12,  pad: 0, flag: 26, plate: 60 },
};

// ---------------------------------------------------------------------------
// CSS variables used by the component (must be defined in globals.css)
// var(--r-card)      — card border radius
// var(--font-display) — display / heading font (Bebas Neue or similar bold)
// var(--font-stat)   — stat/monospace font
// var(--gold)        — #C0A85E or similar
// var(--sh-2), var(--sh-3) — box-shadow presets
// var(--ease-pop)    — cubic-bezier for pop animations
//
// If those vars aren't defined, the inline fallbacks below apply.
// ---------------------------------------------------------------------------

export interface StickerCardPaniniProps {
  sticker: Sticker;
  size?: "sm" | "md" | "lg";
  locked?: boolean;
  selected?: boolean;
  onClick?: () => void;
  showXBadge?: boolean;
  count?: number;
  favorited?: boolean;
  posColor?: string;
}

export default function StickerCardPanini({
  sticker,
  size = "md",
  locked = false,
  selected = false,
  onClick,
  showXBadge = false,
  count = 0,
  favorited = false,
  posColor,
}: StickerCardPaniniProps) {
  const dims = DIMS[size];
  const accent = getAccent(sticker.team);
  const isLg = size === "lg";
  const showBio = size !== "sm";
  const dup = count - 1; // extra copies beyond the first
  const showDup = (count > 1 || showXBadge) && !locked;
  const flag = getFlag(sticker.team_code || "FWC");
  const bio = showBio && !locked ? getBio(sticker.id, sticker.team_code) : null;
  // Resolve photo: originales → seed → placeholder. Falls back to seed_image from catalog.
  const resolvedPhoto = sticker.type === "player" ? photoUrlFor(sticker.id) : (sticker.seed_image ?? null);
  const hasPhoto = Boolean(resolvedPhoto) && !resolvedPhoto?.endsWith("placeholder.svg");

  // Flag chip position — matches cards.jsx line 84
  const flagTop = isLg ? 92 : size === "md" ? 58 : 40;
  const flagRight = isLg ? 10 : 5;
  const flagWidth = isLg ? 34 : size === "md" ? 24 : 18;
  const flagHeight = isLg ? 24 : size === "md" ? 17 : 13;

  // Name plate padding — matches cards.jsx line 88
  const platePad = isLg ? "8px 12px 10px" : size === "md" ? "6px 9px 7px" : "5px 7px 6px";

  // Owned+duplicate badge (top-left, dark pill with gold border)
  const dupFontSize = size === "sm" ? 9 : 10;

  // Gold ring for selected/favorite; position-coded border underneath
  // posColor ring: 0 0 0 3px <posColor>  (outermost)
  // selected gold ring: 0 0 0 6px var(--gold) when posColor is also present
  const posShadow = posColor ? `0 0 0 3px ${posColor}` : "";
  const goldRing = selected
    ? (posColor
        ? `0 0 0 6px var(--gold, #C0A85E), var(--sh-3, 0 8px 24px rgba(0,0,0,0.5))`
        : `0 0 0 3px var(--gold, #C0A85E), var(--sh-3, 0 8px 24px rgba(0,0,0,0.5))`)
    : "var(--sh-2, 0 4px 12px rgba(0,0,0,0.35))";
  const boxShadowSelected = posShadow ? `${posShadow}, ${goldRing}` : goldRing;
  const boxShadowBase = posShadow
    ? `${posShadow}, var(--sh-2, 0 4px 12px rgba(0,0,0,0.35))`
    : "var(--sh-2, 0 4px 12px rgba(0,0,0,0.35))";

  return (
    <button
      onClick={onClick}
      data-testid="panini-card"
      data-sticker-id={sticker.id}
      data-locked={locked}
      aria-label={`${sticker.code} ${sticker.display_name || sticker.name}${locked ? " — bloqueada" : count === 0 ? " — falta" : count === 1 ? " — la tengo" : ` — ×${count}`}`}
      className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: "var(--r-card, 10px)",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        background: locked
          ? "linear-gradient(180deg,#2a3036,#1b2024)"
          : "linear-gradient(180deg,#8fe0ef 0%,#6fd0e6 60%,#58c2dc 100%)",
        boxShadow: selected ? boxShadowSelected : boxShadowBase,
        // posColor border: handled via boxShadow ring above (overflow:hidden-safe)
        transition: "transform .15s var(--ease-pop, cubic-bezier(0.34,1.56,0.64,1))",
        opacity: locked ? 0.5 : 1,
        filter: locked ? "grayscale(0.6)" : "none",
        // iOS zoom guard — buttons need min 44px tap target but card itself has fixed dims
        padding: 0,
        border: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Giant "26" motif — absolutely positioned background decoration      */}
      {/* ------------------------------------------------------------------ */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {/* "2" — top-left, dark */}
        <span
          style={{
            position: "absolute",
            left: -dims.num * 0.12,
            top: -dims.num * 0.06,
            fontFamily: "var(--font-display, 'Impact', sans-serif)",
            fontSize: dims.num,
            lineHeight: 0.8,
            color: "rgba(13,20,24,.9)",
            letterSpacing: "-.04em",
            userSelect: "none",
          }}
        >
          2
        </span>
        {/* "6" — right-of-center, accent color */}
        <span
          style={{
            position: "absolute",
            right: -dims.num * 0.14,
            top: dims.num * 0.18,
            fontFamily: "var(--font-display, 'Impact', sans-serif)",
            fontSize: dims.num,
            lineHeight: 0.8,
            color: accent,
            opacity: 0.92,
            letterSpacing: "-.04em",
            userSelect: "none",
          }}
        >
          6
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Photo slot — full-bleed center area, ends at plate top              */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: showBio ? 6 : 4,
          bottom: dims.plate - 6,
          zIndex: 1,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {locked ? (
          /* Locked placeholder — "?" glyph */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              color: "rgba(255,255,255,.5)",
              fontFamily: "var(--font-display, 'Impact', sans-serif)",
              fontSize: dims.num * 0.4,
            }}
          >
            ?
          </div>
        ) : hasPhoto ? (
          <Image
            src={resolvedPhoto!}
            alt={`${sticker.code} ${sticker.display_name || sticker.name}`}
            fill
            className="object-cover object-top"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 17vw"
            style={{ borderRadius: 0 }}
          />
        ) : (
          /* No photo: team color gradient + sticker code */
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(160deg, ${accent}33 0%, rgba(143,224,239,0.1) 100%)`,
            }}
          >
            <span
              style={{
                fontSize: dims.name * 0.7,
                fontFamily: "var(--font-display, 'Impact', sans-serif)",
                color: "rgba(13,20,24,0.4)",
                textAlign: "center",
                padding: "0 4px",
              }}
            >
              {sticker.code}
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Flag chip — white pill, right edge                                   */}
      {/* ------------------------------------------------------------------ */}
      {!locked && (
        <div
          style={{
            position: "absolute",
            right: flagRight,
            top: flagTop,
            zIndex: 3,
            width: flagWidth,
            height: flagHeight,
            borderRadius: 4,
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: dims.flag,
            overflow: "hidden",
          }}
          aria-hidden
        >
          {flag}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Name plate — accent color at bottom                                  */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          background: locked ? "#3a4148" : accent,
          padding: platePad,
        }}
      >
        {/* Player name */}
        <div
          style={{
            fontFamily: "var(--font-display, 'Impact', sans-serif)",
            fontSize: dims.name,
            lineHeight: 0.95,
            letterSpacing: ".01em",
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textTransform: "uppercase",
          }}
        >
          {locked ? "???" : sticker.display_name || sticker.name}
        </div>

        {/* Bio sub-line — born · height · weight */}
        {showBio && bio && (
          <div
            style={{
              fontFamily: "var(--font-stat, 'Roboto Mono', monospace)",
              fontWeight: 700,
              fontSize: dims.sub,
              color: "rgba(255,255,255,.92)",
              marginTop: 2,
              whiteSpace: "nowrap",
            }}
          >
            {bio.born} · {bio.height}cm · {bio.weight}kg
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Duplicate badge — top-left, gold border pill (count > 1)             */}
      {/* ------------------------------------------------------------------ */}
      {showDup && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 4,
            background: "rgba(13,15,19,.85)",
            border: "1px solid var(--gold, #C0A85E)",
            color: "var(--gold, #C0A85E)",
            fontSize: dupFontSize,
            fontWeight: 800,
            borderRadius: 99,
            padding: "2px 7px",
            lineHeight: 1.4,
          }}
        >
          ×{count > 1 ? count : dup + 1}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Favorited star — top-right corner                                    */}
      {/* ------------------------------------------------------------------ */}
      {favorited && !locked && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: flagRight + flagWidth + 4,
            zIndex: 5,
            fontSize: size === "sm" ? 10 : 12,
            lineHeight: 1,
          }}
          aria-hidden
        >
          ⭐
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Missing overlay — dark tint when count === 0 (not locked)            */}
      {/* ------------------------------------------------------------------ */}
      {count === 0 && !locked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 6,
            pointerEvents: "none",
          }}
        />
      )}
    </button>
  );
}

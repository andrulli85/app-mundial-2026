"use client";

/**
 * StickerCardFut — FUT Champions-style sticker card for /album.
 *
 * DO NOT delete StickerCard.tsx — it is still used by /trade routes.
 *
 * Design:
 *   - Photo as primary content (fill, object-cover)
 *   - Neon rarity border (gradient via padding trick)
 *   - Rating (2-digit mock) + position label top-left
 *   - Flag emoji top-right
 *   - Name strip bottom
 *   - Dark overlay for missing stickers (count === 0)
 *   - Repetidas badge top-right when count > 1
 */

import Image from "next/image";
import type { Sticker } from "@/lib/catalog";
import { getRating, getPosition, getRarityVisualTier, RARITY_COLORS } from "@/lib/rarity-mock";
import { getFlag } from "@/lib/team-flags";

interface StickerCardFutProps {
  sticker: Sticker;
  count: number;
  onTap?: (stickerId: string) => void;
}

/**
 * Abbreviate a display name for the name strip.
 * "LIONEL MESSI" → "L. MESSI"
 * Single-word names returned as-is.
 */
function shortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return displayName;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

export default function StickerCardFut({ sticker, count, onTap }: StickerCardFutProps) {
  const tier = getRarityVisualTier(sticker);
  const rating = getRating(sticker);
  const position = getPosition(sticker);
  const { border: borderGradient, ratingText: ratingColor, glow } = RARITY_COLORS[tier];
  const flag = getFlag(sticker.team_code || "FWC");
  const name = shortName(sticker.display_name || sticker.name);
  const hasPhoto = Boolean(sticker.seed_image);

  return (
    <button
      onClick={() => onTap?.(sticker.id)}
      data-testid="fut-card"
      data-rarity={tier}
      data-rating={rating}
      aria-label={`${sticker.code} ${sticker.name} — ${count === 0 ? "falta" : count === 1 ? "la tengo" : `${count - 1} repite`}`}
      className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-xl"
      style={{
        aspectRatio: "3/4",
        background: borderGradient,
        padding: 2,
        boxShadow: glow,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--tw-ring-color" as any]: ratingColor,
      }}
    >
      {/* Inner card surface */}
      <div className="relative h-full w-full rounded-[10px] overflow-hidden bg-[#1a1a1a]">

        {/* Photo or fallback */}
        {hasPhoto ? (
          <Image
            src={sticker.seed_image!}
            alt={`${sticker.code} ${sticker.name}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 17vw"
          />
        ) : (
          /* Fallback: team-color gradient with sticker code */
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(160deg, ${sticker.team_color}33 0%, #1a1a1a 100%)`,
            }}
          >
            <span
              className="text-[9px] font-black opacity-40 text-center px-1"
              style={{ color: ratingColor }}
            >
              {sticker.code}
            </span>
          </div>
        )}

        {/* Dark gradient top overlay — makes rating readable on bright photos */}
        <div
          className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 100%)" }}
        />

        {/* Rating + position — top-left */}
        <div className="absolute top-1 left-1.5">
          <div
            className="text-2xl font-black leading-none"
            style={{ color: ratingColor, textShadow: "0 2px 4px rgba(0,0,0,0.6)" }}
          >
            {rating}
          </div>
          <div
            className="text-[10px] font-bold leading-none mt-0.5"
            style={{ color: ratingColor, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
          >
            {position}
          </div>
        </div>

        {/* Flag — top-right */}
        <div className="absolute top-1 right-1 text-base leading-none">
          {flag}
        </div>

        {/* Repetidas badge — below flag */}
        {count > 1 && (
          <div
            className="absolute top-7 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black"
            style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
          >
            x{count}
          </div>
        )}

        {/* Missing overlay */}
        {count === 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "rgba(0,0,0,0.55)" }}
          />
        )}

        {/* Name strip — bottom */}
        <div
          className="absolute inset-x-0 bottom-0 px-1.5 py-1 pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)" }}
        >
          <div className="text-[10px] font-bold uppercase truncate text-white text-center">
            {name}
          </div>
        </div>
      </div>
    </button>
  );
}

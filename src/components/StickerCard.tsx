"use client";

/**
 * StickerCard — one cell in the Album grid.
 *
 * Filled (count >= 1): shows seed photo + duplicate badge if count > 1
 * Empty (count == 0):  shows <EmptySlot> with authentic album design
 *
 * Tap behavior: cycles count 0→1→2→3→0
 */

import Image from "next/image";
import EmptySlot from "@/components/EmptySlot";
import type { Sticker } from "@/lib/catalog";

interface StickerCardProps {
  sticker: Sticker;
  count: number;
  onTap: (stickerId: string) => void;
}

export default function StickerCard({
  sticker,
  count,
  onTap,
}: StickerCardProps) {
  const filled = count > 0;
  const hasPhoto = Boolean(sticker.seed_image);
  const isLandscape =
    sticker.type === "team_photo" ||
    sticker.id === "fwc-01" ||
    sticker.id === "fwc-02";

  return (
    <button
      onClick={() => onTap(sticker.id)}
      className="relative w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded"
      style={{
        aspectRatio: isLandscape ? "4/3" : "3/4",
        gridColumn: isLandscape ? "span 2" : undefined,
        // ring color matches team
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--tw-ring-color" as any]: sticker.team_color,
      }}
      title={`${sticker.code} — ${sticker.name}`}
      aria-label={`${sticker.code} ${sticker.name} — ${
        count === 0
          ? "falta"
          : count === 1
          ? "la tengo"
          : `${count - 1} repite`
      }`}
    >
      {filled && hasPhoto ? (
        // Filled + seed photo available
        <div className="relative w-full h-full rounded overflow-hidden">
          <Image
            src={sticker.seed_image!}
            alt={`${sticker.code} ${sticker.name}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 25vw, (max-width: 1024px) 15vw, 10vw"
          />
          {/* Duplicate badge */}
          {count > 1 && (
            <div
              className="absolute top-1 right-1 rounded-full text-white font-bold text-[0.55rem] w-4 h-4 flex items-center justify-center z-10"
              style={{ backgroundColor: sticker.team_color }}
            >
              ×{count}
            </div>
          )}
          {/* "Got it" checkmark overlay (subtle) */}
          <div className="absolute inset-0 ring-2 ring-inset ring-green-400 rounded opacity-60" />
        </div>
      ) : filled && !hasPhoto ? (
        // Filled but no photo — show EmptySlot with a "got" indicator
        <div className="relative w-full h-full">
          <EmptySlot
            stickerCode={sticker.code}
            playerName={sticker.name}
            teamColor={sticker.team_color}
            landscape={isLandscape}
          />
          {/* Green "got it" overlay */}
          <div
            className="absolute inset-0 rounded pointer-events-none"
            style={{
              backgroundColor: "rgba(74,222,128,0.18)",
              border: "2px solid rgba(74,222,128,0.7)",
            }}
          />
          {/* Count badge */}
          {count > 1 && (
            <div
              className="absolute top-1 right-1 rounded-full text-white font-bold text-[0.55rem] w-4 h-4 flex items-center justify-center z-10"
              style={{ backgroundColor: sticker.team_color }}
            >
              ×{count}
            </div>
          )}
        </div>
      ) : (
        // Empty (count == 0)
        <EmptySlot
          stickerCode={sticker.code}
          playerName={sticker.name}
          teamColor={sticker.team_color}
          landscape={isLandscape}
        />
      )}
    </button>
  );
}

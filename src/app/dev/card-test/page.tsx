"use client";

/**
 * /dev/card-test — throwaway dev route for isolating StickerCardPanini.
 * DELETE this file in Phase D cleanup.
 */

import StickerCardPanini from "@/components/StickerCardPanini";
import type { Sticker } from "@/lib/catalog";

// Minimal mock stickers for visual testing
const MOCK_STICKERS: Sticker[] = [
  {
    id: "arg-1-messi",
    code: "ARG 1",
    name: "L. MESSI",
    display_name: "L. MESSI",
    team: "Argentina",
    team_code: "ARG",
    number: 10,
    type: "player",
    sort_order: 0,
    team_color: "#5BBDE4",
    group: "J",
  },
  {
    id: "bra-1-neymar",
    code: "BRA 1",
    name: "NEYMAR JR",
    display_name: "NEYMAR JR",
    team: "Brasil",
    team_code: "BRA",
    number: 10,
    type: "player",
    sort_order: 1,
    seed_image: undefined,
    team_color: "#1FA34A",
    group: "C",
  },
  {
    id: "mex-1-jimenez",
    code: "MEX 1",
    name: "R. JIMÉNEZ",
    display_name: "R. JIMÉNEZ",
    team: "México",
    team_code: "MEX",
    number: 9,
    type: "player",
    sort_order: 2,
    team_color: "#0A7A3B",
    group: "A",
  },
];

const sizes: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];

export default function CardTestPage() {
  return (
    <div style={{ padding: 24, background: "#0a0a0a", minHeight: "100vh", color: "#fff" }}>
      <h1 style={{ fontFamily: "system-ui", marginBottom: 24, fontSize: 18 }}>
        StickerCardPanini — dev test (delete in Phase D)
      </h1>

      {sizes.map((size) => (
        <section key={size} style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "system-ui", fontSize: 14, marginBottom: 12, color: "#9ca3af" }}>
            size={size}
          </h2>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* Owned, no dup */}
            <StickerCardPanini sticker={MOCK_STICKERS[0]} size={size} count={1} />

            {/* Owned + dup ×3 */}
            <StickerCardPanini sticker={MOCK_STICKERS[1]} size={size} count={3} />

            {/* Selected / favorite ring */}
            <StickerCardPanini sticker={MOCK_STICKERS[2]} size={size} count={1} selected favorited />

            {/* Not owned — dark overlay */}
            <StickerCardPanini sticker={MOCK_STICKERS[0]} size={size} count={0} />

            {/* Locked card */}
            <StickerCardPanini sticker={MOCK_STICKERS[1]} size={size} locked count={0} />
          </div>
        </section>
      ))}
    </div>
  );
}

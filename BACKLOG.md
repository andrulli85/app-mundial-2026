# Albumix — Backlog

Design specs queued for implementation. Each item is concrete enough to drop into a RIO brief when ready.

---

## R1 · Rarity Tier Visual System

**Goal.** Distinct visual treatment for premium sticker categories so DORADAS, HOLOGRAMAS, and FWC specials feel different from common players.

**Why.** Engagement multiplier. Premium feel = collection desire. Domi will notice instantly.

**Scope.**

- Five tiers: `common`, `team`, `fwc-silver`, `gold`, `holo`.
- New CSS module `src/styles/rarity.css` with tokens + animations.
- `<StickerCard rarity="..." />` variant prop branches.
- Catalog migration: add `rarity` field to `src/data/stickers.json`. Default `common`. Manual gold list (~30 superstars). Auto `fwc-silver` for `id.startsWith("fwc-")`. Holo tagged from `Hologramas.pdf` extraction.
- Pack-opening reveal: gold burst + holo prismatic streak.
- Performance: skip animations under `prefers-reduced-motion: reduce`; holo tilt desktop-only via `(pointer: coarse)` query.

**Visual signatures.**

| Tier | Treatment |
|---|---|
| Common | Flat bg + team color border |
| Team | Soft glow + landscape ratio |
| FWC Silver | Silver foil + slow shimmer (4s) |
| Gold | Gold border + 6 sparkle particles + glow |
| Holo | Conic-gradient iridescent border + 3D tilt on hover (max 12deg) |

**CSS tokens.**

```css
:root {
  --rarity-gold-border: linear-gradient(135deg, #fde047 0%, #facc15 25%, #fbbf24 50%, #f59e0b 75%, #d97706 100%);
  --rarity-gold-glow: 0 0 32px rgba(252, 211, 77, .6);
  --rarity-holo-gradient: conic-gradient(from 0deg, #ff006e, #fb5607, #ffbe0b, #8338ec, #3a86ff, #06ffa5, #ff006e);
  --rarity-holo-tilt-max: 12deg;
  --rarity-fwc-foil: linear-gradient(135deg, #e8e8e8 0%, #f8f8f8 25%, #c0c0c0 50%, #f8f8f8 75%, #e8e8e8 100%);
}
```

**Playwright validation.**

- `e2e/regression/rarity-tiers.spec.ts` — gold sparkle visible, holo 3D transform on hover, fwc shimmer animation running.

**Estimated effort.** RIO 60-90 min. Blocked on extraction pipeline reaching DORADAS + HOLOGRAMAS PDFs.

---

## R2 · Trade Room Realtime

**Goal.** When 2 friends are both online, open a live trade negotiation room. Real-time give/want grid sync + emoji reactions + 2-of-2 confirm.

**Why.** Monday at school is the killer use case — kids meeting in person but the app is what makes the trade concrete + fair. Synchronous = no WhatsApp scroll friction.

**Scope.**

- New route `/trade/room/[room_id]`.
- Firestore RTDB doc `trade_rooms/{room_id}` with `participants[]`, `state`, `give_a`, `give_b`, `confirms`, `messages[]`, `last_active`.
- Realtime sync via Firestore `onSnapshot` (or RTDB ref) — sub-200ms latency target.
- UI: 2-pane layout (top: their side, bottom: yours), each pane shows the picked-stickers list. Tap sticker → adds/removes.
- Center fairness meter: `⚖️ Fair` / `⚠️ Unbalanced` based on rarity + count delta.
- Emoji reactions float across both panes (🔥 ✅ ❌ 👀 🤝).
- 2-of-2 confirm gate: each side taps `✓ Confirmar`. When both confirmed → trade logs to `trade_log`, inventories swap, room archived.
- Presence: shows `🟢 Tomás escribiendo…` when other side is mutating their pane.
- Timeout: room auto-expires after 15 min idle.

**UI mockup.**

```
┌─ Trade con Tomás 🟢 ──┐
│ ÉL DA:                  │
│ [ARG-11] [BRA-9]        │
├─────────────────────────┤
│      ⚖️ Fair             │
├─────────────────────────┤
│ TÚ DAS:                 │
│ [MEX-7] [USA-3]         │
│                         │
│ [✓ Confirmar] 1/2       │
│ 🔥 Tomás escribiendo…   │
└─────────────────────────┘
```

**State machine.**

```
created → both_present → mutating ↔ proposing ↔ confirming
              ↓                                       ↓
           timeout                              both_confirmed
                                                      ↓
                                              swap_inventories
                                                      ↓
                                                  archived
```

**Entry points.**

- From friend profile → `[💱 Trade now]` (visible only if friend `🟢 online`).
- From notification `Tomás te invita a trade` → tap → opens room.
- From `/mercado` Buscar tab → tap friend with match → `[Trade room]`.

**Auto-suggest seed.**

- On room open, pre-fill panes with auto-match output (use existing `src/lib/auto-match.ts`).
- Both sides can edit; auto-match is a suggestion, not a lock.

**Conflict handling.**

- If both edit simultaneously, last-write-wins per slot. Show 250ms toast: `Tomás cambió ARG-11 por ARG-15`.

**Playwright validation.**

- `e2e/regression/trade-room-2-tabs.spec.ts` — open 2 browser contexts as 2 users, both join room, edit panes, verify cross-context sync, confirm 2-of-2, verify inventories swapped.

**Estimated effort.** RIO 90-120 min. Blocked on Firebase Auth UI gate (need real auth + Firestore writes).

---

## R3 · Sticker Extraction Phase 2 (post-revert)

**Status.** Phase 1 shipped + reverted same session. Commits `3ef3d18`, `dabd302`, `20b4822` reverted at `8af2fe4`, `82fa965`, `deedfda`. CACHE_VERSION rolled back from `20b48226` to `deedfdab`. Manual 50 crops preserved.

**Why Phase 1 failed.**

1. **Wrong grid size.** RIO assumed `5×4 = 20 cells/page`. Sample `ARGENTINA.pdf` page 1 is `4×4 = 16 cells`. Result: cells span across sticker boundaries → some images full, some half (only top portion of face, no name strip).
2. **Catalog `sort_order` ≠ Panini visual reading order.** RIO mapped cell index → `sort_order`. The catalog's `sort_order` is alphabetical/team-internal, but Panini orders by jersey number per visual row. Result: `arg-17-messi.jpg` showed Paredes; `arg-3-molina.jpg` showed Messi.

**Visual evidence captured pre-revert.** Two reads confirmed mislabel:

- `arg-17-messi.jpg` — image showed Leandro Paredes (full sticker with name strip).
- `arg-3-molina.jpg` — image showed Lionel Messi (face only, no name strip → grid offset).

**Phase 2 corrections (required).**

1. **Per-PDF grid detection.** Open each country PDF, measure aspect ratio + count visible stickers via Sharp pixel histogram. Most PDFs are `4×4`; some may be `4×5` for teams with more entries. Don't hardcode.
2. **Visual order over catalog `sort_order`.** Each Panini sticker has a printed **shirt number** (top-left of card, bold). Mapping options:
   - **(2a) OCR the printed number.** Run Tesseract on top-left 60×60px of each cell. Number `7` → match `arg-7-*` in catalog. Cost: ~5 sec/cell × 16 × 49 PDFs ≈ 65 min CPU. Free.
   - **(2b) Manual per-country mapping table.** Andy or Claude inspects page 1 of each PDF once and writes `mapping/<iso>.json`: `[null, "team", 7, 10, 14, 8, ...]` (cell index → printed number → catalog id). 49 PDFs × ~1 min each ≈ 49 min one-time. Fully deterministic.
   - **(2c) Hybrid.** OCR + manual fallback when OCR confidence low.
   - **Recommendation:** start with (2b). It's deterministic, debuggable, audit-able. Domi's nephew-edition deserves zero label errors.
3. **Spot-check validator before write.** Read 3 known-truth stickers per country (escudo, team_photo, top star like Messi/Mbappé) and visually verify cell content matches expected sticker_id BEFORE batch-writing. Halt on any mismatch.
4. **Grid bottom-trim.** RIO observed ~20-30% blank space at top of each cropped cell. The actual sticker art is in the lower ~70%. Add a tight crop pass: `sharp().extract({ top: cellHeight * 0.05, height: cellHeight * 0.92 })` or auto-detect color boundary.
5. **Preserve manual crops.** Continue the existing "never overwrite existing manifest entries unless `--force`" pattern. The 50 originals are higher quality than any auto-extract.

**Acceptance criteria.**

- Spot-check 10 known-truth stickers (Messi, Ronaldo, Mbappé, Vinicius, Haaland, Salah, De Bruyne, Modrić, Pulisic, Domi-pick) — all visually correct.
- Tight crop (no top blank band).
- ≥600 stickers extracted (full 48 country PDFs + FWC specials + DORADAS + HOLOGRAMAS).
- CI green + new spec `e2e/regression/extraction-spot-check.spec.ts` that loads `/album` and verifies image content via DOM `naturalWidth/naturalHeight` non-zero for 10 known IDs.

**Estimated effort.** 2-3 hrs. Higher confidence than Phase 1 because problems are now diagnosed.

---

## Pending non-design items

- **Inventory sync IndexedDB → Firestore** (#48). Phase B of Wishlist will trigger this.
- **Status custom `🟡 En clases` / `🔴 Sin figus`** (#49). 30-min add to /perfil + presence ref.
- **FCM push notifications** (#50). Last Firebase phase. Optional — feed-only is shipping fine.
- **Cleanup duplicate Firebase project `albumix-e63f6`**. 30 sec in console.
- **Firebase Auth manual gates**: (1) Get started, (2) Enable Google provider + support email, (3) Add `app-mundial-2026-lemon.vercel.app` to authorized domains.

---

## Decisions log

- **2026-05-31** — Auth strategy locked: **email whitelist + Next.js middleware + HMAC cookie** (Pattern A from CEO eval). Zero Firebase dependency. Domi + ~10 school friends only. RIO #3 implementing as of 22:53 CLT. See task #67.
- **2026-05-31** — Sticker extraction Phase 1 reverted same session. Visual proof captured. Phase 2 spec above. See task #68.

---

_Last updated: 2026-05-31. Maintained by Claude (CEO mode)._

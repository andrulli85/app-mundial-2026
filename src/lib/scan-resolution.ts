/**
 * scan-resolution.ts
 *
 * Maps Gemini slot detections → canonical sticker IDs from the catalog.
 *
 * Slot → sticker logic:
 *   Most team pages follow this layout:
 *     slot 1  = team_logo  (the badge/crest)
 *     slot 13 = team_photo (group photo — only present on 4×4 grids)
 *     other slots = player stickers, ordered by `number` within team section
 *
 *   Lookup strategy: match by (team_code, slot) using sticker.number === slot
 *   for player stickers, and sticker.type for logo/photo overrides.
 *
 * Returns two buckets:
 *   confirmed  — filled=true AND confidence >= threshold
 *   uncertain  — filled=true AND confidence < threshold (user reviews)
 */

import type { Sticker } from "./catalog";

export interface SlotDetection {
  slot: number;
  filled: boolean;
  confidence: number;
}

export interface ScanResolutionResult {
  /** Sticker IDs that are definitely filled — ready for bulk import */
  confirmed: string[];
  /** Sticker IDs that Gemini thought were filled but with low confidence */
  uncertain: string[];
  /** Slots where we detected filled=true but couldn't find a matching sticker */
  unmapped: number[];
}

/**
 * Resolves slot detections to sticker IDs.
 *
 * @param team_code         The team code from Gemini or user hint (e.g. "ARG")
 * @param detections        Raw detection array from /api/scan-page
 * @param catalog           Full sticker catalog (from getCatalog())
 * @param confidenceThreshold  Min confidence to land in "confirmed"; below → "uncertain"
 */
export function slotsToStickerIds(
  team_code: string,
  detections: SlotDetection[],
  catalog: Sticker[],
  confidenceThreshold = 0.7,
): ScanResolutionResult {
  const confirmed: string[] = [];
  const uncertain: string[] = [];
  const unmapped: number[] = [];

  // Filter to stickers belonging to this team
  const teamStickers = catalog.filter(
    (s) => s.team_code === team_code
  );

  if (teamStickers.length === 0) {
    // Unknown team — return everything as unmapped
    const filledSlots = detections
      .filter((d) => d.filled)
      .map((d) => d.slot);
    return { confirmed: [], uncertain: [], unmapped: filledSlots };
  }

  // Build slot→sticker lookup
  // Slot 1 → type="team_logo" (if exists)
  // Slot 13 → type="team_photo" (if exists, 4×4 grid)
  // Other slots → sticker.number === slot

  const slotMap = new Map<number, Sticker>();

  for (const s of teamStickers) {
    if (s.type === "team_logo") {
      slotMap.set(1, s);
    } else if (s.type === "team_photo") {
      // team_photo occupies slot 13 on standard pages
      slotMap.set(13, s);
    } else if (s.number !== null) {
      // Player sticker — map directly by number
      slotMap.set(s.number, s);
    }
  }

  // Process each filled detection
  for (const detection of detections) {
    if (!detection.filled) continue;

    const sticker = slotMap.get(detection.slot);

    if (!sticker) {
      unmapped.push(detection.slot);
      continue;
    }

    if (detection.confidence >= confidenceThreshold) {
      confirmed.push(sticker.id);
    } else {
      uncertain.push(sticker.id);
    }
  }

  return { confirmed, uncertain, unmapped };
}

/**
 * Convenience: builds StickerEntry objects ready for bulkSetStickers.
 * Uses count=1 for all — does NOT overwrite count > 1 (existing dupes preserved).
 */
export function resolutionToStickerEntries(
  ids: string[],
  existingCounts: Record<string, number>,
): Array<{ sticker_id: string; count: number; acquired_at: number }> {
  const now = Date.now();
  return ids.map((id) => ({
    sticker_id: id,
    count: Math.max(existingCounts[id] ?? 0, 1), // never downgrade existing count
    acquired_at: now,
  }));
}

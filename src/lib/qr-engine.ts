/**
 * QR engine — placeholder interface for Stream C.
 *
 * Stream C fills in encodeTradePayload + decodeTradePayload.
 * The rest of the app imports from this module only — never from qrcode or @zxing directly.
 *
 * Payload encoding: JSON → gzip (pako) → base64 → QR alphanumeric mode
 * Expected QR string length: ~600-800 chars (fits standard QR capacity)
 *
 * Per Decision #9:
 *   v1   req flow: A renders QR_A1 with type="req" proposal
 *   v1   acc flow: B scans + taps Accept → renders QR_B2 with type="acc" + updated state
 *   A scans QR_B2 → both sides updated. Done.
 */

export interface TradePayload {
  v: 1;
  type: "req" | "acc";
  uid: string;     // nickname (e.g. "lautaro12") — pseudonymous, no UUID yet
  ts: number;      // unix ms
  have: string;    // base64-encoded 980-bit bitset of owned stickers
  repes: string;   // base64-encoded 2-bit-per-sticker duplicate counts (245 bytes)
  give: string[];  // sticker_ids offered
  want: string[];  // sticker_ids requested
}

/**
 * Encode a TradePayload → base64 string suitable for QR rendering.
 * Implementation: JSON.stringify → pako.gzip → base64.
 * Stream C implements this.
 */
export function encodeTradePayload(payload: TradePayload): string {
  // Stream C fills this in
  // Placeholder: raw JSON base64 (no gzip, larger QR — replace in Stream C)
  if (typeof window === "undefined") return "";
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

/**
 * Decode a base64 string (from scanned QR) → TradePayload.
 * Returns null if the string is not a valid mundial-2026 QR payload.
 * Stream C implements this.
 */
export function decodeTradePayload(encoded: string): TradePayload | null {
  // Stream C fills this in
  // Placeholder: reverse of placeholder encoder above
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const obj = JSON.parse(json);
    if (obj.v !== 1) return null;
    return obj as TradePayload;
  } catch {
    return null;
  }
}

/**
 * Validate nickname format: lowercase alphanumeric, 3-16 chars.
 * Used on onboarding screen and QR payload generation.
 */
export function isValidNickname(s: string): boolean {
  return /^[a-z0-9]{3,16}$/.test(s);
}

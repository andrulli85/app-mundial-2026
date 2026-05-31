/**
 * QR engine — real implementation ported from Stream C POC.
 *
 * Spec source: docs/plans/2026-05-30-app-mundial-2026.md Decision #9 (locked 2026-05-31).
 * POC source:  tools/scripts/qr-engine-poc/index.mjs (commit 6cb4eb76)
 *
 * Pipeline:
 *   encode: TradePayload → JSON.stringify → pako.gzip → base45.encode → QR string
 *   decode: QR string → base45.decode → pako.ungzip → JSON.parse → TradePayload
 *
 * QR string is composed only of QR alphanumeric set characters, triggering
 * alphanumeric mode (~16% denser than byte mode).
 *
 * Per Decision #9:
 *   v1   req flow: A renders QR_A1 with type="req" proposal
 *   v1   acc flow: B scans + taps Accept → renders QR_B2 with type="acc" + updated state
 *   A scans QR_B2 → both sides updated. Done.
 */

import pako from "pako";
import base45 from "base45";

// Total stickers in the Panini 2026 World Cup album. Drives bitset + repes field sizes.
export const STICKER_COUNT = 980;

// ---------- Discriminated union type ----------

export type TradePayloadReq = {
  v: 1;
  type: "req";
  uid: string;   // nickname (e.g. "lautaro12") — pseudonymous, no UUID yet
  ts: number;    // unix ms
  have: string;  // base64-encoded 980-bit bitset of owned stickers
  repes: string; // base64-encoded 2-bit-per-sticker duplicate counts (245 bytes)
  give: string[]; // sticker_ids offered
  want: string[]; // sticker_ids requested
};

export type TradePayloadAcc = {
  v: 1;
  type: "acc";
  uid: string;
  ts: number;
  have: string;
  repes: string;
  give: string[];
  want: string[];
};

export type TradePayload = TradePayloadReq | TradePayloadAcc;

// Branded sticker ID for type safety (optional consumer use)
export type StickerId = string & { __brand: "StickerId" };

// ---------- Internal helpers ----------

/**
 * Pack a boolean array into a Uint8Array. Index i lands in byte (i >> 3), bit (i & 7), LSB-first.
 * Output length = ceil(bools.length / 8).
 */
function packBitset(bools: boolean[]): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(bools.length / 8));
  for (let i = 0; i < bools.length; i++) {
    if (bools[i]) bytes[i >> 3] |= 1 << (i & 7);
  }
  return bytes;
}

/**
 * Inverse of packBitset. Reads `length` bits out of `bytes`.
 */
function unpackBitset(bytes: Uint8Array, length: number): boolean[] {
  const bools = new Array<boolean>(length).fill(false);
  for (let i = 0; i < length; i++) {
    bools[i] = !!(bytes[i >> 3] & (1 << (i & 7)));
  }
  return bools;
}

/**
 * Pack a duplicate-count array (values clamped to 0..3) into a 2-bit-per-element Uint8Array.
 * Output length = ceil(counts.length * 2 / 8).
 */
function packRepes(counts: number[]): Uint8Array {
  const bytes = new Uint8Array(Math.ceil((counts.length * 2) / 8));
  for (let i = 0; i < counts.length; i++) {
    const c = Math.min(3, Math.max(0, counts[i] | 0));
    const bytePos = (i * 2) >> 3;
    const bitPos = (i * 2) & 7;
    bytes[bytePos] |= c << bitPos;
  }
  return bytes;
}

/**
 * Inverse of packRepes. Reads `length` 2-bit counts out of `bytes`.
 */
function unpackRepes(bytes: Uint8Array, length: number): number[] {
  const counts = new Array<number>(length).fill(0);
  for (let i = 0; i < length; i++) {
    const bytePos = (i * 2) >> 3;
    const bitPos = (i * 2) & 7;
    counts[i] = (bytes[bytePos] >> bitPos) & 0b11;
  }
  return counts;
}

/** Standard base64 of a Uint8Array — browser + Node compatible */
function bytesToB64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b64ToBytes(s: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(s, "base64"));
  }
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------- Payload validation ----------

function validateTradePayload(p: unknown): TradePayload {
  if (!p || typeof p !== "object") throw new TypeError("payload must be object");
  const obj = p as Record<string, unknown>;
  if (obj.v !== 1) throw new TypeError(`payload.v must be 1, got ${obj.v}`);
  if (obj.type !== "req" && obj.type !== "acc") {
    throw new TypeError(`payload.type must be 'req'|'acc', got ${String(obj.type)}`);
  }
  if (typeof obj.uid !== "string" || !obj.uid.length) {
    throw new TypeError("payload.uid must be non-empty string");
  }
  if (typeof obj.ts !== "number" || !Number.isFinite(obj.ts)) {
    throw new TypeError("payload.ts must be finite number");
  }
  if (typeof obj.have !== "string") throw new TypeError("payload.have must be base64 string");
  if (typeof obj.repes !== "string") throw new TypeError("payload.repes must be base64 string");
  if (!Array.isArray(obj.give)) throw new TypeError("payload.give must be array");
  if (!Array.isArray(obj.want)) throw new TypeError("payload.want must be array");
  for (const id of obj.give as unknown[]) {
    if (typeof id !== "string") throw new TypeError("payload.give entries must be strings");
  }
  for (const id of obj.want as unknown[]) {
    if (typeof id !== "string") throw new TypeError("payload.want entries must be strings");
  }
  return p as TradePayload;
}

// ---------- Public API ----------

/**
 * Encode a TradePayload into a QR-ready alphanumeric string.
 * Pipeline: JSON.stringify → pako.gzip → base45.encode.
 *
 * The returned string is composed only of characters in the QR alphanumeric set
 * (digits, A-Z uppercase, space, $, %, *, +, -, ., /, :), triggering QR
 * alphanumeric mode (~16% denser than byte mode).
 */
export function encodeTradePayload(payload: TradePayload): string {
  validateTradePayload(payload);
  const json = JSON.stringify(payload);
  const gzipped = pako.gzip(json); // Uint8Array
  const b45 = base45.encode(gzipped); // string in QR alphanumeric set
  return b45;
}

/**
 * Decode a base45 QR string → TradePayload.
 * Returns null if the string is not a valid mundial-2026 QR payload.
 */
export function decodeTradePayload(qrString: string): TradePayload | null {
  if (typeof qrString !== "string") return null;
  try {
    const gzipped = base45.decode(qrString) as Uint8Array;
    const json = pako.ungzip(gzipped, { to: "string" });
    const payload = JSON.parse(json);
    return validateTradePayload(payload);
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

// ---------- Mock helpers (for testing) ----------

/** Deterministic PRNG (mulberry32) so tests are reproducible across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEAM_CODES = [
  "arg", "bra", "fra", "esp", "eng", "ger", "por", "ita", "ned", "bel",
  "uru", "mex", "usa", "kor", "jpn", "mar", "sen", "civ", "cmr", "rsa",
  "aus", "nzl", "can", "cri", "ecu", "col", "par", "per", "chi", "sui",
];

function pickStickerId(rng: () => number): string {
  const team = TEAM_CODES[Math.floor(rng() * TEAM_CODES.length)];
  const n = 1 + Math.floor(rng() * 20);
  const withSurname = rng() < 0.3;
  if (!withSurname) return `${team}-${n}`;
  const surnames = ["gimenez", "rodriguez", "silva", "martinez", "kane", "mbappe", "kim", "son"];
  const s = surnames[Math.floor(rng() * surnames.length)];
  return `${team}-${n}-${s}`;
}

/**
 * Generate a deterministic mock TradePayload for benchmarking/testing.
 */
export function generateMockPayload(opts: {
  type?: "req" | "acc";
  owned_count?: number;
  give_count?: number;
  want_count?: number;
  dup_count?: number;
  uid?: string;
  ts?: number;
  seed?: number;
} = {}): TradePayload {
  const {
    type = "req",
    owned_count = 250,
    give_count = 3,
    want_count = 3,
    dup_count = 50,
    uid = "lautaro12",
    ts = 1722451200000,
    seed = 42,
  } = opts;

  const rng = mulberry32(seed);

  // Bitset: pick owned_count distinct indices in [0, STICKER_COUNT).
  const bools = new Array<boolean>(STICKER_COUNT).fill(false);
  const ownedSet = new Set<number>();
  while (ownedSet.size < Math.min(owned_count, STICKER_COUNT)) {
    ownedSet.add(Math.floor(rng() * STICKER_COUNT));
  }
  for (const idx of ownedSet) bools[idx] = true;

  // Repes: assign 1-3 duplicate count to dup_count random owned stickers.
  const counts = new Array<number>(STICKER_COUNT).fill(0);
  const ownedArr = [...ownedSet];
  const dupTarget = Math.min(dup_count, ownedArr.length);
  for (let i = 0; i < dupTarget; i++) {
    const idx = ownedArr[Math.floor(rng() * ownedArr.length)];
    counts[idx] = 1 + Math.floor(rng() * 3);
  }

  // give / want: random sticker_ids.
  const give: string[] = [];
  const want: string[] = [];
  for (let i = 0; i < give_count; i++) give.push(pickStickerId(rng));
  for (let i = 0; i < want_count; i++) want.push(pickStickerId(rng));

  return {
    v: 1,
    type,
    uid,
    ts,
    have: bytesToB64(packBitset(bools)),
    repes: bytesToB64(packRepes(counts)),
    give,
    want,
  };
}

// Internal helpers exposed for testing
export const __internal = {
  packBitset,
  unpackBitset,
  packRepes,
  unpackRepes,
  bytesToB64,
  b64ToBytes,
};

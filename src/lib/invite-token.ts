/**
 * invite-token.ts — HMAC-signed tokens for Slack invite action buttons.
 *
 * Token format: "<email_normalized>.<timestamp_ms>.<hex_hmac>"
 *
 * The timestamp lets us expire old tokens (not enforced in v1 — deferred).
 * The HMAC prevents button value tampering (email swapping).
 *
 * Uses Web Crypto (SubtleCrypto) — Node.js compatible since Node 18.
 */

// ── Internal helpers ──────────────────────────────────────────────────────────

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Creates a signed invite token embedding the email and current timestamp.
 * Returns "<email>.<timestamp>.<hex_hmac>".
 */
export async function createInviteToken(
  email: string,
  secret: string
): Promise<string> {
  const ts = Date.now().toString();
  const payload = `${email}.${ts}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${bufToHex(sig)}`;
}

export interface InviteTokenPayload {
  email: string;
  timestamp: number;
}

/**
 * Verifies a signed invite token.
 * Returns { email, timestamp } if valid, null if tampered or malformed.
 */
export async function verifyInviteToken(
  token: string,
  secret: string
): Promise<InviteTokenPayload | null> {
  // Format: email.timestamp.hex_hmac
  // email itself may contain dots, so split from the right
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const providedHex = token.slice(lastDot + 1);
  const payload = token.slice(0, lastDot);

  // payload = email.timestamp — find the timestamp (last segment)
  const secondLastDot = payload.lastIndexOf(".");
  if (secondLastDot === -1) return null;
  const email = payload.slice(0, secondLastDot);
  const tsStr = payload.slice(secondLastDot + 1);
  const timestamp = parseInt(tsStr, 10);
  if (!email || isNaN(timestamp)) return null;

  // Re-compute HMAC over "email.timestamp"
  const key = await importKey(secret);
  const enc = new TextEncoder();
  const expectedBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expectedHex = bufToHex(expectedBuf);

  // Constant-time comparison via Web Crypto verify
  let hexBuf: ArrayBuffer;
  try {
    const bytes = new Uint8Array(
      providedHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []
    );
    hexBuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } catch {
    return null;
  }

  if ((hexBuf as ArrayBuffer).byteLength !== expectedBuf.byteLength) return null;

  const valid = await crypto.subtle.verify("HMAC", key, hexBuf, enc.encode(payload));
  if (!valid) return null;

  // Extra guard against length-extension artifacts
  if (providedHex.length !== expectedHex.length) return null;

  return { email, timestamp };
}

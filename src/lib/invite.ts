/**
 * Albumix invite whitelist helpers.
 *
 * Uses Web Crypto (SubtleCrypto) — Edge runtime compatible.
 * Cookie format: <email_lowercase>.<hex_hmac_sha256>
 *
 * Gmail alias normalization: strip the +tag before matching so that
 * andres.reyes.nunez+test@gmail.com matches andres.reyes.nunez@gmail.com.
 * This lets Andy test with his own aliases without adding them to the list.
 */

const COOKIE_NAME = "albumix_invited";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

// ── Email normalization ───────────────────────────────────────────────────────

/**
 * Normalizes an email for whitelist comparison.
 * - Lowercase + trim
 * - Strip Gmail +tag: user+tag@gmail.com → user@gmail.com
 */
export function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const atIdx = trimmed.indexOf("@");
  if (atIdx === -1) return trimmed;

  let local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);

  // Strip Gmail +tag (applies to gmail.com and googlemail.com)
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plusIdx = local.indexOf("+");
    if (plusIdx !== -1) {
      local = local.slice(0, plusIdx);
    }
  }

  return `${local}@${domain}`;
}

// ── HMAC helpers ──────────────────────────────────────────────────────────────

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

/**
 * Signs an email and returns the cookie value string:
 * "<email_lowercase>.<hex_hmac>"
 */
export async function signCookieValue(
  email: string,
  secret: string
): Promise<string> {
  const normalized = normalizeEmail(email);
  const key = await importKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(normalized));
  return `${normalized}.${bufToHex(sig)}`;
}

/**
 * Verifies a cookie value string against a secret.
 * Returns the email if valid, null if tampered or malformed.
 */
export async function verifyCookieValue(
  value: string,
  secret: string
): Promise<string | null> {
  const dotIdx = value.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const email = value.slice(0, dotIdx);
  const providedHex = value.slice(dotIdx + 1);

  // Re-compute expected HMAC
  const key = await importKey(secret);
  const enc = new TextEncoder();
  const expectedBuf = await crypto.subtle.sign("HMAC", key, enc.encode(email));
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

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    hexBuf,
    enc.encode(email)
  );

  if (!valid) return null;

  // Double-check hex lengths match (guards against length extension)
  if (providedHex.length !== expectedHex.length) return null;

  return email;
}

// ── Whitelist check ───────────────────────────────────────────────────────────

/**
 * Returns whether an email is in the comma-separated WHITELIST_EMAILS env var.
 * Fail-closed: if the env var is empty/unset, always returns false.
 */
export function isWhitelisted(email: string): boolean {
  const raw = process.env.WHITELIST_EMAILS ?? "";
  if (!raw.trim()) return false; // fail closed

  const normalized = normalizeEmail(email);
  const list = raw
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);

  return list.includes(normalized);
}

// ── Cookie attributes ─────────────────────────────────────────────────────────

export { COOKIE_NAME, MAX_AGE_SECONDS };

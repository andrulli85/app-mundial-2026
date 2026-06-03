/**
 * whitelist.ts — Vercel KV-backed email whitelist for Albumix.
 *
 * Stores approved emails as a Redis set at key "albumix:whitelist:emails".
 * All comparisons are done on the normalized form (lowercase, Gmail +tag stripped).
 *
 * Env vars required:
 *   KV_REST_API_URL   — provided by Vercel KV (auto-injected when KV is attached)
 *   KV_REST_API_TOKEN — provided by Vercel KV (auto-injected when KV is attached)
 *
 * When KV env vars are absent the module fails closed — isWhitelisted returns false.
 * This matches the ALBUMIX_INVITE_SECRET gate-disabled behavior elsewhere.
 */

import { kv } from "@vercel/kv";
import { normalizeEmail } from "./invite";

const KEY = "albumix:whitelist:emails";

function kvAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Returns whether an email is in the KV whitelist.
 * Falls back to the WHITELIST_EMAILS env var if KV is not yet configured,
 * so the app continues to work during migration.
 * Fail-closed: if neither source has the email, returns false.
 */
export async function isWhitelisted(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  // KV path (production)
  if (kvAvailable()) {
    try {
      const score = await kv.zscore(KEY, normalized);
      return score !== null;
    } catch (err) {
      console.error("[whitelist] KV error — falling back to env var", err);
    }
  }

  // Fallback: comma-separated WHITELIST_EMAILS env var (local dev / migration)
  const raw = process.env.WHITELIST_EMAILS ?? "";
  if (!raw.trim()) return false;
  const list = raw
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  return list.includes(normalized);
}

/**
 * Adds an email to the KV whitelist.
 * Uses a sorted set with timestamp score for ordered listing.
 * No-op if the email is already present.
 */
export async function addToWhitelist(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await kv.zadd(KEY, { score: Date.now(), member: normalized });
}

/**
 * Removes an email from the KV whitelist.
 */
export async function removeFromWhitelist(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await kv.zrem(KEY, normalized);
}

/**
 * Returns all whitelisted emails, ordered by insertion time (ascending).
 */
export async function listWhitelist(): Promise<string[]> {
  return kv.zrange(KEY, 0, -1);
}

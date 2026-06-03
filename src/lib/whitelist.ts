/**
 * whitelist.ts — Vercel KV-backed email whitelist for Albumix.
 *
 * Stores approved emails as a Redis set at key "albumix:whitelist:emails".
 * All comparisons are done on the normalized form (lowercase, Gmail +tag stripped).
 *
 * Env vars required:
 *   kv_KV_REST_API_URL   — Vercel Upstash integration output (doubled prefix)
 *   kv_KV_REST_API_TOKEN — Vercel Upstash integration output (doubled prefix)
 *
 * When KV env vars are absent the module fails open to the WHITELIST_EMAILS
 * env-var fallback. If neither source has the email, isWhitelisted returns false.
 */

import { createClient } from "@vercel/kv";
import { normalizeEmail } from "./invite";

const KV_URL = process.env.kv_KV_REST_API_URL;
const KV_TOKEN = process.env.kv_KV_REST_API_TOKEN;

const kv =
  KV_URL && KV_TOKEN ? createClient({ url: KV_URL, token: KV_TOKEN }) : null;

const KEY = "albumix:whitelist:emails";

/**
 * Returns whether an email is in the KV whitelist.
 * Falls back to the WHITELIST_EMAILS env var if KV is not yet configured,
 * so the app continues to work during migration.
 * Fail-closed: if neither source has the email, returns false.
 */
export async function isWhitelisted(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  // KV path (production)
  if (kv) {
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
 * Throws if KV is not configured.
 */
export async function addToWhitelist(email: string): Promise<void> {
  if (!kv) throw new Error("[whitelist] KV not configured");
  const normalized = normalizeEmail(email);
  await kv.zadd(KEY, { score: Date.now(), member: normalized });
}

/**
 * Removes an email from the KV whitelist.
 * Throws if KV is not configured.
 */
export async function removeFromWhitelist(email: string): Promise<void> {
  if (!kv) throw new Error("[whitelist] KV not configured");
  const normalized = normalizeEmail(email);
  await kv.zrem(KEY, normalized);
}

/**
 * Returns all whitelisted emails, ordered by insertion time (ascending).
 * Returns empty array if KV is not configured.
 */
export async function listWhitelist(): Promise<string[]> {
  if (!kv) return [];
  return kv.zrange(KEY, 0, -1);
}

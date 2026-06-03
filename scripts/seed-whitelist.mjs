#!/usr/bin/env node
/**
 * scripts/seed-whitelist.mjs
 *
 * One-time migration: reads WHITELIST_EMAILS env var and seeds Vercel KV.
 * Run this ONCE after attaching KV to the side-project.
 *
 * Prerequisites:
 *   1. KV_REST_API_URL and KV_REST_API_TOKEN in env (copy from Vercel dashboard
 *      or use `vercel env pull .env.local` to sync them locally).
 *   2. WHITELIST_EMAILS in env (the existing comma-separated list).
 *
 * Usage:
 *   node scripts/seed-whitelist.mjs [--dry-run]
 *
 *   --dry-run   Print emails that would be added without writing to KV.
 *
 * The script is idempotent: running it again only updates the score
 * (timestamp) of already-present emails — they stay whitelisted.
 */

import { createClient } from "@vercel/kv";

// ── Validate args ──────────────────────────────────────────────────────────────

const KNOWN_FLAGS = new Set(["--dry-run"]);
const unknownFlags = process.argv.slice(2).filter((a) => a.startsWith("--") && !KNOWN_FLAGS.has(a));
if (unknownFlags.length > 0) {
  console.error(`Unknown flags: ${unknownFlags.join(", ")}`);
  process.exit(2);
}

const DRY_RUN = process.argv.includes("--dry-run");

// ── Config ────────────────────────────────────────────────────────────────────

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const WHITELIST_RAW = process.env.WHITELIST_EMAILS ?? "";

if (!KV_URL || !KV_TOKEN) {
  console.error("KV_REST_API_URL and KV_REST_API_TOKEN must be set.");
  console.error("Run: vercel env pull .env.local  (from the project dir with Vercel CLI linked)");
  process.exit(1);
}

// ── Email normalization (mirrors src/lib/invite.ts) ───────────────────────────

function normalizeEmail(raw) {
  const trimmed = raw.trim().toLowerCase();
  const atIdx = trimmed.indexOf("@");
  if (atIdx === -1) return trimmed;
  let local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plusIdx = local.indexOf("+");
    if (plusIdx !== -1) local = local.slice(0, plusIdx);
  }
  return `${local}@${domain}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const emails = WHITELIST_RAW
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);

  if (emails.length === 0) {
    console.log("WHITELIST_EMAILS is empty — nothing to seed.");
    return;
  }

  console.log(`Found ${emails.length} email(s) to seed:`);
  emails.forEach((e) => console.log(`  + ${e}`));

  if (DRY_RUN) {
    console.log("\n[dry-run] No writes performed.");
    return;
  }

  const kv = createClient({ url: KV_URL, token: KV_TOKEN });
  const KEY = "albumix:whitelist:emails";
  const now = Date.now();

  // zadd with NX so existing entries keep their original timestamp (score)
  for (const email of emails) {
    await kv.zadd(KEY, { nx: true, score: now, member: email });
    console.log(`  seeded: ${email}`);
  }

  console.log(`\nDone. ${emails.length} email(s) added to KV key "${KEY}".`);
  console.log("The WHITELIST_EMAILS env var can now be cleared from Vercel (KV is the source of truth).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

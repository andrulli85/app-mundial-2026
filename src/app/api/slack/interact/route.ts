/**
 * POST /api/slack/interact
 *
 * Handles Slack interactive component callbacks (button clicks on invite messages).
 *
 * Security:
 *   1. Verifies Slack request signature (HMAC SHA256 over body with SLACK_SIGNING_SECRET).
 *   2. Verifies the action value token (HMAC over email+timestamp with INVITE_SIGNING_SECRET).
 *
 * Actions handled:
 *   approve_invite → addToWhitelist(email) + update Slack message to "Aprobado"
 *   reject_invite  → update Slack message to "Rechazado" (no DB change)
 *
 * Returns 200 quickly (Slack times out at 3s).
 * Returns 401 if Slack signature is invalid.
 * Returns 503 if required env vars are absent.
 *
 * Reference: https://api.slack.com/authentication/verifying-requests-from-slack
 */

import { NextRequest, NextResponse } from "next/server";
import { addToWhitelist } from "@/lib/whitelist";
import { verifyInviteToken } from "@/lib/invite-token";

export const runtime = "nodejs";

// ── Slack signature verification ──────────────────────────────────────────────

async function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): Promise<boolean> {
  // Replay attack guard: reject requests older than 5 minutes
  const tsNum = parseInt(timestamp, 10);
  if (isNaN(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseString));
  const computed = "v0=" + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// ── Slack chat.update helper ──────────────────────────────────────────────────

async function updateSlackMessage(
  channelId: string,
  ts: string,
  text: string,
  token: string
): Promise<void> {
  await fetch("https://slack.com/api/chat.update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: channelId,
      ts,
      text,
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text },
        },
      ],
    }),
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
  const slackBotToken = process.env.SLACK_BOT_TOKEN;
  const inviteSigningSecret = process.env.INVITE_SIGNING_SECRET;

  if (!slackSigningSecret || !slackBotToken || !inviteSigningSecret) {
    console.error("[api/slack/interact] Missing env vars: SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN, INVITE_SIGNING_SECRET");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // Read raw body for signature verification — must read before any parsing
  const rawBody = await req.text();

  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const slackSig = req.headers.get("x-slack-signature") ?? "";

  const valid = await verifySlackSignature(rawBody, timestamp, slackSig, slackSigningSecret);
  if (!valid) {
    console.warn("[api/slack/interact] Signature verification failed");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // Slack sends form-encoded: payload=<url-encoded JSON>
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get("payload");
  if (!payloadStr) {
    return NextResponse.json({ error: "missing_payload" }, { status: 400 });
  }

  let payload: {
    type: string;
    actions?: Array<{ action_id: string; value: string }>;
    channel?: { id: string };
    message?: { ts: string };
  };
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return NextResponse.json({ error: "invalid_payload_json" }, { status: 400 });
  }

  if (payload.type !== "block_actions") {
    // Not an action we handle — respond 200 to avoid Slack retries
    return NextResponse.json({ ok: true });
  }

  const action = payload.actions?.[0];
  if (!action) {
    return NextResponse.json({ ok: true });
  }

  const { action_id, value: actionToken } = action;
  const channelId = payload.channel?.id ?? "";
  const messageTs = payload.message?.ts ?? "";

  // Verify the HMAC token embedded in the button value
  const tokenPayload = await verifyInviteToken(actionToken, inviteSigningSecret);
  if (!tokenPayload) {
    console.warn("[api/slack/interact] Invalid or tampered action token");
    // Update message to surface the problem without leaking details
    await updateSlackMessage(channelId, messageTs, "Error: token de accion invalido o vencido.", slackBotToken);
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const { email } = tokenPayload;

  if (action_id === "approve_invite") {
    await addToWhitelist(email);
    console.log(`[api/slack/interact] Approved: ${email}`);
    await updateSlackMessage(
      channelId,
      messageTs,
      `*Aprobado* — \`${email}\` fue agregado a la whitelist. La proxima vez que entre con Google, tendra acceso.`,
      slackBotToken
    );
  } else if (action_id === "reject_invite") {
    console.log(`[api/slack/interact] Rejected: ${email}`);
    await updateSlackMessage(
      channelId,
      messageTs,
      `*Rechazado* — \`${email}\` no fue agregado a la whitelist.`,
      slackBotToken
    );
  } else {
    // Unknown action — acknowledge without error
    console.log(`[api/slack/interact] Unknown action_id: ${action_id}`);
  }

  // Slack requires a 200 response within 3 seconds
  return NextResponse.json({ ok: true });
}

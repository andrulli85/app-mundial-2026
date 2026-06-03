/**
 * POST /api/invite
 *
 * Public endpoint. Accepts { email, name? } and posts a Slack message to
 * channel C7367VDFF with Approve / Reject buttons. Andy taps once to approve;
 * the Slack callback (/api/slack/interact) adds the email to the KV whitelist.
 *
 * 200 { ok: true }                → request sent to Slack
 * 200 { status: "already_approved" } → email already in whitelist
 * 400 { error }                   → missing/malformed email
 * 503 { error: "not_configured" } → required env vars absent
 */

import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/invite";
import { isWhitelisted } from "@/lib/whitelist";
import { createInviteToken } from "@/lib/invite-token";

export const runtime = "nodejs";

const SLACK_CHANNEL = "C7367VDFF";

// ── Config guard ──────────────────────────────────────────────────────────────

function configOk(): boolean {
  return !!(
    process.env.SLACK_BOT_TOKEN &&
    process.env.INVITE_SIGNING_SECRET
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configOk()) {
    console.error("[api/invite] Required env vars missing: SLACK_BOT_TOKEN, INVITE_SIGNING_SECRET");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // Parse body
  let email: string;
  let name: string | null;
  try {
    const body = await req.json() as { email?: unknown; name?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  // Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const normalized = normalizeEmail(email);

  // Check if already approved
  const already = await isWhitelisted(normalized);
  if (already) {
    return NextResponse.json({ ok: true, status: "already_approved" });
  }

  // Build signed token (email + timestamp HMAC) to embed in the Slack action value
  const token = await createInviteToken(normalized, process.env.INVITE_SIGNING_SECRET!);

  // Build Slack Block Kit message
  const slackBody = {
    channel: SLACK_CHANNEL,
    text: `Nuevo pedido de acceso a Albumix: ${normalized}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Pedido de acceso — Albumix",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Email:*\n${normalized}`,
          },
          {
            type: "mrkdwn",
            text: `*Nombre:*\n${name ?? "—"}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Aprobar", emoji: true },
            style: "primary",
            action_id: "approve_invite",
            value: token,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Rechazar", emoji: true },
            style: "danger",
            action_id: "reject_invite",
            value: token,
          },
        ],
      },
    ],
  };

  // Post to Slack
  const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify(slackBody),
  });

  const slackData = await slackRes.json() as { ok: boolean; error?: string };

  if (!slackData.ok) {
    console.error("[api/invite] Slack postMessage failed:", slackData.error);
    // Return a user-friendly error but don't expose Slack internals
    return NextResponse.json(
      { error: "No se pudo enviar la solicitud. Intentá más tarde." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

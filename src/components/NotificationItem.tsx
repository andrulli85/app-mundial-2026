"use client";

/**
 * NotificationItem — single row in the notifications list.
 *
 * Renders: emoji + title + body + relative timestamp + unread dot.
 * Tapping marks the item as read and navigates to link (if any).
 */

import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/notifications";
import * as notificationsLib from "@/lib/notifications";

interface NotificationItemProps {
  notification: Notification;
}

/** Returns a human-friendly relative time string in Spanish. */
function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "ahora mismo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "ayer";
  return `hace ${diffDay} días`;
}

export default function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const { id, emoji, title, body, ts, read, link } = notification;

  function handleTap(): void {
    notificationsLib.markRead(id);
    if (link) {
      router.push(link);
    }
  }

  return (
    <div
      data-testid={`notification-item-${id}`}
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleTap();
      }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        cursor: "pointer",
        backgroundColor: read ? "transparent" : "rgba(244,200,74,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        transition: "background-color 0.15s ease",
        position: "relative",
      }}
    >
      {/* Emoji */}
      <span
        style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2 }}
        aria-hidden="true"
      >
        {emoji}
      </span>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: read ? 500 : 700,
            color: "#f0ece3",
            lineHeight: 1.3,
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: 12,
            color: "rgba(240,236,227,0.55)",
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {body}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "rgba(240,236,227,0.35)",
          }}
        >
          {relativeTime(ts)}
        </p>
      </div>

      {/* Unread dot */}
      {!read && (
        <span
          data-testid={`notification-unread-dot-${id}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#F4C84A",
            flexShrink: 0,
            marginTop: 6,
          }}
          aria-label="No leída"
        />
      )}
    </div>
  );
}

"use client";

/**
 * WishlistNotificationItem — notification card for wishlist events.
 *
 * Renders two action buttons:
 *   [Sí, proponer] → navigates to the trade link
 *   [Después]       → marks as read and slides out (dismisses)
 *
 * Used for:
 *   - friend_has_wishlist_item: a friend has ≥2 of a sticker you want
 *   - friend_wants_yours: a friend wishlisted a sticker you have ≥2 of
 */

import type { Notification } from "@/lib/notifications";

interface Props {
  notification: Notification;
  onPropose: () => void;
  onDismiss: () => void;
}

const GOLD = "#F4C84A";

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

export default function WishlistNotificationItem({ notification, onPropose, onDismiss }: Props) {
  const { id, emoji, title, body, ts, read } = notification;

  return (
    <div
      data-testid={`notification-item-${id}`}
      style={{
        padding: "14px 16px",
        backgroundColor: read ? "transparent" : "rgba(244,200,74,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        position: "relative",
      }}
    >
      {/* Main row: emoji + text + unread dot */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span
          style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        >
          {emoji}
        </span>

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
            }}
          >
            {body}
          </p>
          <p
            style={{
              margin: "4px 0 8px",
              fontSize: 11,
              color: "rgba(240,236,227,0.35)",
            }}
          >
            {relativeTime(ts)}
          </p>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-testid={`wishlist-notif-propose-${id}`}
              onClick={onPropose}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: "var(--foil-gold-soft)",
                color: "var(--fg-onlight)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sí, proponer
            </button>
            <button
              data-testid={`wishlist-notif-dismiss-${id}`}
              onClick={onDismiss}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                backgroundColor: "transparent",
                color: "rgba(240,236,227,0.55)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Después
            </button>
          </div>
        </div>

        {/* Unread dot */}
        {!read && (
          <span
            data-testid={`notification-unread-dot-${id}`}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: GOLD,
              flexShrink: 0,
              marginTop: 6,
            }}
            aria-label="No leída"
          />
        )}
      </div>
    </div>
  );
}

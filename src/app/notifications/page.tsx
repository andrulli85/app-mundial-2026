"use client";

/**
 * /notifications — notification feed page.
 *
 * Layout:
 *   - TopBar with back button + "Notificaciones" title
 *   - Sticky header row: "Notificaciones" h1 + "Marcar todas leídas" button
 *   - Scrollable list of NotificationItem (newest first)
 *   - Empty state when no notifications
 *   - "Limpiar todas" button at bottom (only when list non-empty)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as notificationsLib from "@/lib/notifications";
import type { Notification } from "@/lib/notifications";
import NotificationItem from "@/components/NotificationItem";
import WishlistNotificationItem from "@/components/WishlistNotificationItem";
import TopBar from "@/components/TopBar";

function isWishlistType(type: Notification["type"]): boolean {
  return type === "friend_has_wishlist_item" || type === "friend_wants_yours";
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initial load + subscribe to changes
  useEffect(() => {
    setItems(notificationsLib.getAll());
    setLoaded(true);

    const unsubscribe = notificationsLib.subscribe((all) => {
      setItems([...all]);
    });
    return unsubscribe;
  }, []);

  function handleMarkAllRead(): void {
    notificationsLib.markAllRead();
  }

  function handleClearAll(): void {
    notificationsLib.clear();
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-1)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TopBar with back chevron */}
      <TopBar variant="fixed" showBackButton title="Notificaciones" />

      {/* In-flow spacer: accounts for the fixed TopBar height above */}
      <div style={{ height: 54, flexShrink: 0 }} aria-hidden="true" />

      {/* Sticky subheader */}
      <div
        style={{
          position: "sticky",
          top: 54,
          zIndex: 30,
          backgroundColor: "var(--bg-1)",
          borderBottom: "1px solid var(--line)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 800,
            color: "var(--fg-1)",
            letterSpacing: ".01em",
            fontFamily: "var(--font-ui)",
          }}
        >
          Notificaciones
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--red-bright)",
              }}
            >
              {unreadCount} nuevas
            </span>
          )}
        </h1>

        {unreadCount > 0 && (
          <button
            data-testid="mark-all-read"
            onClick={handleMarkAllRead}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--gold)",
              padding: "4px 0",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
          >
            Marcar todas leídas
          </button>
        )}
      </div>

      {/* Content area */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        {!loaded ? (
          // Skeleton shimmer while localStorage loads
          <div style={{ padding: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 72,
                  borderRadius: 12,
                  backgroundColor: "var(--bg-2)",
                  marginBottom: 10,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          // Empty state
          <div
            data-testid="notifications-empty"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: "80px 24px",
              textAlign: "center",
            }}
          >
            {/* Bell icon in gold */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--r-pill)",
                background: "rgba(244,200,74,0.12)",
                border: "1px solid rgba(244,200,74,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: "var(--fg-1)",
              }}
            >
              Aún no tenes notificaciones
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--fg-3)",
              }}
            >
              Te avisaremos cuando desbloquees logros o recibas propuestas.
            </p>
          </div>
        ) : (
          // Notification list
          <div
            data-testid="notifications-list"
            style={{
              backgroundColor: "var(--bg-2)",
              margin: "12px 16px",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid var(--line)",
            }}
          >
            {items.map((n) =>
              isWishlistType(n.type) ? (
                <WishlistNotificationItem
                  key={n.id}
                  notification={n}
                  onPropose={() => {
                    notificationsLib.markRead(n.id);
                    if (n.link) router.push(n.link);
                  }}
                  onDismiss={() => notificationsLib.markRead(n.id)}
                />
              ) : (
                <NotificationItem key={n.id} notification={n} />
              )
            )}
          </div>
        )}

        {/* Clear all button — only when list non-empty */}
        {items.length > 0 && (
          <div
            style={{
              padding: "4px 16px 32px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              data-testid="clear-all"
              onClick={handleClearAll}
              style={{
                background: "none",
                border: "1px solid var(--line-strong)",
                borderRadius: 99,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--fg-3)",
                padding: "10px 24px",
              }}
            >
              Limpiar todas
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

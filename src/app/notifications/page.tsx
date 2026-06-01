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
import * as notificationsLib from "@/lib/notifications";
import type { Notification } from "@/lib/notifications";
import NotificationItem from "@/components/NotificationItem";
import TopBar from "@/components/TopBar";

const BG = "#0d0f13";
const SURFACE = "#131519";
const GOLD = "#F4C84A";
const RED = "#E4002B";

export default function NotificationsPage() {
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
        backgroundColor: BG,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TopBar with back chevron */}
      <TopBar variant="fixed" showBackButton title="Notificaciones" />

      {/* Push content below the fixed TopBar (54px height) */}
      <div style={{ height: 54, flexShrink: 0 }} />

      {/* Sticky subheader */}
      <div
        style={{
          position: "sticky",
          top: 54,
          zIndex: 30,
          backgroundColor: BG,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
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
            color: "#f0ece3",
            letterSpacing: ".01em",
          }}
        >
          Notificaciones
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                fontWeight: 700,
                color: RED,
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
              color: GOLD,
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
                  backgroundColor: SURFACE,
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
              gap: 12,
              padding: "80px 24px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 48 }} aria-hidden="true">
              📭
            </span>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(240,236,227,0.5)",
              }}
            >
              Aún no tenes notificaciones
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(240,236,227,0.3)",
              }}
            >
              Te avisaremos cuando desbloquees logros o recibas propuestas.
            </p>
          </div>
        ) : (
          // Notification list
          <div
            data-testid="notifications-list"
            style={{ backgroundColor: SURFACE, margin: "12px 16px", borderRadius: 16, overflow: "hidden" }}
          >
            {items.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
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
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 99,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(240,236,227,0.45)",
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

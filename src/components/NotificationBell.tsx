"use client";

/**
 * NotificationBell — bell icon with unread-count badge.
 *
 * Reads from the localStorage notifications queue via subscribe().
 * Navigates to /notifications on tap.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as notificationsLib from "@/lib/notifications";

interface NotificationBellProps {
  /** Override the icon color. Defaults to #ffffff. */
  color?: string;
  /** Icon size in px. Defaults to 24. */
  size?: number;
}

export default function NotificationBell({
  color = "#ffffff",
  size = 24,
}: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Read initial count + subscribe to changes
  useEffect(() => {
    setUnreadCount(notificationsLib.getUnreadCount());
    const unsubscribe = notificationsLib.subscribe((all) => {
      setUnreadCount(all.filter((n) => !n.read).length);
    });
    return unsubscribe;
  }, []);

  return (
    <button
      aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ""}`}
      data-testid="notification-bell"
      onClick={() => router.push("/notifications")}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Ensure 44px touch target
        minWidth: 44,
        minHeight: 44,
      }}
    >
      {/* Bell SVG — inline, no library required */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {/* Unread badge — only render when count > 0 */}
      {unreadCount > 0 && (
        <span
          data-testid="notification-badge"
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: 999,
            backgroundColor: "#E4002B",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 800,
            lineHeight: "16px",
            textAlign: "center",
            padding: "0 3px",
            border: "1.5px solid rgba(13,15,19,0.9)",
            pointerEvents: "none",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

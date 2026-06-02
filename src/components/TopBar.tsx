"use client";

/**
 * TopBar — app-level header bar.
 *
 * Design source: Albumix design bundle → app.jsx TopBar function (lines 9-30).
 *
 * Layout:
 *   Left  → logomark (30×30) + "ALBUMI" + "X" in gold
 *   Right → NotificationBell with badge
 *
 * Variants:
 *   'fixed'    → position:fixed at top:0 (default, for main pages with BottomNav)
 *   'absolute' → position:absolute (for pages rendered inside a relative container)
 *
 * When showBackButton=true the logo area is replaced by a back arrow + optional
 * centered title — useful for inner pages like /notifications.
 *
 * Mounting in layout.tsx is DEFERRED to main thread after Design RIO lands
 * the BottomNav + page shells. This component is ready to be imported.
 */

import Image from "next/image";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

export interface TopBarProps {
  /** Position strategy. Default: 'fixed'. */
  variant?: "fixed" | "absolute";
  /** Show back arrow instead of logo — for inner pages. */
  showBackButton?: boolean;
  /** Centered title shown when showBackButton=true. */
  title?: string;
  /**
   * Coins pill displayed right of the logo, left of the bell.
   * Pass a pre-formatted string (e.g. "1.240") — component renders the pill with 🪙 prefix.
   * TODO(economy): wire to real user wallet query.
   */
  coinsLabel?: string;
  /**
   * Override the notification badge count shown on the bell.
   * When undefined, the bell reads the real unread count from localStorage.
   * TODO(notifications): remove override once /notifications count is wired.
   */
  mockNotifCount?: number;
}

const GOLD = "#F4C84A";
const BG_GRADIENT =
  "linear-gradient(180deg,rgba(13,15,19,.95),rgba(13,15,19,.7) 70%,transparent)";

export default function TopBar({
  variant = "fixed",
  showBackButton = false,
  title,
  coinsLabel,
  mockNotifCount,
}: TopBarProps) {
  const router = useRouter();

  const containerStyle: React.CSSProperties = {
    position: variant,
    top: variant === "fixed" ? 0 : "calc(50px + env(safe-area-inset-top, 0px))",
    left: 0,
    right: 0,
    height: "calc(54px + env(safe-area-inset-top, 0px))",
    zIndex: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "env(safe-area-inset-top, 0px) 18px 0 18px",
    background: BG_GRADIENT,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };

  return (
    <div style={containerStyle} data-testid="topbar">
      {/* Left side */}
      {showBackButton ? (
        <button
          aria-label="Volver"
          data-testid="topbar-back"
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            minWidth: 44,
            minHeight: 44,
            padding: "4px",
          }}
        >
          {/* Left chevron SVG */}
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Image
            src="/assets/logomark.svg"
            width={30}
            height={30}
            alt="Albumix"
            priority
          />
          <span
            style={{
              fontFamily:
                "var(--font-display, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: ".02em",
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            ALBUMI
            <span style={{ color: GOLD }}>X</span>
          </span>
        </div>
      )}

      {/* Center title (only when showBackButton=true and title provided) */}
      {showBackButton && title && (
        <span
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 16,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: ".01em",
            pointerEvents: "none",
          }}
        >
          {title}
        </span>
      )}

      {/* Right side — optional coins pill + bell */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {coinsLabel && (
          <div
            data-testid="topbar-coins"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 9999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(252,211,77,0.3)",
            }}
          >
            <span style={{ fontSize: 12 }} aria-hidden="true">🪙</span>
            <span
              style={{ fontWeight: 700, fontSize: 14, color: "#facc15", lineHeight: 1 }}
            >
              {coinsLabel}
            </span>
          </div>
        )}
        <NotificationBell color="#ffffff" size={24} mockCount={mockNotifCount} />
      </div>
    </div>
  );
}

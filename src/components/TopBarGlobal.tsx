"use client";

/**
 * TopBarGlobal — conditionally renders TopBar + in-flow height spacer.
 *
 * Mounted in layout.tsx (Server Component). Uses usePathname() to suppress
 * the bar on pages that should NOT show it:
 *   "/" — fullscreen onboarding (no bar needed)
 *   "/notifications" — has its own TopBar with back button
 *
 * When rendered, the component outputs:
 *   1. The fixed-position TopBar (position:fixed, top:0, height:54px, z:40)
 *   2. A 54px in-flow spacer div so page content doesn't slide under the bar.
 *
 * Returning null for suppressed paths ensures those pages get zero extra space.
 *
 * Route-specific props (scoped to /inicio only):
 *   mockNotifCount — mock notification badge count (3) on the bell
 * NOTE(economy): coins pill removed from /inicio per Fase 1 design alignment 2026-06-01.
 *   coinsLabel prop removed from /inicio. Bell badge (notifications) stays.
 * TODO(notifications): replace INICIO_NOTIF_COUNT with real /notifications count.
 */

import { usePathname } from "next/navigation";
import TopBar from "@/components/TopBar";

/** Paths where the global TopBar must NOT render. */
const SUPPRESS_PATHS = new Set(["/", "/notifications"]);

// TODO(notifications): replace with real unread count from /api/notifications
const INICIO_NOTIF_COUNT = 3;

export default function TopBarGlobal() {
  const pathname = usePathname();

  if (SUPPRESS_PATHS.has(pathname)) return null;

  const isInicio = pathname === "/inicio";

  return (
    <>
      <TopBar
        variant="fixed"
        // coinsLabel intentionally omitted for all routes — removed per Fase 1 design alignment
        mockNotifCount={isInicio ? INICIO_NOTIF_COUNT : undefined}
      />
      {/* In-flow spacer: occupies the 54px that TopBar covers with position:fixed */}
      <div style={{ height: 54, flexShrink: 0 }} aria-hidden="true" />
    </>
  );
}

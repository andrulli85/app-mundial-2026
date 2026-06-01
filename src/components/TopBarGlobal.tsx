"use client";

/**
 * TopBarGlobal — thin client wrapper that conditionally renders TopBar.
 *
 * Mounted in layout.tsx (Server Component). Uses usePathname() to suppress
 * the bar on pages that either:
 *   a) are fullscreen (onboarding "/")
 *   b) render their own TopBar instance ("/notifications")
 *
 * All other pages get the fixed 54px bar with the Albumix logo + bell.
 */

import { usePathname } from "next/navigation";
import TopBar from "@/components/TopBar";

/** Paths where the global TopBar must NOT render. */
const SUPPRESS_PATHS = new Set(["/", "/notifications"]);

export default function TopBarGlobal() {
  const pathname = usePathname();

  if (SUPPRESS_PATHS.has(pathname)) return null;

  return <TopBar variant="fixed" />;
}

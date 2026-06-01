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
 */

import { usePathname } from "next/navigation";
import TopBar from "@/components/TopBar";

/** Paths where the global TopBar must NOT render. */
const SUPPRESS_PATHS = new Set(["/", "/notifications"]);

export default function TopBarGlobal() {
  const pathname = usePathname();

  if (SUPPRESS_PATHS.has(pathname)) return null;

  return (
    <>
      <TopBar variant="fixed" />
      {/* In-flow spacer: occupies the 54px that TopBar covers with position:fixed */}
      <div style={{ height: 54, flexShrink: 0 }} aria-hidden="true" />
    </>
  );
}

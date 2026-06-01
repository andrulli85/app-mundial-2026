"use client";

/**
 * /trade — migrated to /market (Stream C, Phase 4.2).
 * Redirects immediately on mount. Keeps client component for useRouter.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TradePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/market");
  }, [router]);

  // Minimal loading state while redirect fires
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-1, #0D0F13)",
        color: "var(--fg-3, #6B7382)",
        fontFamily: "var(--font-ui, system-ui, sans-serif)",
        fontSize: 14,
      }}
    >
      Redirigiendo…
    </div>
  );
}

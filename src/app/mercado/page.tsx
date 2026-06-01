"use client";

/**
 * /mercado — redirects to /market (Stream C, Phase 4.2).
 *
 * BottomNav links to /mercado. /market is the canonical Mercado hub.
 * This file redirects so both URLs work.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MercadoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/market");
  }, [router]);

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
      Cargando Mercado…
    </div>
  );
}

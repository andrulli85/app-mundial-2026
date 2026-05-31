"use client";

/**
 * /scan — WhatsApp deep-link entry point.
 *
 * Decision E=δ (S124): URL pattern <origin>/scan?p=<base45payload>
 * Immediately redirects to /trade/receive with the payload pre-filled so
 * the user skips camera scanning entirely.
 *
 * If the `p` query param is missing or the URL is navigated without one,
 * redirect to /trade as a safe fallback.
 */

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ScanDeepLinkInner() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const p = sp.get("p");
    if (!p) {
      router.replace("/trade");
      return;
    }
    // Redirect to /trade/receive with payload pre-filled
    router.replace(
      `/trade/receive?payload=${encodeURIComponent(p)}&mode=initial`
    );
  }, [sp, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Abriendo trade...</p>
    </div>
  );
}

export default function ScanDeepLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: "#006847", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <ScanDeepLinkInner />
    </Suspense>
  );
}

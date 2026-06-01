"use client";

/**
 * /once — Mi Once placeholder (Phase A).
 * Full Squad Builder UI is implemented in Phase B.
 */

import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function OncePage() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-lg mx-auto" style={{ backgroundColor: "#f5f0e8" }}>
      <header
        className="px-5 pt-6 pb-4"
        style={{ backgroundColor: "#006847" }}
      >
        <h1 className="text-2xl font-black text-white leading-tight">Mi Once</h1>
        <p className="text-green-200 text-xs mt-1">Armá tu equipo ideal</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-6xl" aria-hidden="true">⚽</span>
        <h2 className="text-xl font-black text-gray-800">Próximamente</h2>
        <p className="text-sm text-gray-600 max-w-xs">
          El armador de equipo estará disponible muy pronto. Podrás armar tu once con las figuritas de tu álbum.
        </p>
        <Link
          href="/album"
          className="mt-2 px-6 py-3 rounded-xl font-bold text-white text-sm"
          style={{ backgroundColor: "#006847" }}
        >
          Ir al álbum
        </Link>
      </main>

      <BottomNav active="once" />
    </div>
  );
}

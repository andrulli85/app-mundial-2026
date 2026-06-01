"use client";

/**
 * /achievements — Badge grid page.
 *
 * Shows all 15 badges with locked/unlocked state.
 * Progress bar at top: "X / 15 desbloqueadas".
 */

import { useEffect, useState } from "react";
import { BADGES } from "@/lib/achievements";
import { getUnlockedBadgeEntries, type AchievementEntry } from "@/lib/db";
import BadgeCard from "@/components/BadgeCard";

export default function AchievementsPage() {
  const [entries, setEntries] = useState<AchievementEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUnlockedBadgeEntries()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const unlockedSet = new Map(entries.map((e) => [e.id, e.unlockedAt]));
  const unlockedCount = unlockedSet.size;
  const total = BADGES.length;
  const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <a
          href="/settings"
          className="text-white text-xl leading-none"
          aria-label="Volver a Opciones"
        >
          ←
        </a>
        <h1 className="text-lg font-black text-white leading-none">Logros</h1>
        <span className="ml-auto text-sm font-semibold text-green-100">
          {unlockedCount}/{total}
        </span>
      </header>

      <main className="flex-1 px-4 py-5 flex flex-col gap-5">
        {/* Progress bar */}
        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "10px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 700,
                color: "#1f2937",
              }}
            >
              {loading
                ? "Cargando logros…"
                : `${unlockedCount} de ${total} desbloqueadas`}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                fontWeight: 600,
                color: "#006847",
              }}
            >
              {pct}%
            </p>
          </div>

          {/* Progress track */}
          <div
            style={{
              height: "8px",
              borderRadius: "999px",
              backgroundColor: "#e5e7eb",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: "999px",
                backgroundColor: "#006847",
                transition: "width 0.6s ease",
              }}
            />
          </div>

          {pct === 100 && (
            <p
              style={{
                margin: "10px 0 0",
                textAlign: "center",
                fontSize: "13px",
                color: "#006847",
                fontWeight: 600,
              }}
            >
              Sos leyenda. Álbum completo. 👑
            </p>
          )}
        </section>

        {/* Badge grid */}
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
            }}
          >
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                style={{
                  borderRadius: "16px",
                  height: "140px",
                  backgroundColor: "#f3f4f6",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              // 3 columns on mobile, 4 on tablet+
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
            }}
            className="sm:grid-cols-4"
          >
            {BADGES.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                unlocked={unlockedSet.has(badge.id)}
                unlockedAt={unlockedSet.get(badge.id)}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <p
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: "#9ca3af",
            paddingBottom: "16px",
          }}
        >
          Los logros se guardan en este dispositivo.
        </p>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (min-width: 640px) {
          .sm\\:grid-cols-4 {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

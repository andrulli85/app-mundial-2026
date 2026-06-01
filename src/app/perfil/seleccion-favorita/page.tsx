"use client";

/**
 * /perfil/seleccion-favorita — Full-page view of the favorite team card.
 *
 * Shows SeleccionFavoritaCard with explanatory copy about how the
 * bonus tier system works.
 */

import Link from "next/link";
import SeleccionFavoritaCard from "@/components/SeleccionFavoritaCard";
import BottomNav from "@/components/BottomNav";

const GOLD = "#F4C84A";

export default function SeleccionFavoritaPage() {
  return (
    <div
      className="flex flex-col flex-1 w-full max-w-lg mx-auto"
      style={{ backgroundColor: "#0d0f13", color: "#f3f4f6" }}
    >
      {/* Header */}
      <div
        className="sticky top-[54px] z-20 px-4 pt-4 pb-3"
        style={{
          background:
            "linear-gradient(180deg, #0d0f13 80%, rgba(13,15,19,0) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/perfil"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#1a1e29",
              border: "1px solid #2d3344",
              color: "#9ca3af",
              textDecoration: "none",
              fontSize: 16,
              flexShrink: 0,
            }}
            aria-label="Volver a perfil"
          >
            ←
          </Link>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#f3f4f6",
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1,
            }}
          >
            Selección Favorita
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-5">
        {/* Main card */}
        <SeleccionFavoritaCard />

        {/* How it works */}
        <section
          style={{
            background: "#1a1e29",
            border: "1px solid #2d3344",
            borderRadius: 18,
            padding: "18px 18px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: GOLD,
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
              marginBottom: 10,
            }}
          >
            Cómo funciona
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {[
              {
                icon: "⭐",
                title: "Selección FIJA",
                body: "Tu selección favorita es fija para todo el torneo. No podés cambiarla una vez que empieza el Mundial.",
              },
              {
                icon: "🏆",
                title: "Puntos por etapa",
                body: "Cada vez que tu selección avanza a una nueva fase, sumás los puntos de ese nivel automáticamente.",
              },
              {
                icon: "🇨🇱",
                title: "Chile en Cuartos",
                body: "¡Ya sumaste +200 puntos! Si Chile llega a semifinales o más, seguís ganando bonos.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.3 }} aria-hidden="true">
                  {item.icon}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#f3f4f6",
                      marginBottom: 2,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      lineHeight: 1.5,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {item.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav active="perfil" />
    </div>
  );
}

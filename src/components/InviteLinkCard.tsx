"use client";

/**
 * InviteLinkCard — shows a QR code of YOUR OWN invite link so a friend can scan it.
 * Used in /friends/add as the "show-QR" fallback.
 */

import { useEffect, useRef, useState } from "react";
import { createInvite } from "@/lib/friends";

export default function InviteLinkCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    createInvite()
      .then((result) => {
        if (result) {
          setInviteUrl(result.url);
        } else {
          setError("Iniciá sesión para generar un link.");
        }
      })
      .catch(() => setError("No se pudo crear el link."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!inviteUrl || !canvasRef.current) return;
    import("qrcode").then(({ toCanvas }) => {
      toCanvas(canvasRef.current!, inviteUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#006847", light: "#ffffff" },
      }).catch(console.error);
    });
  }, [inviteUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Generando QR...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-red-500 text-sm text-center px-4">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-gray-600 text-center">
        Mostrá este QR a tu amigo para que te agregue
      </p>
      <div
        className="rounded-2xl p-3 shadow-sm"
        style={{ backgroundColor: "#ffffff", border: "2px solid #d1c9b8" }}
      >
        <canvas ref={canvasRef} />
      </div>
      {inviteUrl && (
        <button
          onClick={() => navigator.clipboard?.writeText(inviteUrl)}
          className="text-xs text-gray-500 underline underline-offset-2"
        >
          Copiar link
        </button>
      )}
    </div>
  );
}

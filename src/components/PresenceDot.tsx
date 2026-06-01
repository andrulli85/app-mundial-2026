"use client";

/**
 * PresenceDot — subscribes to Firebase RTDB /presence/{uid}.
 * Green dot when status=online, gray otherwise with "hace X min" tooltip.
 */

import { useEffect, useState } from "react";

interface PresenceData {
  status: "online" | "offline";
  lastChanged: number | null;
}

interface PresenceDotProps {
  uid: string;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "hace un momento";
  if (minutes === 1) return "hace 1 min";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "hace 1 hora";
  return `hace ${hours} horas`;
}

export default function PresenceDot({ uid }: PresenceDotProps) {
  const [presence, setPresence] = useState<PresenceData | null>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with RTDB
    let unsubscribe: (() => void) | null = null;

    import("@/lib/presence").then(({ subscribeToPresence }) => {
      unsubscribe = subscribeToPresence(uid, setPresence);
    });

    return () => {
      unsubscribe?.();
    };
  }, [uid]);

  if (!presence) {
    // Neutral gray while loading
    return (
      <span
        className="inline-block w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"
        aria-label="Estado desconocido"
      />
    );
  }

  const isOnline = presence.status === "online";
  const tooltip = isOnline
    ? "Conectado"
    : presence.lastChanged
    ? timeAgo(presence.lastChanged)
    : "Desconectado";

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        isOnline ? "bg-green-500" : "bg-gray-300"
      }`}
    />
  );
}

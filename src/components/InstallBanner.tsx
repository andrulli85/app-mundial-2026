"use client";

/**
 * InstallBanner — Smart PWA install prompt for /album.
 *
 * - Hidden when already running in standalone (PWA) mode
 * - Hidden for 30 days after the user dismisses it
 * - iOS: routes to /install tutorial (Safari doesn't support beforeinstallprompt)
 * - Android Chrome: triggers native one-tap install via beforeinstallprompt API
 * - Other: routes to /install tutorial
 */

import { useEffect, useState } from "react";

const DISMISS_KEY = "albumix-install-dismissed";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android-native" | "other">(
    "other"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed — running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (isStandalone) return;

    // Respect dismiss TTL
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const ts = parseInt(dismissed, 10);
      if (!isNaN(ts) && Date.now() - ts < DISMISS_TTL_MS) return;
    }

    // iOS Safari — beforeinstallprompt not supported; route to tutorial
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    // Android Chrome — listen for native install prompt
    let nativePromptFired = false;
    const onBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      nativePromptFired = true;
      setInstallPromptEvent(e);
      setPlatform("android-native");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // Other platforms (desktop Chrome, Firefox, etc.) — show after short delay
    // only if the native prompt did not fire
    const fallbackTimer = setTimeout(() => {
      if (!nativePromptFired) {
        setPlatform("other");
        setVisible(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      clearTimeout(fallbackTimer);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function handleInstall() {
    if (platform === "android-native" && installPromptEvent) {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
    } else {
      window.location.href = "/install";
    }
  }

  if (!visible) return null;

  const labels: Record<typeof platform, string> = {
    ios: "Agregá Albumix a tu pantalla — toca para ver cómo",
    "android-native": "Instalá Albumix en 1 tap",
    other: "Instalá Albumix",
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 text-xs"
      style={{
        backgroundColor: "var(--bg-2)",
        borderBottom: "1px solid var(--line-strong)",
      }}
      role="banner"
      aria-label="Sugerencia de instalación"
    >
      <span className="text-base flex-shrink-0" aria-hidden="true">
        📲
      </span>
      <button
        onClick={handleInstall}
        className="flex-1 text-left font-semibold leading-snug"
        style={{ color: "var(--gold)" }}
      >
        {labels[platform]}
      </button>
      <button
        onClick={dismiss}
        aria-label="Cerrar sugerencia de instalación"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-opacity active:opacity-70"
        style={{ color: "var(--fg-3)" }}
      >
        ✕
      </button>
    </div>
  );
}

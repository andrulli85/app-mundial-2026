"use client";

/**
 * useAchievements — global achievement sync hook.
 *
 * Run syncUnlocks on mount and whenever the external trigger fires.
 * Returns a queue of newly-unlocked badge IDs for the toast system.
 *
 * Usage:
 *   const { toastQueue, dismissToast } = useAchievements();
 *   // Mount <AchievementToast> in layout and pass these props.
 *
 * Trigger an immediate re-check from anywhere:
 *   import { triggerAchievementCheck } from "@/hooks/useAchievements";
 *   triggerAchievementCheck();
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { buildBadgeContext, syncUnlocks } from "@/lib/achievements";
import { onCollectionChange } from "@/lib/db";
import { dispatchAchievementCheckEvent } from "@/hooks/useNotificationFeed";

// Module-level event emitter so any part of the app can trigger a check
// without prop-drilling. Lightweight alternative to a global store.
type CheckListener = () => void;
const listeners = new Set<CheckListener>();

/** Call this after any state mutation that could unlock a badge */
export function triggerAchievementCheck(): void {
  listeners.forEach((fn) => fn());
}

/** Debounce delay for bulk operations (e.g. marking many stickers quickly) */
const DEBOUNCE_MS = 800;

export function useAchievements() {
  const [toastQueue, setToastQueue] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCheck = useCallback(async () => {
    try {
      const ctx = await buildBadgeContext();
      const newIds = await syncUnlocks(ctx);
      if (newIds.length > 0) {
        setToastQueue((q) => [...q, ...newIds]);
      }
      // Notify the notification feed that a check just completed.
      // useNotificationFeed diffs against its own seen-set, so this is safe
      // to call even when newIds is empty (no notification spam).
      dispatchAchievementCheckEvent();
    } catch (err) {
      // Non-fatal — achievement system should never crash the app
      console.warn("[achievements] sync error:", err);
    }
  }, []);

  // Debounced variant for high-frequency calls (toggleSticker)
  const runCheckDebounced = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runCheck();
    }, DEBOUNCE_MS);
  }, [runCheck]);

  // Mount: run once on app load
  useEffect(() => {
    runCheck();
  }, [runCheck]);

  // Register the debounced check as a global listener (manual triggers)
  useEffect(() => {
    listeners.add(runCheckDebounced);
    return () => {
      listeners.delete(runCheckDebounced);
    };
  }, [runCheckDebounced]);

  // Subscribe to IndexedDB collection mutations (toggleSticker / bulkSetStickers)
  useEffect(() => {
    const unsubscribe = onCollectionChange(runCheckDebounced);
    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [runCheckDebounced]);

  /** Remove the first item from the queue (called after toast is shown) */
  const dismissToast = useCallback((id: string) => {
    setToastQueue((q) => q.filter((qId) => qId !== id));
  }, []);

  return { toastQueue, dismissToast };
}

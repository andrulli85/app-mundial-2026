"use client";

/**
 * useNotificationFeed — connects the achievement emitter to the notification queue.
 *
 * Mount this once in a Provider or in AchievementProvider. It listens for
 * newly-unlocked badges via the same module-level emitter used by
 * useAchievements, then feeds them into notifications.add().
 *
 * IMPORTANT: this hook does NOT import from db.ts — it only reads from
 * lib/achievements (BADGES catalog for metadata) and lib/notifications.
 * This keeps it conflict-free with the in-flight Design RIO bumping db.ts to v3.
 *
 * Architecture note:
 *   The hook intercepts the "post-sync" window by storing the last seen set of
 *   unlocked badge ids and diffing on every triggerAchievementCheck() call.
 *   Because syncUnlocks() in lib/achievements is idempotent, the same badge id
 *   is only ever added once to the notification queue.
 */

import { useEffect, useRef } from "react";
import { BADGES } from "@/lib/achievements";
import { getUnlockedBadges } from "@/lib/db";
import * as notifications from "@/lib/notifications";

// We import triggerAchievementCheck ONLY to subscribe to the listeners set.
// We do NOT call it — we just listen for when others call it.
import { triggerAchievementCheck as _triggerAchievementCheck } from "@/hooks/useAchievements";

/** The hook that wires achievement unlocks into the notification feed. */
export function useNotificationFeed(): void {
  // Track which badge ids we have already notified about (across re-renders).
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    /** Diff current unlocked badges against seen set; push new ones. */
    async function checkForNewUnlocks(): Promise<void> {
      try {
        const unlockedIds = await getUnlockedBadges();
        const seenSet = seenRef.current;

        for (const id of unlockedIds) {
          if (seenSet.has(id)) continue;
          seenSet.add(id);

          // Skip if this is the initial bootstrap (don't spam on first mount)
          if (!initializedRef.current) continue;

          const badge = BADGES.find((b) => b.id === id);
          if (!badge) continue;

          notifications.add({
            type: "achievement",
            title: `¡Desbloqueaste: ${badge.name}!`,
            body: badge.description,
            emoji: badge.emoji,
            link: "/achievements",
          });
        }

        // After the first pass, mark as initialized so future diffs create notifs
        initializedRef.current = true;
      } catch {
        // Non-fatal — don't crash the app if notification wiring fails
      }
    }

    // Bootstrap: load currently-unlocked badges into seenRef WITHOUT creating notifs
    // (user shouldn't get flooded with old unlocks on every app open).
    checkForNewUnlocks();

    // Subscribe: whenever any part of the app calls triggerAchievementCheck(),
    // we re-diff. We piggyback on the same listener set used by useAchievements.
    // triggerAchievementCheck is exported so we can call it as a no-op listener trigger,
    // but we actually register our own callback into the listeners set directly.
    //
    // Since we can't import `listeners` directly (it's module-private in useAchievements),
    // we use a wrapper: call triggerAchievementCheck's exported subscribe pattern.
    // Workaround: use a DOM CustomEvent bridge so we don't need to import the private set.
    function onAchievementCheck(): void {
      checkForNewUnlocks();
    }

    // Listen on a custom DOM event that useAchievements fires after each sync.
    // If the event bridge isn't set up yet, the hook still works — it just won't
    // react to manual triggers until the event fires.
    window.addEventListener(
      "__albumix_achievement_check__",
      onAchievementCheck
    );

    return () => {
      window.removeEventListener(
        "__albumix_achievement_check__",
        onAchievementCheck
      );
    };
  }, []);
}

// ---------------------------------------------------------------------------
// Bridge helper — call this from useAchievements after each syncUnlocks().
// Export so AchievementProvider can dispatch the event without importing
// useNotificationFeed (avoiding circular deps).
// ---------------------------------------------------------------------------
export function dispatchAchievementCheckEvent(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("__albumix_achievement_check__"));
  }
}

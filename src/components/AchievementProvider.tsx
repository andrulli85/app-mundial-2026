"use client";

/**
 * AchievementProvider — mounts the achievement sync hook and toast system.
 * Place this inside AuthProvider in the root layout so it has access to
 * the full React tree but doesn't require auth.
 *
 * Also mounts useNotificationFeed() so that every new badge unlock
 * generates a notification in the bell feed.
 */

import { type ReactNode } from "react";
import { useAchievements } from "@/hooks/useAchievements";
import { useNotificationFeed } from "@/hooks/useNotificationFeed";
import AchievementToast from "@/components/AchievementToast";

export default function AchievementProvider({ children }: { children: ReactNode }) {
  const { toastQueue, dismissToast } = useAchievements();

  // Wire achievement unlocks into the notification bell feed.
  // The hook listens for the __albumix_achievement_check__ DOM event
  // dispatched by dispatchAchievementCheckEvent() after each sync.
  useNotificationFeed();

  return (
    <>
      {children}
      <AchievementToast toastQueue={toastQueue} onDismiss={dismissToast} />
    </>
  );
}

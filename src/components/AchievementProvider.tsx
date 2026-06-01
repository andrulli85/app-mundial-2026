"use client";

/**
 * AchievementProvider — mounts the achievement sync hook and toast system.
 * Place this inside AuthProvider in the root layout so it has access to
 * the full React tree but doesn't require auth.
 */

import { type ReactNode } from "react";
import { useAchievements } from "@/hooks/useAchievements";
import AchievementToast from "@/components/AchievementToast";

export default function AchievementProvider({ children }: { children: ReactNode }) {
  const { toastQueue, dismissToast } = useAchievements();

  return (
    <>
      {children}
      <AchievementToast toastQueue={toastQueue} onDismiss={dismissToast} />
    </>
  );
}

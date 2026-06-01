/**
 * coachmark-state.ts — localStorage persistence for first-visit coachmarks.
 *
 * Each section gets a boolean flag. Once seen, never shown again.
 * Key format: mc_coach_{section}
 */

export type CoachSection = "inicio" | "album" | "once";

const PREFIX = "mc_coach_";

/**
 * Returns true if the coachmark for this section has NOT been seen yet.
 * Safe to call in useEffect (SSR-safe: localStorage only accessed client-side).
 */
export function shouldShowCoachmark(section: CoachSection): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREFIX + section) !== "seen";
}

/**
 * Marks the coachmark for this section as seen. Will not show again.
 */
export function dismissCoachmark(section: CoachSection): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + section, "seen");
}

/**
 * Resets all coachmarks (useful for testing/debug).
 */
export function resetAllCoachmarks(): void {
  if (typeof window === "undefined") return;
  const sections: CoachSection[] = ["inicio", "album", "once"];
  sections.forEach((s) => localStorage.removeItem(PREFIX + s));
}

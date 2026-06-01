/**
 * userXI — Lock-state logic + IndexedDB persistence for Mi Once confirmed XI.
 *
 * Lock paradigm (Decision #7):
 *   XI is locked from MD1 first whistle through end of all MD2 matches.
 *   A brief transfer window opens once MD2 concludes across all 12 groups.
 *   XI re-locks at the first MD3 kickoff and stays locked through the tournament end.
 *
 * LOCK_PHASES entries are hardcoded from FIFA's published 2026 schedule.
 * Source: https://www.skysports.com/football/news/11095/13481245/world-cup-2026-fixture-schedule-and-uk-kick-off-times
 * (All times were in UK BST = UTC+1; converted to UTC below.)
 */

import { getDB } from "@/lib/db";
import type { UserXIEntry } from "@/lib/db";

// ---------------------------------------------------------------------------
// Lock phase types
// ---------------------------------------------------------------------------

export type LockPhase =
  | "before_tournament"   // before MD1 first whistle — editing allowed
  | "md1_to_md2_lock"     // MD1 first whistle → last MD2 final whistle — locked
  | "md2_unlock_window"   // after last MD2 → first MD3 kickoff — editing allowed
  | "md3_to_final_lock"   // first MD3 kickoff → tournament final whistle — locked
  | "tournament_over";    // after tournament — view-only

export interface LockWindow {
  /** ISO 8601 UTC — when this phase begins (inclusive) */
  startsAt: string;
  /** ISO 8601 UTC — when this phase ends (exclusive, next phase begins) */
  endsAt: string;
  phase: LockPhase;
}

// ---------------------------------------------------------------------------
// LOCK_PHASES — hardcoded from FIFA 2026 fixture data
//
// Source: Sky Sports UK fixture schedule (BST = UTC+1, converted below)
// https://www.skysports.com/football/news/11095/13481245/world-cup-2026-fixture-schedule-and-uk-kick-off-times
//
// Opening match: Mexico vs South Africa at Azteca, 8pm BST 11 Jun → 19:00 UTC
// Last MD2 match: Canada vs Qatar, 11pm BST 18 Jun → 22:00 UTC
//   + 90 min match + 5 min buffer = last whistle ≈ 23:35 UTC → using 23:45 UTC as safe buffer
// First MD3 kickoff: Mexico vs South Korea, 2am BST 19 Jun → 01:00 UTC 19 Jun
// Final: 8pm BST 19 Jul → 19:00 UTC; final whistle ~90 min later = 20:30 UTC
//
// NOTE: The MD2-end / MD3-start window is intentionally narrow (~75 min) as spec'd.
// If FIFA publishes updated times, update these constants and redeploy before MD1.
// ---------------------------------------------------------------------------

export const LOCK_PHASES: LockWindow[] = [
  {
    // Before tournament: editing allowed from the beginning of time
    startsAt: "2026-01-01T00:00:00Z",
    endsAt:   "2026-06-11T19:00:00Z", // Mexico vs South Africa kickoff — MD1 first whistle (UTC)
    phase: "before_tournament",
  },
  {
    // MD1 → end of MD2: XI locked. Cannot edit squad.
    startsAt: "2026-06-11T19:00:00Z", // MD1 first whistle
    endsAt:   "2026-06-18T23:45:00Z", // Last MD2 final whistle (Canada vs Qatar ~11pm BST + 90min + buffer)
    phase: "md1_to_md2_lock",
  },
  {
    // Transfer window: MD2 ends → first MD3 kickoff (~75 min window)
    startsAt: "2026-06-18T23:45:00Z", // Last MD2 final whistle
    endsAt:   "2026-06-19T01:00:00Z", // Mexico vs South Korea — first MD3 kickoff (2am BST = 01:00 UTC)
    phase: "md2_unlock_window",
  },
  {
    // MD3 → final: re-locked for the rest of the tournament
    startsAt: "2026-06-19T01:00:00Z", // First MD3 kickoff
    endsAt:   "2026-07-19T20:30:00Z", // Final whistle (8pm BST final + 90 min = 20:30 UTC)
    phase: "md3_to_final_lock",
  },
  {
    // Tournament over — view-only, no more changes
    startsAt: "2026-07-19T20:30:00Z",
    endsAt:   "9999-12-31T23:59:59Z",
    phase: "tournament_over",
  },
];

// ---------------------------------------------------------------------------
// Phase helpers
// ---------------------------------------------------------------------------

/** Returns the current LockPhase based on now (default: real wall-clock). */
export function getCurrentPhase(now: Date = new Date()): LockPhase {
  const ts = now.getTime();
  for (const w of LOCK_PHASES) {
    const start = new Date(w.startsAt).getTime();
    const end   = new Date(w.endsAt).getTime();
    if (ts >= start && ts < end) return w.phase;
  }
  // Fallback: if somehow outside all windows, treat as tournament_over
  return "tournament_over";
}

/** Returns true when the user cannot edit their XI. */
export function isLocked(now: Date = new Date()): boolean {
  const phase = getCurrentPhase(now);
  return (
    phase === "md1_to_md2_lock" ||
    phase === "md3_to_final_lock" ||
    phase === "tournament_over"
  );
}

/**
 * Returns the Date at which the current lock window ends and editing reopens,
 * or null if there are no more unlock windows (tournament over / already in last lock).
 */
export function nextUnlockAt(now: Date = new Date()): Date | null {
  const phase = getCurrentPhase(now);
  // Only two lock phases can transition to an unlock or editing window
  if (phase === "md1_to_md2_lock") {
    // Unlock when MD2 ends
    const w = LOCK_PHASES.find((p) => p.phase === "md1_to_md2_lock")!;
    return new Date(w.endsAt);
  }
  // All other lock/terminal phases have no further unlock
  return null;
}

/**
 * Returns the Date at which the current editing window closes (lock re-engages),
 * or null if the user is already locked.
 */
export function lockEngagesAt(now: Date = new Date()): Date | null {
  const phase = getCurrentPhase(now);
  if (phase === "before_tournament") {
    const w = LOCK_PHASES.find((p) => p.phase === "before_tournament")!;
    return new Date(w.endsAt);
  }
  if (phase === "md2_unlock_window") {
    const w = LOCK_PHASES.find((p) => p.phase === "md2_unlock_window")!;
    return new Date(w.endsAt);
  }
  return null;
}

// ---------------------------------------------------------------------------
// UserXI schema
// Re-exported alias of UserXIEntry from db.ts, with the phase field
// constrained to the LockPhase union for stronger typing in this module.
// ---------------------------------------------------------------------------

export type UserXI = Omit<UserXIEntry, "phase"> & { phase: LockPhase };

// ---------------------------------------------------------------------------
// IndexedDB persistence
//
// Lives in the SAME "mundial-2026" database as the existing stores (collection,
// profile, trade_log, achievements, squad). This is a new "userXI" store added
// via a DB version bump (v4). The existing squad store (draft in-progress lineup)
// is unaffected — userXI is the *confirmed* snapshot only.
// ---------------------------------------------------------------------------

export async function saveXI(data: Omit<UserXI, "key">): Promise<void> {
  const db = await getDB();
  await db.put("userXI", { ...data, key: "userXI" } as UserXIEntry);
}

export async function loadXI(): Promise<UserXI | null> {
  const db = await getDB();
  const entry = await db.get("userXI", "userXI");
  if (!entry) return null;
  return entry as UserXI;
}

/**
 * celebration-store — sessionStorage-backed Set<string> of team codes
 * that have already fired their celebration in this session.
 *
 * Persisted to sessionStorage so page reloads don't replay celebrations
 * the user already saw. The Set resets naturally when the tab is closed.
 */

const SESSION_KEY = "mc_celebrated_teams";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
  } catch {
    // corrupted storage — reset
  }
  return new Set();
}

function writeSet(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]));
  } catch {
    // storage full — silent fail (celebration is cosmetic)
  }
}

/** Returns true if this team code has already been celebrated this session. */
export function hasCelebrated(teamCode: string): boolean {
  return readSet().has(teamCode);
}

/** Marks a team code as celebrated and persists to sessionStorage. */
export function markCelebrated(teamCode: string): void {
  const set = readSet();
  set.add(teamCode);
  writeSet(set);
}

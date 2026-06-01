/**
 * favorites.ts — Sticker favorites store.
 *
 * Persisted in localStorage under key "album_favorites_v1".
 * A favorite is any sticker the user has starred in the album.
 *
 * Separate from rarity_tier==="legend" — those are catalog rarities.
 * Favorites are user-curated (Fase 2.5, 2026-06-01).
 *
 * No IDB version bump required — localStorage is sufficient for a
 * simple set of sticker_ids.
 */

const STORAGE_KEY = "album_favorites_v1";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
}

export function getFavorites(): Set<string> {
  return readSet();
}

export function toggleFavorite(stickerId: string): boolean {
  const set = readSet();
  if (set.has(stickerId)) {
    set.delete(stickerId);
    writeSet(set);
    return false;
  } else {
    set.add(stickerId);
    writeSet(set);
    return true;
  }
}

export function isFavorite(stickerId: string): boolean {
  return readSet().has(stickerId);
}

export function getFavoritesCount(): number {
  return readSet().size;
}

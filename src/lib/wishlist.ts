/**
 * wishlist.ts — client-side wishlist backed by localStorage.
 *
 * Schema:
 *   albumix.wishlist → WishlistItem[]  ordered array, max 10
 *   albumix.wishlist.alerts_sent → Record<string, number>  dedupe keys → ts
 *
 * Dedup key format: <fromUid>_<toUid>_<stickerId>_<YYYYMMDD>
 * Cap: 10 items. Adding an 11th returns { ok: false, error: 'cap_reached' }.
 */

import * as notificationsLib from "@/lib/notifications";
import { getMockPeers } from "@/lib/peer-mock";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WishlistItem {
  sticker_id: string;
  added_at: number; // unix ms
  priority: number; // 1-based position in the ordered list
}

export interface WishlistAddResult {
  ok: boolean;
  error?: "cap_reached";
  current_wishlist: WishlistItem[];
}

export interface WishlistStatus {
  in_wishlist: boolean;
  friends_online_have: number;
  friends_offline_have: number;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const WISHLIST_KEY = "albumix.wishlist";
const ALERTS_KEY = "albumix.wishlist.alerts_sent";
const WISHLIST_CAP = 10;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function loadWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WishlistItem[];
  } catch {
    return [];
  }
}

function saveWishlist(items: WishlistItem[]): void {
  if (typeof window === "undefined") return;
  // Re-assign priority based on current position (1-based)
  const normalized = items.map((item, idx) => ({ ...item, priority: idx + 1 }));
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(normalized));
  } catch {
    // QuotaExceededError — ignore, wishlist is non-critical
  }
  notifyWishlistSubscribers(normalized);
}

function loadAlerts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

function saveAlerts(alerts: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  } catch {
    // ignore
  }
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// ---------------------------------------------------------------------------
// Pub/sub
// ---------------------------------------------------------------------------

type WishlistSubscriber = (items: WishlistItem[]) => void;
const wishlistSubscribers = new Set<WishlistSubscriber>();

export function subscribeWishlist(cb: WishlistSubscriber): () => void {
  wishlistSubscribers.add(cb);

  function onStorage(e: StorageEvent): void {
    if (e.key !== WISHLIST_KEY) return;
    try {
      const updated = e.newValue ? (JSON.parse(e.newValue) as WishlistItem[]) : [];
      cb(updated);
    } catch {
      // Malformed JSON — ignore
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    wishlistSubscribers.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function notifyWishlistSubscribers(items: WishlistItem[]): void {
  wishlistSubscribers.forEach((cb) => cb(items));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns current wishlist ordered by priority. */
export function getWishlist(): WishlistItem[] {
  return loadWishlist();
}

/** Add a sticker to the wishlist. Returns ok=false with 'cap_reached' if at 10. */
export function addToWishlist(sticker_id: string): WishlistAddResult {
  const items = loadWishlist();
  if (items.find((i) => i.sticker_id === sticker_id)) {
    // Already in wishlist — idempotent
    return { ok: true, current_wishlist: items };
  }
  if (items.length >= WISHLIST_CAP) {
    return { ok: false, error: "cap_reached", current_wishlist: items };
  }
  const updated: WishlistItem[] = [
    ...items,
    { sticker_id, added_at: Date.now(), priority: items.length + 1 },
  ];
  saveWishlist(updated);
  return { ok: true, current_wishlist: updated };
}

/** Remove a sticker from the wishlist. No-op if not present. */
export function removeFromWishlist(sticker_id: string): void {
  const items = loadWishlist().filter((i) => i.sticker_id !== sticker_id);
  saveWishlist(items);
}

/**
 * Swap: remove remove_id and add add_id in its place.
 * Used when wishlist is full and the user chooses which to replace.
 */
export function swapWishlistItem(remove_id: string, add_id: string): WishlistItem[] {
  const items = loadWishlist();
  const idx = items.findIndex((i) => i.sticker_id === remove_id);
  if (idx === -1) {
    // remove_id not found — just add
    const r = addToWishlist(add_id);
    return r.current_wishlist;
  }
  const updated = [...items];
  updated[idx] = { sticker_id: add_id, added_at: Date.now(), priority: idx + 1 };
  saveWishlist(updated);
  return updated;
}

/**
 * Reorder the wishlist given a new array of sticker_ids.
 * IDs not present in the current wishlist are ignored.
 */
export function reorderWishlist(new_order: string[]): WishlistItem[] {
  const items = loadWishlist();
  const byId = new Map(items.map((i) => [i.sticker_id, i]));
  const reordered: WishlistItem[] = [];
  for (const id of new_order) {
    const item = byId.get(id);
    if (item) reordered.push(item);
  }
  saveWishlist(reordered);
  return reordered;
}

/**
 * Returns wishlist status for a sticker:
 * - in_wishlist: whether it's currently wishlisted
 * - friends_online_have: count of online friends who own ≥2 of this sticker
 * - friends_offline_have: count of offline friends who own ≥2
 */
export function getWishlistStatus(sticker_id: string): WishlistStatus {
  const items = loadWishlist();
  const in_wishlist = items.some((i) => i.sticker_id === sticker_id);
  const peers = getMockPeers();
  let online = 0;
  let offline = 0;
  for (const peer of peers) {
    const count = peer.collection[sticker_id] ?? 0;
    if (count >= 2) {
      if (peer.status === "online") online++;
      else offline++;
    }
  }
  return { in_wishlist, friends_online_have: online, friends_offline_have: offline };
}

/**
 * Returns the wishlist of a mock friend by uid.
 * Phase B will replace with Firestore.
 */
export function getFriendsWishlist(friend_uid: string): WishlistItem[] {
  const peers = getMockPeers();
  const peer = peers.find((p) => p.uid === friend_uid);
  if (!peer) return [];
  return peer.wishlist.map((sticker_id, idx) => ({
    sticker_id,
    added_at: Date.now() - idx * 60_000,
    priority: idx + 1,
  }));
}

/**
 * Returns sticker_ids that are in a friend's wishlist AND you own count ≥ 2.
 * Used for the bulk-offer button.
 */
export function getMyMatchedDuplicates(
  friend_uid: string,
  myCollection: Record<string, number>
): string[] {
  const friendWishlist = getFriendsWishlist(friend_uid);
  return friendWishlist
    .map((i) => i.sticker_id)
    .filter((id) => (myCollection[id] ?? 0) >= 2);
}

// ---------------------------------------------------------------------------
// Alert dedup — 24h cap
// ---------------------------------------------------------------------------

/**
 * Fire a wishlist notification for a friend having one of your wishlisted stickers.
 * Deduplicates per from_uid + to_uid + sticker_id + day.
 *
 * @param from_uid  - the friend's uid
 * @param from_name - the friend's display name
 * @param sticker_id
 * @param sticker_label - human-readable sticker label e.g. "MEX-7 Reyes"
 * @param sticker_count - how many the friend has (must be ≥2 to trigger)
 * @param to_uid - current user uid (used in dedup key)
 */
export function maybeFireWishlistAlert(
  from_uid: string,
  from_name: string,
  sticker_id: string,
  sticker_label: string,
  sticker_count: number,
  to_uid: string
): void {
  if (sticker_count < 2) return;
  const key = `${from_uid}_${to_uid}_${sticker_id}_${todayKey()}`;
  const alerts = loadAlerts();
  if (alerts[key]) return; // already sent today
  alerts[key] = Date.now();
  saveAlerts(alerts);

  notificationsLib.add({
    type: "friend_has_wishlist_item" as notificationsLib.Notification["type"],
    emoji: "⭐",
    title: `${from_name} tiene ${sticker_label}`,
    body: `Tiene ${sticker_count}. ¿Querés ofrecerle algo?`,
    link: `/mercado?give=&to=${from_uid}&wishlist=${sticker_id}`,
  });
}

/**
 * Fire a "friend wants yours" notification.
 */
export function maybeFireFriendWantsYours(
  from_uid: string,
  from_name: string,
  sticker_id: string,
  sticker_label: string,
  my_count: number,
  to_uid: string
): void {
  if (my_count < 2) return;
  const key = `wants_${from_uid}_${to_uid}_${sticker_id}_${todayKey()}`;
  const alerts = loadAlerts();
  if (alerts[key]) return;
  alerts[key] = Date.now();
  saveAlerts(alerts);

  notificationsLib.add({
    type: "friend_wants_yours" as notificationsLib.Notification["type"],
    emoji: "⭐",
    title: `${from_name} quiere ${sticker_label}`,
    body: `Tenés ${my_count}. ¿Querés ofrecerla?`,
    link: `/mercado?give=${sticker_id}&to=${from_uid}`,
  });
}

/**
 * Scans peer-mock state and fires any pending wishlist alerts for the current user.
 * Call once on app mount (e.g. from a client component).
 */
export function runWishlistAlertScan(
  myUid: string,
  myCollection: Record<string, number>
): void {
  const wishlist = loadWishlist();
  if (!wishlist.length) return;

  const peers = getMockPeers();

  for (const peer of peers) {
    for (const item of wishlist) {
      const peerCount = peer.collection[item.sticker_id] ?? 0;
      if (peerCount >= 2) {
        maybeFireWishlistAlert(
          peer.uid,
          peer.displayName,
          item.sticker_id,
          item.sticker_id, // Phase B: replace with catalog label
          peerCount,
          myUid
        );
      }
    }

    // "friend wants yours" direction
    for (const friendWishId of peer.wishlist) {
      const myCount = myCollection[friendWishId] ?? 0;
      if (myCount >= 2) {
        maybeFireFriendWantsYours(
          peer.uid,
          peer.displayName,
          friendWishId,
          friendWishId,
          myCount,
          myUid
        );
      }
    }
  }
}

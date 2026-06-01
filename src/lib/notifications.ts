/**
 * notifications.ts — client-side notification queue backed by localStorage.
 *
 * Schema:
 *   id        — random hex id
 *   type      — 'achievement' | 'friend_online' | 'trade_proposal' | 'system'
 *   title     — short human-readable title
 *   body      — supporting detail text
 *   emoji     — leading emoji (🏆 / 🟢 / 🤝 / 📣)
 *   ts        — unix ms timestamp
 *   read      — false on creation, true after markRead / markAllRead
 *   link      — optional in-app deep-link (e.g. '/achievements')
 *
 * Storage key: albumix.notifications
 * Cap:         50 most recent entries (FIFO trim on add)
 */

export interface Notification {
  id: string;
  type: "achievement" | "friend_online" | "trade_proposal" | "system";
  title: string;
  body: string;
  emoji: string;
  ts: number;
  read: boolean;
  link?: string;
}

const STORAGE_KEY = "albumix.notifications";
const MAX_NOTIFICATIONS = 50;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function load(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Notification[];
  } catch {
    return [];
  }
}

function save(notifications: Notification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // QuotaExceededError — trim to half and retry once
    const trimmed = notifications.slice(0, Math.floor(MAX_NOTIFICATIONS / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Give up silently — notifications are non-critical
    }
  }
}

function randomHex(bytes = 8): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns all notifications, newest first. */
export function getAll(): Notification[] {
  return load();
}

/** Returns count of unread notifications. */
export function getUnreadCount(): number {
  return load().filter((n) => !n.read).length;
}

/** Prepends a new notification. Auto-generates id, ts, and read=false. Caps at 50. */
export function add(
  n: Omit<Notification, "id" | "ts" | "read">
): void {
  const notifications = load();
  const newItem: Notification = {
    ...n,
    id: randomHex(8),
    ts: Date.now(),
    read: false,
  };
  const updated = [newItem, ...notifications].slice(0, MAX_NOTIFICATIONS);
  save(updated);
  notifySubscribers(updated);
}

/** Marks a single notification as read. No-op if id not found. */
export function markRead(id: string): void {
  const notifications = load().map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  save(notifications);
  notifySubscribers(notifications);
}

/** Marks all notifications as read. */
export function markAllRead(): void {
  const notifications = load().map((n) => ({ ...n, read: true }));
  save(notifications);
  notifySubscribers(notifications);
}

/** Removes all notifications. */
export function clear(): void {
  save([]);
  notifySubscribers([]);
}

// ---------------------------------------------------------------------------
// Pub/sub — cross-tab via storage event + same-tab via direct callbacks
// ---------------------------------------------------------------------------

type Subscriber = (notifications: Notification[]) => void;
const subscribers = new Set<Subscriber>();

/** Subscribes to notification changes. Returns an unsubscribe function. */
export function subscribe(cb: Subscriber): () => void {
  subscribers.add(cb);

  // Also listen for cross-tab storage events
  function onStorage(e: StorageEvent): void {
    if (e.key !== STORAGE_KEY) return;
    try {
      const updated = e.newValue ? (JSON.parse(e.newValue) as Notification[]) : [];
      cb(updated);
    } catch {
      // Malformed JSON — ignore
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    subscribers.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function notifySubscribers(notifications: Notification[]): void {
  subscribers.forEach((cb) => cb(notifications));
}

// ---------------------------------------------------------------------------
// TODO Phase 4: hook into Firebase RTDB onValue('/presence/{friendUid}')
//   when status flips online → add({ type: 'friend_online', emoji: '🟢',
//   title: '<name> está en línea', body: 'Entrá a intercambiar figuritas',
//   link: '/trade' })
//
// TODO Phase 4: hook into Firestore onSnapshot('/users/{me}/incoming_trades')
//   on new doc → add({ type: 'trade_proposal', emoji: '🤝',
//   title: '¡Nueva propuesta de cambio!', body: '<name> te ofrece figuritas',
//   link: '/trade' })
//
// TODO Phase 4: FCM service worker should post messages to the client →
//   listen here via BroadcastChannel or ServiceWorkerContainer.onmessage +
//   add to local notifications + show OS push via Notification API.
// ---------------------------------------------------------------------------

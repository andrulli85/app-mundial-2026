/**
 * IndexedDB schema for App Mundial 2026.
 * All user state lives here — no server, no auth.
 *
 * Stores:
 *   collection  — { sticker_id: string, count: number, acquired_at: number }
 *   profile     — { key: string, value: string }  (key='nickname' | 'color')
 *   trade_log   — { trade_id: string, ts: number, partner: string, gave: string[], received: string[] }
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface StickerEntry {
  sticker_id: string; // canonical ID from catalog (e.g. "mex-13")
  count: number; // 0 = missing, 1 = got, 2+ = duplicate
  acquired_at: number; // unix ms of last change
}

export interface ProfileEntry {
  key: string;
  value: string;
}

export interface TradeLogEntry {
  trade_id: string; // uuid v4
  ts: number; // unix ms
  partner: string; // partner nickname
  gave: string[]; // sticker_ids given
  received: string[]; // sticker_ids received
}

export interface AchievementEntry {
  id: string;         // badge id
  unlockedAt: number; // unix ms
}

interface MundialDB extends DBSchema {
  collection: {
    key: string;
    value: StickerEntry;
    indexes: Record<string, never>;
  };
  profile: {
    key: string;
    value: ProfileEntry;
    indexes: Record<string, never>;
  };
  trade_log: {
    key: string;
    value: TradeLogEntry;
    indexes: { by_ts: number };
  };
  achievements: {
    key: string;
    value: AchievementEntry;
    indexes: Record<string, never>;
  };
}

// ---------------------------------------------------------------------------
// Collection change event — allows achievement hook to react to sticker mutations
// without coupling db.ts to React or the achievement system.
// ---------------------------------------------------------------------------
type CollectionChangeListener = () => void;
const collectionChangeListeners = new Set<CollectionChangeListener>();

export function onCollectionChange(fn: CollectionChangeListener): () => void {
  collectionChangeListeners.add(fn);
  return () => collectionChangeListeners.delete(fn);
}

function emitCollectionChange(): void {
  collectionChangeListeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// DB init
// ---------------------------------------------------------------------------
let dbPromise: Promise<IDBPDatabase<MundialDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MundialDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MundialDB>("mundial-2026", 2, {
      upgrade(db, oldVersion) {
        // v1 stores — create only if they don't exist (safe for existing users)
        if (oldVersion < 1) {
          // Collection store — one entry per sticker
          db.createObjectStore("collection", { keyPath: "sticker_id" });

          // Profile store — key/value pairs for user preferences
          db.createObjectStore("profile", { keyPath: "key" });

          // Trade log — history of completed trades
          const tradeStore = db.createObjectStore("trade_log", {
            keyPath: "trade_id",
          });
          tradeStore.createIndex("by_ts", "ts");
        }

        // v2 — achievements store (new; existing users upgrading from v1 keep all their data)
        if (oldVersion < 2) {
          db.createObjectStore("achievements", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// --- Collection helpers ---

export async function getSticker(
  stickerId: string
): Promise<StickerEntry | undefined> {
  const db = await getDB();
  return db.get("collection", stickerId);
}

export async function setSticker(entry: StickerEntry): Promise<void> {
  const db = await getDB();
  await db.put("collection", entry);
}

export async function getAllStickers(): Promise<StickerEntry[]> {
  const db = await getDB();
  return db.getAll("collection");
}

export async function toggleSticker(stickerId: string): Promise<StickerEntry> {
  const db = await getDB();
  const existing = await db.get("collection", stickerId);
  const next: StickerEntry = {
    sticker_id: stickerId,
    count: existing ? (existing.count + 1) % 4 : 1, // 0→1→2→3→0 cycle
    acquired_at: Date.now(),
  };
  await db.put("collection", next);
  emitCollectionChange();
  return next;
}

export async function bulkSetStickers(entries: StickerEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("collection", "readwrite");
  await Promise.all([...entries.map((e) => tx.store.put(e)), tx.done]);
  emitCollectionChange();
}

// --- Profile helpers ---

export async function getProfile(key: string): Promise<string | null> {
  const db = await getDB();
  const entry = await db.get("profile", key);
  return entry?.value ?? null;
}

export async function setProfile(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put("profile", { key, value });
}

export async function getNickname(): Promise<string | null> {
  return getProfile("nickname");
}

export async function setNickname(nickname: string): Promise<void> {
  return setProfile("nickname", nickname);
}

// --- Trade log helpers ---

export async function logTrade(entry: TradeLogEntry): Promise<void> {
  const db = await getDB();
  await db.put("trade_log", entry);
}

export async function getRecentTrades(limit = 20): Promise<TradeLogEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("trade_log", "by_ts");
  return all.reverse().slice(0, limit);
}

// --- Utility ---

/** Returns 980-bit collection bitset as Uint8Array (123 bytes) */
export async function collectionBitset(
  stickerIds: string[]
): Promise<Uint8Array> {
  const db = await getDB();
  const all = await db.getAll("collection");
  const owned = new Set(all.filter((e) => e.count > 0).map((e) => e.sticker_id));
  const bytes = new Uint8Array(Math.ceil(stickerIds.length / 8));
  stickerIds.forEach((id, i) => {
    if (owned.has(id)) {
      bytes[Math.floor(i / 8)] |= 1 << i % 8;
    }
  });
  return bytes;
}

/** Returns 2-bit-per-sticker duplicate counts as Uint8Array (245 bytes) */
export async function collectionRepeBitset(
  stickerIds: string[]
): Promise<Uint8Array> {
  const db = await getDB();
  const all = await db.getAll("collection");
  const counts = new Map(all.map((e) => [e.sticker_id, e.count]));
  // 2 bits per sticker: 0=missing,1=got,2=repe×1,3=repe×2+
  const bytes = new Uint8Array(Math.ceil((stickerIds.length * 2) / 8));
  stickerIds.forEach((id, i) => {
    const c = Math.min(counts.get(id) ?? 0, 3);
    const bitPos = i * 2;
    bytes[Math.floor(bitPos / 8)] |= c << bitPos % 8;
  });
  return bytes;
}

/** Export full collection as JSON (for manual backup) */
export async function exportCollection(): Promise<string> {
  const db = await getDB();
  const [collection, profile] = await Promise.all([
    db.getAll("collection"),
    db.getAll("profile"),
  ]);
  return JSON.stringify({ v: 1, collection, profile, exported_at: Date.now() });
}

/** Import collection from JSON backup */
export async function importCollection(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (data.v !== 1) throw new Error("Unsupported backup version");
  await bulkSetStickers(data.collection);
  const db = await getDB();
  const tx = db.transaction("profile", "readwrite");
  await Promise.all([
    ...(data.profile as ProfileEntry[]).map((p) => tx.store.put(p)),
    tx.done,
  ]);
}

// --- Achievements helpers ---

/** Returns all unlocked badge ids */
export async function getUnlockedBadges(): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll("achievements");
  return all.map((e) => e.id);
}

/** Persists a badge as unlocked (idempotent — safe to call multiple times) */
export async function markBadgeUnlocked(id: string): Promise<void> {
  const db = await getDB();
  await db.put("achievements", { id, unlockedAt: Date.now() });
}

/** Returns all achievement entries with timestamps */
export async function getUnlockedBadgeEntries(): Promise<AchievementEntry[]> {
  const db = await getDB();
  return db.getAll("achievements");
}

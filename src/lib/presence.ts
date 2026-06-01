/**
 * presence.ts — Firebase RTDB presence system.
 *
 * Pattern (official Firebase):
 * 1. Watch /.info/connected
 * 2. On connect: write /presence/{uid} = { status: "online", lastChanged: serverTimestamp }
 * 3. On disconnect: onDisconnect().update({ status: "offline", lastChanged: serverTimestamp })
 *
 * RTDB handles cleanup natively via WebSocket close — no heartbeat needed.
 */

import {
  ref,
  onValue,
  onDisconnect,
  serverTimestamp,
  set,
} from "firebase/database";
import { getFirebase } from "./firebase";

interface PresenceData {
  status: "online" | "offline";
  lastChanged: number | null;
}

let presenceInitialized = false;

/**
 * Initialize presence for the current signed-in user.
 * Safe to call multiple times — idempotent.
 */
export function initPresence(): void {
  if (presenceInitialized) return;
  presenceInitialized = true;

  const fb = getFirebase();
  if (!fb) return;

  const uid = fb.auth.currentUser?.uid;
  if (!uid) return;

  const connectedRef = ref(fb.rtdb, ".info/connected");
  const presenceRef = ref(fb.rtdb, `/presence/${uid}`);

  onValue(connectedRef, (snap) => {
    if (!snap.val()) return; // not connected yet

    // Register what to do when we go offline (RTDB handles on WebSocket close)
    onDisconnect(presenceRef)
      .set({
        status: "offline",
        lastChanged: serverTimestamp(),
      })
      .then(() => {
        // We're connected — write online status
        set(presenceRef, {
          status: "online",
          lastChanged: serverTimestamp(),
        });
      });
  });
}

/**
 * Subscribe to another user's presence.
 * Returns an unsubscribe function.
 */
export function subscribeToPresence(
  uid: string,
  callback: (data: PresenceData | null) => void
): () => void {
  const fb = getFirebase();
  if (!fb) {
    callback(null);
    return () => {};
  }

  const presenceRef = ref(fb.rtdb, `/presence/${uid}`);

  const unsubscribe = onValue(presenceRef, (snap) => {
    if (!snap.exists()) {
      callback({ status: "offline", lastChanged: null });
      return;
    }
    const data = snap.val();
    callback({
      status: data.status === "online" ? "online" : "offline",
      lastChanged: typeof data.lastChanged === "number" ? data.lastChanged : null,
    });
  });

  return unsubscribe;
}

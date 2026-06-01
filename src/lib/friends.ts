/**
 * friends.ts — Firestore helpers for the friends system.
 *
 * Firestore schema:
 *   users/{uid}                — { displayName, photoURL, nicknameLegacy, createdAt, lastSeen }
 *   users/{uid}/friends/{fid} — { addedAt, displayName, photoURL }  (denormalized)
 *   invites/{token}            — { inviterUid, createdAt, expiresAt, claimed }
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "./firebase";

export interface Friend {
  uid: string;
  displayName: string;
  photoURL: string | null;
  addedAt: number; // unix ms
}

export interface InviteResult {
  token: string;
  url: string;
}

const BASE_URL = "https://app-mundial-2026-lemon.vercel.app";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function randomToken(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a 7-day invite link for the current user. */
export async function createInvite(): Promise<InviteResult | null> {
  const fb = getFirebase();
  if (!fb) return null;
  const uid = fb.auth.currentUser?.uid;
  if (!uid) return null;

  const token = randomToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await setDoc(doc(fb.db, "invites", token), {
    inviterUid: uid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    claimed: false,
  });

  return {
    token,
    url: `${BASE_URL}/friends/invite/${token}`,
  };
}

/**
 * Claim an invite token.
 * - Validates token exists, not claimed, not expired.
 * - Creates mutual friendship between inviter + claimer.
 * - Marks invite as claimed.
 * Returns the inviter uid on success, null on failure.
 */
export async function claimInvite(token: string): Promise<string | null> {
  const fb = getFirebase();
  if (!fb) return null;
  const claimerUid = fb.auth.currentUser?.uid;
  if (!claimerUid) return null;

  const inviteRef = doc(fb.db, "invites", token);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) return null;

  const data = inviteSnap.data();
  if (data.claimed) return null;

  const expiresAt: Timestamp = data.expiresAt;
  if (expiresAt.toMillis() < Date.now()) return null;

  const inviterUid: string = data.inviterUid;
  if (inviterUid === claimerUid) return null; // can't add yourself

  // Load both user profiles for denormalization
  const [inviterSnap, claimerSnap] = await Promise.all([
    getDoc(doc(fb.db, "users", inviterUid)),
    getDoc(doc(fb.db, "users", claimerUid)),
  ]);

  const inviterData = inviterSnap.data() ?? { displayName: "Desconocido", photoURL: null };
  const claimerData = claimerSnap.data() ?? { displayName: "Desconocido", photoURL: null };

  const now = serverTimestamp();

  // Mutual friendship — write both sides
  await Promise.all([
    setDoc(doc(fb.db, "users", inviterUid, "friends", claimerUid), {
      addedAt: now,
      displayName: claimerData.displayName,
      photoURL: claimerData.photoURL ?? null,
    }),
    setDoc(doc(fb.db, "users", claimerUid, "friends", inviterUid), {
      addedAt: now,
      displayName: inviterData.displayName,
      photoURL: inviterData.photoURL ?? null,
    }),
    setDoc(inviteRef, { claimed: true }, { merge: true }),
  ]);

  return inviterUid;
}

/** Add a one-sided friendship entry (used internally; claimInvite is preferred). */
export async function addFriend(friendUid: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  const uid = fb.auth.currentUser?.uid;
  if (!uid) return;

  const friendSnap = await getDoc(doc(fb.db, "users", friendUid));
  const friendData = friendSnap.data() ?? { displayName: "Desconocido", photoURL: null };

  await setDoc(doc(fb.db, "users", uid, "friends", friendUid), {
    addedAt: serverTimestamp(),
    displayName: friendData.displayName,
    photoURL: friendData.photoURL ?? null,
  });
}

/** Remove a friend from both sides. */
export async function removeFriend(friendUid: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  const uid = fb.auth.currentUser?.uid;
  if (!uid) return;

  await Promise.all([
    deleteDoc(doc(fb.db, "users", uid, "friends", friendUid)),
    deleteDoc(doc(fb.db, "users", friendUid, "friends", uid)),
  ]);
}

/**
 * Subscribe to the current user's friend list.
 * Calls callback with the full list on every change.
 * Returns an unsubscribe function.
 */
export function listFriends(
  callback: (friends: Friend[]) => void
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) {
    callback([]);
    return () => {};
  }
  const uid = fb.auth.currentUser?.uid;
  if (!uid) {
    callback([]);
    return () => {};
  }

  const friendsRef = collection(fb.db, "users", uid, "friends");
  const q = query(friendsRef);

  return onSnapshot(q, (snap) => {
    const friends: Friend[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName ?? "Desconocido",
        photoURL: data.photoURL ?? null,
        addedAt:
          data.addedAt instanceof Timestamp
            ? data.addedAt.toMillis()
            : Date.now(),
      };
    });
    callback(friends.sort((a, b) => a.displayName.localeCompare(b.displayName)));
  });
}

/**
 * auth.ts — Firebase Auth wrapper.
 * - signInWithGoogle: popup on desktop, redirect on mobile (pointer: coarse)
 * - signOut: clears Firebase session
 * - getCurrentUser: sync snapshot of current user
 * - onAuthChange: subscribe to auth state changes
 * - On first sign-in: migrates local nickname to Firestore users/{uid}
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebase } from "./firebase";
import { getNickname } from "./db";

export interface AppUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function toAppUser(user: User): AppUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    email: user.email,
  };
}

/**
 * Migrate local nickname to Firestore on first sign-in.
 * Creates users/{uid} with profile fields. Idempotent — skips if doc already exists.
 */
async function migrateProfileToFirestore(user: User): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;

  const userRef = doc(fb.db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const nicknameLegacy = await getNickname();
    await setDoc(userRef, {
      displayName: user.displayName ?? nicknameLegacy ?? user.email?.split("@")[0] ?? "unknown",
      photoURL: user.photoURL ?? null,
      nicknameLegacy: nicknameLegacy ?? null,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });
  } else {
    // Update lastSeen on subsequent sign-ins
    await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
  }
}

export async function signInWithGoogle(): Promise<AppUser | null> {
  const fb = getFirebase();
  if (!fb) return null;

  const provider = new GoogleAuthProvider();

  if (isMobile()) {
    // On mobile: redirect flow (better UX, no popup blocker issues)
    await signInWithRedirect(fb.auth, provider);
    return null; // page will redirect and come back
  } else {
    // On desktop: popup flow
    const result = await signInWithPopup(fb.auth, provider);
    await migrateProfileToFirestore(result.user);
    return toAppUser(result.user);
  }
}

/**
 * Call once on app mount to handle the redirect result after mobile sign-in.
 */
export async function handleRedirectResult(): Promise<AppUser | null> {
  const fb = getFirebase();
  if (!fb) return null;
  const result = await getRedirectResult(fb.auth);
  if (result?.user) {
    await migrateProfileToFirestore(result.user);
    return toAppUser(result.user);
  }
  return null;
}

export async function signOut(): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  await firebaseSignOut(fb.auth);
}

export function getCurrentUser(): AppUser | null {
  const fb = getFirebase();
  if (!fb) return null;
  const user = fb.auth.currentUser;
  return user ? toAppUser(user) : null;
}

export function onAuthChange(callback: (user: AppUser | null) => void): () => void {
  const fb = getFirebase();
  if (!fb) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(fb.auth, (user) => {
    callback(user ? toAppUser(user) : null);
  });
}

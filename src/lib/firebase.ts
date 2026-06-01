/**
 * firebase.ts — lazy-init Firebase app.
 * All env vars are NEXT_PUBLIC_FIREBASE_*. If any is missing, logs a warning
 * and returns null — callers must guard: if (!fb) return.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  getDatabase,
  type Database,
} from "firebase/database";

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  rtdb: Database;
}

let _firebase: FirebaseServices | null = null;

export function getFirebase(): FirebaseServices | null {
  if (_firebase) return _firebase;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!apiKey || !authDomain || !projectId || !appId) {
    if (typeof window !== "undefined") {
      console.warn(
        "[Albumix] Firebase env vars not set — social features disabled. " +
          "Set NEXT_PUBLIC_FIREBASE_* in .env.local to enable."
      );
    }
    return null;
  }

  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    databaseURL,
  };

  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  _firebase = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    rtdb: getDatabase(app),
  };

  return _firebase;
}

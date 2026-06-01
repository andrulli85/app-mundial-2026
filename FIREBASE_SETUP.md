# Firebase Setup for Albumix

This guide walks Andy through creating the Firebase project and wiring up the
social features (Auth, Firestore, Realtime Database).

## 1. Create Firebase project

1. Go to https://console.firebase.google.com
2. Click "Add project" → name it `albumix` (or `app-mundial-2026`)
3. Disable Google Analytics (not needed)

## 2. Enable Google Auth

1. In the Firebase console → Authentication → Sign-in method
2. Enable "Google" provider
3. Add authorized domains:
   - `app-mundial-2026-lemon.vercel.app` (production)
   - `localhost` (local dev)
   - Any Vercel preview domain you want to test on

## 3. Enable Firestore

1. Firestore Database → Create database
2. Choose "Production mode" (you will add rules below)
3. Region: `us-central1` (or closest to Chile — `southamerica-east1`)

## 4. Enable Realtime Database

1. Realtime Database → Create database
2. Choose "Production mode"
3. Same region as Firestore

## 5. Get config keys

1. Project Settings → General → Your apps → click the web `</>` icon
2. Register app (name: "Albumix Web")
3. Copy the config object — you need these values:

```
apiKey
authDomain
projectId
storageBucket
messagingSenderId
appId
```

4. For `databaseURL`: from Realtime Database → Data tab, copy the URL
   (format: `https://your-project-default-rtdb.firebaseio.com`)

## 6. Set env vars

### Local development (.env.local)

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

### Vercel production

In the Vercel dashboard → Project → Settings → Environment Variables, add the
same 7 keys for the Production environment.

## 7. Firestore security rules

Paste these in Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own profile
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      // Friends subcollection: user can read their own friends list
      // Friend can read their own entry (for denormalized data)
      match /friends/{friendUid} {
        allow read, write: if request.auth != null
          && (request.auth.uid == uid || request.auth.uid == friendUid);
      }
    }

    // Invites: anyone authenticated can read (to claim), only owner can create
    match /invites/{token} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.inviterUid == request.auth.uid;
      allow update: if request.auth != null
        && resource.data.claimed == false;
    }
  }
}
```

## 8. Realtime Database security rules

Paste these in Realtime Database → Rules:

```json
{
  "rules": {
    "presence": {
      "$uid": {
        // Only the user themselves can write their own presence
        ".write": "auth != null && auth.uid == $uid",
        // Any authenticated user can read presence (to show dots to friends)
        ".read": "auth != null"
      }
    }
  }
}
```

## 9. Verification smoke test

Once env vars are set and deployed:

1. Open https://app-mundial-2026-lemon.vercel.app/settings
2. Tap "Continuar con Google" — sign in with your Google account
3. Your name + photo should appear in the "Cuenta" section
4. "Amigos" row appears below the account section
5. Tap "Amigos" → /friends page opens with your avatar
6. Tap "Invitar por WhatsApp" — should open wa.me with invite link
7. On a second device/account: open the invite link → sign in → both sides
   see each other in /friends
8. With both apps open: green dot appears next to each friend name

## Architecture notes

- **Auth**: Google OAuth 2.0 via Firebase (popup on desktop, redirect on mobile)
- **Firestore**: stores user profiles + friends subcollection (denormalized for offline)
- **RTDB**: stores presence only (`/presence/{uid}` with `status + lastChanged`)
- **Invite flow**: 16-char hex token, 7-day TTL, single-use, mutual friendship on claim
- **Graceful degradation**: if env vars are unset, `getFirebase()` returns null and
  all social features are hidden — the sticker album works normally

## Free tier limits (Spark plan)

Domi + school friends won't hit these:
- Authentication: 10k sign-ins/month
- Firestore: 50k reads/day, 20k writes/day, 1 GB storage
- Realtime Database: 100 simultaneous connections, 1 GB storage, 10 GB/month transfer

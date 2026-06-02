import { test } from "@playwright/test";

/**
 * whitelist-google-handshake-bad-email — POST to /api/auth/whitelist-check with a
 * verified Firebase token whose email is NOT in WHITELIST_EMAILS should return 403 not_invited.
 *
 * This test requires a real, valid Firebase ID token signed by the correct project.
 * Without the Firebase Auth Emulator or a real token, we cannot produce a valid token
 * for a non-whitelisted email in CI.
 *
 * TODO(Andy): To activate this test, choose one of:
 *   A) Firebase Auth Emulator — run `firebase emulators:start --only auth` and produce
 *      a token via the emulator REST API. The emulator can issue tokens for any project.
 *   B) Real token fixture — sign in with a non-whitelisted Google account in a one-off
 *      script, capture the ID token, and inject it as FIREBASE_TEST_TOKEN_NON_WHITELISTED
 *      in CI. Tokens expire in 1 hour, so this requires periodic refresh.
 *
 * The server-side path IS covered by the JWKS verification logic in
 * src/lib/firebase-id-token.ts and the route handler in
 * src/app/api/auth/whitelist-check/route.ts. The logic chain is:
 *   valid token → emailVerified=true → !isWhitelisted(email) → 403 not_invited
 */

test.fixme(
  "POST /api/auth/whitelist-check with valid token for non-whitelisted email → 403 not_invited",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async () => {
    // Requires Firebase Auth Emulator or real token fixture.
    // See TODO above for activation instructions.
  }
);

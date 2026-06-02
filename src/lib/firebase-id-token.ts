/**
 * firebase-id-token.ts — Server-side Firebase ID Token verification via JWKS.
 *
 * Uses `jose` to verify tokens without firebase-admin (no service account needed).
 * Edge-compatible: jose uses Web Crypto under the hood, no Node-only APIs.
 *
 * Firebase ID tokens are RS256-signed JWTs. The public keys are fetched from
 * Google's JWKS endpoint for the Firebase securetoken service.
 *
 * Reference: https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

// Lazy-initialize so the JWKS fetch only happens on first call (not at module load).
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return _jwks;
}

export interface FirebaseTokenPayload {
  uid: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Verifies a Firebase ID token and extracts the user claims.
 *
 * Returns null on any failure (expired, wrong audience, bad signature, etc.)
 * so callers can return a clean 401 without try/catch complexity.
 *
 * @param idToken - Raw Firebase ID token string from the client.
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<FirebaseTokenPayload | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error(
      "[firebase-id-token] NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set"
    );
    return null;
  }

  try {
    const { payload } = await jwtVerify<
      JWTPayload & {
        email?: string;
        email_verified?: boolean;
        user_id?: string;
      }
    >(idToken, getJWKS(), {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email) {
      // No email claim — Google account without email is unexpected in this app
      return null;
    }

    return {
      uid: payload.user_id ?? payload.sub ?? "",
      email,
      emailVerified: payload.email_verified === true,
    };
  } catch (err) {
    // Log at debug level — failed verifications are not errors (expired tokens, etc.)
    if (process.env.NODE_ENV !== "production") {
      console.debug("[firebase-id-token] Token verification failed:", err);
    }
    return null;
  }
}

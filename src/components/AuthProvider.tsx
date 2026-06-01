"use client";

/**
 * AuthProvider — React context for Firebase Auth state.
 * Exposes useAuth() hook with { user, loading, signIn, signOut }.
 * Wrap the app root to make auth available everywhere.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthChange,
  signInWithGoogle,
  signOut,
  handleRedirectResult,
  type AppUser,
} from "@/lib/auth";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result (mobile sign-in returns here after Google redirect)
    handleRedirectResult().catch(console.error);

    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
      // Initialize RTDB presence when user is authenticated
      if (u) {
        import("@/lib/presence").then(({ initPresence }) => initPresence());
      }
    });

    return unsubscribe;
  }, []);

  const handleSignIn = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn: handleSignIn, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

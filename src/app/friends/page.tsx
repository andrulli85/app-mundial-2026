"use client";

/**
 * /friends — Main friends screen.
 * - User avatar + name at top
 * - Invite via WhatsApp button
 * - Scan QR link to /friends/add
 * - Live friend list from Firestore (onSnapshot) with PresenceDot
 *
 * Dark+gold migration: S126 batch 2.
 * Back-nav fix: router.back() replaces hardcoded /settings href.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import PresenceDot from "@/components/PresenceDot";
import { listFriends, createInvite, type Friend } from "@/lib/friends";
import { getMockPeers, type MockPeer } from "@/lib/peer-mock";

export default function FriendsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const mockPeers: MockPeer[] = getMockPeers();

  // Redirect unauthenticated users to settings to sign in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/settings");
    }
  }, [user, loading, router]);

  // Subscribe to friend list
  useEffect(() => {
    if (!user) return;
    const unsubscribe = listFriends(setFriends);
    return unsubscribe;
  }, [user]);

  const handleWhatsApp = async () => {
    const result = await createInvite();
    if (!result) return;
    const text = encodeURIComponent(
      `¡Hola! Te invito a Albumix para intercambiar figuritas del Mundial 2026 \u{1F3C6}⚽ ${result.url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full" style={{ backgroundColor: "var(--bg-1)" }}>
      {/* Header — dark, no green */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "var(--bg-1)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--fg-2)",
            fontSize: 22,
            lineHeight: 1,
            padding: "4px",
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ‹
        </button>
        <h1
          style={{
            fontSize: 17,
            fontWeight: 900,
            color: "var(--fg-1)",
            fontFamily: "var(--font-ui)",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Amigos
        </h1>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-5">
        {/* User card */}
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? "Tu avatar"}
              width={48}
              height={48}
              className="rounded-full w-12 h-12 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
              style={{ backgroundColor: "var(--gold)", color: "#111111" }}
            >
              {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold" style={{ color: "var(--fg-1)" }}>{user.displayName}</p>
            <p className="text-xs" style={{ color: "var(--fg-3)" }}>{user.email}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {/* WhatsApp — brand green #25D366 is legitimate here */}
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white"
            style={{
              backgroundColor: "#25D366",
              transition: "transform 0.1s, opacity 0.1s",
            }}
            onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)"; (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
            onPointerUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.opacity = ""; }}
            onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.opacity = ""; }}
          >
            <span className="text-base leading-none">📤</span>
            Invitar por WhatsApp
          </button>
          <a
            href="/friends/add"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
            style={{
              backgroundColor: "var(--bg-2)",
              color: "var(--fg-1)",
              border: "1.5px solid var(--line-gold)",
              textDecoration: "none",
            }}
          >
            <span className="text-base leading-none">📷</span>
            Escanear QR
          </a>
        </div>

        {/* Demo friends (mock peers) */}
        <section>
          <p
            className="mb-1"
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--fg-3)",
              fontFamily: "var(--font-ui)",
            }}
          >
            Demo · Amigos (simulado)
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--fg-3)" }}>
            Interacción de prueba hasta que actives Firebase
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--bg-2)", border: "1px solid var(--line)" }}
          >
            {mockPeers.map((peer, i) => (
              <Link
                key={peer.uid}
                href={`/friends/${peer.uid}`}
                data-testid={`friend-row-${peer.uid}`}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  textDecoration: "none",
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: "var(--bg-3)", color: "var(--gold)" }}
                >
                  {peer.displayName[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate" style={{ color: "var(--fg-1)" }}>
                    {peer.displayName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-3)" }}>
                    {peer.wishlist.length} en wishlist
                  </p>
                </div>
                <span style={{ fontSize: 16 }}>
                  {peer.status === "online" ? "🟢" : "🟡"}
                </span>
                <span className="text-sm" style={{ color: "var(--fg-3)" }} aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Friends list */}
        <section>
          <p
            className="mb-3"
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--fg-3)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {friends.length > 0
              ? `${friends.length} amigo${friends.length === 1 ? "" : "s"}`
              : "Sin amigos aún"}
          </p>

          {friends.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                backgroundColor: "var(--bg-2)",
                border: "2px dashed var(--line)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--fg-3)" }}>
                Agregá amigos con el botón de WhatsApp o escaneando su QR.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: "var(--bg-2)", border: "1px solid var(--line)" }}
            >
              {friends.map((friend, i) => (
                <div
                  key={friend.uid}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--line)" : "none" }}
                >
                  {friend.photoURL ? (
                    <img
                      src={friend.photoURL}
                      alt={friend.displayName}
                      width={36}
                      height={36}
                      className="rounded-full w-9 h-9 object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "var(--bg-3)", color: "var(--gold)" }}
                    >
                      {friend.displayName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate" style={{ color: "var(--fg-1)" }}>
                      {friend.displayName}
                    </p>
                  </div>
                  <PresenceDot uid={friend.uid} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

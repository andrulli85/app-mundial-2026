"use client";

/**
 * /friends — Main friends screen.
 * - User avatar + name at top
 * - Invite via WhatsApp button
 * - Scan QR link to /friends/add
 * - Live friend list from Firestore (onSnapshot) with PresenceDot
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
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <a
          href="/settings"
          className="text-white text-xl leading-none"
          aria-label="Volver a opciones"
        >
          ←
        </a>
        <h1 className="text-lg font-black text-white leading-none">Amigos</h1>
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
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: "#006847" }}
            >
              {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-800">{user.displayName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white shadow-sm active:opacity-80 transition-opacity"
            style={{ backgroundColor: "#25D366" }}
          >
            <span className="text-base leading-none">📤</span>
            Invitar por WhatsApp
          </button>
          <a
            href="/friends/add"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm shadow-sm active:opacity-80 transition-opacity"
            style={{
              backgroundColor: "#f0ece3",
              color: "#333",
              border: "2px solid #d1c9b8",
            }}
          >
            <span className="text-base leading-none">📷</span>
            Escanear QR
          </a>
        </div>

        {/* Demo friends (mock peers — Phase A) */}
        <section>
          <h2 className="font-bold text-gray-700 mb-1">
            Demo · Amigos (simulado)
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Interacción de prueba hasta que actives Firebase
          </p>
          <div
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ backgroundColor: "#ffffff" }}
          >
            {mockPeers.map((peer, i) => (
              <Link
                key={peer.uid}
                href={`/friends/${peer.uid}`}
                data-testid={`friend-row-${peer.uid}`}
                className={`flex items-center gap-3 px-4 py-3 ${i < mockPeers.length - 1 ? "border-b" : ""}`}
                style={{ borderColor: "#f0ece3", textDecoration: "none" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: "#006847" }}
                >
                  {peer.displayName[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
                    {peer.displayName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {peer.wishlist.length} en wishlist
                  </p>
                </div>
                <span style={{ fontSize: 16 }}>
                  {peer.status === "online" ? "🟢" : "🟡"}
                </span>
                <span className="text-gray-300 text-sm" aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Friends list */}
        <section>
          <h2 className="font-bold text-gray-700 mb-3">
            {friends.length > 0
              ? `${friends.length} amigo${friends.length === 1 ? "" : "s"}`
              : "Sin amigos aún"}
          </h2>

          {friends.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: "#ffffff", border: "2px dashed #d1c9b8" }}
            >
              <p className="text-gray-500 text-sm">
                Agregá amigos con el botón de WhatsApp o escaneando su QR.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden shadow-sm"
              style={{ backgroundColor: "#ffffff" }}
            >
              {friends.map((friend, i) => (
                <div
                  key={friend.uid}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < friends.length - 1 ? "border-b" : ""
                  }`}
                  style={{ borderColor: "#f0ece3" }}
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
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "#006847" }}
                    >
                      {friend.displayName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
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

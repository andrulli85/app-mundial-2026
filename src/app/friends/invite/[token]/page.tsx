"use client";

/**
 * /friends/invite/[token] — Invite claim page.
 * When a friend opens the invite link:
 * - If logged out: show sign-in prompt
 * - On sign-in (or already signed in): auto-claim the invite
 * - Redirect to /friends on success
 */

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import SignInButton from "@/components/SignInButton";
import { claimInvite } from "@/lib/friends";

type ClaimState = "idle" | "claiming" | "success" | "already_friends" | "error";

export default function InviteClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { user, loading } = useAuth();
  const [claimState, setClaimState] = useState<ClaimState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) return; // wait for sign-in
    if (claimState !== "idle") return;

    setClaimState("claiming");

    claimInvite(token)
      .then((friendUid) => {
        if (friendUid) {
          setClaimState("success");
          setMessage("Amigo agregado correctamente.");
          setTimeout(() => router.push("/friends"), 2000);
        } else {
          setClaimState("error");
          setMessage("Este link ya fue usado, expiró, o es tuyo.");
        }
      })
      .catch(() => {
        setClaimState("error");
        setMessage("Error al procesar el link. Pedile un link nuevo.");
      });
  }, [user, loading, token, claimState, router]);

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <a href="/" className="text-white text-xl leading-none" aria-label="Ir al álbum">
          ←
        </a>
        <h1 className="text-lg font-black text-white leading-none">Albumix</h1>
      </header>

      <main className="flex-1 px-4 py-10 flex flex-col items-center gap-6">
        {/* World cup ball */}
        <div className="text-6xl leading-none">⚽</div>

        <div className="text-center">
          <h2 className="text-xl font-black text-gray-800 mb-2">
            Invitación a Albumix
          </h2>
          <p className="text-sm text-gray-600">
            Te invitaron a intercambiar figuritas del Mundial 2026
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">Cargando...</div>
        ) : !user ? (
          <div className="w-full flex flex-col gap-4">
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: "#f0ece3" }}
            >
              <p className="text-sm text-gray-700 text-center">
                Conectate con Google para aceptar la invitación y ver las
                figuritas que tienen en común.
              </p>
            </div>
            <SignInButton />
          </div>
        ) : claimState === "claiming" ? (
          <div className="text-gray-500 text-sm">Procesando invitación...</div>
        ) : claimState === "success" ? (
          <div
            className="w-full rounded-2xl p-4 text-center"
            style={{ backgroundColor: "#d4edda" }}
          >
            <p className="font-semibold text-green-800">{message}</p>
            <p className="text-xs text-green-700 mt-1">
              Redirigiendo a tus amigos...
            </p>
          </div>
        ) : claimState === "error" ? (
          <div className="w-full flex flex-col gap-3">
            <div
              className="rounded-2xl p-4 text-center"
              style={{ backgroundColor: "#f8d7da" }}
            >
              <p className="font-semibold text-red-800">{message}</p>
            </div>
            <a
              href="/friends"
              className="w-full py-3 rounded-2xl font-semibold text-sm text-white text-center"
              style={{ backgroundColor: "#006847" }}
            >
              Ver mis amigos
            </a>
          </div>
        ) : null}
      </main>
    </div>
  );
}

"use client";

/**
 * /friends/add — QR scanner to add a friend by scanning their invite QR.
 * Also shows your own QR (InviteLinkCard) so the friend can scan you instead.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QrScanner from "@/components/QrScanner";
import InviteLinkCard from "@/components/InviteLinkCard";
import { claimInvite } from "@/lib/friends";
import { useAuth } from "@/components/AuthProvider";

const BASE_URL = "https://app-mundial-2026-lemon.vercel.app";

function extractToken(text: string): string | null {
  // Accept both full URL and raw token
  const urlPattern = new RegExp(`${BASE_URL.replace(".", "\\.")}/friends/invite/([a-f0-9]{16})`);
  const urlMatch = text.match(urlPattern);
  if (urlMatch) return urlMatch[1];
  // Raw 16-char hex token
  if (/^[a-f0-9]{16}$/.test(text.trim())) return text.trim();
  return null;
}

type ScanState = "idle" | "scanning" | "claiming" | "success" | "error";

export default function FriendsAddPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"scan" | "show">("scan");

  const handleScanResult = useCallback(
    async (text: string) => {
      if (scanState !== "idle" && scanState !== "scanning") return;

      const token = extractToken(text);
      if (!token) return; // not an invite QR, ignore

      setScanState("claiming");
      setMessage("Agregando amigo...");

      try {
        const friendUid = await claimInvite(token);
        if (friendUid) {
          setScanState("success");
          setMessage("Amigo agregado.");
          setTimeout(() => router.push("/friends"), 1500);
        } else {
          setScanState("error");
          setMessage("Link inválido, ya usado o expirado.");
          setTimeout(() => {
            setScanState("idle");
            setMessage("");
          }, 3000);
        }
      } catch {
        setScanState("error");
        setMessage("Error al agregar. Intentá de nuevo.");
        setTimeout(() => {
          setScanState("idle");
          setMessage("");
        }, 3000);
      }
    },
    [scanState, router]
  );

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full">
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: "#006847" }}
      >
        <a
          href="/friends"
          className="text-white text-xl leading-none"
          aria-label="Volver a amigos"
        >
          ←
        </a>
        <h1 className="text-lg font-black text-white leading-none">
          Agregar amigo
        </h1>
      </header>

      {/* Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: "#d1c9b8", backgroundColor: "#fafaf8" }}
      >
        <button
          onClick={() => setTab("scan")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === "scan" ? "text-green-700 border-b-2 border-green-700" : "text-gray-500"
          }`}
          style={tab === "scan" ? { borderBottomColor: "#006847", color: "#006847" } : {}}
        >
          📷 Escanear QR
        </button>
        <button
          onClick={() => setTab("show")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === "show" ? "text-green-700 border-b-2 border-green-700" : "text-gray-500"
          }`}
          style={tab === "show" ? { borderBottomColor: "#006847", color: "#006847" } : {}}
        >
          Mi QR
        </button>
      </div>

      <main className="flex-1 px-4 py-6 flex flex-col gap-4">
        {tab === "scan" ? (
          <>
            <p className="text-sm text-gray-600 text-center">
              Apuntá la cámara al QR de tu amigo para agregarlo.
            </p>

            {user ? (
              <QrScanner
                onResult={handleScanResult}
                active={scanState === "idle" || scanState === "scanning"}
              />
            ) : (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ backgroundColor: "#fff3cd", border: "2px solid #ffc107" }}
              >
                <p className="text-sm text-yellow-800">
                  Iniciá sesión con Google en Opciones para usar esta función.
                </p>
              </div>
            )}

            {message && (
              <div
                className={`rounded-xl px-4 py-3 text-sm text-center font-semibold ${
                  scanState === "success"
                    ? "bg-green-50 text-green-700"
                    : scanState === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                {message}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 text-center">
              Mostrá tu QR para que tu amigo te escanee.
            </p>
            {user ? (
              <InviteLinkCard />
            ) : (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ backgroundColor: "#fff3cd", border: "2px solid #ffc107" }}
              >
                <p className="text-sm text-yellow-800">
                  Iniciá sesión con Google en Opciones para generar tu QR.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

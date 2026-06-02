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

const BASE_URL = "https://albumix-app.vercel.app";

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
    <div
      className="flex flex-col flex-1 max-w-lg mx-auto w-full"
      style={{ background: "var(--bg-1)" }}
    >
      {/* Header */}
      <header
        className="sticky top-[54px] z-20 px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "var(--bg-1)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <a
          href="/friends"
          style={{
            color: "var(--fg-2)",
            fontSize: 20,
            lineHeight: 1,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 44,
            minHeight: 44,
          }}
          aria-label="Volver a amigos"
        >
          ←
        </a>
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
          Agregar amigo
        </h1>
      </header>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--line-strong)",
          backgroundColor: "var(--bg-2)",
        }}
      >
        <button
          onClick={() => setTab("scan")}
          style={{
            flex: 1,
            padding: "12px 0",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-ui)",
            background: "none",
            border: "none",
            borderBottom: tab === "scan" ? "2px solid var(--gold)" : "2px solid transparent",
            color: tab === "scan" ? "var(--gold)" : "var(--fg-3)",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          📷 Escanear QR
        </button>
        <button
          onClick={() => setTab("show")}
          style={{
            flex: 1,
            padding: "12px 0",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-ui)",
            background: "none",
            border: "none",
            borderBottom: tab === "show" ? "2px solid var(--gold)" : "2px solid transparent",
            color: tab === "show" ? "var(--gold)" : "var(--fg-3)",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          Mi QR
        </button>
      </div>

      <main className="flex-1 px-4 py-6 flex flex-col gap-4">
        {tab === "scan" ? (
          <>
            <p
              style={{
                fontSize: 14,
                color: "var(--fg-3)",
                textAlign: "center",
              }}
            >
              Apuntá la cámara al QR de tu amigo para agregarlo.
            </p>

            {user ? (
              <QrScanner
                onResult={handleScanResult}
                active={scanState === "idle" || scanState === "scanning"}
              />
            ) : (
              <div
                style={{
                  backgroundColor: "var(--bg-2)",
                  border: "1px solid var(--line-gold)",
                  borderRadius: "var(--r-lg)",
                  padding: "var(--s-6)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 14, color: "var(--fg-2)" }}>
                  Iniciá sesión con Google en Opciones para usar esta función.
                </p>
              </div>
            )}

            {message && (
              <div
                style={{
                  borderRadius: "var(--r-md)",
                  padding: "12px 16px",
                  fontSize: 14,
                  textAlign: "center",
                  fontWeight: 600,
                  fontFamily: "var(--font-ui)",
                  backgroundColor:
                    scanState === "success"
                      ? "rgba(0,162,75,0.12)"
                      : scanState === "error"
                      ? "rgba(228,0,43,0.12)"
                      : "var(--bg-3)",
                  border: `1px solid ${
                    scanState === "success"
                      ? "rgba(0,162,75,0.3)"
                      : scanState === "error"
                      ? "rgba(228,0,43,0.3)"
                      : "var(--line-strong)"
                  }`,
                  color:
                    scanState === "success"
                      ? "var(--green-bright)"
                      : scanState === "error"
                      ? "var(--red-bright)"
                      : "var(--fg-2)",
                }}
              >
                {message}
              </div>
            )}
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 14,
                color: "var(--fg-3)",
                textAlign: "center",
              }}
            >
              Mostrá tu QR para que tu amigo te escanee.
            </p>
            {user ? (
              <InviteLinkCard />
            ) : (
              <div
                style={{
                  backgroundColor: "var(--bg-2)",
                  border: "1px solid var(--line-gold)",
                  borderRadius: "var(--r-lg)",
                  padding: "var(--s-6)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 14, color: "var(--fg-2)" }}>
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

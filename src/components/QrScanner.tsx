"use client";

/**
 * QrScanner — opens the device camera and scans QR codes.
 * Uses @zxing/browser for cross-platform scanning.
 * Stream C wires onResult to decodeTradePayload.
 */

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

interface QrScannerProps {
  onResult: (text: string) => void;
  onError?: (err: Error) => void;
  active?: boolean;
}

export default function QrScanner({
  onResult,
  onError,
  active = true,
}: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!active) return;

    const reader = new BrowserQRCodeReader();
    let cancelled = false;

    (async () => {
      try {
        setStatus("scanning");
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err) => {
            if (cancelled) return;
            if (result) {
              onResult(result.getText());
            }
            if (err && err.name !== "NotFoundException") {
              console.warn("QR scan warning:", err);
            }
          }
        );
        controlsRef.current = controls;
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error(String(err));
        setStatus("error");
        setErrorMsg(e.message);
        onError?.(e);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setStatus("idle");
    };
  }, [active, onResult, onError]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-red-50 rounded text-red-600 text-sm text-center">
        <p className="font-semibold mb-1">No se pudo acceder a la cámara</p>
        <p className="text-xs opacity-75">{errorMsg}</p>
        <p className="text-xs mt-2 opacity-60">
          Asegurate de dar permiso de cámara en tu navegador.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto rounded overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full"
        style={{ aspectRatio: "1/1", objectFit: "cover" }}
        playsInline
        muted
        autoPlay
      />
      {/* Scan indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="border-2 border-white rounded w-2/3 h-2/3 opacity-50" />
      </div>
      {status === "scanning" && (
        <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs opacity-75">
          Apuntá al QR de tu amigo
        </div>
      )}
    </div>
  );
}

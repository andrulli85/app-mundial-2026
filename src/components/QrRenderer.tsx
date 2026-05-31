"use client";

/**
 * QrRenderer — renders a QR code for the given payload string.
 * Uses the `qrcode` library via canvas.
 * Stream C wires this to encodeTradePayload.
 */

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QrRendererProps {
  payload: string;
  size?: number;
}

export default function QrRenderer({ payload, size = 280 }: QrRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !payload) return;
    QRCode.toCanvas(canvasRef.current, payload, {
      width: size,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    }).catch((err) => {
      console.error("QR render error:", err);
    });
  }, [payload, size]);

  if (!payload) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded text-gray-400 text-sm"
        style={{ width: size, height: size }}
      >
        Sin datos
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded shadow-md"
      aria-label="Código QR para intercambio"
    />
  );
}

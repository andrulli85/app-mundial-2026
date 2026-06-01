"use client";

/**
 * TradeStatCard — a compact summary card for the trade analytics header.
 *
 * 4 of these render in a 2×2 grid in /trade/stats.
 * Dark theme: FUT dark palette matching the rest of the app.
 */

interface TradeStatCardProps {
  icon: string;
  label: string;
  value: number | string;
}

export default function TradeStatCard({ icon, label, value }: TradeStatCardProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl p-4 gap-1 text-center"
      style={{
        backgroundColor: "rgba(26,26,26,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {icon}
      </span>
      <span
        className="text-2xl font-black leading-tight"
        style={{ color: "#c2ef4e" }}
      >
        {value}
      </span>
      <span className="text-xs leading-snug" style={{ color: "#9ca3af" }}>{label}</span>
    </div>
  );
}

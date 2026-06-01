"use client";

/**
 * TradeStatCard — a compact summary card for the trade analytics header.
 *
 * 4 of these render in a 2×2 grid in /trade/stats.
 * Styled to match the app palette (green #006847 for primary accent,
 * white background for light cards within the dark-ish page).
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
      style={{ backgroundColor: "#fff", border: "1px solid #e5e0d6" }}
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {icon}
      </span>
      <span
        className="text-2xl font-black leading-tight"
        style={{ color: "#006847" }}
      >
        {value}
      </span>
      <span className="text-xs text-gray-500 leading-snug">{label}</span>
    </div>
  );
}

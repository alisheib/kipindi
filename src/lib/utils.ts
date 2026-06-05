import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ_NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatTzs(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `TZS ${sign}${TZ_NUMBER.format(Math.abs(value))}`;
}

export function formatTzsCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `TZS ${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `TZS ${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `TZS ${sign}${Math.round(abs / 1_000)}K`;
  return `TZS ${sign}${TZ_NUMBER.format(abs)}`;
}

export function formatNumber(value: number): string {
  return TZ_NUMBER.format(value);
}

export function hexToRgba(hex: string, alpha = 1): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16,
  );
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

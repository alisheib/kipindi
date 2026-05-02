"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatTzs, formatTzsCompact, formatNumber } from "@/lib/utils";

export type CountFormat = "number" | "tzs" | "tzs-compact" | "plain";

type CountUpProps = {
  value: number;
  durationMs?: number;
  format?: CountFormat;
  className?: string;
};

/**
 * Smooth easeOutCubic count-up, respecting prefers-reduced-motion.
 * Format prop is a preset string (Server → Client safe — no function props).
 */
export function CountUp({ value, durationMs = 1100, format = "number", className }: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const target = value;
    const from = fromRef.current;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const formatted = useMemo(() => {
    switch (format) {
      case "tzs":         return formatTzs(display);
      case "tzs-compact": return formatTzsCompact(display);
      case "plain":       return String(display);
      case "number":
      default:            return formatNumber(display);
    }
  }, [display, format]);

  return <span className={className}>{formatted}</span>;
}

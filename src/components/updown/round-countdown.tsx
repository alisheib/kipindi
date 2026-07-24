"use client";

import { useEffect, useState } from "react";

/**
 * Seconds remaining until `targetMs`, ticking client-side.
 *
 * ⚠️ Returns `null` until the first client effect runs, and callers render `--:--` for
 * that tick. Seeding the state from `Date.now()` — the obvious implementation — reads
 * the clock ONCE on the server during SSR and AGAIN on the client, so the two disagree
 * by however long the response took and React throws a hydration mismatch. (It did;
 * this is the fix, not a precaution.) A countdown is inherently client-only state and
 * must not participate in the server render.
 *
 * Lives here rather than inside the card so the card and the round detail page share
 * ONE implementation — two countdowns drifting apart by a second reads as broken.
 */
export function useCountdown(targetMs: number): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const compute = () => Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
    setLeft(compute());
    const id = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return left;
}

/** `--:--` on the server tick, so the markup is identical on both sides. */
export function mmss(s: number | null): string {
  return s == null ? "--:--" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The countdown as a standalone readout — used on the round detail page, where the
 * card's full countdown band would be redundant but the player still needs to see how
 * long is left. Same hook, same digits, same urgency rule as the card.
 */
export function RoundCountdown({ closesAtMs, label }: { closesAtMs: number; label: string }) {
  const left = useCountdown(closesAtMs);
  const running = left == null || left > 0;
  const urgent = left != null && left > 0 && left <= 30;
  return (
    <div className="text-right">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-faint">{label}</div>
      <div
        className={urgent ? "ud-count-pulse" : undefined}
        style={{
          fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700,
          fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em", lineHeight: 1.1,
          color: urgent ? "var(--no-300)" : running ? "var(--text)" : "var(--text-subtle)",
        }}
      >
        {mmss(left)}
      </div>
    </div>
  );
}

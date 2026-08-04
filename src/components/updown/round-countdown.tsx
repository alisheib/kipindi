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
export function useCountdown(targetMs: number, serverNowMs?: number): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    // ⛔ ANCHOR TO THE SERVER'S CLOCK WHEN WE HAVE IT (E-72).
    //
    // `Date.now()` is the DEVICE clock, and a handset running 40 seconds fast showed a
    // different countdown to the player standing beside it — on a 3-minute round that is a
    // fifth of the game, and it decides whether the Up/Down buttons look live. Worse, the
    // server settles against ITS clock, so a fast device would show time remaining on a round
    // whose bets `buyPosition` has already refused: the screen and the money path disagreeing
    // about the only deadline that matters.
    //
    // The offset is captured ONCE, on mount, against the instant the server rendered — not
    // re-measured per tick, which would make the digits jitter by the network latency.
    const offset = serverNowMs != null ? serverNowMs - Date.now() : 0;
    const compute = () => Math.max(0, Math.floor((targetMs - (Date.now() + offset)) / 1000));
    setLeft(compute());
    const id = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(id);
  }, [targetMs, serverNowMs]);
  return left;
}

/** `--:--` on the server tick, so the markup is identical on both sides. */
export function mmss(s: number | null): string {
  return s == null ? "--:--" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * D3 round-detail countdown POD — the boxed readout in the round header: 28px tabular
 * digits with the label beside them, in the kit's inset-pod chrome. Open rounds tick
 * live and pulse rose in the final 30s (reduced-motion turns the pulse off); once closed
 * it shows a static 00:00 in `--text-subtle`. Same shared hook as everywhere else.
 */
export function RoundCountdownPod({ closesAtMs, isOpen, label, serverNowMs }: { closesAtMs: number; isOpen: boolean; label: string; serverNowMs?: number }) {
  const left = useCountdown(closesAtMs, serverNowMs);
  const running = isOpen && (left == null || left > 0);
  const urgent = isOpen && left != null && left > 0 && left <= 30;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "var(--bg-inset)", border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)", borderRadius: "var(--r-md)" }}>
      <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">{label}</span>
      <span
        className={urgent ? "ud-count-pulse" : undefined}
        style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em", lineHeight: 1, color: urgent ? "var(--no-300)" : running ? "var(--text)" : "var(--text-subtle)" }}
      >
        {isOpen ? mmss(left) : "00:00"}
      </span>
    </div>
  );
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

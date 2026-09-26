"use client";

/**
 * The Up & Down band's countdown ring — landing v3, WP12.
 *
 * ⭐ THE ONLY PART OF THE LANDING PAGE THAT RE-RENDERS EVERY SECOND (WP15). The band around it is a
 * server render; this leaf owns the digits and the ring and nothing else, on the page's ONE shared
 * second (`useTickSeconds` → `subscribeSecond`), anchored to the SERVER's clock so a handset running
 * fast shows the same time as the one beside it (E-72). Before hydration it paints `--:--` on both
 * sides, so the server and client markup agree (the same rule the /updown card follows).
 *
 * It counts to the moment BETTING closes on this round — the deadline a reader can act on, and the
 * one the /updown board card counts to while a round is open.
 *
 * ⛔ THE ONLY LOOP IS THE FINAL 30 SECONDS: `ud-count-pulse`, an opacity fade that already has its
 * reduced-motion branch (law 42 — the countdown is the only permitted urgency). The ring's arc moves
 * once a second because the time did, never by a transition.
 *
 * ── WHEN BETTING CLOSES (v3 review) ────────────────────────────────────────────────────────────
 * - The digits become an em-dash pair, not "0:00": a zeroed clock reads as a thing that should have
 *   happened and did not — the /updown card's own rule for a clock with nothing left to count.
 * - Closed is decided by EITHER clock. The server anchor is replayed as-is when the App Router restores
 *   "/" from its cache on Back, so the offset would absorb the whole time spent away and count a shut
 *   round as open; the device clock is the backstop. A fast device hides UP/DOWN a little early —
 *   harmless, the band keeps its link to every round — never late.
 * - UP/DOWN hide with it (`data-closed` + `:has()` in globals.css). If keyboard focus was on one of
 *   them it moves to the band's "all rounds" link first, so focus never falls to <body> unannounced.
 */
import { useEffect, useRef } from "react";
import { useTickSeconds } from "@/components/updown/round-countdown";
import { cn } from "@/lib/utils";

function digits(left: number): string {
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function UpdownRing({
  opensAtMs, targetMs, serverNowMs, capOpen, capClosed,
}: {
  opensAtMs: number;
  /** When betting closes on this round. */
  targetMs: number;
  serverNowMs: number;
  /** "Betting closes in" — the caption while the round takes bets. */
  capOpen: string;
  /** "Selections closed" — once it does not. */
  capClosed: string;
}) {
  const left = useTickSeconds(targetMs, serverNowMs, true, null);
  const ref = useRef<HTMLDivElement>(null);
  const total = Math.max(1, Math.round((targetMs - opensAtMs) / 1000));
  // `left` ticks every second, so re-reading the device clock here is re-evaluated on every tick.
  const closed = left != null && (left <= 0 || Date.now() >= targetMs);
  const pct = left == null ? 100 : closed ? 0 : Math.max(0, Math.min(100, (left / total) * 100));
  const text = left == null ? "--:--" : closed ? "—:—" : digits(left);
  const urgent = !closed && left != null && left <= 30;

  useEffect(() => {
    if (!closed) return;
    const band = ref.current?.closest(".kp-updown");
    const active = document.activeElement;
    if (band && active instanceof HTMLElement && active.classList.contains("kp-updown__bet") && band.contains(active)) {
      band.querySelector<HTMLElement>(".kp-updown__all")?.focus();
    }
  }, [closed]);

  return (
    <div ref={ref} className="kp-udring" role="timer" aria-label={closed ? capClosed : `${capOpen} ${text}`} data-closed={closed || undefined}>
      <span className="kp-udring__dial" aria-hidden>
        <svg viewBox="0 0 36 36" className="kp-udring__svg">
          <circle className="kp-udring__track" cx="18" cy="18" r="16" pathLength={100} />
          <circle className="kp-udring__arc" cx="18" cy="18" r="16" pathLength={100} strokeDasharray={`${pct} 100`} />
        </svg>
        <span className={cn("kp-udring__digits", urgent && "ud-count-pulse")}>{text}</span>
      </span>
      {/* The caption sits UNDER the dial, not inside it: "Dau linafungwa baada ya" holds a ten-letter
          word that cannot fit the ring's 72px interior at the label rung, and would clip (V2). */}
      <span className="kp-udring__cap" aria-hidden>{closed ? capClosed : capOpen}</span>
    </div>
  );
}

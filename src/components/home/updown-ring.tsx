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
 * When betting closes the band's UP/DOWN buttons hide (`data-closed` + `:has()` in globals.css): a
 * button into a round that no longer takes bets is an invitation the page cannot honour.
 */
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
  const total = Math.max(1, Math.round((targetMs - opensAtMs) / 1000));
  const closed = left != null && left <= 0;
  const pct = left == null ? 100 : Math.max(0, Math.min(100, (left / total) * 100));
  const text = left == null ? "--:--" : digits(Math.max(0, left));
  const urgent = left != null && left > 0 && left <= 30;
  return (
    <div className="kp-udring" role="timer" aria-label={`${closed ? capClosed : capOpen} ${text}`} data-closed={closed || undefined}>
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

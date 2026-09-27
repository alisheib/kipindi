"use client";

/**
 * THE MATCH'S CLOCK DIGITS — time left to bet, "01:52" (landing v3, R5 · spec updown-band-v2 §4.2).
 *
 * ⭐ THE ONLY PER-SECOND RENDER ON THE PAGE BESIDES THE PLAYHEAD (amended WP15). It ticks on the page's
 * ONE shared second (`useTickSeconds` → `subscribeSecond`), anchored to the SERVER's clock (E-72) through
 * the band's one replay-safe anchor, so it flips in the same frame as the playhead and the closed flag.
 *
 * ⭐ SEEDED (I-15): the server and the first client paint show the same real mm:ss — never `--:--` —
 * because the seed is the anchor, which is exactly the server's instant until the page is replayed.
 *
 * ⛔ Never rose or green (§B2a): the digits are `--text`, and they leave with the whole clock row at
 * close. No pulse on the landing (I-13): the page keeps one loop, the live dot.
 * `role="timer"` is not live, so a screen reader reads it once, on arrival — never a second-by-second
 * announcement. The visible caption beside it is aria-hidden, so the sentence is read exactly once.
 */
import { mmss, useTickSeconds } from "@/components/updown/round-countdown";
import { fill } from "@/lib/utils";
import { useMatch } from "./updown-match-state";

/** `aria` is the dictionary's "Dau linafungwa baada ya dakika {m} na sekunde {s}": read once, mm:ss alone could
 *  be heard as a clock time ("baada ya 8:56"), beside the band's own "saa 19:38" (frame panel round 2). */
export function UpdownMatchDigits({ aria }: { aria: string }) {
  const { round, anchorMs } = useMatch();
  const left = useTickSeconds(round.betsCloseAtMs, anchorMs, true, anchorMs);
  const text = mmss(left);                                   // "01:52" — fixed width, the card's format
  const secs = Math.max(0, Math.floor(left ?? 0));
  return (
    <span className="kp-udclock__digits" role="timer" aria-label={fill(aria, { m: Math.floor(secs / 60), s: secs % 60 })}>
      {text}
    </span>
  );
}

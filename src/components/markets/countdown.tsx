/** Countdown timer — kit/microstructure.jsx Countdown port. */
"use client";

import { memo, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { I } from "@/components/ui/glyphs";
// ⭐ ONE INTERVAL FOR THE PAGE, not one per clock. This component used to arm its own; see the
// file header there for what a private timer per clock costs the low-end handset, and for the
// one thing it deliberately does NOT change (a hidden tab is still left to drift).
import { subscribeSecond } from "@/lib/use-shared-second";

function diff(toIso: string, offset: number) {
  const ms = Math.max(0, Date.parse(toIso) - (Date.now() + offset));
  const d = Math.floor(ms / (24 * 3600_000));
  const h = Math.floor((ms / 3600_000) % 24);
  const m = Math.floor((ms / 60_000) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return { d, h, m, s };
}

/**
 * B-10 — two defects lived here:
 *  · the first paint was hard-zeros ("00 00 00 00") until hydration — on a 2G
 *    hydration lag the player stared at a dead clock on a live market;
 *  · every tick ran on the raw device clock, so a phone a few minutes off
 *    showed a live market as closed (or the reverse).
 * Now the TRUE remainder renders on the server (server clock — authoritative),
 * the client's first paint recomputes it synchronously, and ticks are corrected
 * by a once-captured offset against the server's own `serverNow` stamp.
 * suppressHydrationWarning stays on every cell: SSR and hydration are moments
 * apart by construction, and a minute/hour boundary can legally flip any cell
 * between the two paints.
 */
export function Countdown({ to, label, serverNow, at }: { to: string; label?: string; serverNow?: number; at?: string }) {
  const { t } = useT();
  const resolvedLabel = label ?? t.common.closesIn;
  // Captured ONCE (server render: offset ≈ 0 against its own clock; client
  // hydration: the device-vs-server skew). Recomputing per render would let the
  // offset decay as Date.now() advances past the fixed serverNow stamp.
  const [offset] = useState(() => (serverNow != null ? serverNow - Date.now() : 0));
  const [time, set] = useState(() => diff(to, offset));
  useEffect(() => {
    // ⛔ STILL A DERIVATION, NEVER A DECREMENT — every tick recomputes the remainder from the
    // offset-corrected absolute clock, so a throttled or skipped wake-up cannot accumulate drift.
    // ⭐ AND IT BAILS WHEN NOTHING MOVED. `diff` returns a fresh OBJECT every call, so
    // `set(diff(…))` re-rendered unconditionally — including for the whole time a clock sits at
    // `00 00 00 00` after `Math.max(0, …)` has clamped it, which on a closed market is for ever.
    // Comparing the four fields is what lets an expired clock go quiet. (What stops the
    // days/hours/minutes CELLS repainting on the other 59 ticks in 60 is the `memo` below.)
    const apply = () => set((prev) => {
      const next = diff(to, offset);
      return prev.d === next.d && prev.h === next.h && prev.m === next.m && prev.s === next.s
        ? prev : next;
    });
    apply();
    return subscribeSecond(apply);
  }, [to, offset]);

  return (
    <div>
      {/* ⭐ THE LABEL ROW NAMES THE INSTANT — Jay (Gaming Board) item #6. A player reading
          "170 DAYS" should not have to work out which day that is.
          ⚠️ `flex-wrap` IS the design, not a fallback. Swahili's "Uchaguzi unafungwa baada ya"
          is 27 characters against English's 19, so label + date exceeds a 360px panel and the
          date drops to its own line — which is the layout the date would have had anyway.
          At 393 in EN/ZH the two share one line. Measured, not assumed.
          ⛔ Both spans read `text-micro`, never `text-[10px]`: `test:type-scale` §4's
          arbitrary-size ratchet may only SHRINK, so this row RETURNS one rather than
          spending two. `text-micro` IS 10px, and `tracking-[0.12em]` overrides its built-in
          0.4px exactly as before — the label renders pixel-for-pixel what it did. The date
          takes the ladder's own spacing and so adds no `tracking-` utility either (§6). */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-warning-fg">{resolvedLabel}</span>
        {/* ⭐ A <time> WITH THE MACHINE-READABLE INSTANT, not a styled span. `dateTime` carries
            the SAME `to` the clock counts down to, which is what lets a live driver assert the
            date NAMES the right moment rather than merely that some date is present — a date
            that is correct in every way except which deadline it is about reads as completely
            right. It is also the semantically correct element for a timestamp, so a screen
            reader gets the instant rather than an abbreviation. */}
        {at && (
          <time dateTime={to} data-testid="timer-date" className="inline-flex items-center gap-1 font-mono text-micro text-text-subtle" suppressHydrationWarning>
            <I.calendarClock s={11} className="shrink-0" />
            {at}
          </time>
        )}
      </div>
      <div className="flex gap-2">
        <Cell v={time.d} unit={t.common.days} />
        <Cell v={time.h} unit={t.common.hours} />
        <Cell v={time.m} unit={t.common.minsUnit} />
        <Cell v={time.s} unit={t.common.secsUnit} />
      </div>
    </div>
  );
}

/**
 * ⭐ MEMOISED, so a second's passing repaints the SECONDS and not the whole clock.
 *
 * Four cells re-rendered every tick to change one digit. `v` and `unit` are both primitives, so
 * the days/hours/minutes cells now bail out on 59 ticks in 60 — the same "push the tick down to
 * the digits" rule the Up & Down pod follows. ⛔ Purely a skip: the markup, the
 * `suppressHydrationWarning` and the padding are untouched.
 */
const Cell = memo(function Cell({ v, unit }: { v: number; unit: string }) {
  return (
    <div className="flex flex-col items-center min-w-[56px]">
      <div
        className="font-mono font-bold text-[28px] tabular-nums leading-none rounded-md border border-border bg-bg-elevated px-3 py-2.5 min-w-[48px] text-center text-text"
        style={{ letterSpacing: "-0.04em" }}
        // SSR and hydration are moments apart; the seconds cell (and, at a
        // boundary, any cell) legally differs between the two paints. This is
        // the React-blessed escape for exactly that.
        suppressHydrationWarning
      >
        {String(v).padStart(2, "0")}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mt-1.5">{unit}</div>
    </div>
  );
});

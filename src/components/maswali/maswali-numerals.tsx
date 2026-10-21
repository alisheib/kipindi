import type { ReactNode } from "react";
import { eatClock, eatWeekday } from "@/components/maswali/maswali-format";
import type { Dict } from "@/lib/i18n-dict";

/**
 * A TIME AND A DATE AS THE READER READS THEM — the lead's L7 ruling (2026-10-21: "the weekday in the body face, the clock a
 * .mono numeral") and §T5 ("every numeral … including numbers inside body sentences when they are data"), for the hub's
 * times and dates that are not fact lines (its close line, its event times, its strip's ranges, its timed sentences).
 * MASWALI-BUILD S5-DESIGN-HUB.
 * ⭐ `.mono` (globals.css: the numerals' face, tabular figures) on each numeral run, the words left in the sentence's face.
 * A fact line's numerals are the fact line's own (S5-DESIGN-DOORS' `numeralRuns`, which never sets a `.mono` twice), so
 * the two meet without either setting a run twice.
 */

/** A phrase's numerals — a clock, a day, a year, a count — each a `.mono` run; every word left as it stands. */
export function numeralFace(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\d+(?:[:.,/]\d+)*/g)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(<span key={at} className="mono">{m[0]}</span>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : out;
}

/** "Ijumaa 18:00": the weekday in the sentence's face, the clock a `.mono` numeral — one unbreakable run. `dayClass` names
 *  the weekday's own span (the close line lets it step aside in the last hour, `.kp-mln-close-day`). */
export function weekdayClock(t: Dict, atMs: number, { className, dayClass }: { className?: string; dayClass?: string } = {}): ReactNode {
  return (
    <span className={className ? `whitespace-nowrap ${className}` : "whitespace-nowrap"}>
      <span className={dayClass}>{eatWeekday(t, atMs)} </span>
      <span className="mono">{eatClock(atMs)}</span>
    </span>
  );
}

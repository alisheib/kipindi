import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MaswaliFacts, factsOf } from "@/components/maswali/maswali-facts";
import { eatRange, eatWeekday, eatWeekdayClock } from "@/components/maswali/maswali-format";
import { numeralFace } from "@/components/maswali/maswali-numerals";
import type { Dict } from "@/lib/i18n-dict";

/**
 * THE WEEK STRIP — three phases in plain words, nothing ticking (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.3; the v6
 * delivery's U-hub frames).
 *
 *   Mauzo                                  Matukio                    Matokeo na malipo
 *   Jumatatu 00:01 – Ijumaa 18:00 EAT      Jumamosi 09:00 – Jumapili  Jumapili – Jumatatu
 *
 * A compact vertical list at a phone's width, a dot marking the phase the week is in; from `md` three columns, each
 * under a 2px rule, the current one in brand. The current phase reads in the text's ink, the others muted.
 * ⭐ S5 VIS P4 — EACH PHASE IS ITS LABEL, THEN ITS RANGE, AT EVERY WIDTH, AND A RANGE IS KEPT WHOLE: its start and its
 * end are each one unbreakable run, the dash held to the start ("Jumatatu 00:01 –" · "Ijumaa 18:00 EAT"), so a range
 * stands on one line wherever its line can hold it and can only ever break after its dash — never "Friday 18:00" /
 * "EAT", "Sunday" / "– Monday" or "Saturday 09:00 –" / "Sunday", as the label-and-range line once broke at 768 and 1280.
 * The label and the range are a stacked fact line (`maswali-facts.tsx`): a screen reader hears "Sales · Monday 00:01 –
 * Friday 18:00 EAT", the words the strip always said. The hub gives the strip its full width from 1280, so the three
 * ranges never meet their columns' edge there either.
 * ⛔ No countdown and no clock that moves (the countdown lives on the slip and the buy block only, §10 §8). Every
 * instant is the week's own, said in East Africa Time (`maswali-format.ts`), so the strip names no day of its own: a
 * week whose close moved prints the moved close.
 */
export type WeekPhases = {
  salesFrom: number; salesTo: number;
  eventsFrom: number; eventsTo: number;
  resultsFrom: number; resultsTo: number;
};

/** A phase from its dictionary words ("Mauzo · {range} EAT"): the label, and the range with what follows it ("EAT")
 *  held to the range's end. `ends` is the start and the end — or one day alone. Each clock a `.mono` numeral, each
 *  weekday the body's (the lead's L7 ruling, §T5). */
function phaseOf(template: string, ends: readonly string[]): { label: string; range: ReactNode } {
  const [label = "", part = "{range}"] = factsOf(template);
  const [before = "", after = ""] = part.split("{range}");
  const last = `${ends[ends.length - 1] ?? ""}${after}`;
  const range = ends.length < 2
    ? <span className="whitespace-nowrap">{numeralFace(`${before}${last}`)}</span>
    : (
      <>
        <span className="whitespace-nowrap">{numeralFace(`${before}${ends[0]} –`)}</span>
        {" "}
        <span className="whitespace-nowrap">{numeralFace(last)}</span>
      </>
    );
  return { label, range };
}

export function MaswaliWeekStrip({ t, phases, current, className }: {
  t: Dict;
  phases: WeekPhases;
  /** The phase the week is in (0 sales, 1 events, 2 results and payout), or null for a timeline with no "now" (How to play). */
  current: 0 | 1 | 2 | null;
  className?: string;
}) {
  const sameDay = (a: number, b: number) => eatWeekday(t, a) === eatWeekday(t, b);
  // The sales range is `eatRange`'s (a whole day at midnight reads as its weekday), split back at the one dash it sets.
  const rows = [
    phaseOf(t.millionea.stripSales, eatRange(t, phases.salesFrom, phases.salesTo).split(" – ")),
    phaseOf(t.millionea.stripEvents, [eatWeekdayClock(t, phases.eventsFrom), eatWeekday(t, phases.eventsTo)]),
    phaseOf(t.millionea.stripResults, sameDay(phases.resultsFrom, phases.resultsTo)
      ? [eatWeekday(t, phases.resultsFrom)]
      : [eatWeekday(t, phases.resultsFrom), eatWeekday(t, phases.resultsTo)]),
  ];
  return (
    <ol className={cn("flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3", className)} data-testid="millionea-week-strip">
      {rows.map((row, i) => {
        const now = current === i;
        return (
          <li
            key={i}
            aria-current={now ? "step" : undefined}
            className={cn(
              "flex items-baseline gap-2 md:border-t-2 md:pt-1.5",
              now ? "md:border-brand-400" : "md:border-border-strong",
            )}
          >
            {/* ⭐ S5-DESIGN-HUB L18 (§A4: never colour alone) · the phase the week is in is a FILLED dot, every other one a
                hollow ring — a shape as well as an ink — at every width (the rule over each column from 768 is the ink's). */}
            <span
              aria-hidden
              className={cn("relative -top-px h-1.5 w-1.5 shrink-0 rounded-full", now ? "bg-brand-400" : "border border-border-strong")}
              data-phase-mark={now ? "now" : "other"}
            />
            <span className={cn("min-w-0 text-body-sm", now ? "text-text" : "text-text-muted")}>
              {/* L2 (§T5: every numeral is mono, times in a sentence too) · the range's clocks are `.mono` numerals and its
                  weekdays the body's, as the hub's close and each event's time are set (the lead's L7 ruling) — the label
                  stays the body's. */}
              <MaswaliFacts layout="stack" facts={[<span key="label" className="font-medium">{row.label}</span>, <span key="range" data-range="">{row.range}</span>]} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

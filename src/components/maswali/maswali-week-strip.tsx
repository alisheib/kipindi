import { cn, fill } from "@/lib/utils";
import { eatRange, eatWeekday, eatWeekdayClock } from "@/components/maswali/maswali-format";
import type { Dict } from "@/lib/i18n-dict";

/**
 * THE WEEK STRIP — three phases in plain words, nothing ticking (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.3; the v6
 * delivery's U-hub frames).
 *
 *   Mauzo · Jumatatu – Ijumaa 18:00 EAT
 *   Matukio · Ijumaa 19:30 – Jumapili
 *   Matokeo na malipo · Jumatatu – Jumanne
 *
 * A compact vertical list at a phone's width, a dot marking the phase the week is in; from `md` three columns, each
 * under a 2px rule, the current one in brand. The current phase reads in the text's ink, the others muted.
 * ⛔ No countdown and no clock that moves (the countdown lives on the slip and the buy block only, §10 §8). Every
 * instant is the week's own, said in East Africa Time (`maswali-format.ts`), so the strip names no day of its own: a
 * week whose close moved prints the moved close.
 */
export type WeekPhases = {
  salesFrom: number; salesTo: number;
  eventsFrom: number; eventsTo: number;
  resultsFrom: number; resultsTo: number;
};

export function MaswaliWeekStrip({ t, phases, current, className }: {
  t: Dict;
  phases: WeekPhases;
  /** The phase the week is in (0 sales, 1 events, 2 results and payout), or null for a timeline with no "now" (How to play). */
  current: 0 | 1 | 2 | null;
  className?: string;
}) {
  const sameDay = (a: number, b: number) => eatWeekday(t, a) === eatWeekday(t, b);
  const rows = [
    fill(t.millionea.stripSales, { range: eatRange(t, phases.salesFrom, phases.salesTo) }),
    fill(t.millionea.stripEvents, { range: `${eatWeekdayClock(t, phases.eventsFrom)} – ${eatWeekday(t, phases.eventsTo)}` }),
    fill(t.millionea.stripResults, {
      range: sameDay(phases.resultsFrom, phases.resultsTo)
        ? eatWeekday(t, phases.resultsFrom)
        : `${eatWeekday(t, phases.resultsFrom)} – ${eatWeekday(t, phases.resultsTo)}`,
    }),
  ];
  return (
    <ol className={cn("flex flex-col gap-1.5 md:grid md:grid-cols-3 md:gap-3", className)}>
      {rows.map((text, i) => {
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
            <span aria-hidden className={cn("relative -top-px h-1.5 w-1.5 shrink-0 rounded-full md:hidden", now ? "bg-brand-400" : "bg-border-strong")} />
            <span className={cn("text-body-sm", now ? "text-text" : "text-text-muted")}>{text}</span>
          </li>
        );
      })}
    </ol>
  );
}

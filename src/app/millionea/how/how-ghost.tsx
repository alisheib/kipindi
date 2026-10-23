"use client";

import { PageContainer } from "@/components/layout/page-container";
import { GhostBar, GhostCard, GhostLine, GhostTextLine, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-dict";

/**
 * /millionea/how loading skeleton — the page's own bands (`page.tsx`), in its order, each in the page's own type: a line of
 * words is the kit's bar inside the very line box those words fill (`GhostTextLine`, the hub's drawing's rule), so every
 * band is the page's height and the next band lands where it was drawn. Its head; the four numbered steps at /fairness's
 * reading measure, each its lines of body type; the week's timeline as the strip draws it (three phases, each a dot's
 * place and its label over its range, a column each from 768); the examples' heading and the swap's card at the receipt's
 * measure — its title, the seal line's three rows (the ten sockets at their own fluid size, their numbers with the voided
 * main's kept second line, the five reserves over their labels), the caption's lines, and the button at the kit's own
 * control height (`--h-control-md`, the one the example's `<Button size="md">` resolves to — never a numeric utility: the
 * product's spacing scale is overridden, and `h-10` drew it at 80px). Wordless but for the screen reader's "loading"
 * (`maswali-ghost.tsx` says why). Measured by `qa:maswali-register-shots`' how-ghost hop, band by band.
 */

/** How many lines a paragraph's words take below 360, from 360 (the phone's column) and from 768 (the reading measure). */
type Tiers = readonly [below360: number, from360: number, from768: number];
/** The lines each of the four steps takes in each language, as the page's are measured (`qa:maswali-register-shots`,
 *  how-ghost, on the runner with the phones' Chinese face — DESIGN_AUTHORITY §M4a rule 5; S5-R3-FIX F6, 2026-10-23, where
 *  the Windows reading put English's third step and Swahili's second on one line from 768 and Swahili's fourth on three
 *  below 360): the drawing knows the reader's language, never a word of it. */
const STEP_LINES: Record<Locale, readonly Tiers[]> = {
  en: [[3, 3, 2], [3, 3, 2], [3, 3, 2], [2, 2, 1]],
  sw: [[3, 2, 1], [3, 3, 2], [4, 3, 2], [2, 2, 1]],
  zh: [[3, 2, 1], [3, 2, 1], [3, 2, 1], [2, 2, 1]],
};
/** The example's caption, likewise. */
const CAPTION_LINES: Record<Locale, Tiers> = { en: [4, 4, 2], sw: [5, 4, 3], zh: [4, 3, 2] };

/** A paragraph's lines, `n` of them, the last one short. */
function Lines({ n, last }: { n: number; last: string }) {
  return <>{Array.from({ length: n }, (_, i) => <GhostTextLine key={i} width={i === n - 1 ? last : "w-full"} />)}</>;
}

/** A paragraph drawn as it wraps below 360, from 360 and from 768. */
function Wrapped({ text, lines: [below360, from360, from768], last }: { text?: string; lines: Tiers; last: string }) {
  return (
    <span className={text}>
      <span className="block xs:hidden"><Lines n={below360} last={last} /></span>
      <span className="hidden xs:block md:hidden"><Lines n={from360} last={last} /></span>
      <span className="hidden md:block"><Lines n={from768} last={last} /></span>
    </span>
  );
}

export function MillioneaHowGhost() {
  const { t, locale } = useT();
  const H2 = <GhostTextLine text="font-display text-title-sm font-bold" width="w-[176px]" />;
  return (
    // Millionea's Chinese is set as the page sets it (`kp-mln-zh`: its eyebrows and micro labels at 12px), so the bands match.
    <PageContainer tier="reading" className="kp-mln-zh">
      {/* `data-ghost-page`: which page's drawing this is, for `qa:millionea-ghost-hops` (a hop shows only its own). */}
      <div className="flex flex-col gap-6" aria-busy="true" data-ghost-page="how">
        <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[176px]" />
        <ol className="flex max-w-[68ch] flex-col gap-3" aria-hidden data-ghost="steps">
          {STEP_LINES[locale].map((lines, i) => (
            <li key={i} className="grid grid-cols-[24px_1fr] gap-2 text-body">
              <GhostTextLine text="font-mono font-bold" width="w-[8px]" />
              <Wrapped lines={lines} last="w-[70%]" />
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2" aria-hidden data-ghost="timeline">
          {H2}
          <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-baseline gap-2 md:border-t-2 md:border-border-strong md:pt-1.5">
                <span className="h-1.5 w-1.5 shrink-0" />
                <span className="min-w-0 text-body-sm">
                  <GhostTextLine width="w-[96px] max-w-full" />
                  {/* The sales' and the events' ranges carry clocks in the numerals' mono (§T5), whose line box stands a pixel
                      taller than a body line: an empty run of that face gives the drawn line the same box. The results'
                      range is weekdays alone. */}
                  <span className="block">
                    <GhostLine className="w-[176px] max-w-full" />
                    {i < 2 && <span className="font-mono" />}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3" aria-hidden data-ghost="examples">
          {H2}
          <GhostCard className="flex max-w-receipt flex-col gap-3 p-3">
            <GhostTextLine text="font-display text-body-lg font-semibold" width="w-[180px] max-w-full" />
            <div className="flex flex-col gap-3">
              {/* The seal line (`maswali-seal-line.tsx`, size 24 with numbers) in its before frame: the ten sockets in fluid
                  columns, their numbers with the voided main's kept second line, the five reserves over their labels. */}
              <div className="flex flex-col gap-1.5" data-ghost="seal">
                <span className="flex flex-col gap-0.5">
                  <span className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} className="flex justify-center"><span className="aspect-square w-full max-w-[24px] rounded-full bg-bg-overlay" /></span>
                    ))}
                  </span>
                  <span className="font-mono text-micro eyebrow">
                    <GhostTextLine width="w-full" />
                    <GhostTextLine width="w-0" />
                  </span>
                </span>
                <span className="grid grid-cols-5 gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className="flex flex-col items-center gap-0.5">
                      <span className="h-[18px] w-[18px] rounded-full bg-bg-overlay" />
                      <GhostTextLine text="font-mono text-micro eyebrow" width="w-[16px]" />
                    </span>
                  ))}
                </span>
              </div>
              <Wrapped text="text-body-sm" lines={CAPTION_LINES[locale]} last="w-[60%]" />
              <div className="flex flex-wrap items-center gap-3" data-ghost="button">
                <GhostBar className="h-[var(--h-control-md)] w-[160px] rounded-control" />
              </div>
            </div>
          </GhostCard>
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}

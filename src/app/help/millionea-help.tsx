/**
 * /help — THE MASWALI MILLIONEA BLOCK (MASWALI-BUILD S6 item 10; MASWALI-PLAN §8 MB-71, MR-25).
 *
 * `/help`'s answers were written for the two products that settle a losing side — "a winning bet is never paid less than
 * it staked", "voided markets refund" — and a reader the rollout admits to Millionea must not read them as true of a
 * ticket. So the block opens by naming the products the answers above are about, then answers Millionea's own questions.
 * ⭐ THE SAME FACTS IN THE SAME WORDS: How to play's sentences and rules (`millionea.howOne`, `howTwo`, the jackpot's own
 *    rule `ruleSharedJackpot` — S5's one wording since `howThree` left — `howFour`, `ruleCancel`), filled
 *    with the figures the reader's week froze — or the next week's (`millioneaHowTo`, How to play's own read). No figure
 *    is typed here (L2: admins can change everything).
 * ⛔ AND THE ONE EXCEPTION THEY LEAVE OUT (round 3): the jackpot rule and `howFour` say every 10/10 ticket shares and a week
 *    without one carries forward — false in the final week, where the highest score shares and the fee is taken. How to
 *    play states it in its sunset rule; here it follows them at once (`helpFinalWeek`), as in the rules and the chat.
 * ⛔ NEVER A PICK: nothing here says which answers to choose, how likely a question is, or how many tickets to buy.
 * ⛔ Drawn only when the page's caller has resolved the rollout and read the rules (`page.tsx`): every other reader's
 *    `/help` is today's, its FAQ answers untouched in their slots (`test:flip-copy` §5 pins them word for word).
 * ⛔ Support, not money: no gold (C2i).
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import type { Dict, Locale } from "@/lib/i18n-dict";
import type { MillioneaHowTo } from "@/lib/server/maswali-player";
import { sideWord } from "@/lib/side-label";
import { fill, formatTzs, pctNum } from "@/lib/utils";

/** A sentence's end in the reader's language, and how two sentences sit side by side. */
const stop = (locale: Locale) => (locale === "zh" ? "。" : ".");
const joiner = (locale: Locale) => (locale === "zh" ? "" : " ");

export function MillioneaHelp({ t, locale, h }: { t: Dict; locale: Locale; h: MillioneaHowTo }) {
  const m = t.millionea, f = t.millioneaFairness;
  const pct = pctNum(h.feeRate);
  const items: Array<{ key: string; glyph: "howTo" | "rotateCcw" | "coins" | "commitment" | "tippingScales"; q: string; a: string }> = [
    {
      key: "mln1", glyph: "howTo", q: f.helpQ1,
      a: [fill(m.howOne, { price: formatTzs(h.ticketPrice) }), m.howTwo, fill(m.ruleSharedJackpot, { pct }), m.howFour, f.helpFinalWeek].join(joiner(locale)),
    },
    {
      key: "mln2", glyph: "rotateCcw", q: f.helpQ2,
      a: `${fill(m.ruleCancel, { mins: h.freeCancelMinutes, runway: h.freeCancelMinutes })}${stop(locale)}${joiner(locale)}${f.helpA2}`,
    },
    { key: "mln3", glyph: "coins", q: f.helpQ3, a: fill(f.helpA3, { pct }) },
    { key: "mln4", glyph: "commitment", q: f.helpQ4, a: f.helpA4 },
    { key: "mln5", glyph: "tippingScales", q: f.helpQ5, a: f.helpA5 },
  ];
  const link = "inline-flex items-center gap-1 text-body-sm text-text-link hover:text-text-linkHover";
  // ⭐ The FAQ's own shapes on the type ladder's rungs (a new file writes no hand-typed size, `test:type-scale` §4; nor an
  // inverted spacing key, `test:spacing-scale`): the answer's indent is the glyph's 15px plus the row's 12px gap.
  return (
    <section aria-labelledby="mln-help-title" className="rounded-xl glass-panel p-5 lg:p-6 space-y-2" data-testid="millionea-help">
      <h2 id="mln-help-title" className="font-display text-body-lg font-semibold text-text text-balance">{m.productTitle}</h2>
      <p className="text-body-sm text-text-muted leading-relaxed text-pretty">
        {fill(f.helpScope, { yes: sideWord(t, "YES", "MARKET"), no: sideWord(t, "NO", "MARKET") })}
      </p>
      <div>
        {items.map(({ key, glyph, q, a }) => {
          const Glyph = I[glyph];
          return (
            <details key={key} className="group border-t border-border first:border-t-0">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-3 py-3 font-display text-body font-semibold text-text">
                <span className="flex items-start gap-2 min-w-0">
                  <span className="mt-0.5 shrink-0 text-brand-300"><Glyph s={15} /></span>
                  <span>{q}</span>
                </span>
                <span className="mt-1 shrink-0 text-text-subtle">
                  <I.chevronDown s={13} edge="end" className="transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <p className="mt-2 pb-3 pl-[27px] text-body-sm text-text-muted leading-relaxed text-pretty">{a}</p>
            </details>
          );
        })}
      </div>
      <nav aria-label={m.productTitle} className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-2">
        <Link href={"/legal/rules/millionea" as never} className={link} style={{ minHeight: "var(--h-control-md)" }}>
          {m.rulesTitle}
          <I.chevronRight s={14} edge="end" text="body-400" />
        </Link>
        <Link href={"/millionea/how" as never} className={link} style={{ minHeight: "var(--h-control-md)" }}>
          {m.howToPlay}
          <I.chevronRight s={14} edge="end" text="body-400" />
        </Link>
      </nav>
    </section>
  );
}

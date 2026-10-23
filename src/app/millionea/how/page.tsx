/**
 * /millionea/how — HOW TO PLAY (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, §10 §3.4, M9; the v6 delivery's U-how
 * frames; D-21, D-43). The reading tier.
 *
 * Four steps (answer fifteen; the reserves, in order; the jackpot's headline — at least the floor, shared by every 10/10
 * ticket, the fee at payout; no 10/10 and the whole pool carries forward); the week's timeline right after them; the
 * examples — the swap, on the reader's own tap, and two worked weeks as the one Millionea ledger draws them; the closed
 * list of categories; the rules; the hub and the register.
 *
 * ⭐ ADMINS CAN CHANGE EVERYTHING (manifest L2): every figure here is the rules the reader's current week froze — or, with
 *    no week current, the ones the next will freeze (`millioneaHowTo`, `source`) — and both worked weeks are priced by the
 *    settlement's own arithmetic from those rules. An example the rules cannot show truthfully is left out, never bent.
 * ⭐ S5-DESIGN-REGISTER (2026-10-21, Ali's 10/10 pass — the register critic's H1, H3, M4, M6, M7, M8, L5, L7, L9, L10,
 *    L12–L16; the motion critic's M5):
 *    · step 3 is the hub's and the card's own headline ("Jackpot at least TZS 1,000,000 · shared equally by every 10/10
 *      ticket · 13% fee at payout", M6); the reserve step opens with the slip's own sentence (L7);
 *    · the timeline follows the steps (L12); the examples are a titled section (L15) at the receipt's measure, drawn as a
 *      real ticket and a real ledger are (M4): the swap from its before frame (M7, `how-example.tsx`), the worked weeks as
 *      `MaswaliLedger` rows (H3, H5) — nouns as labels, every amount whole, Money in and Money out matching;
 *    · the rules say what a first visit needs and nothing else: a week voided whole (H1), where a win is paid (M6, MR-27),
 *      the objection window by the platform's one name (L5), the cap in the slip's phrase (L7), and that limits, Take a
 *      break and Self-exclude cover Millionea too, with the footer's own "Set limits" door (L13);
 *    · prose at /fairness's reading measure (`max-w-[68ch]`, M4); the page ends on the hub and the register (M8).
 * ⛔ THE GATE FIRST (MR-2). An unearned surface: no gold (the examples' figures are illustrations, neutral ink).
 */
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { millioneaDoor } from "@/lib/server/millionea-doors";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { MaswaliWeekStrip } from "@/components/maswali/maswali-week-strip";
import { sealLineOf } from "@/components/maswali/maswali-seal-line";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { MaswaliLedger, millioneaLedgerRows } from "@/components/maswali/maswali-ledger";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaHowTimeline, millioneaHowTo, type MillioneaExample, type MillioneaHowTo } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { MARKET_CATEGORIES } from "@/lib/markets/categories";
import { marketCategoryLabel } from "@/lib/localized";
import { fill, formatTzs, pctNum } from "@/lib/utils";
import { durationHours } from "@/lib/duration-phrase";
import type { Dict, Locale } from "@/lib/i18n-dict";
import type { WeekPhases } from "@/components/maswali/maswali-week-strip";
import { MillioneaReadingLinks } from "../millionea-parts";
import { HowExample } from "./how-example";
import { exampleRecord, howCaption, howStepFour, howStepTwo } from "./how-words";

export const dynamic = "force-dynamic";

/** The page's one door to the player's own limits — the footer's and the wallet sheet's address. */
const LIMITS_HREF = "/profile/responsible-gambling";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  return { title: `${t.millionea.howToPlay} · ${t.millionea.productLabel}` };
}

/** The example's two frames, drawn by the one grader from the example's illustrative record (`exampleRecord`, L9), never
 *  a hand-made socket. BEFORE: the graded set not yet final (main 4 VOID, the reserves standing by); AFTER: final, so A1
 *  counts in main 4's place and A2–A5 rest. A real ticket's line is final only once its week settled
 *  (`millionea-view.ts → lineOf`); this one illustrates a settled week, so it says `final` itself. */
function exampleLines() {
  const { questions, picks } = exampleRecord();
  return { before: sealLineOf(questions, picks), after: sealLineOf(questions, picks, { final: true }) };
}

/** Millionea's Chinese sets a digit apart from an ideograph ("24 小时", the 2026-10-19 convention; L9) — the platform's
 *  duration word glues them ("24小时"), so the rule's one figure is spaced here. Other languages are untouched. */
function spacedDuration(locale: Locale, hours: number): string {
  const s = durationHours(locale, hours);
  return locale === "zh" ? s.replace(/(\d)(?=[㐀-䶿一-鿿豈-﫿])/g, "$1 ") : s;
}

/** One worked week ("A week with winners", "A week topped up to the floor"): the one Millionea ledger's rows, priced by
 *  the settlement's own arithmetic (`millioneaExamplesFor`), at the receipt's measure (M4). */
function WorkedWeek({ t, locale, id, title, h, ex }: { t: Dict; locale: Locale; id: string; title: string; h: MillioneaHowTo; ex: MillioneaExample }) {
  const f = ex.figures;
  const rows = millioneaLedgerRows(t, locale, {
    kind: "won", price: h.ticketPrice, tickets: ex.tickets, sales: ex.sales, carryIn: null, floor: h.floor, topUp: f.U,
    jackpot: f.J, feePct: pctNum(h.feeRate), fee: f.F, levies: { tra: f.tra, gbt: f.gbt, traPct: pctNum(h.traRate), gbtPct: pctNum(h.gbtRate) },
    winners: ex.winners, toWinners: f.J - f.F, share: f.share, paid: f.paid, remainder: f.dust,
    carriedForward: f.carryOut > 0 ? { amount: f.carryOut, week: null } : null, refunds: null, sunset: null,
  });
  return (
    <article aria-labelledby={id} className="mat-flat flex max-w-receipt flex-col gap-3 rounded-card p-3">
      <h3 id={id} className="font-display text-body-lg font-semibold text-text text-balance">{title}</h3>
      <MaswaliLedger rows={rows} />
    </article>
  );
}

export default async function MillioneaHowPage() {
  const gate = await millioneaGate();
  const { t, locale } = await getServerT();
  const h = await millioneaHowTo({ userId: gate.userId, state: gate.state });
  const pct = pctNum(h.feeRate);
  const { before, after } = exampleLines();
  // The static words — the second and fourth steps, the caption — are said once, in `how-words.ts`, which the loading
  // drawing sets unseen too, so it breaks them where this page does (S5-R3-FIX 8).
  const caption = howCaption({ t, locale }).text;
  // This week's shape on the template, by the hub's own rules (S5-FIX-PLAYER P7: `millioneaHowTimeline`).
  const phases: WeekPhases | null = millioneaHowTimeline(h, Date.now());
  // M6 · step 3 is the jackpot's own headline, as the hub and the card say it: at least the floor (a floor of 0 promises no
  // figure: the rule alone), shared by every 10/10 ticket, the fee at payout.
  const headline = h.floor > 0
    ? fill(t.millionea.ruleWithFigure, { amount: fill(t.millionea.atLeast, { amount: formatTzs(h.floor) }), pct })
    : fill(t.millionea.ruleShared, { pct });
  const steps: ReactNode[] = [
    keepFact(locale, fill(t.millionea.howOne, { price: formatTzs(h.ticketPrice) })),
    keepFact(locale, howStepTwo({ t, locale }).text),
    <MaswaliFacts key="headline" facts={factsOf(headline).map((f) => keepFact(locale, f))} />,
    keepFact(locale, howStepFour({ t, locale }).text),
  ];
  const rules: ReactNode[] = [
    keepFact(locale, fill(t.millionea.ruleCap, { cap: h.ticketCap })),
    keepFact(locale, t.millionea.ruleMainOnly),
    keepFact(locale, fill(t.millionea.ruleCancel, { mins: h.freeCancelMinutes, runway: h.freeCancelMinutes })),
    keepFact(locale, t.millionea.ruleEvents),
    keepFact(locale, fill(t.millionea.ruleVoidWeek, { price: formatTzs(h.ticketPrice) })),
    keepFact(locale, fill(t.millionea.ruleCheck, { hours: spacedDuration(locale, h.objectionWindowHours) })),
    keepFact(locale, t.millionea.ruleWinPaid),
    keepFact(locale, t.millionea.ruleInsider),
    // L13 · responsible play, plain and direct, with the footer's own door to the player's limits.
    <span key="rg" className="flex flex-col items-start gap-1">
      <span>{keepFact(locale, t.millionea.ruleRg)}</span>
      <Link href={LIMITS_HREF as never} className="inline-flex items-center gap-1 text-text-link hover:text-text-linkHover" style={{ minHeight: "var(--h-control-md)" }}>
        {t.footer.setLimits}
        <I.chevronRight s={14} edge="end" text="body-400" />
      </Link>
    </span>,
    keepFact(locale, t.millionea.ruleSunset),
  ];
  const H2 = "font-display text-title-sm font-bold text-text text-balance";
  return (
    <PageContainer tier="reading" className="kp-mln-zh">
      <div className="flex flex-col gap-6" data-testid="millionea-how">
        <PageHeader eyebrow={t.millionea.productTitle} title={t.millionea.howToPlay} />
        {/* The staff preview is marked once, above the page, by the shell's bar (PLATFORM D12) — never in the page's column. */}
        {/* Each step keeps its phrases whole (S5 VIS P6, A1): "5 reserve", "A1–A5", "13% fee" never torn at a line's end. */}
        <ol className="flex max-w-[68ch] flex-col gap-3">
          {steps.map((s, i) => (
            <li key={i} className="grid grid-cols-[24px_1fr] gap-2 text-body text-text">
              <span className="font-mono font-bold text-text-subtle tabular-nums">{i + 1}</span>
              <span className="text-pretty">{s}</span>
            </li>
          ))}
        </ol>
        {phases && (
          <section aria-labelledby="mln-how-timeline" className="flex flex-col gap-2">
            <h2 id="mln-how-timeline" className={H2}>{t.millionea.timelineTitle}</h2>
            <MaswaliWeekStrip t={t} phases={phases} current={null} />
          </section>
        )}
        <section aria-labelledby="mln-how-examples" className="flex flex-col gap-3">
          <h2 id="mln-how-examples" className={H2}>{t.millionea.examplesTitle}</h2>
          <article aria-labelledby="mln-how-ex-swap" className="mat-raised flex max-w-receipt flex-col gap-3 rounded-card p-3">
            <h3 id="mln-how-ex-swap" className="font-display text-body-lg font-semibold text-text text-balance">{t.millionea.exampleSwapTitle}</h3>
            <HowExample before={before} after={after} caption={caption} />
          </article>
          {h.examples.shared && <WorkedWeek t={t} locale={locale} id="mln-how-ex-shared" title={t.millionea.exampleWinnersTitle} h={h} ex={h.examples.shared} />}
          {h.examples.floorWeek && <WorkedWeek t={t} locale={locale} id="mln-how-ex-floor" title={t.millionea.exampleFloorTitle} h={h} ex={h.examples.floorWeek} />}
        </section>
        <section aria-labelledby="mln-how-categories" className="flex flex-col gap-2">
          <h2 id="mln-how-categories" className={H2}>{t.millionea.categoriesTitle}</h2>
          <ul className="flex flex-wrap gap-2">
            {MARKET_CATEGORIES.map((c) => <li key={c}><Chip variant="cat">{marketCategoryLabel(t, c)}</Chip></li>)}
          </ul>
        </section>
        <section aria-labelledby="mln-how-rules" className="flex flex-col gap-2">
          <h2 id="mln-how-rules" className={H2}>{t.millionea.rulesTitle}</h2>
          <ul className="flex max-w-[68ch] flex-col divide-y divide-border border-t border-border">
            {rules.map((r, i) => <li key={i} className="py-2 text-body-sm text-text text-pretty">{r}</li>)}
          </ul>
        </section>
        <MillioneaReadingLinks t={t} how={false} hub />
      </div>
    </PageContainer>
  );
}

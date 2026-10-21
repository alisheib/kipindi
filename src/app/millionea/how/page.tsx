/**
 * /millionea/how — HOW TO PLAY (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, §10 §3.4, M9; the v6 delivery's U-how
 * frames; D-21, D-43). The reading tier.
 *
 * Four sentences (answer fifteen; a reserve counts only for a voided main, in order; ten of ten shares the jackpot
 * equally, the fee at payout only; no ten of ten and the whole pool carries forward); the static example with the
 * reader's own "Tazama mfano" (M9, N1 once, never on its own); the two worked ledgers labelled "Mfano", each the receipt
 * row it explains; the week's timeline; the closed list of categories; the rules; the register.
 *
 * ⭐ ADMINS CAN CHANGE EVERYTHING (manifest L2): every figure here is the rules the reader's current week froze — or, with
 *    no week current, the ones the next will freeze (`millioneaHowTo`, `source`) — and both examples are priced by the
 *    settlement's own arithmetic from those rules. An example the rules cannot show truthfully is left out, never bent.
 * ⛔ THE GATE FIRST (MR-2). An unearned surface: no gold (the examples' figures are illustrations, neutral ink).
 */
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { millioneaDoor } from "@/lib/server/millionea-doors";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Chip } from "@/components/ui/chip";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { MaswaliWeekStrip } from "@/components/maswali/maswali-week-strip";
import { sealLineOf } from "@/components/maswali/maswali-seal-line";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { joinList, reserveLabel } from "@/components/maswali/maswali-format";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaHowTimeline, millioneaHowTo, type MillioneaExample } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { MARKET_CATEGORIES } from "@/lib/markets/categories";
import { marketCategoryLabel } from "@/lib/localized";
import { MAIN_COUNT, RESERVE_COUNT, type GradableQuestion, type MaswaliPick } from "@/lib/maswali-score";
import { fill, formatNumber, formatTzs, formatTzsSigned, pctNum } from "@/lib/utils";
import { durationHours } from "@/lib/duration-phrase";
import type { Dict, Locale } from "@/lib/i18n-dict";
import type { WeekPhases } from "@/components/maswali/maswali-week-strip";
import { MillioneaPreviewMark, MillioneaReadingLinks } from "../millionea-parts";
import { HowExample } from "./how-example";

export const dynamic = "force-dynamic";

/** The example's voided main, as §10 §3.4 draws it ("4 → A1"). An illustration's place, not a rule. */
const EXAMPLE_VOIDED_MAIN = 4;

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  return { title: `${t.millionea.howToPlay} · ${t.millionea.productLabel}` };
}

/** The example's line: every main matched, main 4 voided and reserve A1 standing in for it, the other reserves unused —
 *  drawn by the one grader from an illustrative record (L9), never a hand-made socket. It illustrates a SETTLED week, so
 *  it says `final` itself; a real ticket's line is final only once its week settled (`millionea-view.ts → lineOf`). */
function exampleLine() {
  const qs: GradableQuestion[] = [
    ...Array.from({ length: MAIN_COUNT }, (_, i) => ({ role: "MAIN" as const, ordinal: i + 1, outcome: i + 1 === EXAMPLE_VOIDED_MAIN ? "VOID" as const : "YES" as const })),
    ...Array.from({ length: RESERVE_COUNT }, (_, i) => ({ role: "RESERVE" as const, ordinal: i + 1, outcome: "YES" as const })),
  ];
  const picks: MaswaliPick[] = Array.from({ length: MAIN_COUNT + RESERVE_COUNT }, () => "YES");
  return sealLineOf(qs, picks, { final: true });
}

/** One worked ledger ("Mfano"), each line the win ledger's own receipt row (D-43): the fee row in its amber. ⭐ Its label
 *  says which week it works through ("Example · a week with winners", S5 VIS P6 — it read "EXAMPLE · 1"), and the fee
 *  taken is the platform's signed figure ("−TZS 136,500", A4 — it read "TZS -136,500"). */
function WorkedLedger({ t, locale, label, ex, pct }: { t: Dict; locale: Locale; label: string; ex: MillioneaExample; pct: number }) {
  const f = ex.figures;
  const fig = (n: number) => <span className="amount">{formatTzs(n)}</span>;
  const ROW = "border-b border-border py-1.5";
  return (
    <section aria-label={label} className="mat-flat flex flex-col rounded-card p-3">
      <span className="pb-1.5 font-mono text-micro uppercase eyebrow text-text-subtle"><MaswaliFacts facts={factsOf(label).map((x) => keepFact(locale, x))} /></span>
      <div className="flex flex-col border-t border-border">
        <ReceiptRow className={ROW} label={fill(t.millionea.regTicketsSold, { n: formatNumber(ex.tickets), price: formatTzs(ex.sales / Math.max(1, ex.tickets)) })} value={fig(ex.sales)} />
        {f.U > 0 && <ReceiptRow className={ROW} label={<MaswaliFacts facts={[t.millionea.topUp, t.millionea.topUpNote]} />} value={fig(f.U)} />}
        <ReceiptRow className={ROW} label={t.millionea.jackpot} value={fig(f.J)} />
        <ReceiptRow className={ROW} tone="warning" emphasis="fee" label={fill(t.millionea.feeLine, { pct })} value={<span className="amount">{formatTzsSigned(-f.F)}</span>} />
        <ReceiptRow className={ROW} label={t.millionea.toWinners} value={fig(f.J - f.F)} />
        <ReceiptRow className={ROW} label={ex.winners === 1 ? t.millionea.perTicketOne : fill(t.millionea.perTicket, { n: formatNumber(ex.winners) })} value={fig(f.share)} />
      </div>
    </section>
  );
}

export default async function MillioneaHowPage() {
  const gate = await millioneaGate();
  const { t, locale } = await getServerT();
  const h = await millioneaHowTo({ userId: gate.userId, state: gate.state });
  const pct = pctNum(h.feeRate);
  const line = exampleLine();
  const unused = line.annex.filter((r) => r.carriedTo === undefined).map((r) => reserveLabel(r.ordinal));
  const caption = fill(t.millionea.exampleCaption, { n: EXAMPLE_VOIDED_MAIN, r: reserveLabel(1), unused: joinList(locale, unused) });
  // This week's shape on the template, by the hub's own rules (S5-FIX-PLAYER P7: `millioneaHowTimeline` — the results and
  // payout run to the latest void deadline's objection window, as the hub's strip says of a real week).
  const phases: WeekPhases | null = millioneaHowTimeline(h, Date.now());
  const sentences = [
    fill(t.millionea.howOne, { price: formatTzs(h.ticketPrice) }),
    t.millionea.howTwo,
    fill(t.millionea.howThree, { pct }),
    t.millionea.howFour,
  ];
  const rules = [
    fill(t.millionea.ruleCap, { cap: h.ticketCap }),
    t.millionea.ruleMainOnly,
    fill(t.millionea.ruleCancel, { mins: h.freeCancelMinutes, runway: h.freeCancelMinutes }),
    t.millionea.ruleEvents,
    fill(t.millionea.ruleCheck, { hours: durationHours(locale, h.objectionWindowHours) }),
    t.millionea.ruleInsider,
    t.millionea.ruleSunset,
  ];
  const H2 = "font-display text-title-sm font-bold text-text";
  return (
    <PageContainer tier="reading" className="kp-mln-zh">
      <div className="flex flex-col gap-6" data-testid="millionea-how">
        <PageHeader eyebrow={t.millionea.productTitle} title={t.millionea.howToPlay} />
        {gate.preview && <MillioneaPreviewMark t={t} />}
        {/* Each step keeps its phrases whole (S5 VIS P6, A1): "5 reserve", "A1 to A5", "13% fee" never torn at a line's end. */}
        <ol className="flex flex-col gap-3">
          {sentences.map((s, i) => (
            <li key={i} className="grid grid-cols-[24px_1fr] gap-2 text-body text-text">
              <span className="font-mono font-bold text-text-subtle tabular-nums">{i + 1}</span>
              <span className="text-pretty">{keepFact(locale, s)}</span>
            </li>
          ))}
        </ol>
        <section aria-label={t.millionea.exampleLabel} className="mat-raised flex flex-col gap-3 rounded-card p-3">
          <span className="font-mono text-micro uppercase eyebrow text-text-subtle">
            <MaswaliFacts facts={[t.millionea.exampleLabel, <span key="carry" className="whitespace-nowrap">{`${EXAMPLE_VOIDED_MAIN} → ${reserveLabel(1)}`}</span>]} />
          </span>
          <HowExample line={line} caption={caption} voided={EXAMPLE_VOIDED_MAIN} standIn={reserveLabel(1)} />
        </section>
        {h.examples.shared && <WorkedLedger t={t} locale={locale} label={`${t.millionea.exampleLabel} · ${t.millionea.exampleWinnersWeek}`} ex={h.examples.shared} pct={pct} />}
        {h.examples.floorWeek && <WorkedLedger t={t} locale={locale} label={`${t.millionea.exampleLabel} · ${t.millionea.exampleFloorWeek}`} ex={h.examples.floorWeek} pct={pct} />}
        {phases && (
          <section className="flex flex-col gap-2">
            <h2 className={H2}>{t.millionea.timelineTitle}</h2>
            <MaswaliWeekStrip t={t} phases={phases} current={null} />
          </section>
        )}
        <section className="flex flex-col gap-2">
          <h2 className={H2}>{t.millionea.categoriesTitle}</h2>
          <ul className="flex flex-wrap gap-2">
            {MARKET_CATEGORIES.map((c) => <li key={c}><Chip variant="cat">{marketCategoryLabel(t, c)}</Chip></li>)}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className={H2}>{t.millionea.rulesTitle}</h2>
          <ul className="flex flex-col">
            {rules.map((r) => <li key={r} className="border-b border-border py-2 text-body-sm text-text text-pretty">{keepFact(locale, r)}</li>)}
          </ul>
        </section>
        <MillioneaReadingLinks t={t} how={false} />
      </div>
    </PageContainer>
  );
}

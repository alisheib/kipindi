/**
 * /millionea/register — THE PARTS BOTH REGISTER PAGES SHARE (MASWALI-BUILD S5 VIS-R, the tile read of 2026-10-19; and
 * S5-DESIGN-REGISTER, 2026-10-21 — Ali's 10/10 pass).
 *
 * Server-safe, no directive, no read: each page hands in its words. ⭐ Three of these are the platform's ONE drawing of a
 * Millionea fact, which the other lanes adopt in round 2: the week's state chip (`WeekStateChip` — the hub), one week's
 * row (`WeekRow` — `/results`' section) and the week's two commitments (`WeekCommitments` — the hub's week section).
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { keepConnectives, runAndDashRanges } from "@/components/ui/keep-run";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { counted, eatWeekdayClock, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { millioneaLedgerRows, ticketSalesRuns, type MillioneaLedgerRow } from "@/components/maswali/maswali-ledger";
import { playerStatusChip } from "@/lib/status-tone";
import { formatEatDateTime } from "@/lib/eat-day";
import { cn, fill, formatNumber, formatTzs, pctNum } from "@/lib/utils";
import { moneyRuns } from "@/lib/fill-nodes";
import type { WeekState } from "@/lib/maswali-week-label";
import type { MillioneaRegisterLiveWeek, MillioneaWeekMoney, MillioneaWeekSummary } from "@/lib/server/maswali-player";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { millioneaWeekPhase, msOf, weekPhaseWord, type MillioneaWeekPhase } from "../millionea-view";
import { registerWeekHref } from "../millionea-parts";

export { ticketSalesRuns };

/**
 * ⭐ WHERE A WEEK STANDS, AS ITS OWN CHIP — every state a public week can be in (S5-DESIGN-REGISTER; the register critic's
 * L2; the HUB lane adopts it in round 2: ONE chip). The word is `weekPhaseWord`'s (`millioneaWeekPhase`, S5-FIX-PLAYER P6:
 * "Objection window", "Settling", "Week is being voided"), or "Paused for now" for a selling week whose sales an officer
 * paused; the tone is status-tone's, read by its Millionea week key — never a variant typed here (§B11). A settled week is
 * slate, never the resolved seal: the register states money, it awards none (§M8a item 7,
 * `STATUS_TONE_EXCEPTIONS.MILLIONEA_WEEK_SETTLED`).
 */
export function weekChipKey(state: WeekState, phase: MillioneaWeekPhase | null, paused = false): string {
  switch (state) {
    case "OPEN": return paused ? "MILLIONEA_WEEK_PAUSED" : "MILLIONEA_WEEK_OPEN";
    case "SETTLED": return "MILLIONEA_WEEK_SETTLED";
    case "VOIDED": return "MILLIONEA_WEEK_VOIDED";
    case "DRAFT": return "MILLIONEA_WEEK_CLOSED"; // a draft is never shown to a player; named so the switch is total
    case "CLOSED": case "RESOLVING":
      switch (phase?.kind) {
        case "objections": return "MILLIONEA_WEEK_OBJECTIONS";
        case "settling": return "MILLIONEA_WEEK_SETTLING";
        case "voiding": return "MILLIONEA_WEEK_VOIDING";
        default: return state === "CLOSED" ? "MILLIONEA_WEEK_CLOSED" : "MILLIONEA_WEEK_RESOLVING";
      }
  }
}

/** The chip's word: the phase's (`weekPhaseWord`), or the sales pause's short word on a selling week. */
export function weekChipWord(t: Dict, state: WeekState, phase: MillioneaWeekPhase | null, paused = false): string {
  return state === "OPEN" && paused ? t.millionea.pausedShort : weekPhaseWord(t, state, phase ?? { kind: "state", objectionsUntil: null });
}

export function WeekStateChip({ t, state, phase = null, paused = false }: {
  t: Dict;
  state: WeekState;
  /** Where a week being graded stands (`millioneaWeekPhase`); omitted, its state's own word. */
  phase?: MillioneaWeekPhase | null;
  /** The sales pause, for a selling week. */
  paused?: boolean;
}) {
  return (
    <Chip variant={playerStatusChip(weekChipKey(state, phase, paused)) ?? "neutral"} metrics="status" className="shrink-0 self-start" data-testid="millionea-week-state">
      {weekChipWord(t, state, phase, paused)}
    </Chip>
  );
}

/**
 * A label whose phrases never break inside (S5 VIS A1): each run the caller names — a week, an amount, a date — stays on
 * one line, and no line ends on a connective (the kit's keep-run, as every receipt label is). The words are unchanged.
 */
export function kept(text: string, runs: readonly string[]): ReactNode {
  return keepConnectives(text, runAndDashRanges(text, runs));
}

/**
 * A FINAL WEEK'S FACTS, AFTER ITS STATE (R9: "Week 48 · Voided" and "Week 45: 1 ticket won" were two grammars for one kind
 * of row) — a voided week's refunds ("every ticket refunded" only once every refund landed: the read model's
 * `refundsPending`, MR-18, never a refund stated before it happened), a won week's winners and jackpot, or a week nobody
 * won: "no 10/10", what it carried forward and its fee 0 (the critic's L1 — the hub's last-week line says "no 10/10"
 * too). Every amount is the read model's; each one is a single unbroken run.
 */
export function weekFacts(t: Dict, w: MillioneaWeekSummary): ReactNode[] {
  if (w.state === "VOIDED") return [w.refundsPending ? t.millionea.regRefundsPending : t.millionea.regRefunded];
  const k = w.winners ?? 0;
  if (k > 0) {
    const facts: ReactNode[] = [counted(k, t.millionea.regWonOne, t.millionea.regWon)];
    if (w.jackpot !== null) facts.push(<>{`${t.millionea.jackpot} `}<span className="amount">{formatTzs(w.jackpot)}</span></>);
    return facts;
  }
  const amount = formatTzs(w.carriedForward ?? 0);
  // The hub's own words (`settledRollover`, `feeZero`), said mid-line there ("Week 45 · no 10/10 · …"); here each is a fact
  // of its own — a line of its own on a phone — so each opens with a capital, as every other fact of a row does. Its amount
  // is drawn as every amount is (`.amount`, the jackpot's face), inside its kept run: the tile read of 2026-10-21 found
  // "TZS 18,000 carried forward" in the body face beside "Jackpot TZS 50,000" in the figure face.
  const fact = (f: string) => keepConnectives(f, runAndDashRanges(f, [amount]), (part) => moneyRuns(part));
  return [...factsOf(fill(t.millionea.settledRollover, { amount })).map((f) => fact(factCase(f))), factCase(t.millionea.feeZero)];
}

/** A fact's first letter as a list item's: a capital (a no-op for a figure or an ideograph). */
function factCase(s: string): string {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

/**
 * A RUNNING WEEK'S FACTS, AFTER ITS CHIP (H2) — the hub's own lines, so the two say a week one way: a selling week's close
 * ("Sales close Friday 18:00"; nothing while its sales are paused — the chip says so, and nothing can be bought before
 * that close); a week being graded, its results so far and, while it is open, its objection window's end.
 */
export function liveWeekFacts(t: Dict, locale: Locale, w: MillioneaRegisterLiveWeek, nowMs: number): ReactNode[] {
  if (w.state === "OPEN") {
    const closes = msOf(w.closesAt);
    return w.paused || closes === null ? [] : [keepFact(locale, fill(t.millionea.salesCloseAt, { when: eatWeekdayClock(t, closes) }))];
  }
  const facts: ReactNode[] = [keepFact(locale, fill(t.millionea.resultsOut, { n: formatNumber(w.resultsOut) }))];
  const until = millioneaWeekPhase(w, nowMs).objectionsUntil;
  if (until !== null) facts.push(keepFact(locale, fill(t.millionea.checkWindowUntil, { when: eatWeekdayClock(t, until) })));
  return facts;
}

/**
 * ⭐ ONE WEEK'S ROW — the index's, and `/results`' section adopts it in round 2 (L3: the row was written twice). Its code,
 * the week with its state chip, then its facts — a fact list (`MaswaliFacts`, layout `phone`): one fact per line below
 * 768, from 768 side by side between the platform's own separators, which never open or end a line (A1) — and the chevron
 * of a door to its page. From 1024 the facts end at the row's end, beside the chevron, wherever the row is drawn (on the
 * register's reading measure and in /results' board-tier box alike), never ~700px from it after the week's column.
 * ⛔ THE ROW DRAWS NO RULE OF ITS OWN: the list divides its rows (`divide-y divide-border`) and draws its own top edge, so
 * a list under a heading and a list inside a box read alike — one rule, no line after the last row.
 */
export function WeekRow({ t, code, chip, facts }: { t: Dict; code: string; chip: ReactNode; facts: readonly ReactNode[] }) {
  return (
    <li>
      <Link href={registerWeekHref(code) as never} className="flex items-center justify-between gap-3 py-3 text-text" style={{ minHeight: "var(--h-control-lg)" }}>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{code}</span>
          <span className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">
            {/* From 768 the week's column holds the week and its longest chip on one line ("Wiki 52 · WIKI INABATILISHWA",
                "Week 52 · WEEK IS BEING VOIDED" — at 200px they broke under the week, so the rows' heights differed). */}
            <span className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 md:w-[280px]">
              <span className="text-body font-semibold text-text">{weekWord(t, weekNumberOf(code))}</span>
              {chip}
            </span>
            {facts.length > 0 && (
              <span className="min-w-0 text-body-sm text-text-muted lg:ml-auto" data-testid="millionea-week-facts">
                <MaswaliFacts layout="phone" facts={facts} />
              </span>
            )}
          </span>
        </span>
        <I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />
      </Link>
    </li>
  );
}

/** An instant the register prints, in EAT ("27 Nov, 18:00"), or null when it is not one. */
export function registerWhen(t: Dict, locale: Locale, iso: string | null, nowMs: number): string | null {
  const ms = msOf(iso);
  return ms === null ? null : formatEatDateTime(ms, nowMs, t.common.monthsShort, locale);
}

/** Han, by the ranges Millionea's Chinese rules read (How to play's `spacedDuration`). */
const HAN = /[㐀-䶿一-鿿豈-﫿]/;

/**
 * A QUESTION'S EVENT, AS THE REGISTER PRINTS IT — "Event 27 Nov, 09:00", its date one kept run. ⭐ Millionea's Chinese at
 * the fill's edge (the lead's zh ruling, 2026-10-21: a space where a Han character meets a digit or a Latin letter, never
 * between two Han characters): the shared "事件{when}" is written for the hub's and the slip's weekday ("事件周五 09:00",
 * S5-DESIGN-DOORS 8), and the register's date opens on its year — so here the edge takes the space, "事件 2026年11月27日
 * 09:00", never "事件2026年…". The words are the shared key's; the edge is set by what meets it.
 */
export function registerEventAt(t: Dict, locale: Locale, iso: string | null, nowMs: number): ReactNode | null {
  const when = registerWhen(t, locale, iso, nowMs);
  if (when === null) return null;
  const at = t.millionea.eventAt.indexOf("{when}");
  const edge = locale === "zh" && at > 0 && HAN.test(t.millionea.eventAt[at - 1]) && /^[0-9A-Za-z]/.test(when) ? " " : "";
  return keepFact(locale, fill(t.millionea.eventAt, { when: `${edge}${when}` }), [when]);
}

/**
 * THE WEEK'S TIMES, UNDER ITS FACTS (the critic's M1: `closedAt` and `settledAt` were in the read model and never
 * printed) — "Sales closed 27 Nov, 18:00 · Settled 2 Dec, 12:00". ⛔ A voided week prints no void instant: its stamp writes
 * the state alone, so none is stored (AGENTS.md §6), and a week still selling has no close to print yet.
 */
export function weekTimes(t: Dict, locale: Locale, w: { state: WeekState; closedAt: string | null; settledAt?: string | null }, nowMs: number): ReactNode[] {
  const closed = registerWhen(t, locale, w.closedAt, nowMs);
  const settled = w.state === "SETTLED" ? registerWhen(t, locale, w.settledAt ?? null, nowMs) : null;
  const out: ReactNode[] = [];
  if (closed !== null) out.push(keepFact(locale, fill(t.millionea.regSalesClosed, { when: closed }), [closed]));
  if (settled !== null) out.push(keepFact(locale, fill(t.millionea.regSettledAt, { when: settled }), [settled]));
  return out;
}

/**
 * ⭐ ONE WEEK'S LEDGER, ROW BY ROW, TO THE SHILLING (§10 §3.17; MR-20–MR-26) — the shared builder's rows
 * (`millioneaLedgerRows`, `maswali-ledger.tsx`: MR-26's identity as two matching totals, the critic's H5), from the
 * settlement's own columns (the read model's), with each carry linked to its week's page (M10):
 *   · S5-FIX-PLAYER P3 · "To winners" is J − F — the win ledger's and How to play's one figure — before the split.
 *   · P4 · the rounding remainder only in a week the house did not top up (MR-25).
 *   · P11 · a fee taken is the platform's signed figure ("−TZS 136,500", rule A4); a week that took none, "TZS 0".
 *   · P9 · the weeks a carry came from and went to are the calendar chain's (`carryFromCode`, `carryToCode`).
 * It reads only the week's money (`MillioneaWeekMoney`, the one core — the public register's record carries it, and the
 * TICKETS lane's win ledger reads a week of either line through `millioneaWeekMoneyRecord`). `links: false` names each
 * carry's week without opening a page — a DRIVE week's chain is private, and the public register has no page for it.
 */
export function registerLedgerRows(t: Dict, locale: Locale, w: MillioneaWeekMoney, { links = true }: { links?: boolean } = {}): MillioneaLedgerRow[] {
  const from = w.carryFromCode, to = w.carryToCode;
  const pageOf = (code: string | null) => (links && code ? registerWeekHref(code) : null);
  const carryIn = (w.carryIn ?? 0) > 0
    ? { amount: w.carryIn ?? 0, week: from ? weekNumberOf(from) : null, href: pageOf(from) }
    : null;
  const kind = w.state === "VOIDED" ? "voided" : (w.winners ?? 0) > 0 ? "won" : "rolled";
  // A voided week hands its carry on untouched (MR-18): what it received is what goes on to the chain's next week.
  const out = kind === "voided" ? (w.carryIn ?? 0) : (w.carriedForward ?? 0);
  const fee = w.fee ?? 0;
  const levies = w.traLevy !== null && w.gbtLevy !== null && fee > 0
    ? { tra: w.traLevy, gbt: w.gbtLevy, traPct: pctNum(w.traLevy / fee), gbtPct: pctNum(w.gbtLevy / fee) }
    : null;
  return millioneaLedgerRows(t, locale, {
    kind,
    price: w.ticketPrice,
    tickets: w.tickets,
    sales: w.sales ?? 0,
    carryIn,
    // The floor never applies to a voided week (MR-18) nor to the sunset's top-score payout (MR-30).
    floor: kind === "voided" || w.basis === "TOP_SCORE" ? null : w.floor,
    topUp: w.topUp ?? 0,
    jackpot: w.jackpot,
    feePct: w.feeRate !== null ? pctNum(w.feeRate) : null,
    fee: kind === "voided" ? null : fee,
    levies,
    winners: w.winners ?? 0,
    toWinners: w.toWinners,
    share: w.share,
    paid: w.paid,
    remainder: w.remainder,
    carriedForward: out > 0 ? { amount: out, week: to ? weekNumberOf(to) : null, href: pageOf(to) } : null,
    refunds: kind === "voided" ? { amount: w.sales ?? 0, landed: !w.refundsPending } : null,
    sunset: w.basis === "TOP_SCORE" && w.winningScore !== null ? { score: w.winningScore, tickets: w.winners ?? 0 } : null,
  });
}

const EYEBROW = "font-mono text-micro uppercase eyebrow text-text-subtle";

/**
 * ⭐ THE WEEK'S TWO COMMITMENTS — its fingerprints (MR-13; the critic's M12, and the lead's H2 ruling: shown the moment
 * each is stamped). The question set's hash, published at the open, under its noun ("Question set", the ticket stub's own
 * word) and over its time; the tickets' root, stamped at the close with its time and count ("Fixed 27 Nov, 18:00 · 1,050
 * tickets"), under the commitment's own glyph (§10c); and — once both exist — one sentence that says what they are for.
 * While the week still sells, the root's place says when it will be published. Each label a noun, never a sentence
 * dressed as an eyebrow. The HUB lane prints the same commitments in its week section (round 2), from these words
 * (`stubHash`, `commitTicketsAtClose`, `commitPublished`, `commitFixed`, `commitExplainer` — the lead's keys).
 * ⛔ Never a hash that is not stamped: an absent one is not drawn (AGENTS.md §6).
 * Its card fills the column it stands in — on the hub, the fifteen questions' width (capped at the receipt's measure it
 * ended 9–64px short of them at 1024–1920; HUB's read, round 2); a page that sets it at the receipt's measure, as the
 * register's week page does under its ledger, says so (`className`).
 */
export function WeekCommitments({ t, locale, nowMs, hash, publishedAt, root, closedAt, tickets, className }: {
  t: Dict;
  locale: Locale;
  nowMs: number;
  /** The section's own measure, when the page sets one (the register's week page: `max-w-receipt`). */
  className?: string;
  /** The question set's hash, published at the open. */
  hash: string | null;
  publishedAt: string | null;
  /** The tickets' root, stamped at the close with its time and count (MR-13) — null while the week sells. */
  root: string | null;
  closedAt: string | null;
  tickets: number | null;
}) {
  const published = registerWhen(t, locale, publishedAt, nowMs);
  const fixed = registerWhen(t, locale, closedAt, nowMs);
  const fixedLine = fixed !== null && tickets !== null
    ? counted(tickets, t.millionea.commitFixedOne, t.millionea.commitFixed, { when: fixed })
    : null;
  return (
    <section aria-labelledby="mln-reg-commit" className={cn("flex flex-col gap-2", className)} data-testid="millionea-commitments">
      <h2 id="mln-reg-commit" className="font-display text-title-sm font-bold text-text text-balance">{t.millionea.commitTitle}</h2>
      <div className="mat-flat flex flex-col gap-4 rounded-card p-3">
        {hash && (
          <div className="flex flex-col gap-1">
            {/* Both commitments wear the commitment glyph — one left edge for the two eyebrows (the tile read of 2026-10-21:
                the question set's eyebrow started 20px left of the root's). */}
            <span className={`${EYEBROW} inline-flex items-center gap-1.5`}>
              <I.commitment s={12} className="shrink-0" />
              <span>{t.millionea.stubHash}</span>
            </span>
            <span className="font-mono text-body-sm text-text break-all">{hash}</span>
            {published !== null && <span className="text-body-sm text-text-muted">{keepFact(locale, fill(t.millionea.commitPublished, { when: published }), [published])}</span>}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className={`${EYEBROW} inline-flex items-center gap-1.5`}>
            <I.commitment s={12} className="shrink-0" />
            <span>{t.millionea.commitTicketsAtClose}</span>
          </span>
          {root ? (
            <>
              <span className="font-mono text-body-sm text-text break-all">{root}</span>
              {fixedLine !== null && (
                <span className="text-body-sm text-text-muted">
                  <MaswaliFacts facts={factsOf(fixedLine).map((f) => keepFact(locale, f, fixed === null ? [] : [fixed]))} />
                </span>
              )}
            </>
          ) : (
            <span className="text-body-sm text-text-muted">{t.millionea.commitAtClose}</span>
          )}
        </div>
        {hash && root && <p className="text-body-sm text-text-muted text-pretty">{t.millionea.commitExplainer}</p>}
      </div>
    </section>
  );
}

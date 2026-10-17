/**
 * /millionea — THE HUB (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, §10 §3.3, §3.15–§3.16; the v6 delivery's U-hub
 * frames; DESIGN_AUTHORITY §M8a). The reading tier.
 *
 * Top to bottom at a phone's width: the week and its state over the product's name; the once-per-week notices; the week
 * strip; the pool block (the figure, its rule, its public ledger); the buy block (the door to the slip, the close always
 * printed, the closing pill in the last hour only, the reader's tickets of the cap, a row per held ticket with its Seal
 * Line); the fifteen public questions with each attested result's stamp; last week as one closed row; How to play and
 * the register. From 1280 two columns: the strip, the questions and last week on the left (640), the pool block, the
 * buy block and the tickets on the right (400), sticky (D-16). Below 1280 one column (L8).
 *
 * ⛔ THE GATE FIRST (`millioneaGate`): a hidden product is a missing page, here and in the metadata (MR-2).
 * ⛔ AN UNEARNED SURFACE: no gold in this file (§M8a item 7; `test:gold-is-money` 1d). The door to the slip is the
 *    brand primary — the gold sits only on the confirm sheet's armed commit (§M3a).
 * ⛔ NO PICK HERE, AND NOTHING ABOUT ANYONE ELSE'S: the questions are public, the reader's own tickets are theirs, and
 *    no aggregate or "still in" count exists before settlement (MB-38, OD-24).
 * ⛔ No `.catch` on the read: a failed read is the error page, never a calm "no week" (B-1).
 */
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Callout } from "@/components/ui/callout";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { I } from "@/components/ui/glyphs";
import { BetBreakNotice } from "@/components/rg/bet-break-notice";
import { MaswaliWeekStrip } from "@/components/maswali/maswali-week-strip";
import { MaswaliLastWeek } from "@/components/maswali/maswali-pool-figure";
import { MaswaliHeldTicketRow } from "@/components/maswali/maswali-ticket";
import { MaswaliOutcomeStamp } from "@/components/maswali/maswali-outcome-stamp";
import { MaswaliClosingPill } from "@/components/maswali/maswali-slip";
import { counted, eatWeekday, eatWeekdayClock, millioneaWord, reserveLabel, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaHub, millioneaMyTicketsWeek, type MillioneaHub, type MillioneaHubWeek, type MillioneaNotice, type MillioneaTicketsWeek } from "@/lib/server/maswali-player";
import { millioneaBreakOf, millioneaDoor } from "@/lib/server/millionea-doors";
import { getServerT } from "@/lib/i18n-server";
import { breakSentence } from "@/lib/break-end";
import { WEEK_STATE_KEY } from "@/lib/maswali-week-label";
import { marketCategoryLabel } from "@/lib/localized";
import { fillNodes, moneyRuns } from "@/lib/fill-nodes";
import { cn, fill, formatTzs } from "@/lib/utils";
import { RESERVE_COUNT, weekVoidCertain } from "@/lib/maswali-score";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { HubPool } from "./hub-pool";
import { HubNotices, type HubNotice } from "./hub-notices";
import { MILLIONEA_HREF, MillioneaPreviewMark, MillioneaReadingLinks, registerWeekHref, signInHref, ticketPageHref } from "./millionea-parts";
import { bySlot, gradableOf, lineOf, msOf, nextWeekNumber, ordinalOf, phaseNow, phasesOf, resultDoorSerial, resultLine, textIn } from "./millionea-view";

export const dynamic = "force-dynamic";

/** The id of last week's carried figure: the origin of M7's carry into this week's ledger. */
const CARRIED_FIGURE_ID = "mln-carried-figure";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  return { title: t.millionea.productTitle };
}

/** The week's eyebrow: "WIKI 42 · WAZI" (the state's word, through WEEK_STATE_KEY). */
function weekEyebrow(t: Dict, w: { code: string; state: MillioneaHubWeek["state"] }): string {
  return `${weekWord(t, weekNumberOf(w.code))} · ${millioneaWord(t, WEEK_STATE_KEY[w.state])}`;
}

/**
 * Valid reserves left (§10 §3.10): the five, less each voided reserve and each reserve a voided main will take — and below
 * zero, when the voided mains outnumber them, said in words (the v6 delivery's D-20; the S5 UI review, MEDIUM 3), never a
 * negative and never a false "0 of 5" over a week that is due to be voided.
 */
function reservesLeftLine(t: Dict, w: MillioneaHubWeek): string {
  const valid = RESERVE_COUNT - w.voidedReserves - w.voidedMains;
  return valid < 0 ? fill(t.millionea.reservesShort, { b: RESERVE_COUNT }) : fill(t.millionea.reservesLeft, { a: valid, b: RESERVE_COUNT });
}

/** The week's void is already certain (MR-18, the one grader's `weekVoidCertain`): its pool is "being voided", never a
 *  jackpot shared by every 10/10 ticket (the S5 UI review, HIGH 1 and MEDIUM 7). A record the grader refuses is not. */
function voidingNow(w: MillioneaHubWeek): boolean {
  try {
    return w.state !== "OPEN" && weekVoidCertain(gradableOf(w.questions));
  } catch {
    return false;
  }
}

/**
 * The once-per-week notices, said in the reader's language (§10 §3.15–§3.16). A result line counts the reader's own
 * tickets of THAT week — read by its week (`millioneaMyTicketsWeek`, round 3's RR4: never looked for on a page of the
 * list), only when such a notice waits — and its door opens a winning ticket: the seal plays there, on the reader's tap.
 */
async function noticesOf(t: Dict, hub: MillioneaHub, userId: string | null): Promise<HubNotice[]> {
  if (hub.notices.length === 0) return [];
  const weeks = new Map<string, MillioneaTicketsWeek | null>();
  if (userId) {
    for (const n of hub.notices) {
      if (n.notice === "RESULT" && !weeks.has(n.weekId)) weeks.set(n.weekId, await millioneaMyTicketsWeek(userId, n.weekId));
    }
  }
  const said = (n: MillioneaNotice): HubNotice | null => {
    const week = weekNumberOf(n.code);
    if (n.notice === "ROLLOVER") {
      const text = n.nextWeekCode
        ? fill(t.millionea.rolloverNotice, { prev: week, amount: formatTzs(n.carriedForward), week: weekNumberOf(n.nextWeekCode) })
        : `${weekWord(t, week)} · ${fill(t.millionea.settledRollover, { amount: formatTzs(n.carriedForward) })}`;
      return { weekId: n.weekId, notice: n.notice, text, door: null };
    }
    if (n.notice === "WEEK_VOID") {
      return { weekId: n.weekId, notice: n.notice, text: counted(n.tickets, t.millionea.resultRefundedOne, t.millionea.resultRefunded, { week }), door: null };
    }
    // ⛔ A week whose every win is still HELD says nothing yet (round 3, RR3): its result waits on Compliance's decision,
    //    and a once-only line shown now would spend the seal a release earns. The server does not send one; nor is one
    //    written here, so the notice stays unseen until it is true.
    if (n.winningTickets === 0 && n.held > 0) return null;
    const mine = weeks.get(n.weekId)?.tickets ?? [];
    const lost = mine.filter((x) => x.shown === "lost").length;
    const serial = resultDoorSerial(mine);
    return {
      weekId: n.weekId, notice: n.notice, text: resultLine(t, n, week, lost),
      door: { href: serial ? ticketPageHref(serial) : MILLIONEA_HREF.tickets, label: t.notif.awayView },
    };
  };
  return hub.notices.map(said).filter((x): x is HubNotice => x !== null);
}

/** One public question: its number, its category, its words, its event's time, and once attested the world's result. */
function QuestionRow({ t, locale, q }: { t: Dict; locale: Locale; q: MillioneaHubWeek["questions"][number] }) {
  const at = msOf(q.eventStartsAt);
  const reserve = q.role === "RESERVE";
  return (
    <li
      className="grid grid-cols-[32px_1fr] gap-x-2 gap-y-1 border-t border-border py-3 xl:grid-cols-[32px_104px_1fr_auto] xl:items-baseline"
      style={reserve ? { background: "var(--wash-inset)" } : undefined}
    >
      <span className={cn("font-mono text-body-sm font-bold tabular-nums", reserve ? "pl-1 text-text-subtle" : "text-text-muted")}>
        {reserve ? reserveLabel(ordinalOf(q)) : q.slot}
      </span>
      <span className="col-start-2 font-mono text-micro uppercase eyebrow text-text-subtle xl:col-start-auto">
        {marketCategoryLabel(t, q.category)}
      </span>
      <span className="col-start-2 text-body-sm text-text text-pretty xl:col-start-auto">{textIn(locale, q.text)}</span>
      <span className="col-start-2 flex flex-wrap items-center gap-2 xl:col-start-auto xl:justify-end">
        {at !== null && <span className="font-mono text-body-sm text-text-subtle">{fill(t.millionea.eventAt, { when: eatWeekdayClock(t, at) })}</span>}
        {q.outcome !== null && <MaswaliOutcomeStamp t={t} outcome={q.outcome} />}
      </span>
    </li>
  );
}

/** The fifteen, mains first, the reserves under their own head on the inset material (§10 §3.3 item 5). */
function WeekQuestions({ t, locale, w }: { t: Dict; locale: Locale; w: MillioneaHubWeek }) {
  const qs = bySlot(w.questions);
  return (
    <section id="mln-questions" aria-labelledby="mln-questions-h" className="flex scroll-mt-24 flex-col" data-testid="millionea-hub-questions">
      <h2 id="mln-questions-h" className="pb-2 font-display text-title-sm font-bold text-text">{t.millionea.weekQuestions}</h2>
      <ol>{qs.filter((q) => q.role === "MAIN").map((q) => <QuestionRow key={q.slot} t={t} locale={locale} q={q} />)}</ol>
      <div className="flex flex-col gap-0.5 border-t border-border px-1 pb-1.5 pt-2" style={{ background: "var(--wash-inset)", boxShadow: "var(--edge-shade)" }}>
        <span className="font-mono text-caption uppercase eyebrow text-text-subtle">{t.millionea.reservesHead}</span>
        <span className="text-body-sm text-text-muted text-pretty">{t.millionea.reserveRule}</span>
      </div>
      <ol>{qs.filter((q) => q.role === "RESERVE").map((q) => <QuestionRow key={q.slot} t={t} locale={locale} q={q} />)}</ol>
    </section>
  );
}

/** Last week as one closed row (§10 §3.3 item 6): its carry, its winners, or its void — a door to its register page. */
function LastWeekRow({ t, hub }: { t: Dict; hub: MillioneaHub }) {
  const last = hub.lastWeek;
  if (!last) return null;
  const week = weekNumberOf(last.code);
  const row = last.state === "SETTLED" && (last.winners ?? 0) === 0
    ? <MaswaliLastWeek t={t} week={week} carried={last.carriedForward ?? 0} id={CARRIED_FIGURE_ID} />
    : (
      <p className="mat-inset rounded-control px-3 py-2 text-body-sm text-text-muted">
        {last.state === "VOIDED"
          ? `${weekWord(t, week)} · ${t.millionea.weekStatusVoided}`
          : counted(last.winners ?? 0, t.millionea.settledWonOne, t.millionea.settledWon, { week })}
      </p>
    );
  return (
    <section aria-label={t.millionea.lastWeek} className="flex flex-col gap-1.5">
      <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{t.millionea.lastWeek}</span>
      <Link href={registerWeekHref(last.code) as never} className="block rounded-control">{row}</Link>
    </section>
  );
}

/** The reader's tickets in a week: "Tiketi zako wiki hii: 2 kati ya 10", then a row per held ticket (D-18). */
function MineBlock({ t, w }: { t: Dict; w: MillioneaHubWeek }) {
  if (!w.mine) return null;
  const held = w.mine.tickets.filter((x) => x.shown !== "cancelled");
  return (
    <div className="flex flex-col gap-2" data-testid="millionea-hub-mine">
      <p className="text-body-sm text-text-muted">{fill(t.millionea.yourTicketsThisWeek, { n: w.mine.held, cap: w.mine.cap })}</p>
      {held.map((row) => (
        <MaswaliHeldTicketRow key={row.serial} href={ticketPageHref(row.serial)} serial={row.serial} line={lineOf(w.questions, row.slots, w.state)} />
      ))}
    </div>
  );
}

/** The buy block (§10 §3.3 item 4): the door, the printed close, the pill in the last hour, the reader's tickets. */
function BuyBlock({ t, w, signedIn, nowMs, breakBody }: {
  t: Dict; w: MillioneaHubWeek; signedIn: boolean; nowMs: number;
  breakBody: { text: string; keep: readonly string[] } | null;
}) {
  const closesMs = msOf(w.closesAt) ?? 0;
  const open = w.state === "OPEN" && closesMs > nowMs;
  const atCap = !!w.mine && w.mine.held >= w.mine.cap;
  const next = nextWeekNumber(w.opensAt);
  const nextOpen = msOf(w.opensAt);
  let door: React.ReactNode = null;
  if (breakBody) {
    // The live break notice stands where the buy block stood (the delivery's open question 12): no buying door on a break.
    door = <BetBreakNotice body={breakBody} testId="millionea-hub-break" />;
  } else if (w.selling && !signedIn) {
    door = <Link href={signInHref(MILLIONEA_HREF.slip) as never} className="btn btn-primary btn-lg w-full" data-testid="millionea-hub-signin">{t.millionea.signInToBuy}</Link>;
  } else if (w.selling && atCap) {
    door = (
      <Callout tone="info" role="status">
        {fill(t.millionea.capReachedNote, { cap: w.ticketCap, week: next, day: nextOpen === null ? "—" : eatWeekday(t, nextOpen + 7 * 86_400_000) })}
      </Callout>
    );
  } else if (w.selling) {
    door = (
      <Link href={MILLIONEA_HREF.slip as never} className="btn btn-primary btn-lg w-full" data-testid="millionea-hub-fill">
        {moneyRuns(fill(t.millionea.fillTicket, { price: formatTzs(w.ticketPrice) }))}
      </Link>
    );
  } else if (w.state !== "OPEN") {
    door = <a href="#mln-questions" className="btn btn-ghost btn-lg w-full border-border-control" data-testid="millionea-hub-follow">{t.millionea.followResults}</a>;
  }
  const live = w.state !== "OPEN"
    ? [fill(t.millionea.resultsOut, { n: w.resultsOut }), reservesLeftLine(t, w)].join(" · ")
    : null;
  return (
    <div className="flex flex-col gap-3" data-testid="millionea-hub-buy">
      {door}
      {open && (
        <p className="flex items-center gap-1.5 text-body-sm text-text-muted">
          <I.hourglassHalf s={14} className="shrink-0" />
          <span>{fillNodes(t.millionea.salesCloseAt, { when: <span className="font-mono text-text">{eatWeekdayClock(t, closesMs)}</span> })}</span>
        </p>
      )}
      {open && !breakBody && <MaswaliClosingPill closesAt={closesMs} serverNow={nowMs} className="self-start" />}
      {live && <p className="text-body-sm text-text-muted">{live}</p>}
      <MineBlock t={t} w={w} />
    </div>
  );
}

/** A second week still being graded while this one sells (MR-3): its line, and the reader's tickets in it. */
function GradingBlock({ t, w }: { t: Dict; w: MillioneaHubWeek }) {
  return (
    <section aria-label={weekEyebrow(t, w)} className="mat-flat flex flex-col gap-2 rounded-card p-3">
      <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{weekEyebrow(t, w)}</span>
      <p className="text-body-sm text-text-muted">{fill(t.millionea.resultsOut, { n: w.resultsOut })}</p>
      <MineBlock t={t} w={w} />
    </section>
  );
}

export default async function MillioneaHubPage() {
  const gate = await millioneaGate();
  const { t, locale } = await getServerT();
  const now = new Date();
  const nowMs = now.getTime();
  const hub = await millioneaHub({ userId: gate.userId, state: gate.state }, now);
  const brk = await millioneaBreakOf(gate.userId);
  const breakBody = brk
    ? breakSentence(brk.exclusion ? t.rg.exclusionActive : t.rg.breakActive, brk.until, nowMs, t.common.monthsShort, locale)
    : null;
  const notices = await noticesOf(t, hub, gate.userId);
  const w = hub.week;
  const rolloverUnseen = hub.notices.some((n) => n.notice === "ROLLOVER");
  const phases = w ? phasesOf(w) : null;

  return (
    <PageContainer tier="reading">
      <div data-testid="millionea-hub" className="flex flex-col gap-6">
        <RefreshPoller intervalMs={60_000} />
        <PageHeader eyebrow={w ? weekEyebrow(t, w) : undefined} title={t.millionea.productTitle} />
        {gate.preview && <MillioneaPreviewMark t={t} />}
        <HubNotices notices={notices} renderedAt={hub.asOf} />
        {hub.life === "RETIRED" && hub.lastWeek && (
          <Callout tone="neutral" role="status">{fill(t.millionea.stoppedSunset, { week: weekNumberOf(hub.lastWeek.code) })}</Callout>
        )}
        {hub.paused && <Callout tone="neutral" role="status">{t.millionea.paused}</Callout>}
        {w?.isFinal && <Callout tone="info" glyph="flag" role="status">{t.millionea.finalWeek}</Callout>}

        {w ? (
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,640px)_400px] xl:gap-8">
            {phases && (
              <div className="xl:col-start-1">
                <MaswaliWeekStrip t={t} phases={phases} current={phaseNow(w, phases, nowMs)} />
              </div>
            )}
            <aside className="flex flex-col gap-4 xl:sticky xl:top-5 xl:col-start-2 xl:row-span-3 xl:row-start-1">
              {w.pool ? (
                <HubPool
                  weekId={w.id}
                  initial={w.pool}
                  price={w.ticketPrice}
                  opensAt={w.opensAt}
                  voiding={voidingNow(w)}
                  carryFrom={rolloverUnseen && hub.lastWeek ? CARRIED_FIGURE_ID : undefined}
                  carryPlay={rolloverUnseen}
                />
              ) : null}
              <BuyBlock t={t} w={w} signedIn={!!gate.userId} nowMs={nowMs} breakBody={breakBody} />
              {hub.grading && <GradingBlock t={t} w={hub.grading} />}
            </aside>
            <div className="xl:col-start-1">
              <WeekQuestions t={t} locale={locale} w={w} />
            </div>
            <div className="flex flex-col gap-4 xl:col-start-1">
              <LastWeekRow t={t} hub={hub} />
              <MillioneaReadingLinks t={t} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Callout tone="neutral" role="status">
              <span className="flex flex-col gap-1">
                <span>{t.millionea.hubNoWeek}</span>
                {msOf(hub.nextOpensAt) !== null && (
                  <span>{fill(t.millionea.nextOpensAt, { when: eatWeekdayClock(t, msOf(hub.nextOpensAt) ?? 0) })}</span>
                )}
                <span className="text-text-muted">{t.millionea.questionsAtOpen}</span>
              </span>
            </Callout>
            <LastWeekRow t={t} hub={hub} />
            <MillioneaReadingLinks t={t} />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

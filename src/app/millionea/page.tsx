/**
 * /millionea — THE HUB (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 1, §10 §3.3, §3.15–§3.16; the v6 delivery's U-hub
 * frames; DESIGN_AUTHORITY §M8a). The reading tier.
 *
 * Over the page, the hub's calm bars (§F9; §M8a item 10): a moved sales close (M7), the final week announced ahead (OD-03,
 * L22) and the once-per-week notices (M9) — the kit's `NoticeBar`, under the header, as the platform's away bar.
 * Top to bottom at a phone's width (S5-DESIGN-HUB, R1-hub H1): the week, its state in its own ink, the product's name, its
 * two doors (How to play, the reader's tickets) and the game in one line (M2); the week strip; the jackpot's HEAD (the
 * figure and its rule); the buy block (the door and its one status line: the close and the closing pill in the last hour,
 * or how far a closed week's results have come); the pool's LEDGER; the reader's tickets; a second week being graded; the
 * fifteen public questions with each attested result's stamp; last week as one closed row; How to play and the register.
 * From 768 the head stands beside the door and the ledger beside the reader's tickets (M1); from 1024 two columns, the
 * market page's grid (the questions, last week and the links on the left; the jackpot's head and the door pinned 72px
 * down on the right — clear of the 56px header — with the ledger, the tickets and the graded week reading on under it,
 * H2). Every "·"-joined line is a fact line (`maswali-facts.tsx`, A1).
 * ⭐ ONE FRAME, THE PAGE'S AND ITS LOADING DRAWING'S (S5-R2-HUB; `hub-frame.ts`): every place a band stands is written once
 * and both compose it, and the reader's own tickets stand LAST in the buy column (MASWALI-PLAN §10 §3.3: "the pool block,
 * the buy block and my tickets"; the v6 frames) — the one band whose height is the reader's, so the swap from the drawing
 * to the page moves nothing above or beside it, whether the reader holds no ticket, one, or many.
 *
 * ⛔ THE GATE FIRST (`millioneaGate`): a hidden product is a missing page, here and in the metadata (MR-2).
 * ⛔ AN UNEARNED SURFACE: no gold in this file (§M8a item 7; `test:gold-is-money` 1d). The door to the slip is the
 *    brand primary — the gold sits only on the confirm sheet's armed commit (§M3a).
 * ⛔ NO PICK HERE, AND NOTHING ABOUT ANYONE ELSE'S: the questions are public, the reader's own tickets are theirs, and
 *    no aggregate or "still in" count exists before settlement (MB-38, OD-24).
 * ⛔ No `.catch` on the read: a failed read is the error page, never a calm "no week" (B-1).
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PAGE_HEADER_PILL, PageHeader } from "@/components/ui/page-header";
import { Callout } from "@/components/ui/callout";
import { NoticeBar } from "@/components/ui/notice-bar";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { I } from "@/components/ui/glyphs";
import { BetBreakNotice } from "@/components/rg/bet-break-notice";
import { MaswaliWeekStrip } from "@/components/maswali/maswali-week-strip";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { MaswaliHeldTicketRow } from "@/components/maswali/maswali-ticket";
import { MaswaliClosingPill } from "@/components/maswali/maswali-slip";
import { MaswaliStrike } from "@/components/maswali/maswali-strike";
import { MaswaliEmptyState } from "@/components/maswali/maswali-empty-state";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { counted, eatWeekdayClock, reserveLabel, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { weekdayClock } from "@/components/maswali/maswali-numerals";
import { millioneaGate } from "@/lib/server/millionea-gate";
import {
  millioneaCloseMove, millioneaFinalWeekAhead, millioneaHub, millioneaHubCancelEnds, millioneaHubCommitments, millioneaMyTicketsWeek,
  type MillioneaHub, type MillioneaHubWeek, type MillioneaNotice, type MillioneaTicketsWeek,
} from "@/lib/server/maswali-player";
import { millioneaBreakOf, millioneaDoor, millioneaOpenTemplate } from "@/lib/server/millionea-doors";
import { nextWeekOpen } from "@/components/maswali/maswali-card-model";
import { getServerT } from "@/lib/i18n-server";
import { breakSentence } from "@/lib/break-end";
import { authDoorHrefs } from "@/lib/auth-landing";
import { marketCategoryLabel } from "@/lib/localized";
import { fillNodes, moneyRuns } from "@/lib/fill-nodes";
import { cn, fill, formatNumber, formatTzs } from "@/lib/utils";
import { MAIN_COUNT, RESERVE_COUNT, displayMap, weekVoidCertain } from "@/lib/maswali-score";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { HUB_DOOR, HUB_EYEBROW, HUB_GRID, HUB_MINE, HUB_PINNED, HUB_QUESTIONS, HUB_STRIP, hubAside, hubCell, hubMain, hubTail } from "./hub-frame";
import { HubPoolHead, HubPoolLedger, HubPoolLive } from "./hub-pool";
import { HubNotices, type HubNotice } from "./hub-notices";
import { HubOutcomeStamp, HubPressGroup } from "./hub-stamp";
import { carryingRollover, closeMovedWords, closeWords, finalAheadWords, lastWeekWords, noWeekBody, pausedWords, voidWords, voidingWords } from "./hub-words";
import { MILLIONEA_HREF, MillioneaReadingLinks, registerWeekHref, ticketPageHref } from "./millionea-parts";
import { WeekCommitments, WeekStateChip, weekChipWord } from "./register/register-parts";
import { bySlot, capReachedLine, gradableOf, lineOf, millioneaWeekPhase, msOf, ordinalOf, phaseNow, phasesOf, reserveRuleAfterHead, resultDoorSerial, resultLine, textIn } from "./millionea-view";

export const dynamic = "force-dynamic";

/** The id of the rollover notice's carried figure: the origin of M7's carry into this week's ledger (R1-hub M10). */
const CARRIED_FIGURE_ID = "mln-carried-figure";
/** The jackpot's label: it names the column that holds the jackpot and the door (L17, as the market names its bet panel). */
const JACKPOT_LABEL_ID = "mln-jackpot-label";
/** Held tickets drawn in a week's block before "See all" (R1-hub M8): at the cap, ten rows ran ~900px. */
const HELD_SHOWN = 3;

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (the account hub's precedent): a hidden product's page is titled as the
  // identical 404 is, and asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaDoor()).visible) return notFoundMetadata();
  const { t } = await getServerT();
  return { title: t.millionea.productTitle };
}

/**
 * ⭐ M5 · WHERE A WEEK STANDS, AS ITS OWN CHIP (§T3: "a STATE line keeps its state's ink"; §B11's dictionary): the
 * register's one week chip (`WeekStateChip`, the REGISTER lane's shared drawing) beside the week it qualifies — the one
 * phase's word (`millioneaWeekPhase`, S5-FIX-PLAYER P6), or "Paused for now" over a paused week (it said "Open"), in
 * status-tone's own tone for that word. The hub's title is the product and its eyebrow the week, so the chip stands in the
 * eyebrow's row, beside "WEEK 49"; on the register the week IS the title, and its chip stands under it.
 */
function WeekLabel({ t, w, nowMs, paused }: { t: Dict; w: MillioneaHubWeek; nowMs: number; paused: boolean }) {
  return (
    <span className={HUB_EYEBROW}>
      <span>{weekWord(t, weekNumberOf(w.code))}</span>
      <WeekStateChip t={t} state={w.state} phase={millioneaWeekPhase(w, nowMs)} paused={paused} />
    </span>
  );
}
function weekLabelText(t: Dict, w: MillioneaHubWeek, nowMs: number, paused: boolean): string {
  return `${weekWord(t, weekNumberOf(w.code))} · ${weekChipWord(t, w.state, millioneaWeekPhase(w, nowMs), paused)}`;
}

/** P6 · "Objection window until Tuesday 12:00" while the week's window is open (its end still ahead), else nothing. */
function objectionsLine(t: Dict, locale: Locale, w: MillioneaHubWeek, nowMs: number): ReactNode {
  const until = millioneaWeekPhase(w, nowMs).objectionsUntil;
  return until === null ? null : keepFact(locale, fill(t.millionea.checkWindowUntil, { when: eatWeekdayClock(t, until) }));
}

/** L12 · "next event Sunday 16:00" — the first unsealed event still ahead (P5: never one already past), its day never
 *  parted from its time; nothing once every awaited event has begun. */
function nextEventLine(t: Dict, w: MillioneaHubWeek): ReactNode {
  const at = msOf(w.nextResultAt);
  return at === null ? null : <span key="next">{fillNodes(t.millionea.nextEvent, { when: weekdayClock(t, at) })}</span>;
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
 *  jackpot shared by every 10/10 ticket (the S5 UI review, HIGH 1 and MEDIUM 7). A record the grader refuses is not. Read from
 *  the week's one phase (`millioneaWeekPhase`, S5-FIX-PLAYER P6): the same answer its eyebrow says. */
function voidingNow(w: MillioneaHubWeek, nowMs: number): boolean {
  return millioneaWeekPhase(w, nowMs).kind === "voiding";
}

/**
 * The once-per-week notices, said in the reader's language (§10 §3.15–§3.16). A result line counts the reader's own
 * tickets of THAT week — read by its week (`millioneaMyTicketsWeek`, round 3's RR4: never looked for on a page of the
 * list), only when such a notice waits — and its door opens a winning ticket: the seal plays there, on the reader's tap.
 * `carry` marks ONE rollover's figure — the week this week's ledger carries in from — as the carry's origin (M10).
 */
async function noticesOf(t: Dict, hub: MillioneaHub, userId: string | null, carry: { code: string; id: string } | null): Promise<HubNotice[]> {
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
      const amount = formatTzs(n.carriedForward);
      const text = n.nextWeekCode
        ? fill(t.millionea.rolloverNotice, { prev: week, amount, week: weekNumberOf(n.nextWeekCode) })
        : `${weekWord(t, week)} · ${fill(t.millionea.settledRollover, { amount })}`;
      return { weekId: n.weekId, notice: n.notice, text, door: null, carry: carry && n.code === carry.code ? { figure: amount, id: carry.id } : undefined };
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

/**
 * L13 · what a voided MAIN question leaves the week, in the ticket's own words (`maswali-ticket.tsx`, one wording per
 * truth): the reserve that stands in once the graded set has named it ("Void ↪ A1"), "too few reserves: the week is due to
 * be voided" once the void is certain, else "a reserve will take its place". A reserve's void is its stamp alone.
 * ⭐ S5-R2-HUB · after the row's stamp (which says "Void") the words are the sentence's second fact, as the register's week
 * page draws them (`voidWords`): one drawing for one truth, never "Void" alone on a first line, never "voided" on a last.
 */
function voidWordsOf(t: Dict, locale: Locale, q: MillioneaHubWeek["questions"][number], gq: ReturnType<typeof gradableOf>): ReactNode {
  if (q.role !== "MAIN" || q.outcome !== "VOID") return null;
  try {
    if (weekVoidCertain(gq)) return voidWords(locale, t.millionea.voidWeekCertain);
    const row = displayMap(gq)?.find((r) => r.slot === q.slot);
    if (row?.state === "REPLACED_BY") {
      // The reserve's label is a numeral, as in its own row ("A1", §T5).
      return <>{t.millionea.void}<MillioneaGlyph name="standIn" s={14} /><span className="mono">{reserveLabel(row.reserve - MAIN_COUNT)}</span></>;
    }
  } catch {
    // A record the grader refuses names no stand-in: the waiting words below are true of it.
  }
  return voidWords(locale, t.millionea.voidAwaiting);
}

/**
 * One public question: its number, its category, its words, its event's time, and once attested the world's result.
 * ⭐ M1 · from 768 a table row — number, category, words, then the time with the result stamp under it (M12: side by side
 * at 1280 they left the question ~120px); a phone keeps the stacked row. A voided question's words are struck in the
 * muted ink, as the ticket strikes them (L13) — through the one strike, which ends at the last mark's ink (`MaswaliStrike`,
 * DESIGN_AUTHORITY §M8a item 24: a plain strike ran half an em past a Chinese "？"). ⭐ M11 · the stamp presses when its
 * result arrives while the reader looks.
 */
function QuestionRow({ t, locale, q, voidWords }: { t: Dict; locale: Locale; q: MillioneaHubWeek["questions"][number]; voidWords: ReactNode }) {
  const at = msOf(q.eventStartsAt);
  const reserve = q.role === "RESERVE";
  const voided = q.outcome === "VOID";
  return (
    <li className={HUB_QUESTIONS.row} data-slot={q.slot}>
      <span className={cn(HUB_QUESTIONS.number, reserve ? "text-text-subtle" : "text-text-muted")}>
        {reserve ? reserveLabel(ordinalOf(q)) : q.slot}
      </span>
      <span className={HUB_QUESTIONS.category}>
        {marketCategoryLabel(t, q.category)}
      </span>
      <span className={HUB_QUESTIONS.words}>
        <span className={cn(HUB_QUESTIONS.text, voided ? "text-text-muted" : "text-text")}>{voided ? <MaswaliStrike text={textIn(locale, q.text)} /> : textIn(locale, q.text)}</span>
        {voidWords && <span className="inline-flex flex-wrap items-center gap-x-1 text-body-sm text-text-muted text-pretty" data-testid="millionea-hub-void-words">{voidWords}</span>}
      </span>
      <span className={HUB_QUESTIONS.when}>
        {/* "Event Saturday 09:00" is one run: a day never parts from its time (S5 VIS A1) — its words in the body face, its
            clock a numeral (the lead's L7 ruling, §T5). */}
        {at !== null && <span className={HUB_QUESTIONS.time}>{fillNodes(t.millionea.eventAt, { when: weekdayClock(t, at) })}</span>}
        <HubOutcomeStamp slot={q.slot} outcome={q.outcome} />
      </span>
    </li>
  );
}

/**
 * The fifteen, mains first, then the reserves under their own head (§10 §3.3 item 5) — the head and the five rows one
 * recessed block, the inset rung itself (`.mat-inset`, L3; §M2: a surface picks a rung, it never composes a shadow).
 */
function WeekQuestions({ t, locale, w }: { t: Dict; locale: Locale; w: MillioneaHubWeek }) {
  const qs = bySlot(w.questions);
  const gq = gradableOf(w.questions);
  // "This week's questions" for the week on sale alone; a week being graded is named by its number (S5-FIX-PLAYER P8, the
  // register's own R6: "Week 47's questions" — the hub headed a past week's fifteen "this week's" when none sold).
  const heading = w.state === "OPEN" ? t.millionea.weekQuestions : fill(t.millionea.regWeekQuestions, { week: weekNumberOf(w.code) });
  const row = (q: (typeof qs)[number]) => <QuestionRow key={q.slot} t={t} locale={locale} q={q} voidWords={voidWordsOf(t, locale, q, gq)} />;
  return (
    <section id="mln-questions" aria-labelledby="mln-questions-h" className={HUB_QUESTIONS.section} data-testid="millionea-hub-questions">
      <h2 id="mln-questions-h" className={HUB_QUESTIONS.heading}>{heading}</h2>
      <HubPressGroup outcomes={Object.fromEntries(qs.map((q) => [q.slot, q.outcome]))}>
        <ol>{qs.filter((q) => q.role === "MAIN").map(row)}</ol>
        <div className="mat-inset mt-1.5 rounded-control px-2" data-testid="millionea-hub-reserves">
          <div className="flex flex-col gap-0.5 pb-1.5 pt-2">
            <span className="font-mono text-caption uppercase eyebrow text-text-subtle"><MaswaliFacts facts={factsOf(t.millionea.reservesHead)} /></span>
            <span className="text-body-sm text-text-muted text-pretty">{keepFact(locale, reserveRuleAfterHead(t))}</span>
          </div>
          <ol>{qs.filter((q) => q.role === "RESERVE").map(row)}</ol>
        </div>
      </HubPressGroup>
    </section>
  );
}

/**
 * Last week as one closed row (§10 §3.3 item 6): its carry, its winners, or its void — a door to its register page, the
 * row's whole box (P16: the tap floor, and its end mark, as the register's own rows end). ⭐ S5-FIX-PLAYER P8: only when it
 * IS last week — the week right before the hub's own in the calendar chain (`lastWeekIsPrevious`); while a later week is
 * still being graded, the newest final week is not, and the grading block stands for the week before.
 * ⭐ L14 · a voided week says it in the register's words for that same week ("Week 48 · Voided · Every ticket refunded",
 * or "Refunds on their way" until every refund landed — the read model's `refundsPending`), never a bare "Voided".
 * ⭐ H4 · after Millionea has ended (`retired`), the row is the FINAL week's, under that name, however long ago it ran.
 * A DRIVE line's week has no public register page: its row is its words, no door to a page that is not there.
 */
function LastWeekRow({ t, locale, hub, retired = false }: { t: Dict; locale: Locale; hub: MillioneaHub; retired?: boolean }) {
  const last = hub.lastWeek;
  if (!last || (!retired && !hub.lastWeekIsPrevious)) return null;
  const words = lastWeekWords(t, locale, last);
  const label = retired ? t.millionea.finalWeek : t.millionea.lastWeek;
  return (
    <section aria-label={label} className="flex flex-col gap-1.5" data-testid="millionea-hub-last-week">
      <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{label}</span>
      {hub.line === "PUBLIC" ? (
        <Link href={registerWeekHref(last.code) as never} className={DOOR_ROW} style={DOOR_ROW_FLOOR}>
          <span className="min-w-0">{words}</span>
          <I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />
        </Link>
      ) : (
        <p className={DOOR_ROW} style={DOOR_ROW_FLOOR}><span className="min-w-0">{words}</span></p>
      )}
    </section>
  );
}

/** A week's door row — last week's, the graded week's facts — in one anatomy: the inset rung, the whole row the link, the
 *  medium control's height at least (P16's tap floor), the register's row end. */
const DOOR_ROW = "mat-inset flex items-center justify-between gap-2 rounded-control px-3 py-2 text-body-sm text-text-muted";
const DOOR_ROW_FLOOR = { minHeight: "var(--h-control-md)" } as const;

/** Whether the reader's block draws anything — a selling week's always (its count line), any other week's only with a
 *  held row to show: `MineBlock`'s own test, which the column's cells read too (no cell stands empty at 768). */
function mineDrawn(w: MillioneaHubWeek): boolean {
  return !!w.mine && (w.state === "OPEN" || w.mine.tickets.some((x) => x.shown !== "cancelled"));
}
/** Whether the buy block draws anything: nothing while a week on sale does not sell to the reader (paused, a public week
 *  at STAFF_PREVIEW) and no break stands in its place — `BuyDoor`'s own test, which the column's cells read too. */
function buyDrawn(w: MillioneaHubWeek, onBreak: boolean): boolean {
  return onBreak || w.selling || w.state !== "OPEN";
}

/**
 * The reader's tickets in a week: a row per held ticket (D-18), newest first, at most three, then "See all 10 tickets ›"
 * to Tiketi zangu (R1-hub M8: at the cap, ten rows ran ~900px) — under "Tiketi zako wiki hii: 2 kati ya 10" for the week on
 * SALE alone (S5-FIX-PLAYER P8): the cap is a selling week's allowance, and a week being graded is not "this week" (its
 * block said "Your tickets this week: 2 of 10" under the open week's own line). A week being graded keeps its rows.
 * ⭐ S5-R2-HUB · the week on sale's block stands LAST in the buy column, after the pool's ledger (`hub-frame.ts`): its
 * height is the reader's — none, a row, three and "See all" — so nothing above or beside it moves with it, and the loading
 * drawing's neutral block is replaced in place (it stood between the door and the ledger: the ledger landed 135–170px
 * below its drawing whenever the reader held a ticket).
 * ⭐ S5-R2-HUB · a closed week's rows stand under their own label, "Your tickets" (the tickets page's own title): under
 * the ledger, unlabelled, they read as more of the ledger (the tile readers, closed and resolving at every width).
 */
function MineBlock({ t, locale, w, nowMs, cancelEnds, className }: {
  t: Dict; locale: Locale; w: MillioneaHubWeek; nowMs: number;
  /** Each held ticket's free-cancel end, by serial (`millioneaHubCancelEnds`, the ticket page's own test) — L20. */
  cancelEnds?: Readonly<Record<string, string>>;
  className?: string;
}) {
  if (!w.mine || !mineDrawn(w)) return null;
  const held = w.mine.tickets.filter((x) => x.shown !== "cancelled").sort((a, b) => Date.parse(b.boughtAt) - Date.parse(a.boughtAt));
  const onSale = w.state === "OPEN";
  return (
    <div className={cn(HUB_MINE.box, className)} data-testid="millionea-hub-mine">
      {onSale && <p className={HUB_MINE.count}>{keepFact(locale, fill(t.millionea.yourTicketsThisWeek, { n: formatNumber(w.mine.held), cap: formatNumber(w.mine.cap) }))}</p>}
      {!onSale && <p className={HUB_MINE.count}>{t.millionea.ticketsTitle}</p>}
      {/* L4 · the row lifts and presses as the kit's raised card does and is named for what it opens ("View ticket · MLN-…");
          L20 · while its free cancel is open, the row says so in the ticket page's own words — TICKETS' row, handed the
          dictionary, the window's end and this render's instant. */}
      {held.slice(0, HELD_SHOWN).map((row) => (
        <MaswaliHeldTicketRow key={row.serial} t={t} href={ticketPageHref(row.serial)} serial={row.serial} line={lineOf(w.questions, row.slots, w.state)}
          cancelUntil={msOf(cancelEnds?.[row.serial]) ?? undefined} serverNow={nowMs} />
      ))}
      {held.length > HELD_SHOWN && (
        <Link href={MILLIONEA_HREF.tickets as never} className="inline-flex items-center gap-1 self-start text-body-sm text-text-link hover:text-text-linkHover" style={{ minHeight: "var(--h-control-md)" }} data-testid="millionea-hub-see-all">
          <span>{keepFact(locale, fill(t.millionea.seeAllTickets, { n: formatNumber(held.length) }))}</span>
          <I.chevronRight s={14} edge="end" text="body-400" />
        </Link>
      )}
    </div>
  );
}

/**
 * The buy block's DOOR (§10 §3.3 item 4): the door and, beside a door that buys, its one status line — the printed close
 * with the closing pill in its row. A closed week's "Follow the results" stands alone here: how far its results have come
 * is the week's own cell under it (`WeekFacts`, S5-R2-HUB 12).
 * `nextOpen` is when the next week opens on the template (`nextWeekOpen`) — null in a final week or while Millionea ends,
 * and the cap line then promises no next week (the S5 review of 24ec0d33, MEDIUM 5).
 * ⭐ M3 · A GUEST IS OFFERED SIGN UP FIRST (§K 8d), then Sign in — the market page's own pair, through the one door rule
 * (`authDoorHrefs`: back to the slip after, the page's `ref` and `invite` carried beside `next`, never dropped).
 */
function BuyDoor({ t, locale, w, signedIn, nowMs, nextOpen, breakBody, guest, className }: {
  t: Dict; locale: Locale; w: MillioneaHubWeek; signedIn: boolean; nowMs: number; nextOpen: number | null;
  breakBody: { text: string; keep: readonly string[] } | null; guest: { signIn: string; signUp: string }; className?: string;
}) {
  const closesMs = msOf(w.closesAt) ?? 0;
  // ⭐ S5-FIX-PLAYER P15 · THE CLOSE AND ITS COUNTDOWN STAND ONLY WHILE THE WEEK SELLS TO THIS READER (`selling`: OPEN, before
  // its close, not paused, and the rollout sells its line): a paused week, or a public week at STAFF_PREVIEW, has nothing
  // anyone can buy before that close, so nothing is counted down to it.
  const open = w.selling;
  const atCap = !!w.mine && w.mine.held >= w.mine.cap;
  let door: ReactNode = null;
  // L9 · the close prints beside a door that BUYS (the fill door, or a guest's way in to it) — never under the cap's line
  // or a break's notice, where nothing can be bought before it.
  let buys = false;
  if (breakBody) {
    // The live break notice stands where the buy block stood (the delivery's open question 12): no buying door on a break.
    door = <BetBreakNotice body={breakBody} testId="millionea-hub-break" />;
  } else if (open && !signedIn) {
    buys = true;
    door = (
      <div className="flex flex-col gap-2" data-testid="millionea-hub-guest">
        <p className="text-body-sm text-text-muted">{t.millionea.signInToBuy}</p>
        {/* Side by side at every width (the market page stacks them below 360): two short words fit a 320 phone's half
            column, and stacked they took the pair under the rail there (H1). */}
        <div className="grid grid-cols-2 gap-2">
          <Link href={guest.signUp as never} className="btn btn-primary btn-md btn-pill" data-testid="millionea-hub-signup">{t.common.signUp}</Link>
          <Link href={guest.signIn as never} className="btn btn-ghost btn-md btn-pill" data-testid="millionea-hub-signin">{t.common.signIn}</Link>
        </div>
      </div>
    );
  } else if (open && atCap) {
    // The cap's one line, the slip's refusal says it too (S5-FIX-PLAYER P13): the next week only when one can follow — its
    // counts and its week's number numerals (§T5, round 2), its phrases kept whole.
    door = <Callout tone="info" role="status">{keepFact(locale, capReachedLine(t, w.ticketCap, nextOpen))}</Callout>;
  } else if (open) {
    buys = true;
    door = (
      <Link href={MILLIONEA_HREF.slip as never} className="btn btn-primary btn-lg w-full" data-testid="millionea-hub-fill">
        {moneyRuns(fill(t.millionea.fillTicket, { price: formatTzs(w.ticketPrice) }))}
      </Link>
    );
  } else if (w.state !== "OPEN") {
    // L16 · the kit's ghost as it is: a `border-border-control` here drew nothing of its own (the kit's .btn-ghost rule
    // wins; both measured 1.79:1 on the page's ground) — a ghost border under §A1's 3:1 is the kit's, reported for every page.
    door = <a href="#mln-questions" className="btn btn-ghost btn-lg w-full" data-testid="millionea-hub-follow">{t.millionea.followResults}</a>;
  }
  if (!buyDrawn(w, !!breakBody)) return null;
  return (
    <div className={cn(HUB_DOOR.box, className)} data-testid="millionea-hub-buy">
      {door}
      {/* A printed time draws the clock (MASWALI-PLAN §10c: `clock` is "a time or date"); the hourglass is the countdown's
          own key, worn by the closing pill. ⭐ R1-motion M8 · the pill stands IN the close's row, the row already at the
          pill's height; and the row makes the pill's room itself (`.kp-mln-close:has(.closing-pill)`, globals.css): in the
          last hour the close is today, so its weekday steps aside — the line never grows a second one (sw 320: 239px of
          words beside a 76px pill in a 288px column), and nothing under it moves. The weekday in the body face, the clock
          a `.mono` numeral (the lead's L7 ruling). S5-R2-HUB · the line is the one wording the slip and the ticket say, its
          zone held to its clock (`closeWords`, the lead's ruling 2026-10-22). */}
      {open && buys && (
        <div className={HUB_DOOR.close} data-testid="millionea-hub-close">
          <p className={HUB_DOOR.closeLine}>
            <I.clock s={14} className="shrink-0" />
            <span>{closeWords(t, closesMs)}</span>
          </p>
          <MaswaliClosingPill closesAt={closesMs} serverNow={nowMs} compact />
        </div>
      )}
    </div>
  );
}

/**
 * A CLOSED WEEK'S STATUS, UNDER ITS DOOR: how far its results have come — results in, valid reserves left, the objection
 * window's end while open (P6) and the next event (L12) — a fact line (A1); nothing while the week sells.
 * ⭐ S5-R2-HUB 12 · ITS OWN CELL (§M8a item 27; the tile readers, voiding at 768 in sw, en and zh): inside the door's block
 * these three or four lines made "Follow the results" taller than the jackpot's head beside it, and from 768 the head's
 * cell hung over an empty band (80px at sw and en 768) before the ledger. Under the door in the column's second row, they
 * start level with the ledger, which follows the head; from 1024 they read on under the pinned pair, which holds only the
 * head and the door (H2: the jackpot's head and the button, nothing else, stay pinned).
 */
function WeekFacts({ t, locale, w, nowMs, className }: { t: Dict; locale: Locale; w: MillioneaHubWeek; nowMs: number; className?: string }) {
  if (w.state === "OPEN") return null;
  const facts = [keepFact(locale, fill(t.millionea.resultsOut, { n: formatNumber(w.resultsOut) })), keepFact(locale, reservesLeftLine(t, w)), objectionsLine(t, locale, w, nowMs), nextEventLine(t, w)];
  return <p className={cn("text-body-sm text-text-muted", className)} data-testid="millionea-hub-facts"><MaswaliFacts facts={facts} /></p>;
}

/** A second week still being graded while this one sells (MR-3): where it stands (P6, in its state's ink — M5), its
 *  results so far — and while it is open, its objection window's end; the next event (L12) — and the reader's tickets.
 *  ⭐ L5 · its facts are the door to the week's register page (a public week's page from the moment it opens, REGISTER's
 *  H2): the last-week row's own drawing, the whole row the link with the register's row end — so no reader meets a card
 *  that leads nowhere. A DRIVE week has no public page: its facts stand as words. */
function GradingBlock({ t, locale, w, nowMs, className }: { t: Dict; locale: Locale; w: MillioneaHubWeek; nowMs: number; className?: string }) {
  const facts = <MaswaliFacts facts={[keepFact(locale, fill(t.millionea.resultsOut, { n: formatNumber(w.resultsOut) })), objectionsLine(t, locale, w, nowMs), nextEventLine(t, w)]} />;
  return (
    <section aria-label={weekLabelText(t, w, nowMs, false)} className={cn("mat-flat flex flex-col gap-2 rounded-card p-3", className)} data-testid="millionea-hub-grading">
      <span className="font-mono text-micro uppercase eyebrow text-text-subtle"><WeekLabel t={t} w={w} nowMs={nowMs} paused={false} /></span>
      {w.visibility === "PUBLIC" ? (
        <Link href={registerWeekHref(w.code) as never} className={DOOR_ROW} style={DOOR_ROW_FLOOR} data-testid="millionea-hub-grading-door">
          <span className="min-w-0">{facts}</span>
          <I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />
        </Link>
      ) : <p className="text-body-sm text-text-muted">{facts}</p>}
      <MineBlock t={t} locale={locale} w={w} nowMs={nowMs} />
    </section>
  );
}

/** M6 · a week being voided, named: how many mains voided against how few valid reserves, and by when it is final if no
 *  objection changes it — the week's own "results and payout" end (`resultsBy`: the objection window's end once stamped,
 *  else the latest void deadline plus the frozen window). Neutral, never an error (M8). */
function VoidingNotice({ t, locale, w }: { t: Dict; locale: Locale; w: MillioneaHubWeek }) {
  const by = msOf(w.resultsBy);
  if (by === null) return null;
  // The reserves not voided themselves (never below zero: at most five can void), as the sentence says "only 2 valid".
  const valid = RESERVE_COUNT - w.voidedReserves;
  return (
    <div data-testid="millionea-hub-voiding">
      <Callout tone="neutral" role="status">{voidingWords(t, locale, w.voidedMains, valid, by)}</Callout>
    </div>
  );
}

export default async function MillioneaHubPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const gate = await millioneaGate();
  const sp = await searchParams;
  const { t, locale } = await getServerT();
  const now = new Date();
  const nowMs = now.getTime();
  const hub = await millioneaHub({ userId: gate.userId, state: gate.state }, now);
  const brk = await millioneaBreakOf(gate.userId);
  const breakBody = brk
    ? breakSentence(brk.exclusion ? t.rg.exclusionActive : t.rg.breakActive, brk.until, nowMs, t.common.monthsShort, locale)
    : null;
  const w = hub.week;
  const retired = hub.life === "RETIRED";
  // M7 · a moved close, while it is still ahead; L22 · the final week announced ahead, while the week on sale is not it.
  // The lead's ruling on R1-register H2: the week's two commitments, printed in its section from the moment each is stamped.
  // L20 · each held ticket's free-cancel end, while the week sells and the reader holds one (the ticket page's own test).
  const [moved, finalAhead, commitments, cancelEnds] = await Promise.all([
    w ? millioneaCloseMove(w, nowMs) : Promise.resolve(null),
    hub.life === "ENDING" && !w?.isFinal ? millioneaFinalWeekAhead(hub.line) : Promise.resolve(null),
    w ? millioneaHubCommitments(w.id) : Promise.resolve(null),
    w && gate.userId && w.state === "OPEN" && (w.mine?.held ?? 0) > 0 ? millioneaHubCancelEnds(w.id, gate.userId, now) : Promise.resolve({}),
  ]);
  // M10 · the carry leaves from the rollover notice's own figure — and only from the rollover that IS this week's carry in
  // (the figure's own provenance, `carryFromCode`), so it never travels from a week the ledger does not name.
  const rollover = carryingRollover(hub.notices, w?.pool ?? null);
  const carries = rollover !== null;
  const notices = await noticesOf(t, hub, gate.userId, rollover ? { code: rollover.code, id: CARRIED_FIGURE_ID } : null);
  const phases = w ? phasesOf(w) : null;
  // M3 · the guest's doors back to the slip, this page's own query carried (its `ref` and `invite` beside `next`).
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : typeof v === "string" ? [v] : []) query.append(k, x);
  const guest = authDoorHrefs(MILLIONEA_HREF.slip, query);
  const finalAheadMs = finalAhead ? msOf(finalAhead.opensAt) : null;

  // ⭐ H1 · THE HEAD, THE DOOR, THEN THE LEDGER — the door on a phone's first screen; the reader's own tickets after the
  // ledger, last (S5-R2-HUB). From 768 the head beside the door and the ledger beside the tickets (M1, the v6 768 frame);
  // from 1024 one column, its head and door pinned 72px down (the market page's offset: the 56px header + 16px), and only
  // those (H2): at a 780px viewport the whole column never fit, and its tickets and the graded week hid under the fold.
  // The pinned pair keeps the page's ground behind it, so what reads on under it never shows through. Every place is the
  // frame's (`hub-frame.ts`), which the loading drawing composes too.
  const twoUp = !!w?.pool;
  const aside = w && (
    <aside
      aria-labelledby={w.pool ? JACKPOT_LABEL_ID : undefined}
      aria-label={w.pool ? undefined : weekLabelText(t, w, nowMs, hub.paused)}
      className={hubAside(twoUp, !!phases)}
      data-testid="millionea-hub-aside"
    >
      <div className={HUB_PINNED} data-testid="millionea-hub-pinned">
        {w.pool && <HubPoolHead final={w.isFinal} labelId={JACKPOT_LABEL_ID} className={hubCell(twoUp, buyDrawn(w, !!breakBody) ? "head" : "headAlone")} />}
        {/* From 768 to 1023 the door stands beside the jackpot's head, centred on it: the next row (the ledger beside the
            reader's tickets) then starts level in both columns. */}
        <BuyDoor
          t={t} locale={locale} w={w} signedIn={!!gate.userId} nowMs={nowMs} nextOpen={nextWeekOpen(hub, millioneaOpenTemplate(), nowMs)}
          breakBody={breakBody} guest={guest} className={hubCell(twoUp, "door")}
        />
      </div>
      {/* A closed week's facts follow its door on a phone, stand under it from 768, read on under the pinned pair from 1024. */}
      <WeekFacts t={t} locale={locale} w={w} nowMs={nowMs} className={hubCell(twoUp, "facts")} />
      {w.pool && <HubPoolLedger carryFrom={carries ? CARRIED_FIGURE_ID : undefined} carryPlay={carries} className={hubCell(twoUp, "ledger")} />}
      <MineBlock t={t} locale={locale} w={w} nowMs={nowMs} cancelEnds={cancelEnds} className={hubCell(twoUp, w.state === "OPEN" ? "mine" : "mineUnderFacts")} />
      {hub.grading && <GradingBlock t={t} locale={locale} w={hub.grading} nowMs={nowMs} className={hubCell(twoUp, mineDrawn(w) ? "grading" : "mine")} />}
    </aside>
  );

  return (
    <>
      {/* The hub's calm bars, under the header as the platform's own (§F9; the away bar's kit). */}
      {moved && (
        <NoticeBar tone="info" glyph="clock" testId="millionea-hub-close-moved">
          {closeMovedWords(t, msOf(moved.to) ?? 0, msOf(moved.from) ?? 0)}
        </NoticeBar>
      )}
      {finalAhead && finalAheadMs !== null && (
        <NoticeBar tone="info" glyph="finalWeek" testId="millionea-hub-final-ahead">
          {finalAheadWords(t, locale, weekNumberOf(finalAhead.code), finalAheadMs, nowMs)}
        </NoticeBar>
      )}
      <HubNotices notices={notices} renderedAt={hub.asOf} />
      <PageContainer tier="reading" className="kp-mln-zh">
        <div data-testid="millionea-hub" className="flex flex-col gap-6">
          <RefreshPoller intervalMs={60_000} />
          {/* M2 · the front door's head: the game in one line (How to play's first step) and its two doors, the page head's
              own pills (the kit's recipe, Up & Down's) — wrapping under the name on a phone. ⛔ After Millionea has ended,
              none of it (H4): no game to explain, no ticket to buy. */}
          <PageHeader
            eyebrow={w ? <WeekLabel t={t} w={w} nowMs={nowMs} paused={hub.paused} /> : undefined}
            title={t.millionea.productTitle}
            subtitle={w && !retired ? keepFact(locale, fill(t.millionea.howOne, { price: formatTzs(w.ticketPrice) })) : undefined}
            actionsWrap
            actions={retired ? undefined : (
              <div className="flex shrink-0 items-center gap-1" data-testid="millionea-hub-doors">
                <Link href={MILLIONEA_HREF.how as never} className={PAGE_HEADER_PILL}>
                  <MillioneaGlyph name="howTo" s={13} />
                  <span>{t.millionea.howToPlay}</span>
                </Link>
                <Link href={MILLIONEA_HREF.tickets as never} className={PAGE_HEADER_PILL}>
                  <I.ticket s={13} />
                  <span>{t.millionea.ticketsTitle}</span>
                </Link>
              </div>
            )}
          />
          {/* A staff preview is marked once, above the page, by the platform's bar (S5-FIX-PLATFORM D12, AppShell's
              `MillioneaPreviewBar`) — no mark of the hub's own in its column. */}
          {retired ? (
            // ⭐ H4 · MILLIONEA HAS ENDED: the closed statement, the final week's row and the register — and nothing that
            // promises a sale ("No Millionea week is on sale right now", "…published when sales open"), which never comes.
            <div className="flex flex-col gap-4" data-testid="millionea-hub-retired">
              {hub.lastWeek && (
                <Callout tone="neutral" glyph="finalWeek" role="status">{keepFact(locale, fill(t.millionea.stoppedSunset, { week: weekNumberOf(hub.lastWeek.code) }))}</Callout>
              )}
              <LastWeekRow t={t} locale={locale} hub={hub} retired />
              <MillioneaReadingLinks t={t} how={false} />
            </div>
          ) : (
            <>
              {/* The paused notice keeps its last pair together, as every Millionea line is kept (`pausedWords`, keepFact):
                  "salama." stood alone at sw 320. */}
              {hub.paused && (
                <div data-testid="millionea-hub-paused">
                  <Callout tone="neutral" glyph="salesPaused" role="status">{pausedWords(t, locale)}</Callout>
                </div>
              )}
              {/* ⭐ H3 + H1 · Millionea's final week is said ONCE, in the jackpot's head: its rule line is the final week's,
                  led by the week's own mark (§10c `finalWeek`, flag-checkered — `flag` means "object to a result", P17;
                  `MaswaliPoolHead`). The page-wide "Final week of Millionea" box above it said the week a third time and put
                  the door under a 360 phone's fold (y 770). A week ahead, the announcement bar says it (L22). */}
              {w && voidingNow(w, nowMs) && <VoidingNotice t={t} locale={locale} w={w} />}
              {w ? (
                <div className={HUB_GRID}>
                  {/* The strip spans the measure (S5 VIS P4): each of its three ranges has a third of it, whole on its line. */}
                  {phases && (
                    <div className={HUB_STRIP}>
                      <MaswaliWeekStrip t={t} phases={phases} current={phaseNow(w, phases, nowMs)} />
                    </div>
                  )}
                  {w.pool ? <HubPoolLive weekId={w.id} initial={w.pool} price={w.ticketPrice} voiding={voidingNow(w, nowMs)}>{aside}</HubPoolLive> : aside}
                  <div className={hubMain(!!phases)}>
                    <WeekQuestions t={t} locale={locale} w={w} />
                    {/* The week's fingerprints, under its fifteen (the register's own drawing, `WeekCommitments`): the
                        question set's hash from the open, the tickets' root from the close — each only once stamped. */}
                    {commitments?.questionSetHash && (
                      <WeekCommitments
                        t={t} locale={locale} nowMs={nowMs} hash={commitments.questionSetHash} publishedAt={commitments.publishedAt}
                        root={commitments.ticketRoot} closedAt={commitments.closedAt} tickets={commitments.ticketCount}
                      />
                    )}
                  </div>
                  <div className={hubTail(!!phases)}>
                    <LastWeekRow t={t} locale={locale} hub={hub} />
                    <MillioneaReadingLinks t={t} />
                  </div>
                </div>
              ) : (
                // ⭐ L6 · no week on sale is the platform's empty state, as the register's and the tickets' are; L21 · while
                // sales are paused it promises no next open. The next open's day never parts from its clock (A1): the kit's
                // kept run (`EmptyStateBody`'s `keep`). §T5 · its numerals in the numerals' face, as Tiketi zangu's empty
                // states set theirs: Millionea's own empty state (`MaswaliEmptyState`, the kit's opt-in numeral part).
                <div className="flex flex-col gap-4" data-testid="millionea-hub-no-week">
                  <MaswaliEmptyState title={t.millionea.hubNoWeek} body={noWeekBody(t, locale, hub.paused ? null : msOf(hub.nextOpensAt))} fill />
                  <LastWeekRow t={t} locale={locale} hub={hub} />
                  <MillioneaReadingLinks t={t} />
                </div>
              )}
            </>
          )}
        </div>
      </PageContainer>
    </>
  );
}

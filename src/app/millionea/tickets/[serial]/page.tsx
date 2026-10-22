/**
 * /millionea/tickets/[serial] — ONE TICKET, FOR ITS OWNER (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 items 1, 5 and 7,
 * §10 §3.8–§3.16, M1–M8; the v6 delivery's T- and W- frames; DESIGN_AUTHORITY §M8a). The receipt tier, at every width.
 *
 * ⭐ A SETTLED TICKET LEADS WITH ITS OUTCOME (§M7; the R1 tickets critic's H1, Ali 2026-10-21 10/10 pass): straight after the
 *    way back, the week's receipt — the win ledger of a PAID share (the only gold, "Kwa tiketi yako" and "Jumla yako"), then
 *    the door to the seal; or a loss's card: "Did not win", the week's line (no 10/10 and where the pool went, or how many
 *    tickets won), the finality, the legal line and the closing rule — never the ten positions again, which the ticket
 *    under it already shows with every stamp. Then the ticket (its state word, its serial, its Seal Line, its fifteen
 *    clauses, the perforation and the stub): the free cancel while its window is open; the week's results arriving (how
 *    many are in, the valid reserves left, the next event, and — in the owner's own words — when it can no longer win); a
 *    week voided whole (every ticket back in full — said as landed only once THIS ticket's refund landed, "pending" until
 *    then).
 * ⭐ WHERE THE MONEY WENT, EVERY OUTCOME (L12, the lead's ruling): a paid share "Paid to main balance · <when>", a cancel
 *    "TZS 1,000 returned to main balance", a landed refund the void's own sentence ending the same way (said once, L4).
 *
 * ⛔ THE TICKETS' GATE (`millioneaTicketGate`, L5): a kill hides the product, never a player's own tickets — a holder
 *    reaches this page, its result, its refund and its free cancel at every rollout state; everyone else gets the 404.
 * ⛔ OWNER-ONLY, AND NO EXISTENCE ORACLE (MB-95): a malformed serial, a serial nobody holds and a serial someone else
 *    holds are one answer — the not-found page — because the read model answers all three with null.
 * ⛔ A SHARE HELD FOR REVIEW OR FORFEITED (MB-43, OD-07) wears no gold and is in no total: its mark says which, the win
 *    ledger and the seal are a PAID share's alone.
 * ⭐ THE ROOT CARRIES THE POSITION'S ID (E-101): `/positions/<id>` redirects here, and its fragment lands on this ticket.
 * ⭐ EACH FACT PERFORMS ONCE, FOR ITS OWNER, ON SCREEN, THEN RESTS (§10 §2; H3/M8): the moments are chosen from the facts
 *    this owner has not seen (`view.seen`) — the cut (N3) on the first view after the purchase, the stamps (N2, at most four),
 *    the carry (N1), the stub's return (N3 reversed) after a cancel or a landed refund, the closing rule (M6) on a settled
 *    receipt — and a backlog of more than four rests whole, the receipt's closing rule carrying the beat. Each moment plays
 *    when its part enters view (`MaswaliMoment`), and the page's host (`TicketHost`) marks the ticket seen THROUGH the newest
 *    fact it rendered (`seen.through`, L7) only once every moment has played.
 */
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { millioneaTicketsDoor } from "@/lib/server/millionea-doors";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BackLink } from "@/components/ui/back-link";
import { HashFocus } from "@/components/ui/hash-focus";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { Callout } from "@/components/ui/callout";
import { MaswaliTicket, type TicketMoments } from "@/components/maswali/maswali-ticket";
import { MaswaliLossReceipt, MaswaliWinLedger, type MaswaliLegal } from "@/components/maswali/maswali-win-ledger";
import { counted, eatWeekday, weekNumberOf, weekWord } from "@/components/maswali/maswali-format";
import { factsOf, keepFact, MaswaliFacts } from "@/components/maswali/maswali-facts";
import { noticeBody } from "@/components/ui/empty-state-text";
import { millioneaTicketGate } from "@/lib/server/millionea-gate";
import { millioneaHowTo, millioneaMyTicketsWeek, millioneaTicket, millioneaWeekMoneyRecord, type MillioneaFact, type MillioneaTicketView } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { millioneaTicketHref } from "@/lib/position-permalink";
import { RESERVE_COUNT } from "@/lib/maswali-score";
import { formatEatDateTime } from "@/lib/eat-day";
import { fill, formatTzs } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { MILLIONEA_HREF, MillioneaPreviewMark, registerWeekHref, signInHref } from "../../millionea-parts";
import { clausesOf, earnedOf, lineOf, millioneaWeekPhase, msOf, refundOf } from "../../millionea-view";
import { registerLedgerRows } from "../../register/register-parts";
import { SealDoor, TicketCancel, TicketHost } from "./ticket-acts";
import { MaswaliObjectionDoor } from "@/components/maswali/maswali-objection-door";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (L5: shown, or a holder at a kill; the account hub's precedent), and
  // asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaTicketsDoor())) return notFoundMetadata();
  const { t } = await getServerT();
  // ⛔ No serial in the title: the metadata does not read the ticket, and a title must not confirm that one exists.
  return { title: `${t.millionea.stubSerial} · ${t.millionea.productLabel}` };
}

/** The question set's commitment, short, as the stub prints it ("7f3a…"); the register prints it whole. */
function shortHash(hash: string | null): string {
  return hash ? `${hash.slice(0, 8)}…` : "—";
}

/** The moments this view plays, from the facts its owner has not seen (§10 §2; DESIGN_AUTHORITY §M8a item 5). */
function momentsOf(view: MillioneaTicketView): { play: TicketMoments; closingRule: boolean } {
  const unseen: readonly MillioneaFact[] = view.seen.unseen;
  const has = (k: MillioneaFact["kind"]) => unseen.some((f) => f.kind === k);
  const settledUnseen = has("result");
  // A backlog rests whole: the reckoning's closing rule carries the beat instead (§10 §2.2).
  if (view.seen.backlogRests) return { play: {}, closingRule: settledUnseen };
  const press = unseen.filter((f) => f.kind === "press" && typeof f.slot === "number").map((f) => f.slot as number).slice(0, 4);
  const undo = has("cancel") || has("refund");
  return {
    play: {
      cut: undo ? "undo" : has("cut") && view.shown === "running" ? "cut" : undefined,
      press: press.length > 0 ? press : undefined,
      carry: has("carry"),
      draw: settledUnseen && view.shown === "won" && view.share === "paid",
      // L14 · the week's recorded close, once, on the stub's lock line (the read model's "close" fact).
      lock: has("close"),
      reveal: undo,
    },
    closingRule: settledUnseen,
  };
}

/** A winning ticket's own share mark when the share is not the player's yet — held for review — or any more: forfeited
 *  after it (MB-43, OD-07; round 3: that ticket reads "forfeited", never "won"). A word, never gold; the week's counts of
 *  such shares are said beside its receipt. Every state named, so a new one is a compile error here, not a silent null. */
function shareLine(t: Dict, view: MillioneaTicketView): string | null {
  switch (view.shown) {
    case "won": return view.share === "held" ? t.millionea.shareHeld : null;
    case "forfeited": return t.millionea.shareForfeited;
    case "running": case "lost": case "refunded": case "cancelled": return null;
  }
}

/** "Jumanne 15 Des, 12:01" — an instant as the stub says one: its weekday, then its date and time in East Africa Time. */
function whenOf(t: Dict, locale: Locale, ms: number, nowMs: number): string {
  return `${eatWeekday(t, ms)} ${formatEatDateTime(ms, nowMs, t.common.monthsShort, locale)}`;
}

export default async function MillioneaTicketPage({ params }: { params: Promise<{ serial: string }> }) {
  const gate = await millioneaTicketGate();
  const { serial } = await params;
  if (!gate.userId) redirect(signInHref(millioneaTicketHref(serial)));
  const { t, locale } = await getServerT();
  const now = new Date();
  const nowMs = now.getTime();
  // B-1 — no swallow: a failed read throws to error.tsx; null is "not found or not yours", one answer for both.
  const view = await millioneaTicket(gate.userId, serial, now);
  if (!view) notFound();

  const weekNumber = weekNumberOf(view.week.code);
  const line = lineOf(view.questions, view.slots, view.week.state);
  // P6 · where the week stands once its results are in — the hub's own answer (`millioneaWeekPhase`): its word on the week
  // line, and while the objection window is open its end on the live line.
  const phase = millioneaWeekPhase({ ...view.week, questions: view.questions }, nowMs);
  const { play, closingRule } = momentsOf(view);
  const running = view.shown === "running";
  const graded = view.week.state === "CLOSED" || view.week.state === "RESOLVING";
  const voidedMains = view.questions.filter((q) => q.role === "MAIN" && q.outcome === "VOID").length;
  const voidedReserves = view.questions.filter((q) => q.role === "RESERVE" && q.outcome === "VOID").length;
  const refund = refundOf(view);
  const earned = earnedOf(view);
  const cancelUntil = msOf(view.cancelUntil);
  const cancellable = running && cancelUntil !== null && view.week.state === "OPEN";
  // The cap and the window the cancel names are the week's frozen ones: a cancellable ticket's week is the one on sale,
  // whose rules the how-to read answers (source WEEK).
  const rules = cancellable ? await millioneaHowTo({ userId: gate.userId, state: gate.state }) : null;
  const paid = view.win !== null && view.share === "paid";
  // M6 · a final PUBLIC week has its register page: the stub's question-set hash and the receipt's legal line open it, for
  // a reader the product is shown to (to a holder let in at a kill the register is an unknown address).
  const registerHref = gate.visible && view.week.visibility === "PUBLIC" && (view.week.state === "SETTLED" || view.week.state === "VOIDED")
    ? registerWeekHref(view.week.code) : undefined;
  // L3 · the legal line follows the real resolution mode; the read model carries no attestation hash, so the line says the
  // mode and opens the week's register, which prints every seal and commitment whole (M6).
  const legal: MaswaliLegal = { twoOfficer: view.resolution === "two", href: registerHref };

  // ── The head's line: where the week and the money stand (L4, L12; MR-18 — never a refund claimed before it landed). ──
  const voidLine = view.weekVoid && !view.cancelledAt
    ? fill(refund === "landed" ? t.millionea.ticketVoidedLanded : t.millionea.weekVoidedBodyPending, {
        voided: view.weekVoid.voidedMains, valid: view.weekVoid.usableReserves,
        price: formatTzs(view.refund?.state === "landed" ? view.refund.amount : view.weekVoid.price),
      })
    : null;
  const moneyLine = view.shown === "cancelled"
    ? fill(t.millionea.cancelModalBody, { price: formatTzs(view.stub.price) })
    : paid && view.week.settledAt
      ? fill(t.millionea.paidTo, { when: whenOf(t, locale, Date.parse(view.week.settledAt), nowMs) })
      : null;
  const share = shareLine(t, view);
  const lines = [voidLine, share, moneyLine].filter((l): l is string => l !== null);
  const notice = lines.length === 0 ? undefined : (
    <span className="flex flex-col gap-0.5">
      {lines.map((l) => <MaswaliFacts key={l} facts={factsOf(l).map((f) => keepFact(locale, f))} />)}
    </span>
  );

  // A won week where this player was paid on more than one ticket: the seal and the ledger name every paid serial (D-45),
  // read by THIS ticket's week (`millioneaMyTicketsWeek`, round 3) — never looked for on a page of the list.
  const weekPaid = paid && view.win && view.win.yourWinningTickets > 1
    ? ((await millioneaMyTicketsWeek(gate.userId, view.week.id))?.tickets ?? [])
      .filter((x) => x.shown === "won" && x.share === "paid").map((x) => x.serial)
    : [];
  const paidSerials = weekPaid.length > 0 ? weekPaid : [view.serial];
  const held = view.win?.yourHeldTickets ?? 0;
  const forfeited = view.win?.yourForfeitedTickets ?? 0;
  // ⭐ THE WEEK'S ONE LEDGER, FROM THE ONE CORE (S5-DESIGN-REGISTER's `millioneaWeekMoneyRecord`; the lead's round-2
  // rulings): a final week's money on either line, so a PUBLIC week's ledger is the register's own rows (MR-26 in the same
  // words) and a DRIVE week's is its own, the same rows — this player's gold rows spliced after the share. The core answers
  // only a final week (null otherwise: no ledger, never a partial MR-26). A carry names its week; it opens the week's
  // register page only on the public line and for a reader the product is shown to — a DRIVE week's chain is private, and
  // to a holder let in at a kill the register is an unknown address.
  const money = paid ? await millioneaWeekMoneyRecord(view.week.id) : null;
  const ledgerRows = money ? registerLedgerRows(t, locale, money, { links: view.week.visibility === "PUBLIC" && gate.visible }) : null;
  // L11 · an open week says where it stands before any result: its close and its first event.
  const firstEvent = view.questions.map((q) => msOf(q.eventStartsAt)).filter((x): x is number => x !== null).sort((a, b) => a - b)[0];

  return (
    <PageContainer tier="receipt" id={view.positionId} className="kp-mln-zh space-y-5">
      <HashFocus />
      {(running || graded) && <RefreshPoller intervalMs={60_000} />}
      <TicketHost serial={view.serial} through={view.seen.through}>
        <div className="space-y-5">
          <BackLink fallbackHref={MILLIONEA_HREF.tickets} label={t.millionea.myTicketsTitle} />
          {gate.preview && <MillioneaPreviewMark t={t} />}
          {paid && view.win && (
            <>
              {ledgerRows && (
                <MaswaliWinLedger
                  t={t}
                  week={weekNumber}
                  serials={paidSerials}
                  rows={ledgerRows}
                  earned={{ perTicket: view.win.share, yours: view.win.yourWinningTickets, yourTotal: view.win.yourTotal }}
                  legal={legal}
                  play={{ draw: closingRule }}
                />
              )}
              {view.win.yourTotal > 0 && (
                <SealDoor
                  amount={view.win.yourTotal}
                  eyebrow={`${t.millionea.productLabel} · ${weekWord(t, weekNumber)}`}
                  facts={[counted(paidSerials.length, t.millionea.wonTicketsOne, t.millionea.wonTickets), ...paidSerials]}
                />
              )}
            </>
          )}
          {view.win && (held > 0 || forfeited > 0) && (
            <Callout tone="neutral" role="status">
              <span className="flex flex-col gap-1">
                {/* Drawn through the notice keep (r10 9.3): "Tiketi zako", "jumla yako" never torn at a line's end. */}
                {held > 0 && <span>{noticeBody(counted(held, t.millionea.shareHeldNoteOne, t.millionea.shareHeldNote))}</span>}
                {forfeited > 0 && <span>{noticeBody(counted(forfeited, t.millionea.shareForfeitedNoteOne, t.millionea.shareForfeitedNote))}</span>}
              </span>
            </Callout>
          )}
          {view.loss && (
            <MaswaliLossReceipt
              t={t}
              week={weekNumber}
              serial={view.serial}
              winners={view.loss.winners}
              carriedTo={view.loss.carriedForward ? (view.loss.nextWeekCode ? weekNumberOf(view.loss.nextWeekCode) : null) : undefined}
              legal={legal}
              play={{ draw: closingRule }}
            />
          )}
          <div data-testid="millionea-ticket">
            <MaswaliTicket
              t={t}
              locale={locale}
              serverNow={nowMs}
              serial={view.serial}
              week={weekNumber}
              weekState={view.week.state}
              phase={phase}
              shown={view.shown}
              clauses={clausesOf(t, locale, view.questions, view.slots, view.slipFilled)}
              line={line}
              stub={{ price: view.stub.price, boughtAt: view.boughtAt, questionSetHash: shortHash(view.week.questionSetHash), registerHref }}
              closedAt={view.week.state !== "OPEN" ? (msOf(view.week.closedAt) ?? msOf(view.week.closesAt) ?? undefined) : undefined}
              wonAmount={earned ?? undefined}
              notice={notice}
              live={running && graded ? {
                resultsIn: view.resultsOut,
                // Unclamped: below zero the ticket says so in words (D-20), never "0 of 5" over a week that will void.
                reservesLeft: { valid: RESERVE_COUNT - voidedReserves - voidedMains, of: RESERVE_COUNT },
                nextEventAt: msOf(view.nextResultAt) ?? undefined,
                objectionsUntil: phase.objectionsUntil ?? undefined,
              } : running && view.week.state === "OPEN" ? {
                salesCloseAt: msOf(view.week.closesAt) ?? undefined,
                firstEventAt: firstEvent,
              } : undefined}
              cannotWin={running && view.cannotWinSoFar}
              cancel={cancellable && cancelUntil !== null && rules
                ? <TicketCancel serial={view.serial} ownerId={gate.userId} until={cancelUntil} serverNow={nowMs} price={view.stub.price} cap={rules.ticketCap} windowMins={rules.freeCancelMinutes} />
                : undefined}
              play={play}
            />
          </div>
          <MaswaliObjectionDoor t={t} locale={locale} userId={gate.userId} week={view.week} questions={view.questions} nowMs={nowMs} />
        </div>
      </TicketHost>
    </PageContainer>
  );
}

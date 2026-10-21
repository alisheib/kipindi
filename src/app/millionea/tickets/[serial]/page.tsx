/**
 * /millionea/tickets/[serial] — ONE TICKET, FOR ITS OWNER (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 items 1, 5 and 7,
 * §10 §3.8–§3.16, M1–M8; the v6 delivery's T- and W- frames; DESIGN_AUTHORITY §M8a). The receipt tier, at every width.
 *
 * The ticket (its state word, its serial, its Seal Line, its fifteen clauses, the perforation and the stub), then what
 * its week did: the free cancel while its window is open; the week's results arriving (how many are in, the valid
 * reserves left, the next event, and — in the owner's own words — when it can no longer win); a won ticket's door to the
 * seal and its win ledger (the only gold, "Kwa tiketi yako" and "Jumla yako", and only on a PAID share); a loss's receipt
 * (no score, the rows are the facts); a week voided whole (every ticket back in full — said as landed only once THIS
 * ticket's refund landed, "pending" until then).
 *
 * ⛔ THE TICKETS' GATE (`millioneaTicketGate`, L5): a kill hides the product, never a player's own tickets — a holder
 *    reaches this page, its result, its refund and its free cancel at every rollout state; everyone else gets the 404.
 * ⛔ OWNER-ONLY, AND NO EXISTENCE ORACLE (MB-95): a malformed serial, a serial nobody holds and a serial someone else
 *    holds are one answer — the not-found page — because the read model answers all three with null.
 * ⛔ A SHARE HELD FOR REVIEW OR FORFEITED (MB-43, OD-07) wears no gold and is in no total: its mark says which, the win
 *    ledger and the seal are a PAID share's alone.
 * ⭐ THE ROOT CARRIES THE POSITION'S ID (E-101): `/positions/<id>` redirects here, and its fragment lands on this ticket.
 * ⭐ EACH FACT PERFORMS ONCE, FOR ITS OWNER, THEN RESTS (§10 §2): the moments are chosen from the facts this owner has not
 *    seen (`view.seen`) — the cut (N3) on the first view after the purchase, the stamps (N2, at most four), the carry (N1),
 *    the stub's return (N3 reversed) after a cancel or a landed refund, the closing rule (M6) on a settled receipt — and a
 *    backlog of more than four rests whole, the receipt's closing rule carrying the beat. The page then marks the ticket
 *    seen THROUGH the newest fact it rendered (`seen.through`, L7), so a fact that lands after the render still performs.
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
import { MaswaliLossReceipt, MaswaliWinLedger } from "@/components/maswali/maswali-win-ledger";
import { counted, joinList, weekNumberOf } from "@/components/maswali/maswali-format";
import { keepFact } from "@/components/maswali/maswali-facts";
import { noticeBody } from "@/components/ui/empty-state-text";
import { millioneaTicketGate } from "@/lib/server/millionea-gate";
import { millioneaHowTo, millioneaMyTicketsWeek, millioneaTicket, type MillioneaFact, type MillioneaTicketView } from "@/lib/server/maswali-player";
import { getServerT } from "@/lib/i18n-server";
import { millioneaTicketHref } from "@/lib/position-permalink";
import { RESERVE_COUNT } from "@/lib/maswali-score";
import { fill, formatTzs } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";
import { MILLIONEA_HREF, MillioneaPreviewMark, signInHref } from "../../millionea-parts";
import { clausesOf, earnedOf, lineOf, lossPositionsOf, msOf, refundOf, winLinesOf } from "../../millionea-view";
import { SealDoor, TicketCancel, TicketSeen } from "./ticket-acts";

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
      reveal: undo,
    },
    closingRule: settledUnseen,
  };
}

/** A winning ticket's own share mark when the share is not the player's yet — held for review — or any more: forfeited
 *  after it (MB-43, OD-07; round 3: that ticket reads "forfeited", never "won"). A word, never gold; the week's counts of
 *  such shares are said under the ticket. Every state named, so a new one is a compile error here, not a silent null. */
function shareLine(t: Dict, view: MillioneaTicketView): string | null {
  switch (view.shown) {
    case "won": return view.share === "held" ? t.millionea.shareHeld : null;
    case "forfeited": return t.millionea.shareForfeited;
    case "running": case "lost": case "refunded": case "cancelled": return null;
  }
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
  const { play, closingRule } = momentsOf(view);
  const running = view.shown === "running";
  const graded = view.week.state === "CLOSED" || view.week.state === "RESOLVING";
  const voidedMains = view.questions.filter((q) => q.role === "MAIN" && q.outcome === "VOID").length;
  const voidedReserves = view.questions.filter((q) => q.role === "RESERVE" && q.outcome === "VOID").length;
  const refund = refundOf(view);
  const earned = earnedOf(view);
  const cancelUntil = msOf(view.cancelUntil);
  const cancellable = running && cancelUntil !== null && view.week.state === "OPEN";
  // The cap the cancel's confirm names is the week's frozen one: a cancellable ticket's week is the one on sale, whose
  // rules the how-to read answers (source WEEK).
  const cap = cancellable ? (await millioneaHowTo({ userId: gate.userId, state: gate.state })).ticketCap : 0;
  const paid = view.win !== null && view.share === "paid";

  // The week voided whole: the dictionary's sentence — "every ticket refunded" only once THIS ticket's refund landed, and
  // until then that it is on its way back (MR-18; the S5 UI review, HIGH 1: never a refund claimed before it happened).
  const voidLine = view.weekVoid
    ? fill(refund === "pending" ? t.millionea.weekVoidedBodyPending : t.millionea.weekVoidedBody, {
        voided: view.weekVoid.voidedMains, valid: view.weekVoid.usableReserves, price: formatTzs(view.weekVoid.price),
      })
    : null;
  const share = shareLine(t, view);
  // ⭐ S5 VIS P10 · money that came back says where it went, on the first screen: a cancel, and a voided week's refund once
  // it landed — "TZS 1,000 returned to main balance" (the cancel's own result words; the stub keeps its stamp line too).
  const backTo = view.shown === "cancelled" || view.shown === "refunded"
    ? fill(t.millionea.cancelModalBody, { price: formatTzs(view.refund?.state === "landed" ? view.refund.amount : view.stub.price) })
    : null;
  const lines = [voidLine ?? share, backTo].filter((l): l is string => l !== null);
  const notice = lines.length === 0 ? undefined : (
    <span className="flex flex-col gap-0.5">
      {lines.map((l) => <span key={l}>{keepFact(locale, l)}</span>)}
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

  return (
    <PageContainer tier="receipt" id={view.positionId} className="kp-mln-zh space-y-5">
      <HashFocus />
      {(running || graded) && <RefreshPoller intervalMs={60_000} />}
      <TicketSeen serial={view.serial} through={view.seen.through} />
      <BackLink fallbackHref={MILLIONEA_HREF.tickets} label={t.millionea.myTicketsTitle} />
      {gate.preview && <MillioneaPreviewMark t={t} />}
      <div data-testid="millionea-ticket">
        <MaswaliTicket
          t={t}
          locale={locale}
          serverNow={nowMs}
          serial={view.serial}
          week={weekNumber}
          weekState={view.week.state}
          shown={view.shown}
          clauses={clausesOf(t, locale, view.questions, view.slots, view.slipFilled)}
          line={line}
          stub={{ price: view.stub.price, boughtAt: view.boughtAt, questionSetHash: shortHash(view.week.questionSetHash) }}
          closedAt={view.week.state !== "OPEN" ? (msOf(view.week.closedAt) ?? msOf(view.week.closesAt) ?? undefined) : undefined}
          wonAmount={earned ?? undefined}
          notice={notice}
          live={running && graded ? {
            resultsIn: view.resultsOut,
            // Unclamped: below zero the ticket says so in words (D-20), never "0 of 5" over a week that will void.
            reservesLeft: { valid: RESERVE_COUNT - voidedReserves - voidedMains, of: RESERVE_COUNT },
            nextEventAt: msOf(view.nextResultAt) ?? undefined,
          } : undefined}
          cannotWin={running && view.cannotWinSoFar}
          seal={paid && view.win && view.win.yourTotal > 0 ? <SealDoor amount={view.win.yourTotal} label={joinList(locale, paidSerials)} /> : undefined}
          cancel={cancellable && cancelUntil !== null
            ? <TicketCancel serial={view.serial} ownerId={gate.userId} until={cancelUntil} serverNow={nowMs} price={view.stub.price} cap={cap} />
            : undefined}
          play={play}
        />
      </div>
      {paid && view.win && (
        <MaswaliWinLedger
          t={t}
          week={weekNumber}
          serials={paidSerials}
          lines={winLinesOf(view.win)}
          sunset={view.win.basis === "TOP_SCORE" ? { score: view.win.winningScore, tickets: view.win.winners } : undefined}
          legal={null}
          play={{ draw: closingRule }}
        />
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
          positions={lossPositionsOf(locale, view.questions, view.slots, line)}
          winners={view.loss.winners}
          legal={null}
          play={{ draw: closingRule }}
        />
      )}
    </PageContainer>
  );
}

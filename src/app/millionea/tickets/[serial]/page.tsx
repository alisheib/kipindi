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
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BackLink } from "@/components/ui/back-link";
import { HashFocus } from "@/components/ui/hash-focus";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { Callout } from "@/components/ui/callout";
import { MaswaliTicket, type TicketMoments } from "@/components/maswali/maswali-ticket";
import { MaswaliLossReceipt, MaswaliWinLedger } from "@/components/maswali/maswali-win-ledger";
import { counted, weekNumberOf } from "@/components/maswali/maswali-format";
import { millioneaTicketGate } from "@/lib/server/millionea-gate";
import { millioneaHowTo, millioneaMyTickets, millioneaTicket, type MillioneaFact, type MillioneaTicketView } from "@/lib/server/maswali-player";
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
  await millioneaTicketGate();
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

/** This won ticket's own mark when its share is not the player's yet, or any more (MB-43, OD-07): a word, never gold.
 *  The week's counts of such shares are said under the ticket. */
function shareLine(t: Dict, view: MillioneaTicketView): string | null {
  if (view.shown !== "won") return null;
  if (view.share === "held") return t.millionea.shareHeld;
  if (view.share === "forfeited") return t.millionea.shareForfeited;
  return null;
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

  // The week voided whole: the dictionary's sentence, and — until THIS ticket's refund lands — that it is on its way.
  const voidLine = view.weekVoid
    ? fill(t.millionea.weekVoidedBody, { voided: view.weekVoid.voidedMains, valid: view.weekVoid.usableReserves, price: formatTzs(view.weekVoid.price) })
    : null;
  const share = shareLine(t, view);
  const notice = voidLine || share
    ? (
      <>
        {voidLine ?? share}
        {view.weekVoid && refund === "pending" && (
          <span className="mt-1 block text-text-muted">{fill(t.millionea.refundPending, { price: formatTzs(view.weekVoid.price) })}</span>
        )}
      </>
    )
    : undefined;

  // A won week where this player was paid on more than one ticket: the seal and the ledger name every paid serial (D-45).
  const paidSerials = paid && view.win && view.win.yourWinningTickets > 1
    ? ((await millioneaMyTickets(gate.userId)).find((g) => g.week.id === view.week.id)?.tickets ?? [])
      .filter((x) => x.shown === "won" && x.share === "paid").map((x) => x.serial)
    : [view.serial];
  const held = view.win?.yourHeldTickets ?? 0;
  const forfeited = view.win?.yourForfeitedTickets ?? 0;

  return (
    <PageContainer tier="receipt" id={view.positionId} className="space-y-5">
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
          clauses={clausesOf(t, locale, view.questions, view.slots)}
          line={line}
          stub={{ price: view.stub.price, boughtAt: view.boughtAt, questionSetHash: shortHash(view.week.questionSetHash) }}
          closedAt={view.week.state !== "OPEN" ? (msOf(view.week.closedAt) ?? msOf(view.week.closesAt) ?? undefined) : undefined}
          wonAmount={earned ?? undefined}
          notice={notice}
          live={running && graded ? {
            resultsIn: view.resultsOut,
            reservesLeft: { valid: Math.max(0, RESERVE_COUNT - voidedReserves - voidedMains), of: RESERVE_COUNT },
            nextEventAt: msOf(view.nextResultAt) ?? undefined,
          } : undefined}
          cannotWin={running && view.cannotWinSoFar}
          seal={paid && view.win && view.win.yourTotal > 0 ? <SealDoor amount={view.win.yourTotal} label={paidSerials.join(" · ")} /> : undefined}
          cancel={cancellable && cancelUntil !== null
            ? <TicketCancel serial={view.serial} until={cancelUntil} serverNow={nowMs} price={view.stub.price} cap={cap} />
            : undefined}
          ended={view.shown === "cancelled" ? "cancelled" : view.shown === "refunded" ? "refunded" : undefined}
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
            {held > 0 && <span>{counted(held, t.millionea.shareHeldNoteOne, t.millionea.shareHeldNote)}</span>}
            {forfeited > 0 && <span>{counted(forfeited, t.millionea.shareForfeitedNoteOne, t.millionea.shareForfeitedNote)}</span>}
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

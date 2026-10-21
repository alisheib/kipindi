"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MaswaliSlip, MaswaliSlipConfirm, slipProgress, type SlipPicks, type SlipQuestion } from "@/components/maswali/maswali-slip";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { exitBeatMs } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useCountdown, useServerNow } from "@/components/updown/round-countdown";
import { millioneaFreeCancelEnd } from "@/lib/millionea-free-cancel";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { eatClock } from "@/components/maswali/maswali-format";
import { useT } from "@/lib/i18n";
import { haptics } from "@/lib/haptics";
import { fillNodes } from "@/lib/fill-nodes";
import { refusalReason, refusalVariant, renderFailure, type ReasonedFailure } from "@/lib/failure-reasons";
import { millioneaTicketHref } from "@/lib/position-permalink";
import type { MaswaliPick } from "@/lib/maswali-score";
import {
  addSlip, emptySlip, firstIncompleteSlip, newSlipDraft, parseSlipDraft, pickInDraft, removeActiveSlip,
  selectSlip, slipTotal, type MillioneaSlipDraft,
} from "@/lib/millionea-slip-draft";
import { fill, formatNumber, formatTzs } from "@/lib/utils";
import { buyMillioneaTicketsAction } from "../actions";
import { VOIDED_ROW_FILL } from "../millionea-view";

/**
 * ⭐ THE SLIP KEPT IN THE TAB, BY WEEK (MASWALI-PLAN §7b S5 item 8; Privacy §7 names it): the fifteen answers a player has
 * picked for ONE week, including each ticket's separate answers, in that tab's sessionStorage, so they come back intact after a deposit or a reload. ⛔ It holds no
 * identifier, it never places a ticket by itself (the commit is the player's own press on the confirm sheet), it is
 * removed once the ticket is cut, and it is gone when the tab closes. ONE spelling of the key, here.
 */
export const MILLIONEA_SLIP_KEY_PREFIX = "kp-millionea-slip:";

function slipKey(weekId: string): string {
  return `${MILLIONEA_SLIP_KEY_PREFIX}${weekId}`;
}

/** A tab's ticket drafts for this week, or null. ⛔ Never trusted: every ticket must have fifteen YES/NO/empty slots. */
function readKept(weekId: string, hiddenSlots: readonly number[], cap: number): MillioneaSlipDraft | null {
  try {
    const raw = window.sessionStorage.getItem(slipKey(weekId));
    if (!raw) return null;
    return parseSlipDraft(JSON.parse(raw) as unknown, hiddenSlots, VOIDED_ROW_FILL, cap);
  } catch {
    return null;
  }
}

function keep(weekId: string, draft: MillioneaSlipDraft): void {
  try { window.sessionStorage.setItem(slipKey(weekId), JSON.stringify(draft)); } catch { /* a private tab: the slip simply is not kept */ }
}

function forget(weekId: string): void {
  try { window.sessionStorage.removeItem(slipKey(weekId)); } catch { /* nothing kept */ }
}

/** One request id per confirmed purchase (MB-51): every ticket in its batch uses this one key and a retry reuses it. */
function newRequestId(): string {
  const rnd = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `mlnslip-${rnd}`;
}

type Cut = { serials: string[]; firstTicketNumber: number; weekNumber: number; cancelUntil: string | null };

/**
 * THE SLIP'S COMPOSER (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.5–§3.7, M1; the v6 delivery's S-purchase frames): the picks,
 * kept in the tab; the confirm sheet; the purchase; the result.
 *   · The commit is the confirm sheet's armed gilt "Kata tiketi" — the one gold on the slip (§M3a). A short MAIN balance
 *     swaps it for the platform's own deposit entry; bonus money never counts (MR-10).
 *   · A landed purchase: `haptics.confirm()` once, the picks forgotten, and the result modal with the stamp (`.seal-commit`,
 *     M1) — one serial in the original single-ticket title or every serial in a batch receipt, with the ticket-list door.
 *     ⭐ IN THAT ORDER, ONE AT A TIME (S5 VIS P1): the confirm sheet closes first, and plays its exit for one `--t-quick`
 *     beat (`exitBeatMs`, which is nothing under reduced motion); only once it is gone does the stamp open and the slip
 *     behind it clear. The cut once opened the stamp over the still-leaving sheet — its fifteen answers already reset to
 *     "—", its button still "Cutting…" — and the two read through each other. The stamp's serial is set in the mono face
 *     on one line (`titleFace`, P2) and its facts stack, centred, with no separator to end a line (A1).
 *   · A refusal: the registry's sentence in the reader's language (never the server's English), the factual toast for a
 *     refusal the player can fix and the danger one for a block (§F2, `refusalVariant`) — never a popup for a fixable
 *     refusal. A short balance re-opens the sheet on its deposit entry instead.
 *   · Sales closing while the slip is open: the band reveals on the mark's axis, the controls rest, the rail leaves (M2).
 */
export function SlipClient({
  userId, weekId, weekNumber, closesAt, firstEventAt, serverNow, questions, hiddenSlots, price, cap, held, balance, freeCancelMinutes,
  pct,
}: {
  /** The account this page was drawn for: a page drawn for A never debits B (the action refuses a changed account). */
  userId: string;
  weekId: string;
  weekNumber: number;
  closesAt: number;
  firstEventAt: number | null;
  serverNow: number;
  questions: SlipQuestion[];
  hiddenSlots: number[];
  price: number;
  cap: number;
  held: number;
  balance: number | null;
  /** RULES §2.6's grace the week froze: what the confirm sheet's free-cancel line is computed from, live (P1 below). */
  freeCancelMinutes: number;
  pct: number;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<MillioneaSlipDraft>(() => newSlipDraft(hiddenSlots, VOIDED_ROW_FILL));
  const draftRef = useRef(draft);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lowBalance, setLowBalance] = useState(false);
  const [fundsNow, setFundsNow] = useState(balance ?? 0);
  const [cut, setCut] = useState<Cut | null>(null);
  // A landed cut waiting for the confirm sheet to finish leaving: the stamp and the cleared slip come after it (P1).
  const [landing, setLanding] = useState<{ cut: Cut; cleared: MillioneaSlipDraft } | null>(null);
  const [pending, start] = useTransition();
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  // The page can go stale after another tab buys the last allowance. Keep its draft visible, but never open or submit
  // a purchase when the actual remaining allowance is zero.
  const allowed = Math.max(0, cap - held);
  const left = useCountdown(closesAt, serverNow);
  const closedAtRender = closesAt <= serverNow;
  const closed = closedAtRender || (left !== null && left <= 0);
  // ⭐ S5-FIX-PLAYER P1 · THE FREE CANCEL A TICKET CUT NOW WOULD CARRY, ASKED AGAIN ON EVERY TICK: the server-aligned instant
  // (`useServerNow`: the offset to the render's server clock taken once, at mount — the countdown's own anchor) through
  // `cancelMaswaliTicket`'s one rule (`millioneaFreeCancelEnd`: placed now, the runway against the close, the end at the
  // earlier of the grace and the close). It was a time fixed at the page's render: a player who answered for twelve minutes
  // was promised a time already past, and near the close a cancel the purchase would not carry. Null before hydration and
  // whenever the close is too near for one — then the sheet promises none.
  const nowAligned = useServerNow(serverNow);
  const cancelUntil = nowAligned === null ? null : millioneaFreeCancelEnd(nowAligned, closesAt, closesAt, freeCancelMinutes);

  // The tab's kept picks for this week come back once the page is in the browser (never in the server's HTML).
  useEffect(() => {
    const kept = readKept(weekId, hiddenSlots, cap);
    if (!kept) return;
    draftRef.current = kept;
    setDraft(kept);
  }, [weekId, hiddenSlots, cap]);

  // ⭐ P1 · the sheet has closed: once its exit beat is over (Modal's `useExitPhase`, the same token), the slip clears and
  // the stamp opens — never while the sheet is still on screen.
  useEffect(() => {
    if (landing === null || confirmOpen) return;
    const timer = window.setTimeout(() => {
      draftRef.current = landing.cleared;
      setDraft(landing.cleared);
      setCut(landing.cut);
      setLanding(null);
    }, exitBeatMs("--t-quick"));
    return () => window.clearTimeout(timer);
  }, [landing, confirmOpen]);

  const updateDraft = useCallback((next: MillioneaSlipDraft, answersChanged: boolean) => {
    if (next === draftRef.current) return;
    draftRef.current = next;
    setDraft(next);
    keep(weekId, next);
    if (answersChanged) requestId.current = null;
  }, [weekId]);

  const onPick = useCallback((slot: number, pick: MaswaliPick) => {
    if (hiddenSlots.includes(slot)) return;
    updateDraft(pickInDraft(draftRef.current, slot, pick), true);
  }, [hiddenSlots, updateDraft]);

  const picks = draft.slips[draft.active] ?? emptySlip(hiddenSlots, VOIDED_ROW_FILL);
  const count = draft.slips.length;
  const total = slipTotal(price, count);
  const ready = firstIncompleteSlip(draft) < 0 && total !== null;
  const openConfirm = () => {
    if (closed || total === null) return;
    if (draftRef.current.slips.length > allowed) {
      toast({ title: t.millionea.refusedTitle, description: allowed === 0 ? fill(t.millionea.capReachedOnly, { cap: formatNumber(cap) }) : t.millionea.reduceTickets, variant: "factual" });
      return;
    }
    const incomplete = firstIncompleteSlip(draftRef.current);
    if (incomplete >= 0) {
      updateDraft(selectSlip(draftRef.current, incomplete), false);
      toast({ title: t.millionea.refusalIncomplete, description: fill(t.millionea.finishTicket, { n: formatNumber(held + incomplete + 1) }), variant: "factual" });
      return;
    }
    requestId.current ??= newRequestId();
    setFundsNow(balance ?? 0);
    setLowBalance(balance !== null && balance < total);
    setConfirmOpen(true);
  };

  const commit = () => {
    if (!ready || draftRef.current.slips.length > allowed || pending || inFlight.current) return;
    const slips = draftRef.current.slips.map((slip) => [...slip]);
    const amount = slipTotal(price, slips.length);
    if (amount === null) return;
    const key = requestId.current ?? (requestId.current = newRequestId());
    const fd = new FormData();
    fd.set("expectedOwnerId", userId);
    fd.set("weekId", weekId);
    fd.set("idempotencyKey", key);
    fd.set("slips", JSON.stringify(slips));
    inFlight.current = true;
    start(async () => {
      try {
        const r = await buyMillioneaTicketsAction(fd);
        if (r.ok && r.data && r.data.tickets.length === slips.length && r.data.tickets.every((ticket) => ticket.serial)) {
          haptics.confirm();
          forget(weekId);
          requestId.current = null;
          // The sheet closes FIRST; the answers clear and the stamp opens after its exit (P1).
          setLanding({ cut: { serials: r.data.tickets.map((ticket) => ticket.serial), firstTicketNumber: held + 1, weekNumber, cancelUntil: r.data.cancelUntil }, cleared: newSlipDraft(hiddenSlots, VOIDED_ROW_FILL) });
          setConfirmOpen(false);
          router.refresh();
          return;
        }
        if (r.ok) {
          setConfirmOpen(false);
          toast({ title: t.millionea.refusedTitle, description: t.millionea.purchaseUnknown, variant: "danger", durationMs: 0 });
          router.refresh();
          return;
        }
        const failure = r as ReasonedFailure;
        const reason = refusalReason(failure);
        if (reason === "balance_insufficient" || reason === "millionea_bonus_refused") {
          // The sheet stays, its commit swapped for the deposit entry: the money path's own refusal, said where it is fixed.
          const actual = failure.detail?.balance;
          if (typeof actual === "number" && Number.isSafeInteger(actual) && actual >= 0) setFundsNow(actual);
          setLowBalance(true);
          return;
        }
        setConfirmOpen(false);
        const said = renderFailure(failure, t.error as unknown as Record<string, string>, t.common.couldNotPlace, (n) => formatTzs(n));
        toast({ title: t.millionea.refusedTitle, description: said.body, variant: refusalVariant(reason) });
        router.refresh();
      } catch {
        setConfirmOpen(false);
        toast({ title: t.millionea.refusedTitle, description: t.millionea.purchaseUnknown, variant: "danger", durationMs: 0 });
        router.refresh();
      } finally {
        inFlight.current = false;
      }
    });
  };

  const shortfall = Math.max(0, (total ?? price) - fundsNow);
  const depositDoor = (
    <Link href={`/wallet/deposit?${new URLSearchParams({ amount: String(shortfall) })}` as never} className="btn btn-gold btn-lg w-full gilt-metal" data-testid="millionea-slip-deposit">
      <span>{fillNodes(t.journey.lowDeposit, { amount: <span className="amount">{formatTzs(shortfall)}</span> })}</span>
    </Link>
  );
  // The stamp's facts — the week, the price and its balance, the free cancel — one per line, centred (A1, P2).
  const resultSubtitle = cut
    ? (
      <MaswaliFacts layout="stack" className="kp-mln-facts--center" facts={factsOf(cut.cancelUntil
        ? fill(t.millionea.resultDetails, { week: cut.weekNumber, price: formatTzs(slipTotal(price, cut.serials.length) ?? price), time: eatClock(Date.parse(cut.cancelUntil)) })
        : fill(t.millionea.resultDetailsNoCancel, { week: cut.weekNumber, price: formatTzs(slipTotal(price, cut.serials.length) ?? price) })).map((f) => keepFact(locale, f))} />
    )
    : undefined;
  const sheetPicks: SlipPicks = picks;

  return (
    <div data-testid="millionea-slip">
      {!closed && (allowed > 1 || count > 1) && (
        <section aria-label={t.millionea.draftTickets} data-testid="millionea-ticket-drafts" className="mat-flat flex min-w-0 flex-col gap-2 rounded-card px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-mono text-label uppercase eyebrow text-text-subtle">{t.millionea.draftTickets}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {count > 1 && <Button type="button" variant="ghost" size="md" onClick={() => updateDraft(removeActiveSlip(draftRef.current), true)}>{fill(t.millionea.removeTicket, { n: formatNumber(held + draft.active + 1) })}</Button>}
              {count < allowed && <Button type="button" variant="ghost" size="md" onClick={() => updateDraft(addSlip(draftRef.current, hiddenSlots, VOIDED_ROW_FILL, allowed), true)}>{t.millionea.addTicket}</Button>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2" aria-label={t.millionea.draftTickets}>
            {draft.slips.map((slip, i) => {
              // Of the questions the slip ASKS (P10): "Ticket 1 · 0/14" when one voided before the close, never "1/15" untapped.
              const progress = slipProgress(slip, questions);
              return (
                <Button key={i} type="button" size="md" variant={i === draft.active ? "primary" : "ghost"} aria-current={i === draft.active ? "true" : undefined}
                  onClick={() => updateDraft(selectSlip(draftRef.current, i), false)} className="shrink-0 whitespace-nowrap">
                  {fill(t.millionea.draftTicket, { n: formatNumber(held + i + 1) })} · {formatNumber(progress.mains + progress.reserves)}/{formatNumber(progress.mainsOf + progress.reservesOf)}
                </Button>
              );
            })}
          </div>
          <p className="text-body-sm text-text-muted">{fill(t.millionea.ticketDraftHint, { n: formatNumber(questions.length) })}</p>
        </section>
      )}
      <MaswaliSlip
        key={draft.active}
        week={weekNumber}
        questions={questions}
        picks={sheetPicks}
        onPick={onPick}
        closesAt={closesAt}
        firstEventAt={firstEventAt}
        serverNow={serverNow}
        price={price}
        cap={cap}
        ticketNumber={held + draft.active + 1}
        actionLabel={count > 1 && total !== null ? fill(t.millionea.continueTicketsAt, { n: formatNumber(count), price: formatTzs(total) }) : undefined}
        closed={closed}
        closedJustNow={closed && !closedAtRender}
        onContinue={openConfirm}
      />
      <MaswaliSlipConfirm
        open={confirmOpen && !closed}
        onClose={() => { if (!pending) setConfirmOpen(false); }}
        week={weekNumber}
        questions={questions}
        picks={sheetPicks}
        slips={draft.slips}
        price={total ?? price}
        balance={fundsNow}
        ticketNumber={held + 1}
        cap={cap}
        cancelUntil={cancelUntil}
        pct={pct}
        lowBalance={lowBalance}
        depositDoor={depositDoor}
        pending={pending}
        onCommit={commit}
      />
      <OperationResultModal
        open={cut !== null}
        variant="success"
        stripTone="brand"
        stamp
        titleFace={cut?.serials.length === 1 ? "mono" : undefined}
        className="kp-mln-zh"
        eyebrow={t.millionea.ticketCut}
        title={cut ? cut.serials.length > 1 ? fill(t.millionea.ticketsCut, { n: formatNumber(cut.serials.length) }) : cut.serials[0] : ""}
        subtitle={resultSubtitle}
        details={cut && cut.serials.length > 1 ? cut.serials.map((serial, i) => ({ label: fill(t.millionea.draftTicket, { n: formatNumber(cut.firstTicketNumber + i) }), value: serial })) : undefined}
        autoCloseMs={cut && cut.serials.length > 1 ? 60_000 : undefined}
        primaryLabel={cut && cut.serials.length > 1 ? t.millionea.viewTickets : t.millionea.viewTicket}
        onPrimary={() => { const c = cut; setCut(null); if (c) router.push(c.serials.length > 1 ? "/millionea/tickets" as never : millioneaTicketHref(c.serials[0]) as never); }}
        onClose={() => setCut(null)}
      />
    </div>
  );
}

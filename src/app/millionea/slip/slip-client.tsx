"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MaswaliSlip, MaswaliSlipConfirm, slipProgress, type SlipPicks, type SlipQuestion } from "@/components/maswali/maswali-slip";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { exitBeatMs } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useCountdown } from "@/components/updown/round-countdown";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { eatClock } from "@/components/maswali/maswali-format";
import { useT } from "@/lib/i18n";
import { haptics } from "@/lib/haptics";
import { fillNodes } from "@/lib/fill-nodes";
import { refusalReason, refusalVariant, renderFailure, type ReasonedFailure } from "@/lib/failure-reasons";
import { millioneaTicketHref } from "@/lib/position-permalink";
import { SLOT_COUNT, type MaswaliPick } from "@/lib/maswali-score";
import { fill, formatTzs } from "@/lib/utils";
import { buyMillioneaTicketsAction } from "../actions";
import { VOIDED_ROW_FILL } from "../millionea-view";

/**
 * ⭐ THE SLIP KEPT IN THE TAB, BY WEEK (MASWALI-PLAN §7b S5 item 8; Privacy §7 names it): the fifteen answers a player has
 * picked for ONE week, in that tab's sessionStorage, so they come back intact after a deposit or a reload. ⛔ It holds no
 * identifier, it never places a ticket by itself (the commit is the player's own press on the confirm sheet), it is
 * removed once the ticket is cut, and it is gone when the tab closes. ONE spelling of the key, here.
 */
export const MILLIONEA_SLIP_KEY_PREFIX = "kp-millionea-slip:";

function slipKey(weekId: string): string {
  return `${MILLIONEA_SLIP_KEY_PREFIX}${weekId}`;
}

/** The picks a tab kept for this week, or null. ⛔ Never trusted: anything that is not fifteen YES/NO/empty is dropped. */
function readKept(weekId: string): (MaswaliPick | null)[] | null {
  try {
    const raw = window.sessionStorage.getItem(slipKey(weekId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== SLOT_COUNT) return null;
    return parsed.map((p) => (p === "YES" || p === "NO" ? p : null));
  } catch {
    return null;
  }
}

function keep(weekId: string, picks: readonly (MaswaliPick | null)[]): void {
  try { window.sessionStorage.setItem(slipKey(weekId), JSON.stringify(picks)); } catch { /* a private tab: the slip simply is not kept */ }
}

function forget(weekId: string): void {
  try { window.sessionStorage.removeItem(slipKey(weekId)); } catch { /* nothing kept */ }
}

/** One request id per confirmed slip (MB-51): the confirm sheet mints it when it opens, and a retry reuses it. */
function newRequestId(): string {
  const rnd = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `mlnslip-${rnd}`;
}

/** The fifteen, each slot empty but the ones the slip fills itself (a question sealed VOID before the close, MB-15). */
function emptyPicks(hiddenSlots: readonly number[]): (MaswaliPick | null)[] {
  const out: (MaswaliPick | null)[] = Array.from({ length: SLOT_COUNT }, () => null);
  for (const slot of hiddenSlots) out[slot - 1] = VOIDED_ROW_FILL;
  return out;
}

type Cut = { serial: string; weekNumber: number; cancelUntil: string | null };

/**
 * THE SLIP'S COMPOSER (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.5–§3.7, M1; the v6 delivery's S-purchase frames): the picks,
 * kept in the tab; the confirm sheet; the purchase; the result.
 *   · The commit is the confirm sheet's armed gilt "Kata tiketi" — the one gold on the slip (§M3a). A short MAIN balance
 *     swaps it for the platform's own deposit entry; bonus money never counts (MR-10).
 *   · A landed purchase: `haptics.confirm()` once, the picks forgotten, and the result modal with the stamp (`.seal-commit`,
 *     M1) — eyebrow "Tiketi imekatwa", the serial as its title, "Tazama tiketi" its one door; no "buy another".
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
  userId, weekId, weekNumber, finalWeek, closesAt, firstEventAt, serverNow, questions, hiddenSlots, price, cap, held, balance, cancelIfBoughtNow,
  pct, depositHref,
}: {
  /** The account this page was drawn for: a page drawn for A never debits B (the action refuses a changed account). */
  userId: string;
  weekId: string;
  weekNumber: number;
  /** The sunset week (MR-30): the slip and its confirm sheet state its rule. */
  finalWeek: boolean;
  closesAt: number;
  firstEventAt: number | null;
  serverNow: number;
  questions: SlipQuestion[];
  hiddenSlots: number[];
  price: number;
  cap: number;
  held: number;
  balance: number | null;
  cancelIfBoughtNow: number | null;
  pct: number;
  /** The deposit page, asked for the shortfall. */
  depositHref: string;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [picks, setPicks] = useState<(MaswaliPick | null)[]>(() => emptyPicks(hiddenSlots));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lowBalance, setLowBalance] = useState(balance !== null && balance < price);
  const [cut, setCut] = useState<Cut | null>(null);
  // A landed cut waiting for the confirm sheet to finish leaving: the stamp and the cleared slip come after it (P1).
  const [landing, setLanding] = useState<{ cut: Cut | null; cleared: (MaswaliPick | null)[] } | null>(null);
  const [pending, start] = useTransition();
  const requestId = useRef<string | null>(null);
  const left = useCountdown(closesAt, serverNow);
  const closedAtRender = closesAt <= serverNow;
  const closed = closedAtRender || (left !== null && left <= 0);

  // The tab's kept picks for this week come back once the page is in the browser (never in the server's HTML).
  useEffect(() => {
    const kept = readKept(weekId);
    if (!kept) return;
    for (const slot of hiddenSlots) kept[slot - 1] = VOIDED_ROW_FILL;
    setPicks(kept);
  }, [weekId, hiddenSlots]);

  // ⭐ P1 · the sheet has closed: once its exit beat is over (Modal's `useExitPhase`, the same token), the slip clears and
  // the stamp opens — never while the sheet is still on screen.
  useEffect(() => {
    if (landing === null || confirmOpen) return;
    const timer = window.setTimeout(() => {
      setPicks(landing.cleared);
      setCut(landing.cut);
      setLanding(null);
    }, exitBeatMs("--t-quick"));
    return () => window.clearTimeout(timer);
  }, [landing, confirmOpen]);

  const onPick = useCallback((slot: number, pick: MaswaliPick) => {
    setPicks((prev) => {
      const next = [...prev];
      next[slot - 1] = pick;
      keep(weekId, next);
      return next;
    });
  }, [weekId]);

  const ready = slipProgress(picks).ready;
  const openConfirm = () => {
    if (!ready || closed) return;
    requestId.current = newRequestId();
    setLowBalance(balance !== null && balance < price);
    setConfirmOpen(true);
  };

  const commit = () => {
    if (!ready || pending) return;
    const key = requestId.current ?? (requestId.current = newRequestId());
    const fd = new FormData();
    fd.set("expectedOwnerId", userId);
    fd.set("weekId", weekId);
    fd.set("idempotencyKey", key);
    fd.set("slips", JSON.stringify([picks]));
    // MR-30 · the finality this slip stated: a week made final after it opened refuses the purchase, and the refresh
    // below redraws the slip with the final week's rule.
    fd.set("shownFinal", finalWeek ? "1" : "0");
    start(async () => {
      const r = await buyMillioneaTicketsAction(fd);
      if (r.ok && r.data) {
        haptics.confirm();
        forget(weekId);
        requestId.current = null;
        const first = r.data.tickets[0];
        // The sheet closes FIRST; the picks clear and the stamp opens after its exit (the effect above, P1).
        setLanding({ cut: first ? { serial: first.serial, weekNumber, cancelUntil: r.data.cancelUntil } : null, cleared: emptyPicks(hiddenSlots) });
        setConfirmOpen(false);
        router.refresh();
        return;
      }
      const failure = r as ReasonedFailure;
      const reason = refusalReason(failure);
      if (reason === "balance_insufficient") {
        // The sheet stays, its commit swapped for the deposit entry: the money path's own refusal, said where it is fixed.
        setLowBalance(true);
        return;
      }
      setConfirmOpen(false);
      const said = renderFailure(failure, t.error as unknown as Record<string, string>, t.common.couldNotPlace, (n) => formatTzs(n));
      toast({ title: t.millionea.refusedTitle, description: said.body, variant: refusalVariant(reason) });
      router.refresh();
    });
  };

  const shortfall = balance !== null ? Math.max(0, price - balance) : price;
  const depositDoor = (
    <Link href={depositHref as never} className="btn btn-gold btn-lg w-full gilt-metal" data-testid="millionea-slip-deposit">
      <span>{fillNodes(t.journey.lowDeposit, { amount: <span className="amount">{formatTzs(shortfall)}</span> })}</span>
    </Link>
  );
  // The stamp's facts — the week, the price and its balance, the free cancel — one per line, centred (A1, P2).
  const resultSubtitle = cut
    ? (
      <MaswaliFacts layout="stack" className="kp-mln-facts--center" facts={factsOf(cut.cancelUntil
        ? fill(t.millionea.resultDetails, { week: cut.weekNumber, price: formatTzs(price), time: eatClock(Date.parse(cut.cancelUntil)) })
        : fill(t.millionea.resultDetailsNoCancel, { week: cut.weekNumber, price: formatTzs(price) })).map((f) => keepFact(locale, f))} />
    )
    : undefined;
  const sheetPicks: SlipPicks = useMemo(() => picks, [picks]);

  return (
    <div data-testid="millionea-slip">
      <MaswaliSlip
        week={weekNumber}
        questions={questions}
        picks={sheetPicks}
        onPick={onPick}
        closesAt={closesAt}
        firstEventAt={firstEventAt}
        serverNow={serverNow}
        price={price}
        cap={cap}
        ticketNumber={held + 1}
        closed={closed}
        closedJustNow={closed && !closedAtRender}
        onContinue={openConfirm}
        finalWeek={finalWeek}
      />
      <MaswaliSlipConfirm
        open={confirmOpen && !closed}
        onClose={() => { if (!pending) setConfirmOpen(false); }}
        week={weekNumber}
        questions={questions}
        picks={sheetPicks}
        price={price}
        balance={balance ?? 0}
        ticketNumber={held + 1}
        cap={cap}
        cancelUntil={cancelIfBoughtNow}
        pct={pct}
        finalWeek={finalWeek}
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
        titleFace="mono"
        className="kp-mln-zh"
        eyebrow={t.millionea.ticketCut}
        title={cut?.serial ?? ""}
        subtitle={resultSubtitle}
        primaryLabel={t.millionea.viewTicket}
        onPrimary={() => { const c = cut; setCut(null); if (c) router.push(millioneaTicketHref(c.serial) as never); }}
        onClose={() => setCut(null)}
      />
    </div>
  );
}

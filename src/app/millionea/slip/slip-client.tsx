"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { ConfirmModal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { amountPillClass } from "@/components/wallet/amount-field";
import { SheetSentence } from "@/components/journey/bet-sheet/sheet-parts";
import {
  MaswaliSlip, MaswaliSlipConfirm, firstUnansweredLabel, focusQuestion, slipProgress, type SlipQuestion,
} from "@/components/maswali/maswali-slip";
import { OperationResultModal, type OperationDetail } from "@/components/markets/operation-result-modal";
import { MaswaliGhostHint } from "@/components/maswali/maswali-ghost-hint";
import { MaswaliFacts } from "@/components/maswali/maswali-facts";
import { eatClock, weekWord } from "@/components/maswali/maswali-format";
import { useT, type Dict, type Locale } from "@/lib/i18n";
import { haptics } from "@/lib/haptics";
import { fillNodes } from "@/lib/fill-nodes";
import { refusalReason, refusalVariant, renderFailure, type ReasonedFailure } from "@/lib/failure-reasons";
import { millioneaTicketHref } from "@/lib/position-permalink";
import { DWELL_MILLIONEA_BATCH_STAMP_MS } from "@/lib/feedback-timing";
import { depositLeftAfterFor, depositRequestFor, type DepositOption, type ShortfallPlan } from "@/lib/journey/shortfall";
import { pendingBand, type SheetLine } from "@/lib/journey/sheet-state";
import { useServerNowGated } from "@/lib/use-shared-second";
import type { MaswaliPick } from "@/lib/maswali-score";
import {
  addSlip, emptySlip, firstIncompleteSlip, newSlipDraft, parseSlipDraft, pickInDraft, removeActiveSlip,
  selectSlip, slipTotal, type MillioneaSlipDraft,
} from "@/lib/millionea-slip-draft";
import { slipFallbackDeposit, slipShortfall, type SlipDepositFacts } from "@/lib/millionea-slip-money";
import { fill, formatNumber, formatTzs } from "@/lib/utils";
import { buyMillioneaTicketsAction } from "../actions";
import { MILLIONEA_HREF } from "../millionea-parts";
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

/** A landed purchase, as its stamp states it. */
type Cut = { serials: string[]; firstTicketNumber: number; weekNumber: number; cancelUntil: string | null; total: number };

/** A design token's duration in ms, read from the stylesheet (never retyped, §B5) — 0 under the three clamps of §M6. */
function tokenMs(name: "--t-quick" | "--t-move"): number {
  if (typeof window === "undefined") return 0;
  const root = document.documentElement;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || root.classList.contains("kp-reduce-motion")
    || root.getAttribute("data-motion") === "minimal") return 0;
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? (raw.endsWith("ms") ? n : n * 1000) : 0;
}

/** A programmatic navigation answers at once (§F10): the platform's progress bar, then the push. */
function navigate(push: () => void): void {
  window.dispatchEvent(new Event("50pick:navigating"));
  push();
}

/**
 * THE SHORT MAIN BALANCE'S WAY ON (the slip critic's H4 and M4), the bet sheet's own low frame in the confirm's place for
 * the commit: the deposit door — gold xl, the wallet leading, the chevron trailing, the open rails' names under its words —
 * at the PLAN's amount (`slipShortfall`: never under the minimum deposit), its other amounts as the deposit page's own pills,
 * the minimum's note when the shortfall is under it; a deposit already on its way instead of any offer (never a second);
 * and, when no deposit can be taken, why. Every sentence is the bet sheet's (`SheetSentence`), in its own classes.
 */
function DepositOffer({ t, locale, plan, fallback, railNames, amount, onAmount, onDeposit, onClose }: {
  t: Dict;
  locale: Locale;
  plan: ShortfallPlan | null;
  /** With no plan (facts or balance unknown): the minimum-kept figure (`slipFallbackDeposit`). */
  fallback: number;
  /** The open deposit rails, by name, in the chooser's order (the page's facts; none when they could not be read). */
  railNames: readonly string[];
  amount: number | null;
  onAmount: (amount: number) => void;
  onDeposit: (amount: number) => void;
  onClose: () => void;
}) {
  const nowMs = Date.now();
  if (plan?.kind === "pending") {
    const band = pendingBand(plan.createdAt, nowMs);
    const title: SheetLine = band === "late" ? { key: "journey.lowPendingLateTitle" } : { key: "journey.lowPendingTitle", vars: { amount: plan.amount } };
    const body: SheetLine = band === "late" ? { key: "journey.lowPendingLateBody" } : band === "long" ? { key: "journey.lowPendingWaitBody" } : { key: "common.depositPendingBody" };
    return (
      <Callout tone="info" glyph="info" title={<SheetSentence t={t} locale={locale} nowMs={nowMs} line={title} />}>
        <p><SheetSentence t={t} locale={locale} nowMs={nowMs} line={body} /></p>
        <Link href={`/wallet/receipt/${encodeURIComponent(plan.txnId)}` as never} onClick={onClose} className="kp-bsheet__link kp-bsheet__link--lead">
          {t.journey.lowPendingTrack}<I.chevronRight s={16} edge="end" text="body-400" />
        </Link>
      </Callout>
    );
  }
  // A held wallet takes neither a deposit nor a ticket: the purchase's own refusal says so at the buy.
  if (plan?.kind === "blocked" || plan?.kind === "enough") return null;
  const option = plan?.kind === "short" ? (plan.options.find((o) => o.kind === "deposit") as DepositOption | undefined) : undefined;
  if (plan?.kind === "short" && !option) {
    // Why no deposit can be taken, in the bet sheet's words and with the plan's own figures (`depositRequestFor`).
    const refusal = plan.depositRefusal;
    const asked = depositRequestFor(plan.shortfall);
    const line: SheetLine = refusal === "rails_paused" ? { key: "journey.sheetRailsPaused" } : refusal === "sof_required" ? { key: "journey.sheetSofRequired" }
      : refusal === "deposit_max" ? { key: "journey.sheetDepositMax", vars: { max: asked.maximum } } : { key: "journey.sheetDepositLimit", vars: { amount: asked.amount } };
    return (
      <>
        <p className="kp-bsheet__deposit-refusal"><SheetSentence t={t} locale={locale} nowMs={nowMs} line={line} /></p>
        {refusal === "sof_required" && <Link className="kp-bsheet__link" href={"/profile/source-of-funds" as never} onClick={onClose}>{t.journey.lowSofCta}<I.chevronRight s={16} edge="end" text="body-400" /></Link>}
        {refusal === "deposit_limit" && <Link className="kp-bsheet__link" href={"/profile/responsible-gambling" as never} onClick={onClose}>{t.rg.setLimits}<I.chevronRight s={16} edge="end" text="body-400" /></Link>}
      </>
    );
  }
  const chosen = option && amount !== null && option.chips.includes(amount) ? amount : option?.amount ?? fallback;
  return (
    <>
      <Button type="button" variant="gold" size="xl" fullWidth className="kp-bsheet__deposit gilt-metal" data-testid="millionea-slip-deposit"
        onClick={() => onDeposit(chosen)} leading={<I.wallet s={20} text="body-600" />} trailing={<I.chevronRight s={20} text="body-600" />}>
        <span className="kp-bsheet__deposit-copy">
          <span>{fillNodes(t.journey.lowDeposit, { amount: <span className="amount">{formatTzs(chosen)}</span> })}</span>
          {railNames.length > 0 && <span className="kp-bsheet__rails"><MaswaliFacts facts={railNames} /></span>}
        </span>
      </Button>
      {option && option.chips.length > 1 && (
        <div className="kp-bsheet__amounts" role="group" aria-label={t.common.deposit} data-testid="millionea-slip-deposit-amounts">
          {option.chips.map((a) => (
            <button key={a} type="button" className={amountPillClass(chosen === a)} aria-pressed={chosen === a} onClick={() => onAmount(a)}>{formatNumber(a)}</button>
          ))}
        </div>
      )}
      {option?.belowDepositMin && (
        <p className="kp-bsheet__note">
          <SheetSentence t={t} locale={locale} nowMs={nowMs} line={{ key: "journey.lowMinNote", vars: { min: option.amount, left: depositLeftAfterFor(option, chosen) } }} />
        </p>
      )}
    </>
  );
}

/**
 * THE SLIP'S COMPOSER (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.5–§3.7, M1; the v6 delivery's S-purchase frames; the design
 * pass of Ali 2026-10-21, "10/10"): the picks, kept in the tab; the tickets of one purchase; the confirm sheet; the
 * purchase; the stamp.
 *   · The commit is the confirm sheet's armed gilt "Buy ticket" — the one gold on the slip (§M3a). A short MAIN balance
 *     swaps it for the deposit door the bet sheet's own plan offers (`DepositOffer`); bonus money never counts (MR-10).
 *   · SEVERAL TICKETS (the slip critic's H2, H3, M9): the switcher is the kit's own pills (`Tabs` "pill", 40px), drawn under
 *     the head only once there are two; "Add another ticket" stands after the reserves; removing a ticket that holds
 *     answers asks first (the kit's ConfirmModal); the pay control arms only when EVERY ticket is answered and otherwise
 *     reads "Finish ticket n" and opens it; the counts lead with the ticket being answered.
 *   · ⭐ A LANDED PURCHASE, UNDER ONE DIM (the motion critic's H1, P1 kept): in ONE commit the sheet closes — dropping its
 *     dim while its panel plays `.m-out` — the stamp opens holding the page's dim from its first frame, its panel rising one
 *     `--t-quick` beat later (Modal's `handoff` and `panelDelay`), and the slip clears under that dim (its refusal too: H2);
 *     the page reads again once the stamp has landed. Two panels are never up at once, and the slip is never seen bare.
 *     `haptics.confirm()` once. The stamp's serial is mono on one line (P2); its facts are the receipt's rows (§3.7, the
 *     Up & Down receipt's): the price, the free cancel in EAT, the payout "when the week settles"; it keeps its last words
 *     while it leaves (M3), and "View ticket" is the kit's Link: its press starts the progress bar (M4) and production
 *     prefetches the ticket's loading drawing while the stamp is up (round 2).
 *   · A refusal: the registry's sentence in the reader's language (never the server's English), the factual toast for a
 *     refusal the player can fix and the danger one — sticky — for a block (§F2, §F8, `refusalVariant`; M10). A short
 *     balance keeps the sheet open on its deposit door instead.
 *   · Sales closing while the slip is open (H6, motion H5): the slip's own closed statement, and an open sheet keeps itself
 *     open on its closed frame — the composer re-renders only when the close is crossed (`useServerNowGated`, M12).
 */
export function SlipClient({
  userId, weekId, weekNumber, closesAt, firstEventAt, serverNow, questions, hiddenSlots, price, cap, held, balance, freeCancelMinutes,
  pct, depositFacts,
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
  /** The MAIN balance, or null when the wallet could not be read (unknown — never TZS 0, H5). */
  balance: number | null;
  /** RULES §2.6's grace the week froze: what the confirm sheet's free-cancel line is computed from, live (P1). */
  freeCancelMinutes: number;
  pct: number;
  /** The deposit half of the plan's facts (null when any read failed: the door then keeps only the minimum). */
  depositFacts: SlipDepositFacts | null;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<MillioneaSlipDraft>(() => newSlipDraft(hiddenSlots, VOIDED_ROW_FILL));
  const draftRef = useRef(draft);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lowBalance, setLowBalance] = useState(false);
  const [fundsNow, setFundsNow] = useState<number | null>(balance);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  // The player pressed the pay control with questions unanswered: the rows are marked and the line says which (M2, M8).
  const [refused, setRefused] = useState(false);
  // The stamp: open while `cut` is set; `shownCut` keeps its words through the exit beat (M3).
  const [cut, setCut] = useState<Cut | null>(null);
  const [shownCut, setShownCut] = useState<Cut | null>(null);
  // The sheet closes INTO the stamp: it drops its dim at once (Modal's `handoff`); reset when it opens again.
  const [handoffOut, setHandoffOut] = useState(false);
  // A ticket that holds answers, asked about before it is removed (M9).
  const [removing, setRemoving] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  const refreshTimer = useRef<number | null>(null);
  // The page can go stale after another tab buys the last allowance. Keep its draft visible, but never open or submit
  // a purchase when the actual remaining allowance is zero.
  const allowed = Math.max(0, cap - held);
  // ⭐ THE CLOSE, CROSSED ONCE (the slip critic's M12): the server-aligned instant is kept in a ref and the composer is drawn
  // again only when the answer to "closed?" moves — it re-rendered all fifteen rows every second for a close days away.
  const nowAligned = useServerNowGated(serverNow, (n) => (n >= closesAt ? "closed" : "open"));
  const closedAtRender = closesAt <= serverNow;
  const closed = closedAtRender || (nowAligned !== null && nowAligned >= closesAt);

  // The tab's kept picks for this week come back once the page is in the browser (never in the server's HTML).
  useEffect(() => {
    const kept = readKept(weekId, hiddenSlots, cap);
    if (!kept) return;
    draftRef.current = kept;
    setDraft(kept);
  }, [weekId, hiddenSlots, cap]);
  // A fresh server read of the balance (the page read again) is the one the next confirm states.
  useEffect(() => { if (!confirmOpen) setFundsNow(balance); }, [balance, confirmOpen]);
  useEffect(() => () => { if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current); }, []);

  const updateDraft = useCallback((next: MillioneaSlipDraft, answersChanged: boolean) => {
    if (next === draftRef.current) return;
    draftRef.current = next;
    setDraft(next);
    keep(weekId, next);
    if (answersChanged) requestId.current = null;
  }, [weekId]);

  // ONE stable callback for every row (the rows are memoised on it, M12).
  const onPick = useCallback((slot: number, pick: MaswaliPick) => {
    if (hiddenSlots.includes(slot)) return;
    updateDraft(pickInDraft(draftRef.current, slot, pick), true);
  }, [hiddenSlots, updateDraft]);

  const picks = draft.slips[draft.active] ?? emptySlip(hiddenSlots, VOIDED_ROW_FILL);
  const count = draft.slips.length;
  const total = slipTotal(price, count);
  const nameOf = (i: number) => fill(t.millionea.draftTicket, { n: formatNumber(held + i + 1) });

  /** Opens ticket `i` of the purchase and takes the player to its first unanswered question (H3, M8). */
  const goToTicket = (i: number, mark: boolean) => {
    updateDraft(selectSlip(draftRef.current, i), false);
    setRefused(mark);
    const first = firstUnansweredLabel(draftRef.current.slips[i] ?? [], questions);
    if (first) focusQuestion(first);
  };
  const incomplete = firstIncompleteSlip(draft);
  const finish = count > 1 && incomplete >= 0 && incomplete !== draft.active
    ? { label: fill(t.millionea.finishTicketN, { n: formatNumber(held + incomplete + 1) }), onPress: () => goToTicket(incomplete, true) }
    : undefined;

  const openConfirm = () => {
    if (closed || total === null) return;
    if (draftRef.current.slips.length > allowed) {
      toast({ title: t.millionea.refusedTitle, description: allowed === 0 ? fill(t.millionea.capReachedOnly, { cap: formatNumber(cap) }) : t.millionea.reduceTickets, variant: "factual" });
      return;
    }
    // Never a money confirm over an unanswered ticket: that ticket opens instead, at its first unanswered question.
    const unfinished = firstIncompleteSlip(draftRef.current);
    if (unfinished >= 0) { goToTicket(unfinished, true); return; }
    requestId.current ??= newRequestId();
    setFundsNow(balance);
    setLowBalance(balance !== null && balance < total);
    setDepositAmount(null);
    setHandoffOut(false);
    setConfirmOpen(true);
  };

  /* ⭐ AFTER A PURCHASE, THE TOP OF THE FRESH SLIP (S5-DESIGN-SLIP, deliberate). The slip starts again at its first question,
     so in the commit the sheet closes into the stamp — under the stamp's dim, before it paints — the page goes to its top,
     and the stamp leaves it there. Every other way back leaves the page where the player had it: the dialog's way back
     never scrolls (modal.tsx `PAGE.focus`, the lead's ruling of 2026-10-21 — the motion run had the slip's first answer at
     y −2,248 under the stamp, the page scrolled to the sticky rail's place in the document). `qa:dialog-way-back` holds
     both. */
  const landedRef = useRef(false);
  useLayoutEffect(() => {
    if (cut === null || !landedRef.current) return;
    landedRef.current = false;
    if (window.scrollY !== 0) window.scrollTo({ top: 0, behavior: "instant" });
  }, [cut]);

  const commit = () => {
    if (firstIncompleteSlip(draftRef.current) >= 0 || draftRef.current.slips.length > allowed || pending || inFlight.current || closed) return;
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
          // ⭐ ONE COMMIT, UNDER ONE DIM (H1): the sheet closes into the stamp, which opens now; the slip clears under the
          // stamp's dim, its refusal with it (H2). The page reads again once the stamp has landed.
          const landed: Cut = {
            serials: r.data.tickets.map((ticket) => ticket.serial), firstTicketNumber: held + 1, weekNumber,
            cancelUntil: r.data.cancelUntil, total: amount,
          };
          const cleared = newSlipDraft(hiddenSlots, VOIDED_ROW_FILL);
          draftRef.current = cleared;
          setDraft(cleared);
          setRefused(false);
          setHandoffOut(true);
          setShownCut(landed);
          landedRef.current = true;
          setCut(landed);
          setConfirmOpen(false);
          if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
          refreshTimer.current = window.setTimeout(() => { refreshTimer.current = null; router.refresh(); }, tokenMs("--t-quick") + tokenMs("--t-move"));
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
          // The sheet stays, its commit swapped for the deposit door: the money path's own refusal, said where it is fixed.
          const actual = failure.detail?.balance;
          if (typeof actual === "number" && Number.isSafeInteger(actual) && actual >= 0) setFundsNow(actual);
          setLowBalance(true);
          return;
        }
        setConfirmOpen(false);
        const said = renderFailure(failure, t.error as unknown as Record<string, string>, t.common.couldNotPlace, (n) => formatTzs(n));
        const variant = refusalVariant(reason);
        // A block on the money path stays until it is read (§F2, §F8; the slip critic's M10).
        toast({ title: t.millionea.refusedTitle, description: said.body, variant, ...(variant === "danger" ? { durationMs: 0 } : {}) });
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

  // The plan's deposit half, against the main balance the sheet states (H4); its rails and the maximum the refusal names.
  const plan = lowBalance && total !== null ? slipShortfall(depositFacts, fundsNow, total, Date.now()) : null;
  const deposit = lowBalance && total !== null ? (
    <DepositOffer t={t} locale={locale} plan={plan} fallback={slipFallbackDeposit(fundsNow, total)} railNames={plan ? depositFacts?.deposit.railNames ?? [] : []}
      amount={depositAmount} onAmount={setDepositAmount}
      onClose={() => setConfirmOpen(false)}
      onDeposit={(amount) => navigate(() => router.push(`/wallet/deposit?${new URLSearchParams({ amount: String(amount), from: "low-balance" })}` as never))} />
  ) : undefined;

  // The stamp's facts as the receipt's rows (§3.7; the Up & Down receipt's `details`): the serials of a batch, the price or
  // the total, the free cancel in EAT, and when the payout comes — never a figure it does not know.
  const stamp = shownCut;
  const many = (stamp?.serials.length ?? 0) > 1;
  const stampRows: OperationDetail[] = stamp ? [
    ...(many ? stamp.serials.map((serial, i) => ({ label: fill(t.millionea.draftTicket, { n: formatNumber(stamp.firstTicketNumber + i) }), value: serial })) : []),
    { label: many ? t.millionea.totalRow : t.millionea.price, value: formatTzs(stamp.total) },
    ...(stamp.cancelUntil ? [{ label: t.millionea.cancelFreeLabel, value: `${eatClock(Date.parse(stamp.cancelUntil))} EAT` }] : []),
    { label: t.journey.ticketPayout, value: t.millionea.payoutWhenSettled },
  ] : [];
  const stampEyebrow = stamp ? `${many ? t.millionea.productTitle : t.millionea.ticketCut} · ${weekWord(t, stamp.weekNumber)}` : "";

  // ⭐ SEVERAL TICKETS (H2, M9): the kit's pills under the head, only once there are two; the remove action after them.
  // ⭐ THE NOUN ONCE (the lead's ruling (a), round 2): the group's visible label says it ("TIKETI" / "TICKETS" / 彩票) and
  // each pill says its number and its progress, "1 · 15/15", one format for every state — so two pills share one row at
  // 320 in every language (they stacked, "TIKETI 1 · 15/15" ~172px each). Each pill's accessible name keeps the noun and
  // the count ("Tiketi 1 · 15/15", the kit's `ariaLabel`); the visible label is the group's own name, said once by it.
  const switcher = count > 1 && !closed ? (
    <section aria-label={t.millionea.draftTickets} data-testid="millionea-ticket-drafts" className="flex min-w-0 flex-col gap-2">
      <span aria-hidden className="font-mono text-caption uppercase eyebrow text-text-subtle">{t.millionea.draftTicketsNoun}</span>
      <Tabs variant="pill" ariaLabel={t.millionea.draftTickets} value={String(draft.active)}
        onChange={(v) => goToTicket(Number(v), false)}
        tabs={draft.slips.map((slip, i) => {
          // Of the questions the slip ASKS (P10): "1 · 0/14" when one voided before the close, never "1/15" untapped.
          const p = slipProgress(slip, questions);
          const progress = `${formatNumber(p.mains + p.reserves)}/${formatNumber(p.mainsOf + p.reservesOf)}`;
          return { value: String(i), labelEn: `${formatNumber(held + i + 1)} · ${progress}`, ariaLabel: `${nameOf(i)} · ${progress}` };
        })} />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 basis-[14rem] text-body-sm text-text-muted">{fill(t.millionea.ticketDraftHint, { n: formatNumber(questions.length) })}</p>
        <Button type="button" variant="ghost" size="sm" className="shrink-0 border-border-control" leading={<I.trash s={16} />} data-testid="millionea-ticket-remove"
          onClick={() => {
            const i = draftRef.current.active;
            const answered = (draftRef.current.slips[i] ?? []).some((p, j) => p !== null && !hiddenSlots.includes(j + 1));
            if (answered) setRemoving(i);
            else { updateDraft(removeActiveSlip(draftRef.current), true); setRefused(false); }
          }}>
          {fill(t.millionea.removeTicket, { n: formatNumber(held + draft.active + 1) })}
        </Button>
      </div>
    </section>
  ) : null;
  const addTicket = count < allowed ? (
    <Button type="button" variant="ghost" size="md" fullWidth className="border-border-control" leading={<I.plus s={16} />} data-testid="millionea-ticket-add"
      onClick={() => {
        updateDraft(addSlip(draftRef.current, hiddenSlots, VOIDED_ROW_FILL, allowed), true);
        setRefused(false);
        // The new ticket is the one now answered: its first question into view (the rows stay; their answers empty).
        const first = firstUnansweredLabel(draftRef.current.slips[draftRef.current.active] ?? [], questions);
        if (first) focusQuestion(first);
      }}>
      {t.millionea.addTicket}
    </Button>
  ) : null;

  return (
    <div data-testid="millionea-slip">
      <MaswaliSlip
        week={weekNumber}
        questions={questions}
        picks={picks}
        onPick={onPick}
        closesAt={closesAt}
        firstEventAt={firstEventAt}
        serverNow={serverNow}
        price={price}
        cap={cap}
        ticketNumber={held + draft.active + 1}
        ticketName={count > 1 ? nameOf(draft.active) : undefined}
        actionLabel={count > 1 && total !== null ? fill(t.millionea.continueTicketsAt, { n: formatNumber(count), price: formatTzs(total) }) : undefined}
        finish={finish}
        refused={refused}
        onRefuse={() => setRefused(true)}
        closed={closed}
        closedJustNow={closed && !closedAtRender}
        onContinue={openConfirm}
        switcher={switcher}
        addTicket={addTicket}
        followHref={MILLIONEA_HREF.hub}
      />
      <MaswaliSlipConfirm
        open={confirmOpen}
        onClose={() => { if (!pending) setConfirmOpen(false); }}
        handoff={handoffOut}
        week={weekNumber}
        questions={questions}
        picks={picks}
        slips={draft.slips}
        total={total ?? price}
        balance={fundsNow}
        ticketNumber={held + 1}
        cap={cap}
        closesAt={closesAt}
        serverNow={serverNow}
        freeCancelMinutes={freeCancelMinutes}
        pct={pct}
        lowBalance={lowBalance}
        deposit={deposit}
        closed={closed}
        pending={pending}
        onCommit={commit}
      />
      {/* Removing a ticket that holds answers asks first (the kit's confirm; M9): its answers are discarded. No money moves,
          so the dialog's own footprint (`md`) — `lg` is the money commit's (the deposit and withdraw confirms). */}
      <ConfirmModal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing !== null && draftRef.current.active === removing) { updateDraft(removeActiveSlip(draftRef.current), true); setRefused(false); }
          setRemoving(null);
        }}
        tone="brand"
        panelClassName="kp-mln-zh"
        icon={<I.trash s={20} />}
        title={t.millionea.removeTicketTitle}
        body={fill(t.millionea.removeTicketBody, { n: formatNumber(held + (removing ?? 0) + 1) })}
        confirmLabel={fill(t.millionea.removeTicket, { n: formatNumber(held + (removing ?? 0) + 1) })}
        cancelLabel={t.millionea.keepTicket}
      />
      <OperationResultModal
        open={cut !== null}
        handoff={cut !== null}
        panelDelay
        variant="success"
        stripTone="brand"
        stamp
        compactOnPhone
        titleFace={stamp && !many ? "mono" : undefined}
        className="kp-mln-zh"
        eyebrow={stampEyebrow}
        title={stamp ? many ? fill(t.millionea.ticketsCut, { n: formatNumber(stamp.serials.length) }) : stamp.serials[0] : ""}
        details={stampRows}
        autoCloseMs={many ? DWELL_MILLIONEA_BATCH_STAMP_MS : undefined}
        primaryLabel={many ? t.millionea.viewTickets : t.millionea.viewTicket}
        // ⭐ "View ticket" IS THE KIT'S LINK (the lead's ruling, round 2): the press closes the stamp and the Link moves —
        // NavProgress starts on it as on every internal link (§F10), and production prefetches the ticket's loading drawing
        // while the stamp is up, so the move shows that drawing at once (it held the bare slip for a round trip).
        primaryHref={stamp ? (many ? MILLIONEA_HREF.tickets : millioneaTicketHref(stamp.serials[0])) : undefined}
        onPrimary={() => setCut(null)}
        onClose={() => setCut(null)}
      />
      {/* ⭐ WHAT THE STAMP KNOWS, FOR THE TICKET'S DRAWING (TICKETS' `maswali-ghost-hint.tsx`, round 2): "View ticket" opens a
          ticket whose free cancel is open, so its loading drawing holds the cancel's band and the clauses land where it drew
          them. Renders nothing. */}
      {cut && cut.cancelUntil !== null ? cut.serials.map((serial) => <MaswaliGhostHint key={serial} serial={serial} cancelUntil={Date.parse(cut.cancelUntil ?? "")} />) : null}
    </div>
  );
}

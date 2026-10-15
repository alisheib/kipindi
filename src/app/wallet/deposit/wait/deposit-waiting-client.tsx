"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { I } from "@/components/ui/glyphs";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { Cash } from "@/components/ui/cash";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";
import { depositPollDelay, depositWaitingBand, markerForDeposit, trustedDepositBet, type DepositProjection } from "@/lib/journey/deposit-state-client";
import { parseBetParam, pendingBetUrl, PENDING_BET_KEY } from "@/lib/journey/pending-bet";
import type { DepositRecheckBinding } from "@/lib/journey/deposit-recheck-binding";
import { KycFirstDepositNotice } from "@/components/wallet/kyc-first-deposit-notice";
import type { FirstDepositNotice } from "@/lib/kyc-notice";
import { fundingStorageKey, parseStoredFunding, releaseStoredFunding } from "@/lib/journey/funding-storage";

type WaitingView =
  | { state: "UNKNOWN"; serverNow: number; retryAfterSec: number; noPayment?: boolean }
  | Exclude<DepositProjection, { state: "UNKNOWN" }> & { balance: number; spendable?: number; retryAfterSec: number; failureAuthority?: "signed-recheck" };

const fundingKey = fundingStorageKey;

export function DepositWaitingClient({ ownerId, initial, lookupUrl, paymentKey, firstDepositNotice, noticeDismissValue }: {
  ownerId: string; initial: WaitingView; lookupUrl: string; paymentKey: string | null;
  firstDepositNotice: FirstDepositNotice | null; noticeDismissValue: string | null;
}) {
  const { t } = useT();
  const [view, setView] = useState<WaitingView>(initial);
  const [readError, setReadError] = useState(false);
  const [returnBlocked, setReturnBlocked] = useState(false);
  const [returnTapReason, setReturnTapReason] = useState<"notice" | "new-tab" | null>(null);
  const [checkingFailure, setCheckingFailure] = useState(false);
  const [failureReleased, setFailureReleased] = useState(false);
  const [noPaymentReleased, setNoPaymentReleased] = useState(false);
  const [statusUrl, setStatusUrl] = useState(lookupUrl);
  const [unknownStartedAt, setUnknownStartedAt] = useState<number | null>(null);
  const mounted = useRef(true);
  const current = useRef(initial);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectStarted = useRef(false);

  const refresh = useCallback(async () => {
    if (request.current || !mounted.current) return;
    const abort = new AbortController();
    request.current = abort;
    try {
      const response = await fetch(statusUrl, { credentials: "same-origin", cache: "no-store", signal: abort.signal });
      if (response.status === 401) { window.location.reload(); return; }
      if (!response.ok && response.status !== 429) { setReadError(true); return; }
      const next: WaitingView = await response.json();
      if (!mounted.current || abort.signal.aborted) return;
      // A temporary UNKNOWN, including a rate limit, cannot erase a terminal/held answer already seen.
      if (next.state === "UNKNOWN" && current.current.state !== "UNKNOWN") { setReadError(true); return; }
      if (current.current.state === "UNKNOWN" && current.current.noPayment
        && next.state === "UNKNOWN" && !next.noPayment) { setReadError(true); return; }
      if (current.current.state !== "UNKNOWN" && current.current.state !== "PENDING" && next.state === "PENDING") return;
      current.current = next;
      setView(next);
      if (next.state !== "UNKNOWN" && statusUrl.includes("/recover?")) {
        setStatusUrl(`/api/wallet/deposits/${encodeURIComponent(next.txnId)}/status`);
      }
      setReadError(false);
    } catch {
      if (!abort.signal.aborted && mounted.current) setReadError(true);
    } finally {
      if (request.current === abort) request.current = null;
    }
  }, [statusUrl]);

  const recheckFailure = useCallback(async () => {
    const previous = current.current;
    if (checkingFailure || previous.state !== "FAILED") return;
    setCheckingFailure(true);
    setReadError(false);
    try {
      const bindingResponse = await fetch(`/api/wallet/deposits/${encodeURIComponent(previous.txnId)}/recheck-binding`,
        { cache: "no-store", credentials: "same-origin" });
      if (bindingResponse.status === 401) { window.location.reload(); return; }
      if (!bindingResponse.ok) throw new Error("The payment cannot be checked yet");
      const capsule: { binding: DepositRecheckBinding | null } = await bindingResponse.json();
      if (!capsule.binding || capsule.binding.owner !== ownerId || capsule.binding.txnId !== previous.txnId) throw new Error("Funding capsule unavailable");
      const reply = await fetch(`/api/wallet/deposits/${encodeURIComponent(previous.txnId)}/recheck`, {
        method: "POST", cache: "no-store", credentials: "same-origin",
        headers: { "content-type": "application/json", "X-KP-Deposit-Recheck": "1" },
        body: JSON.stringify(capsule.binding),
      });
      if (reply.status === 401) { window.location.reload(); return; }
      if (!reply.ok) throw new Error("The payment remains uncertain");
      const checked: WaitingView = await reply.json();
      if (checked.state === "UNKNOWN") throw new Error("The payment remains uncertain");
      if (!mounted.current || current.current.state !== "FAILED" || current.current.txnId !== previous.txnId) return;
      current.current = checked;
      setView(checked);
      if (checked.state === "FAILED" && checked.failureAuthority === "signed-recheck") {
        // The signed provider answer, not an ordinary stored FAILED read, releases this tab's funding identity.
        const box = window.sessionStorage;
        const slot = fundingKey(ownerId);
        const raw = box.getItem(slot);
        if (raw) {
          const saved = parseStoredFunding(raw, ownerId);
          if (!saved || saved.key !== capsule.binding.fundingKey) throw new Error("Funding identity changed");
          box.removeItem(slot);
          if (box.getItem(slot) !== null) throw new Error("Funding identity could not be released");
        }
        setFailureReleased(true);
      }
    } catch { if (mounted.current) setReadError(true); }
    finally { if (mounted.current) setCheckingFailure(false); }
  }, [checkingFailure, ownerId]);

  useEffect(() => {
    mounted.current = true;
    try {
      const raw = window.sessionStorage.getItem(fundingKey(ownerId));
      if (raw) {
        const saved = parseStoredFunding(raw, ownerId);
        if (saved && saved.startedAt <= Date.now() && saved.startedAt > Date.now() - 24 * 60 * 60 * 1000) setUnknownStartedAt(saved.startedAt);
      }
    } catch { /* unknown stays conservative */ }
    return () => {
      mounted.current = false;
      request.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  useEffect(() => {
    if (view.state !== "UNKNOWN" || !view.noPayment || !paymentKey) return;
    try { setNoPaymentReleased(releaseStoredFunding(window.sessionStorage, ownerId, paymentKey)); }
    catch { setNoPaymentReleased(false); }
  }, [view, ownerId, paymentKey]);

  useEffect(() => {
    // A terminal or held answer has no payment poll or SSE status listener. The receipt stays available.
    if (view.state !== "PENDING" && (view.state !== "UNKNOWN" || view.noPayment)) return;
    const hint = () => { void refresh(); };
    window.addEventListener("50pick:sse:wallet-balance", hint);
    return () => window.removeEventListener("50pick:sse:wallet-balance", hint);
  }, [view.state, refresh]);

  useEffect(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (view.state === "UNKNOWN" && view.noPayment) return;
    const arm = () => {
      const scheduledFor = current.current;
      const delay = scheduledFor.state === "UNKNOWN" ? Math.max(
        unknownStartedAt === null ? 10_000 : depositPollDelay("UNKNOWN", new Date(unknownStartedAt).toISOString(), Date.now()) ?? 10_000,
        scheduledFor.retryAfterSec * 1_000,
      )
        : depositPollDelay(scheduledFor.state, scheduledFor.createdAt, scheduledFor.serverNow);
      if (delay === null) return;
      timer.current = setTimeout(async () => {
        timer.current = null;
        await refresh();
        // A changed view re-arms through this effect; an unchanged answer or a network fault still needs a next check.
        if (mounted.current && current.current === scheduledFor) arm();
      }, delay);
    };
    arm();
    return () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  }, [view, refresh, unknownStartedAt]);

  const returnToChoice = useCallback(() => {
    const owned = current.current;
    if (owned.state === "UNKNOWN" || !owned.pendingBet || redirectStarted.current) return;
    const bet = parseBetParam(owned.pendingBet.bet);
    if (!bet) return;
    try {
      const box = window.sessionStorage;
      const existing = box.getItem(PENDING_BET_KEY);
      const row = { id: owned.txnId, userId: ownerId, type: "DEPOSIT", amount: owned.amount,
        currency: owned.currency, provider: owned.provider, status: owned.status, createdAt: owned.createdAt,
        pendingBet: owned.pendingBet };
      const marker = markerForDeposit(ownerId, null, null, { kind: "owned-deposit", row }, existing, Date.now());
      if (!marker) throw new Error("Bet marker unavailable");
      box.setItem(PENDING_BET_KEY, marker);
      if (box.getItem(PENDING_BET_KEY) !== marker) throw new Error("Bet marker was not saved");
      redirectStarted.current = true;
      const destination = pendingBetUrl(owned.pendingBet.returnPath, bet);
      // The context id restores a closed question for this owner. Only a PAID deposit can carry an origin hint;
      // the manual bet action still checks the owned confirmed row and exact quote under its lock.
      const context = bet.kind === "market" ? `${destination}&returnChoiceId=${encodeURIComponent(owned.txnId)}` : destination;
      const tagged = bet.kind === "market" && owned.state === "PAID"
        ? `${context}&returnDepositId=${encodeURIComponent(owned.txnId)}` : context;
      window.location.replace(tagged);
    } catch { setReturnBlocked(true); }
  }, [ownerId]);

  useEffect(() => {
    if (view.state !== "PAID" || redirectStarted.current) return;
    try {
      const box = window.sessionStorage;
      const slot = fundingKey(ownerId);
      const raw = box.getItem(slot);
      if (paymentKey && raw) {
        const saved = parseStoredFunding(raw, ownerId);
        if (saved?.key === paymentKey) box.removeItem(slot);
      }
    } catch { /* a different or unreadable funding identity remains locked */ }
    if (!view.pendingBet) return;
    if (firstDepositNotice) { setReturnTapReason("notice"); return; }
    try {
      const markerRaw = window.sessionStorage.getItem(PENDING_BET_KEY);
      const sameTab = trustedDepositBet(ownerId, view.pendingBet.bet, view.pendingBet.returnPath,
        { kind: "tab-marker", hydrated: true, markerRaw }, Date.now());
      if (!sameTab) { setReturnTapReason("new-tab"); return; }
    } catch { setReturnTapReason("new-tab"); return; }
    returnToChoice();
  }, [view, ownerId, paymentKey, firstDepositNotice, returnToChoice]);

  const band = view.state === "PENDING" ? depositWaitingBand(view.createdAt, view.serverNow) : "unknown";
  const savedQuote = view.state === "UNKNOWN" || !view.pendingBet ? null : parseBetParam(view.pendingBet.bet);
  const existingMoneyChoice = view.state === "PENDING" && band === "late" && savedQuote?.stake !== null
    && savedQuote?.stake !== undefined && typeof view.spendable === "number" && view.spendable >= savedQuote.stake;
  const pendingText = band === "fresh" ? t.journey.depositWaitFresh
    : band === "slow" ? t.journey.depositWaitSlow
    : band === "long" ? t.journey.depositWaitLong : t.journey.depositWaitLate;
  const title = view.state === "UNKNOWN" && view.noPayment ? t.journey.depositNoPaymentTitle
    : view.state === "PAID" ? t.wallet.returnPaidTitle
    : view.state === "FAILED" ? t.wallet.returnFailedTitle
    : view.state === "HELD" || view.state === "RETURNED" ? t.wallet.returnReversedTitle
    : view.state === "REVIEW" ? t.wallet.returnReviewTitle
    : view.state === "PENDING" ? t.wallet.returnPendingTitle : t.journey.depositWaitUnknown;
  const body = view.state === "UNKNOWN" && view.noPayment ? t.journey.depositNoPaymentBody
    : view.state === "PAID" ? (view.pendingBet ? t.journey.depositPaidManual : t.wallet.returnPaidBody)
    : view.state === "FAILED" ? t.wallet.returnFailedBody
    : view.state === "HELD" || view.state === "RETURNED" ? t.wallet.returnReversedBody
    : view.state === "REVIEW" ? t.wallet.returnReviewBody
    : view.state === "PENDING" ? pendingText : t.journey.depositUnknownBody;

  return <PageContainer tier="receipt" className="space-y-5 pb-16" >
    <PageHero><PageHeader icon={view.state === "PAID" ? <I.checkCircle s={14} className="text-success-fg" /> : <I.clock s={14} className="text-brand-300" />}
      eyebrow={t.journey.depositWaitEyebrow} title={title} subtitle={body} /></PageHero>
    {view.state === "PENDING" && <Callout tone="info" title={t.wallet.returnPendingWarnTitle}>{t.wallet.returnPendingWarnBody}</Callout>}
    {existingMoneyChoice && <Button type="button" variant="ghost" size="lg" fullWidth onClick={returnToChoice}>
      {t.journey.depositUseExistingMoney}
    </Button>}
    {view.state === "PAID" && firstDepositNotice && <KycFirstDepositNotice variant={firstDepositNotice} dismissValue={noticeDismissValue} documentNavigation />}
    {readError && <Callout tone="neutral" title={t.journey.depositCheckDelayed}>{t.journey.depositUnknownBody}</Callout>}
    {view.state !== "UNKNOWN" && <div className="rounded-xl glass-panel divide-y divide-border">
      <div className="flex justify-between gap-4 px-4 py-3 text-body-sm"><span className="text-text-muted">{t.wallet.amount}</span><span className="amount text-text"><Cash>{formatTzs(view.amount)}</Cash></span></div>
      <div className="flex justify-between gap-4 px-4 py-3 text-body-sm"><span className="text-text-muted">{t.wallet.transactionId}</span><span className="font-mono text-text break-all text-right">{view.txnId}</span></div>
    </div>}
    {view.state === "PAID" && returnBlocked && <Callout tone="neutral" title={t.journey.depositReturnNeedsTab}>{t.journey.depositReturnNeedsTabBody}</Callout>}
    {view.state === "PAID" && returnTapReason === "new-tab" && !returnBlocked && <Callout tone="info" title={t.journey.depositNewTabTitle}>{t.journey.depositNewTabBody}</Callout>}
    {view.state === "PAID" && returnTapReason && !returnBlocked && <Button type="button" size="lg" fullWidth onClick={returnToChoice}>{t.journey.depositReturnToChoice}</Button>}
    {view.state === "FAILED" && !failureReleased && <Button type="button" size="lg" fullWidth disabled={checkingFailure} onClick={() => { void recheckFailure(); }}
      className="disabled:opacity-50">{t.journey.depositCheckPayment}</Button>}
    {view.state === "FAILED" && failureReleased && <a href="/wallet/deposit" className="btn btn-primary btn-lg flex w-full justify-center">{t.error.tryAgain}</a>}
    {view.state === "FAILED" && view.pendingBet && <Button type="button" variant="ghost" size="lg" fullWidth onClick={returnToChoice}>{t.journey.depositReturnToChoice}</Button>}
    {view.state !== "FAILED" && view.state !== "UNKNOWN" && <a href={`/wallet/receipt/${view.txnId}`} className="btn btn-ghost btn-lg flex w-full justify-center">{t.wallet.viewReceipt}</a>}
    {view.state === "UNKNOWN" && view.noPayment && noPaymentReleased && <a href="/wallet/deposit" className="btn btn-primary btn-lg flex w-full justify-center">{t.error.tryAgain}</a>}
    {view.state === "UNKNOWN" && (!view.noPayment || !noPaymentReleased) && <Button type="button" variant="ghost" size="lg" fullWidth onClick={() => { void refresh(); }}>{t.error.tryAgain}</Button>}
    {view.state === "PENDING" && (band === "long" || band === "late") && <a href="/help" className="btn btn-ghost btn-md flex w-full justify-center">{t.journey.depositContactSupport}</a>}
    <a href="/wallet" className="btn btn-ghost btn-md flex w-full justify-center">{t.error.backToWallet}</a>
  </PageContainer>;
}

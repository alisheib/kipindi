"use client";

/**
 * Sell button — cash out an open position before resolution.
 * Shows the live cash-out value with the slippage already applied,
 * a confirm flow, and a result toast.
 *
 * The current value is computed server-side and passed in as `value`. We
 * don't recalculate on the client because pool composition changes second
 * by second; the value displayed here is the moment we render — the
 * server re-runs the math when the action fires.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { cashOutPositionAction } from "@/app/markets/actions";
import { SellConfirmModal } from "./sell-confirm-modal";
import { OperationResultModal } from "./operation-result-modal";
import { formatTzs, formatNumber } from "@/lib/utils";
import { errorCopy } from "@/lib/error-copy";

const GRACE_MS = 5 * 60_000;

export function SellButton({
  positionId,
  stake,
  value,
  placedAt,
  closesAt,
  alreadyClosed,
  serverNow,
}: {
  positionId: string;
  /** Stake at place-time. */
  stake: number;
  /** Current sellback value (post-slippage). */
  value: number;
  /** ISO timestamp when the position was placed — used to determine
   *  whether the 5-minute free-exit grace window is still open. */
  placedAt?: string;
  /**
   * ISO timestamp when SELLING shuts — i.e. the selection cutoff
   * (`selectionClosedAt ?? resolutionAt`), NOT the resolution time.
   *
   * This used to be passed `resolutionAt`, which is LATER: it left the "Sell now"
   * button live through the whole window between selections closing and the
   * officers recording the result — exactly the window in which the real-world
   * outcome is already knowable. The server now refuses those sales, so offering
   * the button there would only be a lie the server rejects. The exit shuts when
   * the entry shuts.
   */
  closesAt?: string;
  /**
   * The server's own verdict (`isSelectionClosed(market)`), so the button is
   * right on the first paint and covers the cases a timestamp alone cannot —
   * notably a sentinel-CLOSED market, which is the single most dangerous moment
   * to leave an exit open.
   */
  alreadyClosed?: boolean;
  /** Server's Date.now() at render time. Passed from the server component
   *  so the client can calibrate its clock against the server — prevents
   *  clock skew (e.g. server 1 min ahead of device) from showing 6 min
   *  instead of 5 on the free-exit countdown. */
  serverNow?: number;
}) {
  const [pending, start] = useTransition();
  const [closedNow, setClosedNow] = useState(false);
  // Grace period — ticks once per second to update the countdown label.
  const [graceRemainMs, setGraceRemainMs] = useState<number>(0);
  useEffect(() => {
    if (!placedAt) return;
    const placedTs = Date.parse(placedAt);
    if (!Number.isFinite(placedTs)) return;
    // Compute clock offset once: server ahead → positive offset.
    // Applying it keeps the countdown aligned to server time so a device
    // clock that's 1 min behind doesn't show 6:00 instead of 5:00.
    const clockOffset = serverNow != null ? serverNow - Date.now() : 0;
    const update = () => setGraceRemainMs(Math.max(0, placedTs + GRACE_MS - (Date.now() + clockOffset)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [placedAt, serverNow]);
  // closedNow flips client-side the moment the wall clock crosses
  // resolutionAt. Tick once per second.
  useEffect(() => {
    // The server already told us if selling is shut (covers sentinel-CLOSED, which
    // no timestamp can express). Otherwise tick against the SELECTION cutoff.
    if (alreadyClosed) { setClosedNow(true); return; }
    if (!closesAt) return;
    const closeTs = Date.parse(closesAt);
    if (!Number.isFinite(closeTs)) return;
    const update = () => setClosedNow(Date.now() >= closeTs);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [closesAt, alreadyClosed]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{ variant: "success" | "danger"; value: number; net: number; error?: string } | null>(null);
  const router = useRouter();
  // B-16 — the success toast rides the transition's falling edge (the wallet
  // figure it announces is then actually on screen); errors stay immediate.
  const { toast, deferToast } = useDeferredToast(pending);
  const { t } = useT();

  // Free exit is only valid if: grace window hasn't expired AND the market
  // closes in more than 5 min (prevents last-second exploitation).
  const marketCloseMs = closesAt ? Date.parse(closesAt) - Date.now() : Infinity;
  const inGrace = graceRemainMs > 0 && marketCloseMs > GRACE_MS;
  // Cash-out is an EARLY EXIT, never a profit. `value` is the stake returned:
  // the full stake inside the free-exit window, or stake − fee outside it.
  // `net` is therefore always ≤ 0 (0 when free, −fee otherwise).
  const net = value - stake;
  const fee = Math.max(0, stake - value);

  // Grace countdown label: "43:12" remaining
  const graceMin = Math.floor(graceRemainMs / 60_000);
  const graceSec = Math.floor((graceRemainMs % 60_000) / 1000);
  const graceLabel = `${graceMin}:${String(graceSec).padStart(2, "0")}`;

  const openConfirm = () => {
    if (pending || closedNow) return;
    setConfirmOpen(true);
  };

  // ONE SALE PER CONFIRM. `openConfirm` guards on `pending` and the confirm button is
  // `disabled={pending}` — but the modal's Enter-to-confirm is a WINDOW keydown listener
  // reading a `pendingRef` that an effect syncs one commit late (sell-confirm-modal.tsx:55-65),
  // so two fast Enters both pass it and both land here. No money can move twice — the
  // server re-reads the position inside `withLock(wallet:{userId})` and refuses the second
  // with `position_not_open` — but that refusal writes the SAME `resultData` as the success,
  // and whichever reply lands last wins. So the player can be told "Couldn't cash out"
  // after their money has correctly moved. That is a truthfulness defect on a money
  // control, which is the one thing a cash-out screen must never be.
  //
  // BOTH latches below are needed, because they close different windows. `pending` is
  // `useTransition` state read from the closure of the render that built this `submit`,
  // and the modal invokes it through its own one-commit-late `onConfirmRef` — so in the
  // same tick, before React has flushed passive effects, `pending` is still false and the
  // second call walks straight through. `inFlight` is set SYNCHRONOUSLY on the first call,
  // so it is the only one that closes that tick. `pending` stays because it is the
  // in-repo precedent (`conviction-dial.tsx`'s `submit` opens with exactly it) and it
  // refuses a repeat arriving from any surface that never armed the ref.
  const inFlight = useRef(false);

  const submit = () => {
    if (inFlight.current || pending) return;
    inFlight.current = true;
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("positionId", positionId);
        // A throw here was as silent as it was on the bet path (see conviction-dial):
        // the rejection escaped the transition, the confirm dialog dismissed itself, and
        // no toast, modal or error state ever mounted — leaving the player unsure whether
        // their position had been sold. Mapped to a refusal the copy layer can render.
        let r: Awaited<ReturnType<typeof cashOutPositionAction>>;
        try {
          r = await cashOutPositionAction(fd);
        } catch {
          r = { ok: false as const, error: "", code: "BUSY" } as Awaited<ReturnType<typeof cashOutPositionAction>>;
        }
        setConfirmOpen(false);
        // AUTH LOSS IS NOT A FAILED SALE — same shape as the bet path, same model
        // (`use-quick-bet.ts`). A session revoked in another tab makes
        // `cashOutPositionAction` `redirect("/auth/login")`, and a Server Action that
        // redirects RESOLVES TO NOTHING. Reading `.ok` off that undefined throws a
        // TypeError below the catch above, so the rejection escapes the transition and
        // the error boundary flashes while the login page loads — leaving the player
        // unable to tell whether the position was sold. Return silently; the nav speaks.
        if (r == null) return;
        if (!r.ok) {
          // B-7 — the refusal is rendered as toast body AND modal title, so it must
          // be the localized line, never the raw service string.
          const msg = errorCopy(t, r);
          toast({ title: t.toast.couldntCashOut, description: msg, variant: "danger" });
          setResultData({ variant: "danger", value: value, net, error: msg });
          setResultOpen(true);
          return;
        }
        const realisedValue = r.data!.value;
        const realisedFee = Math.max(0, stake - realisedValue); // 0 inside the free-exit window
        deferToast({
          title: `${t.dialog.sellLabel} · ${formatTzs(realisedValue)} ${t.toast.soldReturned}`,
          description: realisedFee <= 0
            ? t.toast.fullStakeRefunded
            : `${formatTzs(realisedFee)} ${t.toast.earlyExitFeeApplied}`,
          variant: "success",
        });
        // net is stored as −fee so the result modal can surface the fee row.
        setResultData({ variant: "success", value: realisedValue, net: -realisedFee });
        setResultOpen(true);
        window.dispatchEvent(new Event("50pick:refresh"));
        window.dispatchEvent(new Event("50pick:refresh-notifications"));
        // B-16 — both SellButton hosts (/markets/[id], /positions) mount a
        // RefreshPoller on the "50pick:refresh" event; a direct refresh beside
        // the dispatch was a guaranteed double fetch.
      } finally {
        // Disarmed only once the whole body has run — including every early `return`
        // above — so the latch can never outlive the request it is guarding, and a
        // retry after a genuine refusal is never blocked by a stuck ref.
        inFlight.current = false;
      }
    });
  };

  // Cash-out is an early-exit utility, not a win — always the neutral royal CTA.
  const btnVariant = "btn-primary";

  return (
    <>
      {inGrace && !closedNow && (
        <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-500/[0.12] border border-brand-500/30">
          <span className="font-mono text-micro font-bold text-brand-300 uppercase tracking-[0.12em]">{t.common.freeExitLabel}</span>
          <span className="font-mono text-[10px] text-brand-300 tabular-nums">{graceLabel}</span>
          <span className="font-mono text-[10px] text-text-subtle">· {t.dialog.noFee}</span>
        </div>
      )}
      <button
        type="button"
        onClick={closedNow ? undefined : openConfirm}
        disabled={pending || closedNow}
        aria-label={
          closedNow
            ? t.common.sellLockedHint
            : inGrace
            ? `${t.common.freeExitLabel} — ${formatTzs(value)}`
            : `${t.common.cashOut} ${formatTzs(value)}`
        }
        // Height is `.btn-md` (--h-control-md = 44px, globals.css) and nothing else.
        // The inline `minHeight: 44` that used to sit here existed only because
        // btn-md capped at 38px; `h-auto` beside it was always inert (no cascade
        // layers — `.btn-md`'s `height` wins on source order). ⛔ Do not re-add
        // a per-call height: the token owns it.
        className={`btn ${closedNow ? "btn-ghost" : btnVariant} btn-md w-full whitespace-normal`}
        style={{ justifyContent: "space-between" }}
      >
        <span>
          {closedNow ? t.common.sellLocked
            : pending ? t.common.selling
            : inGrace ? t.common.freeExitLabel
            : t.common.sellNow}
        </span>
        {!closedNow && (
          <span className="font-mono tabular-nums">
            TZS {formatNumber(value)}
            {inGrace
              ? <span className="ml-1.5 opacity-80 text-[11px]">{t.common.fullRefund}</span>
              : <span className="ml-1.5 opacity-80 text-[11px]">−{formatNumber(fee)} {t.common.fee}</span>
            }
          </span>
        )}
      </button>
      <SellConfirmModal
        open={confirmOpen}
        pending={pending}
        stake={stake}
        value={value}
        positionId={positionId}
        onConfirm={submit}
        onCancel={() => { if (!pending) setConfirmOpen(false); }}
      />
      {resultData && (
        <OperationResultModal
          open={resultOpen}
          variant={resultData.variant}
          eyebrow={resultData.variant === "success" ? t.common.positionSold : t.common.cashOutFailed}
          title={
            resultData.variant === "success"
              ? `${formatTzs(resultData.value)} ${t.common.returned}`
              : (resultData.error ?? t.error.tryAgain)
          }
          subtitle={
            resultData.variant === "success"
              ? (resultData.net >= 0
                  ? t.common.fullStakeReturned
                  : t.common.stakeReturnedMinusFee)
              : t.common.positionUnchanged
          }
          details={resultData.variant === "success" ? [
            { label: t.common.ticket, value: positionId },
            { label: t.common.returned, value: formatTzs(resultData.value) },
            {
              label: t.common.earlyExitFee,
              value: resultData.net >= 0 ? t.common.none : formatTzs(Math.abs(resultData.net)),
              tone: "default",
            },
          ] : undefined}
          primaryLabel={resultData.variant === "success" ? t.common.doneSawa : t.common.close}
          onClose={() => setResultOpen(false)}
          stripTone="brand"
        />
      )}
    </>
  );
}

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
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { cashOutPositionAction } from "@/app/markets/actions";
import { SellConfirmModal } from "./sell-confirm-modal";
import { OperationResultModal } from "./operation-result-modal";
import { formatTzs, formatNumber } from "@/lib/utils";

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
  const { toast } = useToast();
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

  const submit = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("positionId", positionId);
      const r = await cashOutPositionAction(fd);
      setConfirmOpen(false);
      if (!r.ok) {
        toast({ title: t.toast.couldntCashOut, description: r.error, variant: "danger" });
        setResultData({ variant: "danger", value: value, net, error: r.error });
        setResultOpen(true);
        return;
      }
      const realisedValue = r.data!.value;
      const realisedFee = Math.max(0, stake - realisedValue); // 0 inside the free-exit window
      toast({
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
      router.refresh();
    });
  };

  // Cash-out is an early-exit utility, not a win — always the neutral royal CTA.
  const btnVariant = "btn-primary";

  return (
    <>
      {inGrace && !closedNow && (
        <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-500/[0.12] border border-brand-500/30">
          <span className="font-mono text-[10px] font-bold text-brand-300 uppercase tracking-[0.12em]">{t.common.freeExitLabel}</span>
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
        className={`btn ${closedNow ? "btn-ghost" : btnVariant} btn-md w-full whitespace-normal h-auto`}
        style={{ justifyContent: "space-between", minHeight: 44 }}
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

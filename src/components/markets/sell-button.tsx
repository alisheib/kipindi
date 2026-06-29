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

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const GRACE_MS = 5 * 60_000;

export function SellButton({
  positionId,
  stake,
  value,
  placedAt,
  resolutionAt,
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
  /** ISO timestamp when the underlying market closes. If supplied, the
   *  button switches to a "Market closed" state the instant the wall
   *  clock crosses this — avoiding the stale "Sell now · TZS X" call
   *  to action sitting in front of a market the server has already
   *  shut for cash-outs. Mirrors the dial's closedNow pattern. */
  resolutionAt?: string;
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
    if (!resolutionAt) return;
    const closeTs = Date.parse(resolutionAt);
    if (!Number.isFinite(closeTs)) return;
    const update = () => setClosedNow(Date.now() >= closeTs);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [resolutionAt]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{ variant: "success" | "danger"; value: number; net: number; error?: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useT();

  // Free exit is only valid if: grace window hasn't expired AND the market
  // closes in more than 5 min (prevents last-second exploitation).
  const marketCloseMs = resolutionAt ? Date.parse(resolutionAt) - Date.now() : Infinity;
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
        title: `${t.dialog.sellLabel} · TZS ${fmt(realisedValue)} ${t.toast.soldReturned}`,
        description: realisedFee <= 0
          ? t.toast.fullStakeRefunded
          : `TZS ${fmt(realisedFee)} ${t.toast.earlyExitFeeApplied}`,
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
          <span className="font-mono text-[10px] font-bold text-brand-300 uppercase tracking-[0.12em]">Free exit</span>
          <span className="font-mono text-[10px] text-brand-300 tabular-nums">{graceLabel}</span>
          <span className="font-mono text-[10px] text-text-subtle">· no fee · bila gharama</span>
        </div>
      )}
      <button
        type="button"
        onClick={closedNow ? undefined : openConfirm}
        disabled={pending || closedNow}
        aria-label={
          closedNow
            ? "Market closed — awaiting settlement"
            : inGrace
            ? `Free exit — full refund TZS ${fmt(value)}`
            : `Cash out for TZS ${fmt(value)}`
        }
        className={`btn ${closedNow ? "btn-ghost" : btnVariant} btn-md w-full whitespace-normal h-auto`}
        style={{ justifyContent: "space-between", minHeight: 44 }}
      >
        <span>
          {closedNow ? "Market closed · Soko limefungwa"
            : pending ? "Selling…"
            : inGrace ? "Free exit · Toka bila gharama"
            : t.common.sellNow}
        </span>
        {!closedNow && (
          <span className="font-mono tabular-nums">
            TZS {fmt(value)}
            {inGrace
              ? <span className="ml-1.5 opacity-80 text-[11px]">full refund</span>
              : <span className="ml-1.5 opacity-80 text-[11px]">−{fmt(fee)} fee</span>
            }
          </span>
        )}
      </button>
      <SellConfirmModal
        open={confirmOpen}
        pending={pending}
        stake={stake}
        value={value}
        onConfirm={submit}
        onCancel={() => { if (!pending) setConfirmOpen(false); }}
      />
      {resultData && (
        <OperationResultModal
          open={resultOpen}
          variant={resultData.variant}
          eyebrow={resultData.variant === "success" ? "Position sold · Imeuzwa" : "Cash-out failed · Haikufanikiwa"}
          title={
            resultData.variant === "success"
              ? `TZS ${fmt(resultData.value)} returned · Imerudishwa`
              : (resultData.error ?? "Try again · Jaribu tena")
          }
          subtitle={
            resultData.variant === "success"
              ? (resultData.net >= 0
                  ? "Full stake returned to your wallet · Pesa imerudi"
                  : "Stake returned, minus the early-exit fee · Pesa imerudi, ukatwa ada")
              : "Position is unchanged · Position haijabadilika."
          }
          details={resultData.variant === "success" ? [
            { label: "Returned", sw: "Imerudishwa", value: `TZS ${fmt(resultData.value)}` },
            {
              label: "Early-exit fee",
              sw: "Ada ya kutoka",
              value: resultData.net >= 0 ? "None · Hakuna" : `TZS ${fmt(Math.abs(resultData.net))}`,
              tone: "default",
            },
          ] : undefined}
          primaryLabel={resultData.variant === "success" ? "Done · Sawa" : "Close"}
          onClose={() => setResultOpen(false)}
          stripTone="brand"
        />
      )}
    </>
  );
}

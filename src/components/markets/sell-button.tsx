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
import { cashOutPositionAction } from "@/app/markets/actions";
import { dispatchWinCelebration } from "@/components/markets/win-celebration";
import { SellConfirmModal } from "./sell-confirm-modal";
import { OperationResultModal } from "./operation-result-modal";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const GRACE_MS = 45 * 60_000;

export function SellButton({
  positionId,
  stake,
  value,
  placedAt,
  resolutionAt,
}: {
  positionId: string;
  /** Stake at place-time. */
  stake: number;
  /** Current sellback value (post-slippage). */
  value: number;
  /** ISO timestamp when the position was placed — used to determine
   *  whether the 45-minute free-exit grace window is still open. */
  placedAt?: string;
  /** ISO timestamp when the underlying market closes. If supplied, the
   *  button switches to a "Market closed" state the instant the wall
   *  clock crosses this — avoiding the stale "Sell now · TZS X" call
   *  to action sitting in front of a market the server has already
   *  shut for cash-outs. Mirrors the dial's closedNow pattern. */
  resolutionAt?: string;
}) {
  const [pending, start] = useTransition();
  const [closedNow, setClosedNow] = useState(false);
  // Grace period — ticks once per second to update the countdown label.
  const [graceRemainMs, setGraceRemainMs] = useState<number>(0);
  useEffect(() => {
    if (!placedAt) return;
    const placedTs = Date.parse(placedAt);
    if (!Number.isFinite(placedTs)) return;
    const update = () => setGraceRemainMs(Math.max(0, placedTs + GRACE_MS - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [placedAt]);
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

  const inGrace = graceRemainMs > 0;
  const ratio = stake > 0 ? value / stake : 0;
  const net = value - stake;
  const tone = inGrace ? "yes" :
    ratio >= 1.05 ? "yes" :
    ratio >= 1.00 ? "warning" :
    "no";

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
        toast({ title: "Couldn't cash out", description: r.error, variant: "danger" });
        setResultData({ variant: "danger", value: value, net, error: r.error });
        setResultOpen(true);
        return;
      }
      const realisedNet = r.data!.value - stake;
      toast({
        title: `Sold · TZS ${fmt(r.data!.value)}`,
        description: realisedNet >= 0 ? `+TZS ${fmt(realisedNet)} profit locked in` : `−TZS ${fmt(Math.abs(realisedNet))} loss`,
        variant: realisedNet >= 0 ? "success" : "warning",
      });
      setResultData({ variant: "success", value: r.data!.value, net: realisedNet });
      setResultOpen(true);
      if (realisedNet > 0) {
        dispatchWinCelebration({
          kind: "CASHOUT",
          amount: r.data!.value,
          net: realisedNet,
          label: "Cashed out at profit",
        });
      }
      try { window.dispatchEvent(new Event("50pick:refresh-notifications")); } catch {}
      router.refresh();
    });
  };

  // Kit btn map: profit at conviction-grade ratio → gold; positive but thin →
  // primary royal; loss territory → no.
  const btnVariant =
    tone === "yes"     ? "btn-gold" :
    tone === "warning" ? "btn-primary" :
                         "btn-no";

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
            : "Sell now"}
        </span>
        {!closedNow && (
          <span className="font-mono tabular-nums">
            TZS {fmt(value)}
            {inGrace
              ? <span className="ml-1.5 opacity-80 text-[11px]">full refund</span>
              : <span className="ml-1.5 opacity-80 text-[11px]">{net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}</span>
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
                  ? "Profit locked in. Stake left the pool."
                  : "Loss crystallised. Stake left the pool.")
              : "Position is unchanged · Position haijabadilika."
          }
          details={resultData.variant === "success" ? [
            { label: "Sellback", sw: "Pesa sasa", value: `TZS ${fmt(resultData.value)}` },
            {
              label: "Net",
              sw: "Faida / hasara",
              value: `${resultData.net >= 0 ? "+" : "−"}TZS ${fmt(Math.abs(resultData.net))}`,
              tone: resultData.net >= 0 ? "good" : "bad",
            },
          ] : undefined}
          primaryLabel={resultData.variant === "success" ? "Done · Sawa" : "Close"}
          onClose={() => setResultOpen(false)}
          stripTone="gold"
        />
      )}
    </>
  );
}

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
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { cashOutPositionAction } from "@/app/markets/actions";
import { dispatchWinCelebration } from "@/components/markets/win-celebration";
import { SellConfirmModal } from "./sell-confirm-modal";
import { OperationResultModal } from "./operation-result-modal";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function SellButton({
  positionId,
  stake,
  value,
}: {
  positionId: string;
  /** Stake at place-time. */
  stake: number;
  /** Current sellback value (post-slippage). */
  value: number;
}) {
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{ variant: "success" | "danger"; value: number; net: number; error?: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const ratio = stake > 0 ? value / stake : 0;
  const net = value - stake;
  const tone =
    ratio >= 1.05 ? "yes" :
    ratio >= 1.00 ? "warning" :
    "no";

  const openConfirm = () => {
    if (pending) return;
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
      <button
        type="button"
        onClick={openConfirm}
        disabled={pending}
        aria-label={`Cash out for TZS ${fmt(value)}`}
        className={`btn ${btnVariant} btn-md w-full`}
        style={{ justifyContent: "space-between" }}
      >
        <span>{pending ? "Selling…" : "Sell now"}</span>
        <span className="font-mono tabular-nums">
          TZS {fmt(value)}
          <span className="ml-1.5 opacity-80 text-[11px]">
            {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}
          </span>
        </span>
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
          eyebrow={resultData.variant === "success" ? "Position sold · Imeuzwa" : "Cash-out failed"}
          title={
            resultData.variant === "success"
              ? `TZS ${fmt(resultData.value)} returned`
              : (resultData.error ?? "Try again")
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
        />
      )}
    </>
  );
}

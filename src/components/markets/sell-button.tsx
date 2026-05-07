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
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { cashOutPositionAction } from "@/app/markets/actions";
import { dispatchWinCelebration } from "@/components/markets/win-celebration";

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
  const router = useRouter();
  const { toast } = useToast();

  const ratio = stake > 0 ? value / stake : 0;
  const net = value - stake;
  const tone =
    ratio >= 1.05 ? "yes" :
    ratio >= 1.00 ? "warning" :
    "no";

  const onClick = () => {
    if (pending) return;
    const confirmMsg = `Sell now for TZS ${fmt(value)}? You'd ${
      net >= 0 ? "lock in TZS " + fmt(net) + " profit" : "take a TZS " + fmt(Math.abs(net)) + " loss"
    } and your stake leaves the pool.`;
    if (!confirm(confirmMsg)) return;
    start(async () => {
      const fd = new FormData();
      fd.set("positionId", positionId);
      const r = await cashOutPositionAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't cash out", description: r.error, variant: "danger" });
        return;
      }
      toast({
        title: `Sold · TZS ${fmt(r.data!.value)}`,
        description: net >= 0 ? `+TZS ${fmt(net)} profit locked in` : `−TZS ${fmt(Math.abs(net))} loss`,
        variant: net >= 0 ? "success" : "warning",
      });
      // Profit-only: fire the gold-and-aqua celebration. Losses get the
      // toast only — no fanfare for crossing back below stake.
      if (net > 0) {
        dispatchWinCelebration({
          kind: "CASHOUT",
          amount: r.data!.value,
          net,
          label: "Cashed out at profit",
        });
      }
      router.refresh();
    });
  };

  const bgClass =
    tone === "yes"     ? "bg-yes-500/15 border-yes-700 text-yes-300 hover:bg-yes-500/25" :
    tone === "warning" ? "bg-warning-bg/40 border-warning-border text-warning-fg hover:bg-warning-bg/60" :
    "bg-no-500/15 border-no-700 text-no-300 hover:bg-no-500/25";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={`Cash out for TZS ${fmt(value)}`}
      className={`w-full inline-flex items-center justify-between gap-2 rounded-md border px-3 h-10 font-display font-semibold text-[13px] transition-all disabled:opacity-50 ${bgClass}`}
    >
      <span>{pending ? "Selling…" : "Sell now"}</span>
      <span className="font-mono tabular-nums">
        TZS {fmt(value)}
        <span className="ml-1.5 opacity-70 text-[11px]">
          {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}
        </span>
      </span>
    </button>
  );
}

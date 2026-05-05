"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { OPERATOR_MARGIN } from "@/lib/server/market-service";
import { buyPositionAction } from "@/app/markets/actions";

type Side = "YES" | "NO";
type Props = {
  marketId: string;
  yesPool: number;
  noPool: number;
  initialSide?: Side;
};

const fmt = (n: number) => n.toLocaleString("en-US");

function projectedPayout(yesPool: number, noPool: number, side: Side, stake: number): number {
  const winningPool  = side === "YES" ? yesPool + stake : noPool + stake;
  const losingPool   = side === "YES" ? noPool : yesPool;
  if (winningPool === 0) return stake;
  const distributable = losingPool * (1 - OPERATOR_MARGIN);
  return Math.round(stake + (stake / winningPool) * distributable);
}

export function BuyTray({ marketId, yesPool, noPool, initialSide = "YES" }: Props) {
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState("25,000");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const num = parseInt(amount.replace(/[^\d]/g, ""), 10) || 0;
  const payout = projectedPayout(yesPool, noPool, side, num);
  const total = yesPool + noPool + num;
  const sharePct = total === 0 ? 0 : (num / (side === "YES" ? yesPool + num : noPool + num)) * 100;

  const chips = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

  const submit = () => {
    if (num < 100) {
      toast({ title: "Stake must be at least TZS 100", variant: "warning" });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("side", side);
      fd.set("stake", String(num));
      const r = await buyPositionAction(fd);
      if (!r.ok) {
        toast({ title: "Could not place", description: r.error, variant: "danger" });
      } else {
        toast({ title: `Predicted ${side}`, description: `If correct, you receive TZS ${fmt(r.data!.payoutIfWin)}`, variant: "success" });
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-5 w-full max-w-[340px]">
      {/* Side toggle */}
      <div className="mb-4 flex gap-1 rounded-md bg-bg-overlay p-1">
        <button
          type="button"
          onClick={() => setSide("YES")}
          className={cn(
            "flex-1 h-9 rounded-sm font-bold transition-all duration-micro",
            side === "YES" ? "bg-yes-500 text-yes-950" : "bg-transparent text-text-muted hover:text-text",
          )}
        >
          YES
        </button>
        <button
          type="button"
          onClick={() => setSide("NO")}
          className={cn(
            "flex-1 h-9 rounded-sm font-bold transition-all duration-micro",
            side === "NO" ? "bg-no-500 text-white" : "bg-transparent text-text-muted hover:text-text",
          )}
        >
          NO
        </button>
      </div>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Stake amount</p>
      <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-bg-overlay px-3 focus-within:border-teal-300">
        <span className="font-mono text-[13px] text-text-subtle">TZS</span>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))}
          className="flex-1 bg-transparent font-mono text-[16px] tabular-nums text-text outline-none"
        />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setAmount(c.toLocaleString())}
            className="h-7 rounded-pill border border-border px-3 font-mono text-[12px] text-text-muted hover:border-border-strong hover:text-text"
          >
            {c >= 1000 ? `${c / 1000}k` : c}
          </button>
        ))}
      </div>

      <div className="my-4 h-px bg-border" />

      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] text-text-subtle">Share of pool</span>
        <span className="font-mono text-[12px] text-text-muted">~{sharePct.toFixed(2)}%</span>
      </div>
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-[12px] text-text-subtle">If correct, you receive</span>
        <span className="font-mono text-[18px] font-semibold text-gold-300">TZS {fmt(payout)}</span>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full h-14 rounded-lg font-bold text-[16px] bg-gradient-to-b from-gold-400 to-gold-600 text-gold-fg border border-gold-700 shadow-[0_1px_0_oklch(95%_0.08_80)_inset] disabled:opacity-50 hover:from-gold-300 hover:to-gold-500 transition-all"
      >
        {pending ? "Placing…" : `Confirm · TZS ${fmt(payout)}`}
      </button>
      <p className="mt-2.5 text-center text-[11px] text-text-subtle">
        Pool-share payout. Outcome may differ from current odds.
      </p>
    </div>
  );
}

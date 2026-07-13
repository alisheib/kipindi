"use client";

/**
 * The officer presses this to pay a market. Nothing else pays it — automatic
 * settlement is paused until the payment aggregator is live — so this is a real
 * money act and it goes behind an explicit confirm that states, in figures, what
 * is about to move.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { formatTzs } from "@/lib/utils";
import { settleMarketAction } from "./actions";

export function SettleButton({
  marketId, title, pool, positions, outcome,
}: {
  marketId: string;
  title: string;
  pool: number;
  positions: number;
  outcome: string | null;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const settle = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      const r = await settleMarketAction(fd);
      if (!r.ok) {
        toast({ title: "Not settled", description: r.error, variant: "danger" });
        return;
      }
      setOpen(false);
      toast({ title: "Settled", description: r.detail, variant: "success" });
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-brand-500 bg-brand-500/10 px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-brand-300 transition-colors hover:bg-brand-500/20 brand-focus"
      >
        <I.check s={13} className="shrink-0" />
        Settle now
      </button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        role="alertdialog"
        closeOnScrim={false}
        labelledBy="settle-title"
        maxWidth={440}
      >
        <div className="space-y-4">
          <h2 id="settle-title" className="font-display text-[16px] font-semibold text-text">
            Pay out this market?
          </h2>

          <p className="text-[12.5px] leading-relaxed text-text-muted">{title}</p>

          <div className="rounded-md border border-border bg-bg-overlay font-mono text-[12.5px]">
            <Row label="Verdict" value={outcome ?? "—"} />
            <Row label="Pool" value={formatTzs(pool)} />
            <Row label="Open positions" value={String(positions)} />
          </div>

          <p className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg/20 px-3 py-2 text-[12px] leading-relaxed text-warning-fg">
            <I.alertCircle s={14} className="mt-[1px] shrink-0" />
            This credits every winner and closes every position. It cannot be undone — once the
            money is in players&rsquo; wallets, an objection can no longer change it.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={settle} disabled={pending}>
              {pending ? "Settling…" : "Settle & pay winners"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2 border-b border-border/50 last:border-b-0">
      <span className="text-text-subtle">{label}</span>
      <span className="font-semibold tabular-nums text-text">{value}</span>
    </div>
  );
}

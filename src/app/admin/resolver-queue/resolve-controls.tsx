"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { resolveMarketAction } from "@/app/markets/actions";
import { BrandSpinner } from "@/components/markets/brand-spinner";

export function ResolveControls({ marketId, stage }: { marketId: string; stage: "stage1" | "stage2" }) {
  const [pending, startTransition] = useTransition();
  const [submittedSide, setSubmittedSide] = useState<"YES" | "NO" | "VOID" | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const submit = (outcome: "YES" | "NO" | "VOID") => {
    setSubmittedSide(outcome);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("outcome", outcome);
      const r = await resolveMarketAction(fd);
      if (!r.ok) {
        toast({ title: "Could not resolve", description: r.error, variant: "danger" });
      } else if (r.data?.stage === "stage1") {
        toast({ title: "Stage 1 recorded", description: "Awaiting second officer to release.", variant: "warning" });
      } else {
        toast({ title: `Resolved ${outcome}`, description: r.data?.winnersPaid ? `Paid TZS ${r.data.winnersPaid.toLocaleString()} to winners` : "All voided · refunds issued", variant: "success" });
      }
      setSubmittedSide(null);
      router.refresh();
    });
  };

  if (pending) {
    return (
      <div className="flex items-center justify-center gap-3 py-2">
        <BrandSpinner size={36} />
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted">
          Recording {submittedSide} · {stage}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => submit("YES")}
        className="h-10 rounded-md bg-yes-500 font-bold text-yes-950 transition-colors hover:bg-yes-400 disabled:opacity-50"
      >
        Resolve YES
      </button>
      <button
        type="button"
        onClick={() => submit("NO")}
        className="h-10 rounded-md bg-no-500 font-bold text-white transition-colors hover:bg-no-400 disabled:opacity-50"
      >
        Resolve NO
      </button>
      <button
        type="button"
        onClick={() => submit("VOID")}
        className="h-10 rounded-md border border-border bg-bg-overlay font-bold text-text-muted transition-colors hover:border-border-strong"
      >
        Void
      </button>
    </div>
  );
}

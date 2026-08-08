"use client";

/**
 * "Re-check this market now" — run the AI resolution check on ONE market on demand.
 *
 * Replaces the old global "Run sentinel sweep" button: there is no sweep any more,
 * each market is checked at its own resolution time. This is the manual override for
 * a single market — useful when a result lands early, or to re-read a market whose
 * source had not published when its timer fired.
 *
 * Safe before the resolve date: if the AI finds no locked outcome the market stays
 * open for betting (only its recommendation is recorded).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import { recheckMarketNowAction } from "./resolution-mode-action";

export function RecheckButton({ marketId }: { marketId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();
  // B-28 — success toasts ride the transition's falling edge (data visible when announced)
  const { toast, deferToast } = useDeferredToast(pending);

  const run = () => {
    setDone(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      const r = await recheckMarketNowAction(fd);
      if (!r.ok) {
        toast({ title: "Re-check failed", description: r.error, variant: "danger" });
        return;
      }
      setDone(true);
      // "AI sealed" announces as a warning (immediate); the success outcomes defer to the refresh.
      (r.status === "resolved-auto" ? toast : deferToast)({
        title: r.status === "resolved-auto" ? "AI sealed this market"
          : r.status === "closed-human" ? "Closed — ready for the ceremony"
          : "Re-check complete",
        description: r.detail,
        variant: r.status === "resolved-auto" ? "warning" : "success",
      });
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      title="Ask the AI to web-check this market's outcome right now. Before its resolve date this cannot close the market unless the outcome is genuinely locked."
      className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-md border border-border bg-bg-overlay px-3 font-mono text-[11px] tracking-[0.08em] uppercase text-text-muted transition-colors hover:border-brand-500 hover:text-text disabled:opacity-50"
    >
      {/* M5 — in-flight is the kit Spinner (a glyph never wears bespoke motion);
          the check ARRIVES on the state change through the settle primitive. */}
      {pending ? <Spinner size={12} /> : done ? <I.check s={12} className="g-settle" /> : <I.sparkle s={12} />}
      {pending ? "Checking…" : "Re-check this market now"}
    </button>
  );
}

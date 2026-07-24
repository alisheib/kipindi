"use client";

/**
 * AI resolution pause/resume — the operator's switch over the AUTOMATIC resolve-date
 * AI check, platform-wide.
 *
 *   Active (on)  → at each market's resolve date the AI check runs (the normal flow).
 *   Paused (off) → no automatic AI call; the resolve trigger still fires on time and
 *                  goes straight to the human ceremony. The per-market "Re-check this
 *                  market now" button still works — pause only stops the AUTOMATIC call.
 *
 * Reversible and not money-moving, so it applies directly (no confirm). When the
 * deployment has no ANTHROPIC_API_KEY the switch is disabled with a clear reason —
 * there is nothing to pause. Kit <Toggle> only.
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { setAiPausedAction } from "./resolution-mode-action";

export function AiPauseToggle({ active, hasKey }: { active: boolean; hasKey: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  if (!hasKey) {
    return (
      <span
        title="No ANTHROPIC_API_KEY on this deployment — the AI resolution check is unavailable, so there is nothing to pause. Markets resolve via the human ceremony."
        className="inline-flex items-center gap-2 rounded-md border px-2.5 h-8 font-mono text-[10px] uppercase tracking-[0.12em]"
        style={{ borderColor: "var(--border-strong)", background: "var(--bg-inset)", color: "var(--text-faint)" }}
      >
        <I.lock s={13} />
        <span className="hidden sm:inline">AI checks · no key</span>
        <span className="sm:hidden">AI off</span>
      </span>
    );
  }

  const toggle = () => {
    const nextPaused = active; // currently active → pausing; currently paused → resuming
    startTransition(async () => {
      const fd = new FormData();
      fd.set("paused", String(nextPaused));
      const r = await setAiPausedAction(fd);
      if (!r.ok) {
        toast({ title: "Could not change AI state", description: r.error, variant: "danger" });
        return;
      }
      toast({
        title: r.paused ? "AI resolution PAUSED" : "AI resolution resumed",
        description: r.paused
          ? "Markets reaching their resolve date now go straight to the two-officer ceremony — no AI call. Re-check a single market by hand anytime."
          : "The AI checks each market at its resolve date again.",
        variant: r.paused ? "warning" : "success",
      });
      router.refresh();
    });
  };

  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-md border px-2.5 h-8"
      style={active
        ? { borderColor: "var(--border-strong)", background: "var(--bg-inset)" }
        : { borderColor: "var(--warning-border)", background: "var(--warning-bg)" }}
      title={active
        ? "AI resolution is ACTIVE — the AI checks each market at its resolve date. Toggle to pause all automatic AI calls (markets then fall to the human ceremony)."
        : "AI resolution is PAUSED — no automatic AI calls; markets resolve via the human ceremony. Toggle to resume."}
    >
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em]"
        style={{ color: active ? "var(--text-subtle)" : "var(--warning-fg)" }}
      >
        {active ? <I.sparkle s={13} /> : <I.pause s={13} />}
        <span className="hidden sm:inline">{active ? "AI checks · active" : "AI checks · paused"}</span>
        <span className="sm:hidden">AI</span>
      </span>
      <Toggle
        on={active}
        disabled={pending}
        onClick={toggle}
        aria-label={`AI resolution check: ${active ? "active" : "paused"}`}
      />
    </div>
  );
}

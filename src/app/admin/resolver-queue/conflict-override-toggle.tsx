"use client";

/**
 * TESTING override toggle — lets ONE admin resolve a market end-to-end alone,
 * even one they hold a position in: it relaxes both the position-conflict block
 * (POCA §16) AND the two-officer "second reviewer must differ" gate, so a tester
 * acting as admin + player can settle a market and get paid. Claret-warned;
 * default OFF; lives in the resolver-queue header where the tester hits it.
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { toggleConflictOverrideAction } from "./conflict-override-action";

export function ConflictOverrideToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const toggle = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("enabled", String(!enabled));
      const r = await toggleConflictOverrideAction(fd);
      if (!r.ok) {
        toast({ title: "Could not change override", description: r.error, variant: "danger" });
        return;
      }
      toast({
        title: r.enabled ? "Solo resolution ENABLED" : "Solo resolution disabled",
        description: r.enabled ? "⚠ Not for production — one admin can now resolve a market alone, even one they bet on. Keep OFF before real-money launch." : "Two distinct officers required again; conflicted officers blocked.",
        variant: r.enabled ? "warning" : "success",
      });
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={enabled}
      title="Solo resolution (NOT FOR PRODUCTION — testing/consultant only) — let one admin resolve a market alone, even one they bet on; bypasses the two-officer rule + the position-conflict block. Keep OFF before real-money launch."
      className="inline-flex items-center gap-2 rounded-md border px-2.5 h-8 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors disabled:opacity-50"
      style={
        enabled
          ? { borderColor: "var(--claret-edge)", background: "var(--claret-soft)", color: "var(--claret-200)" }
          : { borderColor: "var(--border-strong)", background: "var(--bg-inset)", color: "var(--text-subtle)" }
      }
    >
      <I.alertCircle s={13} />
      <span className="hidden sm:inline">Solo resolve · testing</span>
      <span className="sm:hidden">Solo</span>
      <span
        className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
        style={{ background: enabled ? "var(--claret-400, var(--no-500))" : "var(--border-strong)" }}
      >
        <span
          className="inline-block h-3 w-3 rounded-full bg-white transition-transform"
          style={{ transform: enabled ? "translateX(14px)" : "translateX(2px)" }}
        />
      </span>
      <span className="font-bold">{enabled ? "ON" : "OFF"}</span>
    </button>
  );
}

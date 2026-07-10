"use client";

/**
 * TESTING override toggle — allows a conflicted officer (one holding a position)
 * to resolve a market. Claret-warned because it bypasses the POCA §16
 * conflict-of-interest block; default OFF. Lives in the resolver-queue header
 * where a tester acting as both admin and player will hit the block.
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
        title: r.enabled ? "Conflicted resolution ENABLED" : "Conflicted resolution disabled",
        description: r.enabled ? "Testing only — officers with positions may now resolve." : "Production rule restored — conflicted officers are blocked.",
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
      title="Testing override — allow an officer who holds a position to resolve that market"
      className="inline-flex items-center gap-2 rounded-md border px-2.5 h-8 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors disabled:opacity-50"
      style={
        enabled
          ? { borderColor: "var(--claret-edge)", background: "var(--claret-soft)", color: "var(--claret-200)" }
          : { borderColor: "var(--border-strong)", background: "var(--bg-inset)", color: "var(--text-subtle)" }
      }
    >
      <I.alertCircle s={13} />
      <span className="hidden sm:inline">Conflicted resolve · testing</span>
      <span className="sm:hidden">Conflict</span>
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

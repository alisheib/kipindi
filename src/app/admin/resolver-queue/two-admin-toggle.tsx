"use client";

/**
 * Two-admin authorization toggle — the ONE control for how many admins a resolution
 * needs. Replaces the old "Solo resolve" override (one place, one thing).
 *
 *   OFF (default): a single admin resolves any market in one action, even one they
 *     hold a position in.
 *   ON: the two-officer ceremony — stage-1 by A, stage-2 by a DIFFERENT B.
 *
 * Kit only: <Toggle> + <ConfirmModal>. Turning it OFF (relaxing to single-admin)
 * carries the informed-consent confirm — that is the compliance-relaxing direction;
 * turning it ON (re-imposing the ceremony) is the safe direction and applies directly.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { setTwoAdminAuthAction } from "./resolution-policy-action";

export function TwoAdminToggle({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();
  const [confirmOff, setConfirmOff] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const apply = (next: boolean) => {
    start(async () => {
      const fd = new FormData();
      fd.set("enabled", String(next));
      const r = await setTwoAdminAuthAction(fd);
      setConfirmOff(false);
      if (!r.ok) { toast({ title: "Couldn't change authorization", description: r.error, variant: "danger" }); return; }
      toast({
        title: next ? "Two-admin authorization ON" : "Single-admin resolution ON",
        description: next
          ? "Every resolution now needs two distinct officers (stage-1 then a different stage-2)."
          : "A single admin can now resolve any market in one action — even one they hold a position in.",
        variant: next ? "success" : "warning",
      });
      router.refresh();
    });
  };

  const onToggle = () => {
    if (enabled) { setConfirmOff(true); return; } // ON → OFF relaxes → confirm
    apply(true); // OFF → ON re-imposes the ceremony → safe, direct
  };

  return (
    <>
      <div
        className="inline-flex items-center gap-2.5 rounded-md border px-2.5 h-8"
        style={enabled
          ? { borderColor: "var(--border-strong)", background: "var(--bg-inset)" }
          : { borderColor: "var(--warning-border)", background: "var(--warning-bg)" }}
        title={enabled
          ? "Two-admin authorization is ON — resolution requires two distinct officers (stage-1 by A, stage-2 by B)."
          : "Single-admin resolution — one admin resolves any market in one action, even one they hold a position in. Toggle on to require two officers."}
      >
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em]"
          style={{ color: enabled ? "var(--text-subtle)" : "var(--warning-fg)" }}
        >
          <I.users s={13} />
          <span className="hidden sm:inline">{enabled ? "Two-admin auth" : "Single-admin"}</span>
          <span className="sm:hidden">2-admin</span>
        </span>
        <Toggle
          on={enabled}
          disabled={pending}
          onClick={onToggle}
          aria-label={`Two-admin authorization: ${enabled ? "on" : "off"}`}
        />
      </div>

      <ConfirmModal
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        onConfirm={() => apply(false)}
        tone="claret"
        eyebrow="Compliance · Uzingatiaji"
        title="Allow single-admin resolution?"
        confirmLabel="Yes, single admin can resolve"
        cancelLabel="Keep two-admin"
        body={
          <>
            <p>
              With two-admin authorization OFF, <strong>one admin resolves a market end-to-end in a
              single action</strong> — including a market they hold a position in. No second officer,
              no countersignature.
            </p>
            <p className="mt-2">
              The objection window, the objection freeze and the winner-floor still gate every payout,
              and every resolution is audited. This relaxes the two-officer / POCA §16 control — an
              owner decision (docs/COMPLIANCE-DECISIONS.md). You can switch it back on anytime.
            </p>
          </>
        }
      />
    </>
  );
}

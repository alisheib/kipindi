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
import { useDeferredToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import { setTwoAdminAuthAction } from "./resolution-policy-action";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function TwoAdminToggle({ enabled }: { enabled: boolean }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [pending, start] = useTransition();
  const [confirmOff, setConfirmOff] = useState(false);
  const router = useRouter();
  // B-28 — success toasts ride the transition's falling edge (data visible when announced)
  const { toast, deferToast } = useDeferredToast(pending);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const apply = (next: boolean) => {
    start(async () => {
      const fd = new FormData();
      fd.set("enabled", String(next));
      const r = await runAdminAction(() => setTwoAdminAuthAction(fd));
      setConfirmOff(false);
      if (!r.ok) { toast({ title: "Couldn't change authorization", description: r.error, variant: "danger" }); return; }
      // Re-imposing the ceremony is the success (deferred); relaxing is a warning (immediate).
      (next ? deferToast : toast)({
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
        /* ⚠️ LITERAL, not `h-8` — spacing is overridden (tailwind.config.ts:200-215) so `h-8`
           was 48px on the governance row that arms two-officer settlement. 40px = --tap-min. */
        className="inline-flex items-center gap-2.5 rounded-md border px-2.5 h-[40px]"
        style={enabled
          ? { borderColor: "var(--border-strong)", background: "var(--bg-inset)" }
          : { borderColor: "var(--warning-border)", background: "var(--warning-bg)" }}
        title={enabled
          ? "Two-admin authorization is ON — resolution requires two distinct officers (stage-1 by A, stage-2 by B)."
          : "Single-admin resolution — one admin resolves any market in one action, even one they hold a position in. Toggle on to require two officers."}
      >
        <span
          className="inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.12em]"
          style={{ color: enabled ? "var(--text-subtle)" : "var(--warning-fg)" }}
        >
          {/* ⭐ THE CONTROL SAYS IT IS WORKING, INSTEAD OF ONLY GOING DEAD.
              `disabled={pending}` was the whole of the in-flight state: the switch stopped
              responding and nothing else changed, so a slow save and a broken toggle looked
              identical — on the control that decides whether ONE officer or TWO may seal a
              real-money market. The glyph is swapped for the kit Spinner (never a bespoke
              animation on a glyph) and the label says which way it is going, so the officer
              can read the outcome before the toast arrives. */}
          {pending ? <Spinner size={13} /> : <I.users s={13} />}
          <span className="hidden sm:inline">
            {pending ? (enabled ? "Switching to single…" : "Switching to two-admin…") : enabled ? "Two-admin auth" : "Single-admin"}
          </span>
          <span className="sm:hidden">{pending ? "Saving…" : "2-admin"}</span>
        </span>
        <Toggle
          on={enabled}
          disabled={pending}
          onClick={onToggle}
          aria-label={`Two-admin authorization: ${enabled ? "on" : "off"}`}
        />
      </div>

      {/* ⛔ `loading` WAS AVAILABLE ON THIS MODAL ALL ALONG AND WAS NEVER PASSED.
          `setConfirmOff(false)` runs AFTER the await inside `apply`, so between the click
          and the server's answer the dialog stayed open with a live, re-pressable
          "Yes, single admin can resolve" — a second press firing a second write of the
          compliance-relaxing direction. The kit already handles this: `loading` disables the
          confirm and shows its own in-flight state. Left mounted rather than closed early,
          deliberately — closing on click would hide the outcome of a control whose whole
          point is informed consent. */}
      <ConfirmModal
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        onConfirm={() => apply(false)}
        loading={pending}
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

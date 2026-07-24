"use client";

/**
 * Resolution-mode toggle — the operator's control over HOW a market's outcome is
 * sealed when its resolve timer fires:
 *
 *   OFF (default) · "Require human ceremony"  — the AI web-checks the market and
 *     pre-fills a recommendation; two officers seal + settle it (POCA §16).
 *   ON            · "Auto-resolve at resolve date" — the AI seals the outcome and
 *     hands it to the settle timer WITHOUT the ceremony, but ONLY when its
 *     confidence clears the threshold. A low-confidence or UNKNOWN read ALWAYS
 *     falls back to the human ceremony.
 *
 * Built from the UI kit only: <Toggle> + <ConfirmModal>. Turning auto ON is a
 * compliance-relevant change (it overrides the two-officer rule), so it is gated
 * behind a claret confirm that states the consequence, and is sterner still when
 * real money is LIVE. Turning it OFF is always safe → applies directly.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { setResolutionModeAction } from "./resolution-mode-action";

export function ResolutionModeToggle({
  mode,
  threshold,
  liveMoney,
}: {
  mode: "human" | "auto";
  threshold: number;
  liveMoney: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const isAuto = mode === "auto";

  const apply = (next: "human" | "auto") => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mode", next);
      const r = await setResolutionModeAction(fd);
      setConfirmOpen(false);
      if (!r.ok) {
        toast({ title: "Could not change resolution mode", description: r.error, variant: "danger" });
        return;
      }
      toast({
        title: next === "auto" ? "Auto-resolve ENABLED" : "Human ceremony restored",
        description: next === "auto"
          ? `Markets seal themselves at their resolve date when the AI is at least ${threshold}% confident. Anything less still goes to two officers.`
          : "Every market is sealed by the two-officer ceremony. The AI only pre-fills a recommendation.",
        variant: next === "auto" ? "warning" : "success",
      });
      router.refresh();
    });
  };

  const onToggle = () => {
    if (isAuto) { apply("human"); return; } // turning auto OFF is always safe
    setConfirmOpen(true);
  };

  return (
    <>
      <div
        className="inline-flex items-center gap-2.5 rounded-md border px-2.5 h-8"
        style={isAuto
          ? { borderColor: "var(--warning-border)", background: "var(--warning-bg)" }
          : { borderColor: "var(--border-strong)", background: "var(--bg-inset)" }}
        title={isAuto
          ? `Auto-resolve is ON — at its resolve date a market is sealed by the AI when it is at least ${threshold}% confident, with no two-officer ceremony. Below that it still goes to officers.`
          : "Human ceremony — the AI recommends, two officers seal and settle every market (POCA §16)."}
      >
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em]"
          style={{ color: isAuto ? "var(--warning-fg)" : "var(--text-subtle)" }}
        >
          {isAuto ? <I.bolt s={13} /> : <I.shieldcheck s={13} />}
          <span className="hidden sm:inline">{isAuto ? "Auto-resolve" : "Human ceremony"}</span>
          <span className="sm:hidden">{isAuto ? "Auto" : "Human"}</span>
        </span>
        <Toggle
          on={isAuto}
          disabled={pending}
          onClick={onToggle}
          aria-label={`Auto-resolve at resolve date: ${isAuto ? "on" : "off"}`}
        />
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => apply("auto")}
        tone="claret"
        eyebrow="Compliance · Uzingatiaji"
        title="Auto-resolve markets without the two-officer ceremony?"
        confirmLabel="Yes, enable auto-resolve"
        cancelLabel="Keep human ceremony"
        body={
          <>
            <p>
              With this ON, a market reaching its resolution date is sealed by the{" "}
              <strong>AI alone</strong> — no second officer, no countersignature — whenever the AI is
              at least <strong>{threshold}% confident</strong> the outcome is irreversibly locked. The
              money then pays automatically once the objection window closes.
            </p>
            <p className="mt-2">
              {/* {" "} is load-bearing: JSX strips whitespace that contains a newline,
                  so a line break right after </strong> renders "§16).The safeguards". */}
              <strong>This overrides the two-officer rule (POCA §16).</strong>{" "}
              The safeguards that
              remain: a low-confidence or UNKNOWN read always falls back to a human ceremony; the
              objection window, the objection freeze and the winner-floor still gate every payout;
              and every auto-resolution is written to the compliance audit trail with the AI&rsquo;s
              evidence.
            </p>
            {liveMoney && (
              <p className="mt-2 font-semibold" style={{ color: "var(--claret-300)" }}>
                ⚠ REAL MONEY IS LIVE on this deployment. Enabling this lets the platform pay real
                players on the AI&rsquo;s judgement alone.
              </p>
            )}
            <p className="text-text-subtle italic text-[12px] mt-2">
              Unaweza kuzima wakati wowote.
            </p>
          </>
        }
      />
    </>
  );
}

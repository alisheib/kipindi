"use client";

/**
 * StatusTimeline — vertical stepper: Submitted → Under review → Approved →
 * Live → Resolved. Done steps are success, the current step is brand, future steps are muted.
 * ⭐ ONE PROGRESS CONVENTION (R5-C, the second gold audit, 2026-10-09). It was gold up to the current step — a proposal's
 * progress is not money (DESIGN_AUTHORITY Q5), and "Approved" in gold is the exact slip §B11's first correction names
 * ("an approval is not money, it is permission"). It now reads as the KYC verification rail does: done in the app-state
 * success family (never the betting YES ink, §B2a), the current step and the fill that reaches it in the brand
 * family, the rest muted.
 */
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export function StatusTimeline({ current }: { current: number }) {
  const { t } = useT();

  const steps = [
    t.common.submitted,
    t.common.underReview,
    t.common.approved,
    t.common.live,
    t.market.statusResolved,
  ];

  return (
    <div className="flex flex-col">
      {steps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <span
                className="grid h-[22px] w-[22px] place-items-center rounded-full"
                style={{
                  background: done
                    ? "var(--success-bg)"
                    : now
                      ? "color-mix(in oklab, var(--brand-500) 18%, transparent)"
                      : "var(--bg-overlay)",
                  border: "1.5px solid " + (done ? "var(--success-border)" : now ? "var(--brand-500)" : "var(--border-strong)"),
                  color: done ? "var(--success-fg)" : now ? "var(--brand-300)" : "var(--text-subtle)",
                }}
              >
                {done && <I.check s={12} />}
                {now && <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--brand-400)" }} />}
              </span>
              {i < steps.length - 1 && (
                <span className="w-[2px] h-[26px]" style={{ background: done ? "color-mix(in oklab, var(--brand-500) 75%, transparent)" : "var(--border)" }} />
              )}
            </div>
            <div className="pt-px pb-3.5">
              <div className={`text-[13.5px] ${now ? "font-bold" : "font-semibold"} ${done || now ? "text-text" : "text-text-subtle"}`}>{label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

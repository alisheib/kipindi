"use client";

/**
 * StatusTimeline — vertical stepper: Submitted → Under review → Listed →
 * Resolved → Paid. Done/current steps use gold; future steps are muted.
 */
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export function StatusTimeline({ current }: { current: number }) {
  const { t } = useT();

  const steps = [
    t.common.submitted,
    t.common.underReview,
    t.proposals.filterListed,
    t.market.statusResolved,
    t.market.paidLabel,
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
                    ? "linear-gradient(180deg, var(--gold-400), var(--gold-600))"
                    : now
                      ? "color-mix(in oklab, var(--gold-500) 18%, transparent)"
                      : "var(--bg-overlay)",
                  border: "1.5px solid " + (done || now ? "var(--gold-600)" : "var(--border-strong)"),
                  color: done || now ? "var(--gold-fg, oklch(24% 0.06 85))" : "var(--text-subtle)",
                }}
              >
                {done && <I.check s={12} />}
                {now && <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--gold-400)" }} />}
              </span>
              {i < steps.length - 1 && (
                <span className="w-[2px] h-[26px]" style={{ background: done ? "var(--gold-600)" : "var(--border)" }} />
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

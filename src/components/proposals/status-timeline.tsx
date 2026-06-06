/**
 * StatusTimeline — vertical stepper: Submitted → Under review → Listed →
 * Resolved → Paid. Done/current steps use gold; future steps are muted.
 */
import { I } from "@/components/ui/glyphs";

const STEPS: Array<[string, string]> = [
  ["Submitted", "Imewasilishwa"],
  ["Under review", "Inakaguliwa"],
  ["Listed", "Imeorodheshwa"],
  ["Resolved", "Imetatuliwa"],
  ["Paid", "Imelipwa"],
];

export function StatusTimeline({ current }: { current: number }) {
  return (
    <div className="flex flex-col">
      {STEPS.map(([en, sw], i) => {
        const done = i < current;
        const now = i === current;
        return (
          <div key={en} className="flex items-start gap-3">
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
              {i < STEPS.length - 1 && (
                <span className="w-[2px] h-[26px]" style={{ background: done ? "var(--gold-600)" : "var(--border)" }} />
              )}
            </div>
            <div className="pt-px pb-3.5">
              <div className={`text-[13.5px] ${now ? "font-bold" : "font-semibold"} ${done || now ? "text-text" : "text-text-subtle"}`}>{en}</div>
              <div className="font-display italic text-text-subtle text-[11px]">{sw}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

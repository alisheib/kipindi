/**
 * PageRibbon — a thin kit-faithful stat strip sits below a page's
 * eyebrow + h1. Gives a page its own glance-able identity so lists
 * don't all start with the same header shape.
 *
 * ⚠️ ONE CONSUMER, corrected 2026-08-21: `src/app/leaderboard/page.tsx`.
 * This comment claimed three ("/markets, /live, /leaderboard") and neither
 * of the other two has ever imported it — verified by grepping `PageRibbon`
 * across `src/`. A doc comment naming phantom consumers is how a component
 * gets treated as load-bearing and left un-refactored, and it is the same
 * defect class as a doc citing a deleted file.
 *
 * Stats render as a horizontal row of slim "pill" capsules, mono
 * numerals, gilt accents on the most important number. Wraps on
 * narrow viewports.
 */

import { cn } from "@/lib/utils";

export type RibbonStat = {
  label: string;
  sw?: string;
  value: string;
  accent?: "gold" | "yes" | "no" | "default";
};

export function PageRibbon({
  stats,
  className,
}: {
  stats: RibbonStat[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-elevated/60 px-4 py-3",
        "flex flex-wrap items-baseline gap-x-6 gap-y-2",
        className,
      )}
    >
      {stats.map((s, i) => (
        <div key={i} className="flex items-baseline gap-2 min-w-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle whitespace-nowrap">
              {s.label}
            </p>
            {s.sw && (
              <p className="text-micro italic text-text-subtle whitespace-nowrap leading-none">
                {s.sw}
              </p>
            )}
          </div>
          <p
            className={cn(
              "font-mono text-body-lg font-bold tabular-nums whitespace-nowrap leading-none",
              s.accent === "gold" && "text-gold-300",
              s.accent === "yes" && "text-yes-300",
              s.accent === "no" && "text-no-300",
              (!s.accent || s.accent === "default") && "text-text",
            )}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

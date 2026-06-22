"use client";

import { useState } from "react";
import { ProbabilityChart, type ProbPoint } from "./probability-chart";
import { I } from "@/components/ui/glyphs";

export function ChartToggle({
  series,
  ranges,
  defaultRange,
  height = 240,
}: {
  series: Record<string, ProbPoint[]>;
  ranges: string[];
  defaultRange?: string;
  height?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg glass-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
          <I.chart s={11} />
          Probability over time
        </span>
        <I.chevronDown
          s={14}
          className={[
            "text-text-muted shrink-0 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 w-full overflow-hidden border-t border-border/40">
          <div className="pt-3">
            <ProbabilityChart
              series={series}
              ranges={ranges}
              defaultRange={defaultRange}
              height={height}
            />
          </div>
        </div>
      )}
    </section>
  );
}

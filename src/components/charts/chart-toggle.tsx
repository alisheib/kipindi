"use client";

import { useEffect, useState } from "react";
import { ProbabilityChart, type ProbPoint } from "./probability-chart";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * ChartToggle — the market detail page's probability chart, collapsible.
 *
 * ⭐ OPEN BY DEFAULT since CHART-SPRINT C (2026-09-04). The June ruling that
 * collapsed it (751f86bb: "betting intent stays above the fold") predates the
 * current two-column layout, where the bet aside is `order-1` on mobile —
 * ABOVE this entire column — and this section is the column's LAST item, so
 * expanding it displaces no money control at any width. A licensed betting
 * product's signature price history hidden behind an unlabelled chevron was
 * the fold rule outliving the fold.
 *
 * The player's own collapse still wins: the choice persists per device
 * (localStorage, same contract as the board's `kp-updown-viz` — try/catch'd,
 * SSR renders the default and a stored "closed" applies on mount).
 */
const STORE_KEY = "kp-market-chart";

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
  const [open, setOpen] = useState(true);
  const { t } = useT();

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORE_KEY) === "closed") setOpen(false);
    } catch { /* blocked storage → open stands */ }
  }, []);

  const toggle = () => {
    setOpen((v) => {
      try { window.localStorage.setItem(STORE_KEY, v ? "closed" : "open"); } catch { /* per-device nicety */ }
      return !v;
    });
  };

  return (
    <section className="glass-panel overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 font-mono text-micro uppercase eyebrow text-text-subtle">
          <I.chart s={11} />
          {t.market.probOverTime}
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
              hideTitle
            />
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { MarketCurve, type CurvePoint } from "./market-curve";
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
 * ⭐ THE BODY IS THE ENGINE CURVE since CHART-SPRINT-2 final (Ali: polls take
 * "the TradingView curve, not candlestick — more professional"): `MarketCurve`
 * replaced the hand-rolled `ProbabilityChart` svg (deleted; git history holds
 * it), keeping its exact grammar — gilt 50 tipping line, emerald-above /
 * rose-below half-planes, the same range rail vocabulary.
 *
 * The player's collapse persists per device (localStorage, the
 * `kp-updown-viz` contract — try/catch'd, SSR renders the default).
 */
const STORE_KEY = "kp-market-chart";
/** D87 · one id for the section name, so `aria-labelledby` and the `<h2>` cannot drift apart. */
const HEADING_ID = "prob-chart-heading";

export function ChartToggle({
  series,
  ranges,
  defaultRange,
  height = 240,
}: {
  series: Record<string, CurvePoint[]>;
  ranges: string[];
  defaultRange?: string;
  height?: number;
}) {
  const [open, setOpen] = useState(true);
  const { t, locale } = useT();

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
    /* 🔴 D87 · THE PAGE'S SIGNATURE VISUALISATION WAS ABSENT FROM ITS OWN HEADING OUTLINE.
       D40 repaired the detail page's outline — h1 title, h2 bet panel, h2 positions, h2 criterion,
       h2 similar, h2 discussion — and this section was in none of it: an unnamed `<section>` whose
       only label was a `<span>` inside the toggle button. A player navigating by heading or by
       landmark could not reach the chart, and a guard that checks heading LEVELS cannot see a
       heading that is MISSING, which is why it survived D40.
       ⛔ NO NEW COPY. The heading reuses `market.probOverTime` — the exact string the button
       already shows ("YES probability over time" / "Uwezekano wa NDIYO kwa muda" / the zh
       equivalent) — because `src/lib/i18n*` belongs to another session today and, more to the
       point, a section should be named by the words already on it.
       ⭐ The `<h2>` wraps the span the button already rendered, so the accessible name of the
       button is unchanged and NOTHING moves: Tailwind preflight resets h1-h6 size, weight and
       margin to inherit (globals.css:22), which is the same reason D40's four promoted headings
       were pixel-identical. */
    <section className="glass-panel overflow-hidden" aria-labelledby={HEADING_ID}>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <h2 id={HEADING_ID} className="flex items-center gap-1.5 font-mono text-micro uppercase eyebrow text-text-subtle">
          <I.chart s={11} />
          {t.market.probOverTime}
        </h2>
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
            <MarketCurve
              series={series}
              ranges={ranges}
              defaultRange={defaultRange}
              height={height}
              locale={locale}
              labels={{ rangeAria: t.market.timeRange, chartAria: t.market.probOverTime }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

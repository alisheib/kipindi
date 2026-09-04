"use client";

/**
 * BoardViz — the Up & Down board's cubes ↔ chart switch (CHART-SPRINT B).
 *
 * CUBES (the outcome heartbeat) is the default; CHART is the current round's
 * live price action. Both bodies arrive server-rendered as props — this
 * component only decides which one is on screen, so switching costs no fetch
 * and the 20s board poller keeps refreshing whichever is visible.
 *
 * The rail reuses `.pchart-ranges` / `.pchart-range` — the chart system's one
 * pressed-buttons vocabulary (probability-chart A5 ruling: `aria-pressed`
 * buttons, never a tab widget in name only), which also inherits that rail's
 * certified contrast and expanded hit-area.
 *
 * The choice persists per device in localStorage (`kp-updown-viz`) — a viewer
 * convenience, not shared state. Reads/writes are try/catch'd: a blocked
 * storage renders the default and the toggle still works for the session.
 * ⚠️ The server always renders CUBES first; a stored "chart" applies on mount.
 * That hydration-length settle (first paint → hydration, NOT one frame — a
 * stored-chart player sees the strip repaint as the chart, a ~170px shift on
 * the low-end handsets this product targets) is the honest cost of not leaking
 * per-device state into SSR — and with no stored choice there is no flip at
 * all. If players report the shift, the dependency-free fix is a tiny inline
 * pre-hydration script stamping a data-attribute the first paint honours.
 *
 * When only one body exists (no live round → no chart; no outcomes yet → no
 * cubes) the rail is not rendered — a toggle with one destination is
 * decoration wearing an affordance.
 */
import { useEffect, useState } from "react";

const STORE_KEY = "kp-updown-viz";
type Mode = "cubes" | "chart";

export function BoardViz({
  cubes,
  chart,
  labels,
}: {
  cubes: React.ReactNode | null;
  chart: React.ReactNode | null;
  labels: { aria: string; cubes: string; chart: string; cubesEyebrow: string; chartEyebrow: string };
}) {
  const [mode, setMode] = useState<Mode>("cubes");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORE_KEY);
      if (stored === "chart" || stored === "cubes") setMode(stored);
    } catch { /* blocked storage → default stands */ }
  }, []);

  const pick = (m: Mode) => {
    setMode(m);
    try { window.localStorage.setItem(STORE_KEY, m); } catch { /* per-device nicety only */ }
  };

  if (!cubes && !chart) return null;
  const both = !!cubes && !!chart;
  const showChart = both ? mode === "chart" : !!chart;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-micro font-semibold uppercase eyebrow text-text-faint">
          {showChart ? labels.chartEyebrow : labels.cubesEyebrow}
        </span>
        {both && (
          <div className="pchart-ranges" role="group" aria-label={labels.aria}>
            <button type="button" aria-pressed={!showChart} className={"pchart-range" + (!showChart ? " is-active" : "")} onClick={() => pick("cubes")}>
              {labels.cubes}
            </button>
            <button type="button" aria-pressed={showChart} className={"pchart-range" + (showChart ? " is-active" : "")} onClick={() => pick("chart")}>
              {labels.chart}
            </button>
          </div>
        )}
      </div>
      <div className="mt-2">
        {/* CUBES stay mounted (cheap SSR strip, instant switch-back). The CHART
            body mounts ONLY while selected: keeping it hidden-mounted made every
            cubes-mode player load the terminal's library chunk and poll its feed
            for a pane nobody could see (review F1). The chart's own state (range
            choice) survives unmount in localStorage. `hidden` keeps the strip
            honest for readers (display:none subtrees are skipped by AT). */}
        {cubes && <div hidden={showChart}>{cubes}</div>}
        {chart && showChart && <div>{chart}</div>}
      </div>
    </div>
  );
}

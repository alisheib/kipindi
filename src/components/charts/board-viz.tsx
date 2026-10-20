"use client";

/** U43 B3: the recent rounds stay in view. The price chart opens below them on a
 * phone and beside the current card on a computer. A saved choice wins; otherwise
 * computers start open and smaller screens start closed. */
import { useEffect, useState } from "react";
import { I } from "@/components/ui/glyphs";

const STORE_KEY = "kp-updown-chart-open";

export function BoardViz({
  cubes,
  chart,
  labels,
}: {
  cubes: React.ReactNode | null;
  chart: React.ReactNode | null;
  labels: { chart: string; cubesEyebrow: string };
}) {
  // Storage and viewport are client facts. While they are unresolved, reserve
  // the desktop chart's CSS height so its usual open state does not push the
  // recent rounds or the page below after hydration. Phones stay collapsed.
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORE_KEY);
      if (stored === "open" || stored === "closed") {
        setOpen((current) => current ?? (stored === "open"));
      } else {
        setOpen((current) => current ?? window.matchMedia("(min-width: 1024px)").matches);
      }
    } catch {
      setOpen((current) => current ?? window.matchMedia("(min-width: 1024px)").matches);
    }
  }, []);

  const toggle = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      try { window.localStorage.setItem(STORE_KEY, next ? "open" : "closed"); }
      catch { /* storage is an optional convenience */ }
      return next;
    });
  };

  if (!cubes && !chart) return null;
  return (
    <div className="ud-board-viz" data-viz-state={open === null ? "pending" : open ? "open" : "closed"}>
      {cubes && (
        <section className="ud-board-cubes">
          <h2 className="font-mono text-micro font-semibold uppercase eyebrow text-text-subtle">{labels.cubesEyebrow}</h2>
          <div className="mt-2">{cubes}</div>
        </section>
      )}
      {chart && (
        <section className="ud-board-chart">
          <button type="button" className="ud-chart-trigger" aria-expanded={open === true} onClick={toggle}>
            <I.chart s={16} />
            <span>{labels.chart}</span>
            <I.chevronDown s={14} edge="end" />
          </button>
          {open === null ? (
            <div className="ud-chart-slot hidden rounded-lg bg-bg-elevated kp-shimmer-track lg:block" aria-hidden="true" />
          ) : (
            <div className="ud-chart-slot" hidden={!open}>
              {open ? chart : null}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

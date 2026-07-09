"use client";

/**
 * C2a — the home animated stats band. Two mono counters bound to REAL platform
 * aggregates (markets settled · TZS paid out) that count up from 0 when the band
 * scrolls into view, with the kit gilt `value-flash` on settle. Never fabricated
 * — the values are passed straight from server aggregates. Reduced-motion: the
 * final values render immediately, no count-up, no flash.
 */
import { useEffect, useRef, useState } from "react";
import { I } from "@/components/ui/glyphs";
import { motionReduced } from "@/lib/haptics";
import { formatTzsCompact } from "@/lib/utils";

function useCountUp(target: number, run: boolean, ms = 1100) {
  const [v, setV] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!run || done.current) return;
    done.current = true;
    if (motionReduced()) { setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else setV(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  return v;
}

export function StatsBand({
  settled,
  paidOut,
  settledLabel,
  paidOutLabel,
}: {
  settled: number;
  paidOut: number;
  settledLabel: string;
  paidOutLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If IntersectionObserver is unavailable, just show the final values.
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) { setInView(true); obs.disconnect(); }
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const s = useCountUp(settled, inView);
  const p = useCountUp(paidOut, inView);

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-xl border border-border bg-bg-elevated/60"
    >
      <Stat glyph={<I.resolved s={16} />} value={Math.round(s).toLocaleString("en-US")} label={settledLabel} settled={inView} />
      <Stat glyph={<I.wallet s={16} />} value={formatTzsCompact(p)} label={paidOutLabel} settled={inView} />
    </div>
  );
}

function Stat({ glyph, value, label, settled }: { glyph: React.ReactNode; value: string; label: string; settled: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-6 lg:py-8 text-center">
      <span className="text-aqua-300">{glyph}</span>
      <span className={`font-display text-[26px] lg:text-[34px] font-bold tabular-nums leading-none text-text ${settled ? "value-flash" : ""}`}>
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{label}</span>
    </div>
  );
}

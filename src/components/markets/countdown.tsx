/** Countdown timer — kit/microstructure.jsx Countdown port. */
"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

function diff(toIso: string, offset: number) {
  const ms = Math.max(0, Date.parse(toIso) - (Date.now() + offset));
  const d = Math.floor(ms / (24 * 3600_000));
  const h = Math.floor((ms / 3600_000) % 24);
  const m = Math.floor((ms / 60_000) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return { d, h, m, s };
}

/**
 * B-10 — two defects lived here:
 *  · the first paint was hard-zeros ("00 00 00 00") until hydration — on a 2G
 *    hydration lag the player stared at a dead clock on a live market;
 *  · every tick ran on the raw device clock, so a phone a few minutes off
 *    showed a live market as closed (or the reverse).
 * Now the TRUE remainder renders on the server (server clock — authoritative),
 * the client's first paint recomputes it synchronously, and ticks are corrected
 * by a once-captured offset against the server's own `serverNow` stamp.
 * suppressHydrationWarning stays on every cell: SSR and hydration are moments
 * apart by construction, and a minute/hour boundary can legally flip any cell
 * between the two paints.
 */
export function Countdown({ to, label, serverNow }: { to: string; label?: string; serverNow?: number }) {
  const { t } = useT();
  const resolvedLabel = label ?? t.common.closesIn;
  // Captured ONCE (server render: offset ≈ 0 against its own clock; client
  // hydration: the device-vs-server skew). Recomputing per render would let the
  // offset decay as Date.now() advances past the fixed serverNow stamp.
  const [offset] = useState(() => (serverNow != null ? serverNow - Date.now() : 0));
  const [time, set] = useState(() => diff(to, offset));
  useEffect(() => {
    set(diff(to, offset));
    const id = setInterval(() => set(diff(to, offset)), 1000);
    return () => clearInterval(id);
  }, [to, offset]);

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-warning-fg mb-2">{resolvedLabel}</div>
      <div className="flex gap-2">
        <Cell v={time.d} unit={t.common.days} />
        <Cell v={time.h} unit={t.common.hours} />
        <Cell v={time.m} unit={t.common.minsUnit} />
        <Cell v={time.s} unit={t.common.secsUnit} />
      </div>
    </div>
  );
}

function Cell({ v, unit }: { v: number; unit: string }) {
  return (
    <div className="flex flex-col items-center min-w-[56px]">
      <div
        className="font-mono font-bold text-[28px] tabular-nums leading-none rounded-md border border-border bg-bg-elevated px-3 py-2.5 min-w-[48px] text-center text-text"
        style={{ letterSpacing: "-0.04em" }}
        // SSR and hydration are moments apart; the seconds cell (and, at a
        // boundary, any cell) legally differs between the two paints. This is
        // the React-blessed escape for exactly that.
        suppressHydrationWarning
      >
        {String(v).padStart(2, "0")}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mt-1.5">{unit}</div>
    </div>
  );
}

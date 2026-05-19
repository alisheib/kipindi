/** Countdown timer — kit/microstructure.jsx Countdown port. */
"use client";

import { useEffect, useState } from "react";

function diff(toIso: string) {
  const ms = Math.max(0, Date.parse(toIso) - Date.now());
  const d = Math.floor(ms / (24 * 3600_000));
  const h = Math.floor((ms / 3600_000) % 24);
  const m = Math.floor((ms / 60_000) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return { d, h, m, s };
}

// Render-once-on-server placeholder. The actual remaining time
// depends on Date.now() which differs between server SSR and client
// hydration (by 100 ms – 2 s typically), producing a hydration
// mismatch on the seconds cell. We deliberately render zeros until
// the first client effect runs, then snap to the live value. This
// trades a single sub-frame flash for a clean console + no React
// "regenerated on the client" warning.
const PLACEHOLDER = { d: 0, h: 0, m: 0, s: 0 };

export function Countdown({ to, label = "Closes in" }: { to: string; label?: string }) {
  const [time, set] = useState(PLACEHOLDER);
  useEffect(() => {
    // First tick fires synchronously so the placeholder is replaced
    // immediately on hydration — the flash is invisible to a player.
    set(diff(to));
    const id = setInterval(() => set(diff(to)), 1000);
    return () => clearInterval(id);
  }, [to]);

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-warning-fg mb-2">{label}</div>
      <div className="flex gap-2">
        <Cell v={time.d} unit="Days" />
        <Cell v={time.h} unit="Hours" />
        <Cell v={time.m} unit="Min" />
        <Cell v={time.s} unit="Sec" />
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
        // The number flips on every client tick. suppressHydrationWarning
        // is the React-blessed escape for time-sensitive text that we
        // know will diverge between server SSR and the first client
        // commit — paired with the PLACEHOLDER above it eliminates the
        // mismatch warning entirely.
        suppressHydrationWarning
      >
        {String(v).padStart(2, "0")}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mt-1.5">{unit}</div>
    </div>
  );
}

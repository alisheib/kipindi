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

export function Countdown({ to, label = "Closes in" }: { to: string; label?: string }) {
  const [{ d, h, m, s }, set] = useState(() => diff(to));
  useEffect(() => {
    const id = setInterval(() => set(diff(to)), 1000);
    return () => clearInterval(id);
  }, [to]);

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-warning-fg mb-2">{label}</div>
      <div className="flex gap-2">
        <Cell v={d} unit="Days" />
        <Cell v={h} unit="Hours" />
        <Cell v={m} unit="Min" />
        <Cell v={s} unit="Sec" />
      </div>
    </div>
  );
}

function Cell({ v, unit }: { v: number; unit: string }) {
  return (
    <div className="flex flex-col items-center min-w-[56px]">
      <div className="font-mono font-bold text-[28px] tabular-nums leading-none rounded-md border border-border bg-bg-elevated px-3 py-2.5 min-w-[48px] text-center text-text" style={{ letterSpacing: "-0.04em" }}>
        {String(v).padStart(2, "0")}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mt-1.5">{unit}</div>
    </div>
  );
}

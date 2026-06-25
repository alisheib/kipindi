"use client";

/**
 * CountdownPill — small mono-numeric countdown for rate-limit / cool-off
 * messaging. Adapted from kit/microstructure.jsx Countdown but in a
 * single inline pill (the kit's d/h/m/s grid is overkill for "try
 * again in 90s").
 *
 *   <CountdownPill seconds={90} suffix="· Subiri" />
 */

import * as React from "react";

export function CountdownPill({
  seconds,
  prefix,
  suffix,
  onExpire,
}: { seconds: number; prefix?: string; suffix?: string; onExpire?: () => void }) {
  const [left, setLeft] = React.useState(Math.max(0, Math.floor(seconds)));
  const expiredRef = React.useRef(false);
  React.useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [left]);
  React.useEffect(() => {
    if (left <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [left, onExpire]);
  if (left <= 0) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
        Ready · Tayari
      </span>
    );
  }
  const m = Math.floor(left / 60);
  const s = left % 60;
  const display = m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums">
      {prefix && <span className="text-text-subtle">{prefix}</span>}
      <span className="font-bold text-warning-fg">{display}</span>
      {suffix && <span className="text-text-subtle">{suffix}</span>}
    </span>
  );
}

"use client";

/**
 * CountdownPill — small mono-numeric countdown for rate-limit / cool-off
 * messaging. Adapted from kit/microstructure.jsx Countdown but in a
 * single inline pill (the kit's d/h/m/s grid is overkill for "try
 * again in 90s").
 *
 *   <CountdownPill seconds={90} suffix="· Subiri" />
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 A5 (2026-08-21) — THE TICKING NUMBER IS NOT ANNOUNCED. IT USED TO BE, EVERY SECOND.
 *
 * The digits carried `aria-live="polite"` and changed once a second, so a screen reader
 * read the countdown out loud sixty times a minute. Worse where it actually ships: on
 * `/auth/otp` the pill sits INSIDE a `role="alert"` container, and an alert is an
 * ASSERTIVE live region — so a locked-out player was interrupted every single second, with
 * the whole error sentence re-read around the number, for the full ninety seconds they were
 * being asked to wait. A countdown a person cannot act on is the last thing that should be
 * allowed to interrupt them.
 *
 * ⭐ SO THE DIGITS ARE `aria-hidden` AND THE ANNOUNCEMENT IS SPARSE — start, 30s, 10s, ready.
 * `aria-hidden` on the visual span also removes it from the enclosing alert's announcement,
 * which is why the OTP case is fixed here rather than at the call site.
 *
 * ⚠️ ONE PERSISTENT LIVE REGION, mounted empty. A live region that arrives with its text
 * already in it is frequently not announced at all (the AT has no CHANGE to observe) — which
 * is exactly what the old "Ready" branch did: it swapped in a whole new `aria-live` span at
 * zero. The region below is present from the first render, empty, and only ever updated.
 *
 * ⛔ NO NEW STRINGS, DELIBERATELY (A5 trilingual). The announcement is the same text a
 * sighted reader sees — the caller's own already-translated `prefix`/`suffix` around the
 * numerals — so there is nothing here that can ship in one language and not the other two.
 */

import * as React from "react";
import { useT } from "@/lib/i18n";

export function CountdownPill({
  seconds,
  prefix,
  suffix,
  onExpire,
}: { seconds: number; prefix?: string; suffix?: string; onExpire?: () => void }) {
  const { t } = useT();
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

  const m = Math.floor(left / 60);
  const s = left % 60;
  const display = m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;

  /**
   * The four moments worth an interruption. `startRef` is captured on the first render so a
   * cool-off shorter than the milestones still announces itself once, at whatever it is —
   * a 12-second wait must not go silent just because it never passes 30.
   */
  const startRef = React.useRef(left);
  const [announce, setAnnounce] = React.useState("");
  React.useEffect(() => {
    if (left !== startRef.current && left !== 30 && left !== 10 && left !== 0) return;
    setAnnounce(
      left <= 0
        ? t.common.ready
        : [prefix, display, suffix].filter(Boolean).join(" "),
    );
  }, [left, display, prefix, suffix, t]);

  return (
    <span className="inline-flex items-center gap-1">
      {left <= 0 ? (
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted" aria-hidden>
          {t.common.ready}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums" aria-hidden>
          {prefix && <span className="text-text-subtle">{prefix}</span>}
          <span className="font-bold text-warning-fg">{display}</span>
          {suffix && <span className="text-text-subtle">{suffix}</span>}
        </span>
      )}
      {/* Present and empty from the first render — see the header for why that matters. */}
      <span className="sr-only" aria-live="polite">{announce}</span>
    </span>
  );
}

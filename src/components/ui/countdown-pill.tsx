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
  /**
   * ⚡ ONE INTERVAL FOR THE WHOLE COUNTDOWN — 2026-08-21.
   *
   * This effect used to depend on `left`, which changes every second. So every single
   * tick tore the interval down and built a new one: on a 90-second cool-off that is 90
   * `clearInterval` + 90 `setInterval` calls, plus 90 effect cleanups, to do the work of
   * one timer. It also meant the clock re-based itself on each React commit, so the
   * countdown accumulated one commit's latency of drift per second.
   *
   * The dependency is now `running`, which flips true → false EXACTLY ONCE, at zero. The
   * interval is therefore created once and cleared once, and it ticks on a fixed 1000 ms
   * cadence instead of a re-based one. The displayed number and the moment `onExpire`
   * fires are unchanged — this is the same countdown, costing one timer instead of N.
   *
   * ⛔ DO NOT PUT `left` BACK IN THE DEPENDENCY ARRAY. The updater form
   * `setLeft((v) => …)` is what makes that unnecessary: it reads the freshest value from
   * React rather than closing over a stale one, so the effect never needs to re-subscribe.
   *
   * ⚠️ NO VISIBILITY GATE, DELIBERATELY. Pausing on `document.hidden` looks like a free
   * win and is not: the only correct way to resume a COOL-OFF is to re-derive it from a
   * wall-clock deadline, and that changes the second at which a locked-out player is told
   * they may retry — a compliance-adjacent decision, not a performance one. It would also
   * buy almost nothing here: both call sites (`/auth/otp` and `rate-limit-banner`) are
   * foreground auth screens the player is sitting and watching, and the pill unmounts
   * when the wait ends.
   */
  const running = left > 0;
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
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

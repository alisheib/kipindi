"use client";

/**
 * OtpExpiryCountdown — live countdown showing how much time the player
 * has left before their OTP expires. Includes a slim progress bar that
 * drains from full to empty over the TTL window.
 *
 * ⛔ THE BAR DRAINS BY TRANSFORM, NEVER BY WIDTH. It re-renders every second for
 * up to five minutes; a width transition made that a five-minute layout loop on
 * the sign-in path. See the note at the fill.
 */

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

const OTP_TTL_SEC = 5 * 60; // 5 minutes

/**
 * B-27 — anchored, not invented. `initialRemainingSec` is computed SERVER-SIDE
 * from the code's real `expiresAt` (threaded through the redirect as `?exp=`),
 * so a reload or a failed verify resumes the true remainder instead of
 * restarting a fabricated 5:00 progress bar. Falls back to the full TTL when
 * the param is absent (legacy links).
 */
export function OtpExpiryCountdown({ initialRemainingSec }: { initialRemainingSec?: number }) {
  const { t } = useT();
  const [remaining, setRemaining] = useState(
    Math.max(0, Math.min(OTP_TTL_SEC, Math.floor(initialRemainingSec ?? OTP_TTL_SEC))),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const expired = remaining <= 0;
  const warning = remaining <= 60;
  const pct = (remaining / OTP_TTL_SEC) * 100;

  const barColor = expired
    ? "var(--no-500)"
    : warning
      ? "var(--gold-400)"
      : "var(--brand-400)";

  return (
    <div className="mt-1.5 space-y-1">
      {/* Progress bar */}
      <div
        className="h-[3px] w-full rounded-full overflow-hidden"
        style={{ background: "var(--bg-inset)" }}
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={OTP_TTL_SEC}
        aria-label={t.auth.codeExpiresIn}
      >
        {/* 🔴 THE FILL IS SCALED, NOT WIDENED — and on this surface that is not a
            micro-optimisation. The interval above re-renders once a SECOND for the
            whole 5-minute TTL, and the bar used to carry `transition-[width]
            duration-1000`: every tick started a fresh one-second animation of a
            LAYOUT property, so the sign-in page ran continuous layout + paint for
            five minutes on the one screen a player reaches on a cold, cheap phone.
            `transform: scaleX()` produces the identical drain on the compositor —
            no layout, no reflow of the hint line below it.
            The in-repo model is `.admin-bar-grow` (state-tokens.css): full width,
            `transform-origin: left`, scale the fill.
            ⚠️ scaleX squashes the element's own corner radius horizontally, so the
            cap is stated honestly: the TRACK is `rounded-full overflow-hidden`, so
            both visible OUTER ends keep their true shape; only the moving right
            edge is affected, and on a 3px bar that radius is 1.5px — the squash is
            sub-pixel and there is no child to counter-scale (no label, no cap art).
            §M6 · all three gates hold WITHOUT a new branch, and that is a property
            of the swap rather than an omission: this is a TRANSITION, and the
            universal clamp in motion.css already zeroes `transition-duration` for
            the OS query, `html.kp-reduce-motion` and `[data-motion="minimal"]`
            alike — it did so for the width transition and does so for this one. The
            third gate (`[data-motion="reduced"]`) is a THROTTLE whose list in
            globals.css §6 governs `infinite` animations; a one-shot transition has
            nothing to list there. With motion off the bar simply jumps each second,
            which is the truthful end frame. */}
        <div
          className="h-full w-full origin-left rounded-full transition-transform duration-1000 ease-linear"
          style={{ transform: `scaleX(${pct / 100})`, background: barColor }}
        />
      </div>
      <p id="otp-hint" aria-live="polite" className={`text-[11px] tabular-nums ${expired ? "text-no-300 font-semibold" : warning ? "text-warning-fg" : "text-text-subtle"}`}>
        {expired ? (
          t.auth.codeExpired
        ) : (
          <>
            {t.auth.codeExpiresIn}{" "}
            <span className="font-mono font-semibold">{min}:{sec.toString().padStart(2, "0")}</span>
          </>
        )}
      </p>
    </div>
  );
}

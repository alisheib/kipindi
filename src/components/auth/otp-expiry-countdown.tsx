"use client";

/**
 * OtpExpiryCountdown — live countdown showing how much time the player
 * has left before their OTP expires. Includes a slim progress bar that
 * drains from full to empty over the TTL window.
 */

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

const OTP_TTL_SEC = 5 * 60; // 5 minutes

export function OtpExpiryCountdown() {
  const { t } = useT();
  const [remaining, setRemaining] = useState(OTP_TTL_SEC);

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
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%`, background: barColor }}
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

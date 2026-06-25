"use client";

/**
 * OtpExpiryCountdown — live countdown showing how much time the player
 * has left before their OTP expires. Replaces the static "Code valid
 * for 5 minutes" text with a ticking clock so the player knows when
 * to request a new code.
 */

import { useEffect, useState } from "react";

const OTP_TTL_SEC = 5 * 60; // 5 minutes

export function OtpExpiryCountdown() {
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

  return (
    <p id="otp-hint" className={`mt-1.5 text-[11px] tabular-nums ${expired ? "text-no-300 font-semibold" : warning ? "text-warning-fg" : "text-text-subtle"}`}>
      {expired ? (
        <>Code expired — request a new one. <span className="italic">Msimbo umeisha muda.</span></>
      ) : (
        <>
          Code expires in{" "}
          <span className="font-mono font-semibold">{min}:{sec.toString().padStart(2, "0")}</span>
          {" · "}
          <span className="italic">Msimbo unakwisha {min > 0 ? `dakika ${min}` : `sekunde ${sec}`}.</span>
        </>
      )}
    </p>
  );
}

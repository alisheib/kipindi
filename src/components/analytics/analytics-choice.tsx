"use client";

/**
 * AnalyticsChoice — the "change your mind at any time" control Privacy §3 and §7 promise.
 *
 * It states the current choice for THIS browser and offers the one action that changes it. Turning analytics off
 * takes effect at once: `GoogleTag` sets Google's disable switch and deletes the `_ga` cookies on the next render,
 * and its transport guard drops anything gtag.js had queued.
 *
 * ⛔ NOTHING IS STATED BEFORE HYDRATION. The server cannot read the browser's choice, so a server-rendered sentence
 * would say "you haven't chosen" to a visitor who has — a false statement on a legal page, however brief (a drive
 * caught it being read before hydration). The line and the button wait for mount; `data-state` says when they are real.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { setConsent, useAnalyticsConsent } from "@/lib/analytics-consent";

export function AnalyticsChoice() {
  const { t } = useT();
  const consent = useAnalyticsConsent();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const on = consent === "granted";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3" data-testid="analytics-choice" data-state={mounted ? consent : "pending"}>
      <p className="min-w-0 text-body-sm text-text" aria-live="polite">
        {!mounted ? " " : consent === "granted" ? t.common.consentChoiceOn : consent === "denied" ? t.common.consentChoiceOff : t.common.consentChoiceUnset}
      </p>
      <Button type="button" variant="ghost" size="sm" disabled={!mounted} onClick={() => setConsent(on ? "denied" : "granted")} data-testid="analytics-choice-toggle">
        {on ? t.common.consentTurnOff : t.common.consentTurnOn}
      </Button>
    </div>
  );
}

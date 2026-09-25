"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { useT } from "@/lib/i18n";
import { stopMarketingAction, resumeMarketingAction } from "./actions";

/**
 * U8's interactive half — four of the unit's six states live here (`valid`, `already
 * suppressed`, `resubscribed`, `error`); `loading` is `loading.tsx` and `invalid token` never
 * reaches this component at all, because the page renders the refusal instead.
 *
 * ⛔ ONE CLICK. THERE IS NO CONFIRMATION STEP, AND THERE IS NO STATE THAT COULD HOLD ONE.
 * "Are you sure?" is a step a person on a slow connection abandons, and everybody who abandons
 * it stays marketable while believing they opted out — a false success produced by good
 * intentions. The law's question is whether they asked to stop, and they asked by tapping.
 * `test:marketing-optout` plants a confirmation step and requires the suite to go red.
 *
 * ⭐ AND THE SECOND BUTTON IS NEVER A CONDITION OF THE FIRST (OD43). "Start them again" is
 * offered AFTER a stop and to a number already suppressed. It is never something somebody has
 * to pass through on the way out.
 *
 * ⛔ THE SUCCESS SENTENCE IS RENDERED FROM THE SERVER'S ANSWER, NEVER FROM THE CLICK. `state`
 * is set from the action's result and only when it says `ok` — an optimistic "done" painted on
 * submit is the same false success wearing a different hat, and it is exactly what a throttled
 * or failed write would produce.
 */
export function OptOutClient({ token, suppressed }: { token: string; suppressed: boolean }) {
  const { t } = useT();
  const [state, setState] = useState<"idle" | "stopped" | "already" | "resumed" | "error">(
    suppressed ? "already" : "idle",
  );
  const [pending, start] = useTransition();

  const run = (fn: (tok: string) => Promise<{ ok: true; state: "stopped" | "already" | "resumed" } | { ok: false; reason: string }>) =>
    start(async () => {
      const r = await fn(token);
      setState(r.ok ? r.state : "error");
    });

  // The number is being refused right now — either it already was when the page loaded, or the
  // tap just made it so. Both offer the way back, and only the way back.
  const stoppedNow = state === "stopped" || state === "already";

  return (
    <div className="space-y-3">
      {state === "stopped" && <Callout tone="success">{t.optout.done}</Callout>}
      {state === "already" && <Callout tone="info">{t.optout.already}</Callout>}
      {state === "resumed" && <Callout tone="success">{t.optout.resubscribed}</Callout>}
      {state === "error" && <Callout tone="danger">{t.optout.error}</Callout>}

      {/* ⭐ EXACTLY ONE ACTION IS ON SCREEN AT A TIME, and it is the one that matches what is
          true of this number right now. Two opposite buttons side by side is a tap that lands
          on the wrong one — on a page whose entire job is a single unambiguous tap. After a
          resubscribe the button becomes "stop" again, so the way out is never more than one
          tap away from wherever the person has got to. */}
      {stoppedNow ? (
        <Button variant="ghost" size="lg" fullWidth loading={pending} onClick={() => run(resumeMarketingAction)}>
          {t.optout.resubscribeButton}
        </Button>
      ) : (
        <Button variant="primary" size="lg" fullWidth loading={pending} onClick={() => run(stopMarketingAction)}>
          {t.optout.stopButton}
        </Button>
      )}
    </div>
  );
}

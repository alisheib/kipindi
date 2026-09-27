"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
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
 *
 * ⭐ D6 (2026-09-26) · THE HEADING FOLLOWS THE STATE, AND THE BUTTON FOLLOWS WHAT IS TRUE.
 *  · A stopped number read "Stop marketing messages / tap once to stop…" above a button that
 *    RE-SUBSCRIBES, so following the page's own instruction undid the stop. The heading is now
 *    chosen from `isSuppressed` and the last answer, never fixed.
 *  · `isSuppressed` changes ONLY on an ok answer. A failed "start them again" used to show the STOP
 *    button under "try again" — the opposite act; it now keeps offering the act that failed.
 *  · The resume button carries its OWN consent sentence (`push.marketingBody`), the one the ledger
 *    stores with it (`optOutWording("RESUME")`) — what the person agrees to is on screen beside the tap.
 *  · The answer is announced (`status`, or `alert` for a failure) and focus moves to it: the tapped
 *    button goes `disabled` while pending, which blurs it to <body>, so without this a screen-reader
 *    user heard nothing at all.
 */
type ActResult = { ok: true; state: "stopped" | "already" | "resumed" } | { ok: false; reason: string };

export function OptOutClient({
  token,
  masked,
  suppressed,
  resumable,
  eyebrow,
}: {
  token: string;
  masked: string;
  suppressed: boolean;
  /** The stop is one the person made, so their link may lift it (`personMayLift`). */
  resumable: boolean;
  eyebrow: string;
}) {
  const { t } = useT();
  const [state, setState] = useState<"idle" | "stopped" | "already" | "resumed" | "error">(
    suppressed ? "already" : "idle",
  );
  // ⭐ WHAT IS TRUE OF THIS NUMBER NOW — moved only by an ok answer, never by a failure.
  const [isSuppressed, setIsSuppressed] = useState(suppressed);
  const [mayResume, setMayResume] = useState(resumable);
  const [acted, setActed] = useState(0);
  const [pending, start] = useTransition();
  const msgRef = useRef<HTMLDivElement>(null);

  const run = (act: "STOP" | "RESUME") =>
    start(async () => {
      const fn = act === "STOP" ? stopMarketingAction : resumeMarketingAction;
      // ⛔ A REJECTED ACTION (a dropped connection, a deploy skew) is this page's own error sentence,
      // never the root error boundary's "back to markets" — same guard as `marketing-consent.tsx`.
      const r: ActResult = await fn(token).catch(() => ({ ok: false as const, reason: "error" }));
      setState(r.ok ? r.state : "error");
      if (r.ok) {
        setIsSuppressed(r.state !== "resumed");
        // A stop THIS tap made is the person's own, so the way back is offered. A resume answered
        // `already` is a stop somebody else made (officer, complaint, RG): no way back from here.
        if (act === "STOP") setMayResume(true);
        else if (r.state === "already") setMayResume(false);
      }
      setActed((n) => n + 1);
    });

  // Focus follows the answer, once per tap — never on first load, which would steal the reader's place.
  useEffect(() => {
    if (acted > 0) msgRef.current?.focus();
  }, [acted]);

  const title = isSuppressed
    ? t.optout.stoppedTitle
    : state === "resumed" ? t.optout.resumedTitle : t.optout.title;

  const message =
    state === "stopped" ? { tone: "success" as const, text: t.optout.done }
    : state === "already" ? { tone: "info" as const, text: t.optout.already }
    : state === "resumed" ? { tone: "success" as const, text: t.optout.resubscribed }
    : state === "error" ? { tone: "danger" as const, text: t.optout.error }
    : null;

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      {/* A LABELLED VALUE, not a panel: the glass box read as an editable field. Masked on the
          server in the shared `+255••••21` form (§5.14); `tabular-nums` because it is a number. */}
      <dl>
        <dt className="text-body-sm text-text-muted">{t.auth.phone}</dt>
        <dd className="mt-1 font-mono text-title-sm font-bold tabular-nums text-text">{masked}</dd>
      </dl>
      {message && (
        <div ref={msgRef} tabIndex={-1} className="focus:outline-none">
          {/* `md`: the sentence the person came for is body text (13px), never an 11px footnote. */}
          <Callout size="md" tone={message.tone} role={state === "error" ? "alert" : "status"}>
            {message.text}
          </Callout>
        </div>
      )}

      {/* ⭐ EXACTLY ONE ACTION IS ON SCREEN AT A TIME, and it is the one that matches what is
          true of this number right now. Two opposite buttons side by side is a tap that lands
          on the wrong one — on a page whose entire job is a single unambiguous tap. After a
          resubscribe the button becomes "stop" again, so the way out is never more than one
          tap away from wherever the person has got to. */}
      {!isSuppressed ? (
        <div className="space-y-3">
          <p className="text-body-sm leading-relaxed text-text-muted">{t.optout.body}</p>
          <Button variant="primary" size="lg" fullWidth loading={pending} onClick={() => run("STOP")}>
            {pending ? t.optout.loading : t.optout.stopButton}
          </Button>
        </div>
      ) : mayResume ? (
        <div className="space-y-3 border-t border-border pt-5">
          {/* ⛔ THE CONSENT SENTENCE, BESIDE THE TAP IT BELONGS TO — the ledger stores exactly
              `resubscribeButton — push.marketingBody` for this act, in the language shown here. */}
          <p className="text-body-sm leading-relaxed text-text-muted">{t.push.marketingBody}</p>
          <Button variant="ghost" size="lg" fullWidth loading={pending} onClick={() => run("RESUME")}>
            {pending ? t.optout.loading : t.optout.resubscribeButton}
          </Button>
        </div>
      ) : null}
    </>
  );
}

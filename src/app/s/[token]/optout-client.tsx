"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/lib/i18n";
import { stopMarketingAction, resumeMarketingAction } from "./actions";
import { NUMBER_LABEL, NUMBER_VALUE, ACT_GROUP, ACT_SENTENCE, TITLE_TEXT, NOTICE_TEXT } from "./optout-classes";

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
 *
 * ⭐ 2026-09-27 · A FAILED TAP NAMES A WAY TO REACH US. "Try again" and the same button were the only
 * way forward, and when a write outage or the per-link cap persists that is no way forward at all.
 * `contact` is our desk's phone and email, rendered on the SERVER (`ContactLines`, E-226: the support
 * config is never read in a client file) and shown inside the failure's alert; the retry stays the action.
 *
 * 🔴 2026-09-27 · A FAILED TAP MOVES NOTHING UNDER THE THUMB. The alert and the desk were inserted ABOVE
 * the button, pushing it ~210px down at 360, and the desk's `tel:` row landed where the thumb had just
 * tapped: "try again" at the same spot opened the phone dialer. Now:
 *  · the failure renders BELOW the button, and nothing above it changes: the heading and the message
 *    above read `said`, the last OK answer, which a failure never moves;
 *  · the alert takes focus WITHOUT scrolling, because a scroll moves the button too. It sits directly
 *    under the button the person just tapped, and an alert is announced wherever it is.
 * The U8 drive taps, fails, and asserts the button's box is unchanged and the old tap point still
 * hits it. The loading state follows the same rule (`loading.tsx`).
 */
type ActResult = { ok: true; state: "stopped" | "already" | "resumed" } | { ok: false; reason: string };

/** The tapped button while its answer is on the way. `.btn:disabled` (globals.css) dims every disabled
 *  button to 0.45 and a busy one is disabled too, which made "One moment…" the faintest text on the page
 *  at the moment the person is waiting on it. The stacked variant outranks that rule (0,3,0 over 0,2,0). */
const BUSY_LEGIBLE = "aria-busy:disabled:opacity-85 aria-busy:disabled:cursor-progress";

export function OptOutClient({
  token,
  masked,
  suppressed,
  resumable,
  eyebrow,
  contact,
}: {
  token: string;
  masked: string;
  suppressed: boolean;
  /** The stop is one the person made, so their link may lift it (`personMayLift`). */
  resumable: boolean;
  eyebrow: string;
  /** Our desk's contact lines, rendered on the server — shown in a failed tap's alert. */
  contact?: ReactNode;
}) {
  const { t } = useT();
  const [state, setState] = useState<"idle" | "stopped" | "already" | "resumed" | "error">(
    suppressed ? "already" : "idle",
  );
  // ⭐ WHAT THE PAGE SAYS ABOVE THE BUTTON — the last OK answer. A failure never moves it.
  const [said, setSaid] = useState<Exclude<typeof state, "error">>(suppressed ? "already" : "idle");
  // ⭐ WHAT IS TRUE OF THIS NUMBER NOW — moved only by an ok answer, never by a failure.
  const [isSuppressed, setIsSuppressed] = useState(suppressed);
  const [mayResume, setMayResume] = useState(resumable);
  const [acted, setActed] = useState(0);
  const [pending, start] = useTransition();
  const msgRef = useRef<HTMLDivElement>(null);
  const errRef = useRef<HTMLDivElement>(null);

  const run = (act: "STOP" | "RESUME") =>
    start(async () => {
      const fn = act === "STOP" ? stopMarketingAction : resumeMarketingAction;
      // ⛔ A REJECTED ACTION (a dropped connection, a deploy skew) is this page's own error sentence,
      // never the root error boundary's "back to markets" — same guard as `marketing-consent.tsx`.
      const r: ActResult = await fn(token).catch(() => ({ ok: false as const, reason: "error" }));
      setState(r.ok ? r.state : "error");
      if (r.ok) {
        setIsSuppressed(r.state !== "resumed");
        setSaid(r.state);
        // A stop THIS tap made is the person's own, so the way back is offered. A resume answered
        // `already` is a stop somebody else made (officer, complaint, RG): no way back from here.
        if (act === "STOP") setMayResume(true);
        else if (r.state === "already") setMayResume(false);
      }
      setActed((n) => n + 1);
    });

  // Focus follows the answer, once per tap — never on first load, which would steal the reader's place.
  // ⛔ A failure is focused WITHOUT a scroll: a scroll is the button moving under the thumb.
  useEffect(() => {
    if (acted === 0) return;
    if (state === "error") errRef.current?.focus({ preventScroll: true });
    else msgRef.current?.focus();
  }, [acted, state]);

  const title = isSuppressed
    ? t.optout.stoppedTitle
    : said === "resumed" ? t.optout.resumedTitle : t.optout.title;

  const message =
    said === "stopped" ? { tone: "success" as const, text: t.optout.done }
    : said === "already" ? { tone: "info" as const, text: t.optout.already }
    : said === "resumed" ? { tone: "success" as const, text: t.optout.resubscribed }
    : null;

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={<span className={TITLE_TEXT}>{title}</span>} />
      {/* A LABELLED VALUE, not a panel: the glass box read as an editable field. Masked on the
          server in the shared `+255••••21` form (§5.14); `tabular-nums` because it is a number. */}
      <dl>
        <dt className={NUMBER_LABEL}>{t.auth.phone}</dt>
        <dd className={NUMBER_VALUE}>{masked}</dd>
      </dl>
      {message && (
        <div ref={msgRef} tabIndex={-1} className="focus:outline-none">
          {/* `md`: the sentence the person came for is body text (13px), never an 11px footnote. */}
          <Callout size="md" tone={message.tone} role="status">
            <p className={NOTICE_TEXT}>{message.text}</p>
          </Callout>
        </div>
      )}

      {/* ⭐ EXACTLY ONE ACTION IS ON SCREEN AT A TIME, and it is the one that matches what is
          true of this number right now. Two opposite buttons side by side is a tap that lands
          on the wrong one — on a page whose entire job is a single unambiguous tap. After a
          resubscribe the button becomes "stop" again, so the way out is never more than one
          tap away from wherever the person has got to. */}
      {!isSuppressed ? (
        <div className={ACT_GROUP}>
          <p className={ACT_SENTENCE}>{t.optout.body}</p>
          <Button variant="primary" size="lg" fullWidth loading={pending} className={BUSY_LEGIBLE} onClick={() => run("STOP")}>
            {pending ? t.optout.loading : t.optout.stopButton}
          </Button>
        </div>
      ) : mayResume ? (
        <div className={`${ACT_GROUP} border-t border-border pt-5`}>
          {/* ⛔ THE CONSENT SENTENCE, BESIDE THE TAP IT BELONGS TO — the ledger stores exactly
              `resubscribeButton — push.marketingBody` for this act, in the language shown here. */}
          <p className={ACT_SENTENCE}>{t.push.marketingBody}</p>
          <Button variant="ghost" size="lg" fullWidth loading={pending} className={BUSY_LEGIBLE} onClick={() => run("RESUME")}>
            {pending ? t.optout.loading : t.optout.resubscribeButton}
          </Button>
        </div>
      ) : null}

      {/* 🔴 BELOW THE BUTTON, NEVER ABOVE IT (see the header): a retry at the same spot is the same
          button. The desk sits INSIDE the alert, lined up with its sentence, so the two read as one. */}
      {state === "error" && (
        <div ref={errRef} tabIndex={-1} className="focus:outline-none">
          <Callout size="md" tone="danger" role="alert">
            <p className={NOTICE_TEXT}>{t.optout.error}</p>
            {contact}
          </Callout>
        </div>
      )}
    </>
  );
}

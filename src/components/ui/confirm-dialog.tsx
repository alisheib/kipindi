"use client";

/**
 * ConfirmDialog — the trigger-driven convenience wrapper over <ConfirmModal>.
 *
 * Wraps a form's submit so a destructive action (self-exclude, close account,
 * large withdraw, irreversible state changes) always asks for an explicit
 * "Yes, do it" before the server action runs.
 *
 *   <ConfirmDialog
 *     trigger={<button className="btn btn-claret btn-md">Self-exclude</button>}
 *     title="Self-exclude · Jizuie"
 *     body="This locks your account for the period you picked..."
 *     confirmLabel="Yes, self-exclude"
 *     onConfirm={() => formRef.current?.requestSubmit()}
 *     submitsForm
 *   />
 *
 * The scrim + portal + focus-trap + scroll-lock all live in the shared
 * <ConfirmModal>/<Modal> primitive — this file only adds the clone-the-trigger
 * ergonomics so callers don't manage open state themselves.
 *
 * ⭐ DS-4 / B-6 (2026-08-07) — the PENDING hold. Pass `pending` (from
 * `useTransition` or `useFormStatus`) and confirm STOPS closing the dialog:
 * it holds open through the round-trip wearing ConfirmModal's `loading`
 * (both buttons disabled, spinner + "working", scrim/Esc/✕ blocked), then
 * closes itself on the true→false falling edge. Before this, the two
 * highest-stakes forms in the product (deposit, withdraw) confirmed → the
 * modal vanished → the page sat dead-looking for the whole 2–10s Selcom
 * round-trip → anxious re-submit. The dial and SellButton already did this
 * correctly; this brings the convenience wrapper up to the same bar.
 * ⚠️ Leave `pending` undefined to keep the classic close-on-confirm
 * behaviour — the admin consumers that run their own overlay want exactly that.
 *
 * ⭐ S6 A8j (2026-10-07) — A FORM WHOSE COMMIT IS THIS DIALOG IS SUBMITTED BY THIS DIALOG ALONE: see `submitsForm`.
 * Enter in such a form opens the dialog, exactly as the trigger does, and never submits the form behind it: before
 * the page wakes, while it hydrates and after. ⚠️ In WebKit before Safari 16.4 Enter there does nothing at all, which
 * is safe (see `submitsForm`). `test:implicit-submit` holds every dialog whose confirm submits a
 * form to the prop and its six host forms to their shape, and reads the server's markup by each browser engine's own
 * rule; `qa:implicit-submit` presses the keys, in Chromium, Firefox or WebKit.
 */

import * as React from "react";
import { ConfirmModal } from "@/components/ui/modal";

type Tone = "claret" | "warning" | "brand";

type Props = {
  trigger: React.ReactElement;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tone of the confirm button. claret = irreversible / destructive (default).
   *  ⚠️ D1 (2026-08-21) — the DEFAULT is the trap this ruling closed. Deposit and
   *  withdraw reached this wrapper without naming a tone and inherited `claret`,
   *  so the last screen before a DEPOSIT wore the destructive colour §B4 reserves
   *  for editorial weight. Both now pass `tone="brand"` explicitly. A money commit
   *  that is not destructive must SAY it is not; silence here means claret. */
  tone?: Tone;
  /** D1 — button footprint for the dialog's stacked pair, forwarded to
   *  <ConfirmModal>. Default "md"; the two money commits take "lg". */
  size?: "md" | "lg";
  /** In hold-open mode (`pending` provided), return `false` to signal the
   *  mutation did NOT start (e.g. `form.reportValidity()` refused) — the dialog
   *  releases immediately instead of waiting for a round-trip that will never
   *  come. Any other return (including void) means "in flight, hold". */
  onConfirm: () => void | boolean;
  /** Fires right before the dialog opens — use to snapshot form data. */
  onOpen?: () => void;
  /** Fires on the open true→false edge, WHEREVER the close came from (cancel ·
   *  scrim · Esc · refused pre-flight · the hold-open falling edge). Use it to
   *  drop state a closed dialog has no business keeping — e.g. a resolved payee
   *  name that must not be waiting on screen the next time it opens. Optional:
   *  omit it and the dialog behaves exactly as it always has. */
  onClose?: () => void;
  /** B-22 — pre-flight gate: return `false` to REFUSE opening (invalid input).
   *  The caller surfaces its own kit-styled error (inline/toast) — never the
   *  native browser bubble. Omit for always-openable dialogs. */
  openGuard?: () => boolean;
  /** DS-4 / B-6 — the mutation-in-flight signal (useTransition pending or
   *  useFormStatus().pending). PROVIDING this prop (even as `false`) opts the
   *  dialog into the hold-open contract: confirm no longer closes it; the
   *  falling edge of `pending` does. Omit for classic close-on-confirm. */
  pending?: boolean;
  /**
   * ⭐ S6 A8j (2026-10-07) — THIS DIALOG'S CONFIRM SUBMITS THE FORM ITS TRIGGER SITS IN, AND NOTHING ELSE MAY.
   *
   * 🔴 THE DEFECT IT CLOSES, ON EVERY PLAYER'S WITHDRAWAL. The trigger is forced to `type="button"` (below), which left
   * the withdraw form with no submit button and one text field, and a browser SUBMITS such a form when Enter is pressed
   * in that field (HTML's implicit submission; a phone's Go key is the same Enter). An amount typed and entered left the
   * account with no "Confirm withdrawal" at all: no fee, no "You receive", no recipient. The close-account form was the
   * same shape, and Enter in its phrase box closed the account and its wallet. Before the page woke (its scripts still
   * coming down a slow line) the same Enter posted the server action as plain HTML, which no listener can stop.
   *
   * ⭐ WITH IT ON, ENTER DOES WHAT THE TRIGGER DOES, in three parts, each for a window the others cannot reach:
   *   · THE GUARD (`formGuard`) listens on the form and refuses every submit but the confirm's own, then opens the
   *     dialog by the trigger's own path (its `openGuard`, its `onOpen`), or does nothing where the trigger would do
   *     nothing: disabled, or the dialog already open;
   *   · A DEFAULT CONTROL — a submit input no one sees or reaches, the form's first submit control, so it is what a
   *     browser presses for Enter — disabled until the guard listens. In Chromium and Firefox a disabled default
   *     control stops implicit submission outright, so the server's markup and the hydration are covered. Once the
   *     guard listens it is enabled, and Enter in ANY field of the form presses it: a submit the guard turns into the
   *     dialog (eight fields on the deposit form, where Enter used to do nothing). `formNoValidate`, so bad input
   *     meets the kit's toast and never the browser's bubble (V-3).
   *     ⛔ AN INPUT WITH `autoComplete="off"`, NEVER A BUTTON. Firefox keeps a control's disabled state once script
   *     has changed it, and on a reload or a history step that parses the page again it puts that state back while
   *     parsing — so a default button the guard had enabled came back ENABLED before the page woke, and Enter clicked
   *     it: the native post this control exists to stop. `autocomplete="off"` takes the control out of that
   *     restoration (Firefox keeps no state for it at all), and React types `autoComplete` on an input, not on a
   *     button. It was safe only because these pages are served no-store, which Firefox never restores; now it is safe
   *     whatever a page is served as;
   *   · A SECOND TEXT FIELD, unnamed, unseen and out of reach. WebKit (every browser on an iPhone) skips a disabled
   *     submit control and submits a form of ONE text field anyway; a form of two it submits in no engine.
   * ⚠️ WEBKIT BEFORE SAFARI 16.4 presses a submit control for Enter only if it is RENDERED, and a `hidden` one is not:
   * there Enter in these forms does NOTHING, before the page wakes and after — no submit and no dialog. Inert, never
   * unsafe: the trigger still opens the dialog. (Next 16 builds for Safari 16.4 and later, so such a device may never
   * wake the page at all; Enter stays inert there either way.) Chromium, Firefox and WebKit from Safari 16.4 open the
   * dialog on Enter.
   * ⛔ THREE RULES, each held by `test:implicit-submit`:
   *   · ONE `submitsForm` DIALOG PER FORM. Each guard refuses every submit but its own confirm's, so two on one form
   *     would refuse each other's confirm and neither would ever send. The second to listen THROWS in development; in
   *     production it says so on the console and stays out, its default control disabled — and its confirm then CAN
   *     NEVER SEND: the first dialog's guard refuses that submit as Enter's and opens the first dialog instead, and in
   *     the held-open mode the second dialog would spin with nothing in flight, undismissable. The development throw
   *     and the host table (§1.5b, §4.5) are what keep that shape from shipping;
   *   · THE SUBMIT HAPPENS INSIDE `onConfirm`, SYNCHRONOUSLY (`requestSubmit()` fires its event before it returns):
   *     never after an `await`, nor in a `.then`, a timer or a transition. The guard refuses a later submit as Enter's,
   *     and a held-open dialog would spin over a round-trip that never started (§4.6);
   *   · NOTHING ELSE IN THE FORM MAY SUBMIT — no submit control of the form's own, ahead of this dialog or after it.
   *     Chromium and Firefox press the form's FIRST submit control, so one drawn ahead would be pressed instead of the
   *     guard's; and WebKit skips the guard's disabled control and presses the first ENABLED submit control wherever it
   *     stands, so one drawn anywhere would be pressed before the page wakes — a native post, no confirm (§4.5, the
   *     host forms by name).
   */
  submitsForm?: boolean;
};

/**
 * ⭐ S6 A8j · THE FORM GUARD `submitsForm` runs — pure of React, so `test:implicit-submit` drives the very rule the
 * dialog runs, on real submit events.
 *
 * `confirm` runs the dialog's own confirm, and the submit that confirm starts is the one the guard lets through:
 * `requestSubmit()` fires its submit event before it returns, so a submit that arrives inside `confirm` is the
 * dialog's, and any other is the browser's (Enter in a field, the default control) or a stray control's.
 * `listen` refuses every other submit of `form`, three ways at once. Its default is prevented, so the browser posts
 * nothing. It is STOPPED, so React's root never hears it: React runs a form's action from the root, and a submit that
 * arrives there prevented still marks the form pending when the same event started a transition, which opening the
 * withdraw dialog does (its payee lookup is a server action, and a server action's call is a transition). And
 * `refused` is told, so the dialog can open the way its trigger opens it. `listen` hands back the stop that takes all
 * of this away again, or null where it refused to listen at all (below).
 * ⛔ One guard per dialog, so one dialog's confirm never lets another form's submit through. ⛔ And ONE GUARD PER FORM:
 * `guardedForms` holds every form a guard listens on, so a second guard on the same form is refused instead of
 * deadlocking the first (each would refuse the other's confirm, and neither would ever send). In development the
 * refusal throws, so the mistake cannot ship unseen; in production it is said on the console and the second dialog
 * stays out — its own confirm can then never send (see `submitsForm`), while the first dialog's still does. The stop
 * takes the form out of the set again, so a dialog that remounts (and React's second effect in development) listens
 * as before.
 */
export type FormGuard = {
  confirm<T>(act: () => T): T;
  listen(form: EventTarget, refused: () => void): (() => void) | null;
};

/** ⭐ S6 A8j · every form a guard listens on, across every dialog on the page (see `formGuard`). */
const guardedForms = new WeakSet<EventTarget>();

export function formGuard(): FormGuard {
  let confirming = false;
  return {
    confirm<T>(act: () => T): T {
      confirming = true;
      try {
        return act();
      } finally {
        confirming = false;
      }
    },
    listen(form: EventTarget, refused: () => void) {
      if (guardedForms.has(form)) {
        const why =
          "ConfirmDialog submitsForm: this form is guarded by another dialog already. Each guard refuses every submit " +
          "but its own confirm's, so two on one form would refuse each other's confirm and neither would ever send. " +
          "One form, one ConfirmDialog with submitsForm.";
        if (process.env.NODE_ENV !== "production") throw new Error(why);
        console.error(why);
        return null;
      }
      guardedForms.add(form);
      const onSubmit = (e: Event) => {
        if (confirming) return;
        e.preventDefault();
        e.stopPropagation();
        refused();
      };
      form.addEventListener("submit", onSubmit);
      return () => {
        form.removeEventListener("submit", onSubmit);
        guardedForms.delete(form);
      };
    },
  };
}

export function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "claret",
  size = "md",
  onConfirm,
  onOpen,
  onClose,
  openGuard,
  pending,
  submitsForm,
}: Props) {
  const [open, setOpen] = React.useState(false);
  // Hold-open bookkeeping (only used when `pending` is provided): `awaiting`
  // means confirm was pressed and we are riding the round-trip; `sawPending`
  // distinguishes "not started yet" from "settled" so the dialog closes on the
  // falling edge and never on the gap before the transition starts.
  const holdOpen = pending !== undefined;
  const [awaiting, setAwaiting] = React.useState(false);
  const sawPendingRef = React.useRef(false);

  React.useEffect(() => {
    if (!awaiting) return;
    if (pending) { sawPendingRef.current = true; return; }
    if (sawPendingRef.current) {
      // Settled (success re-render, error re-render, or the action returned) —
      // release the dialog. On a redirect this whole tree unmounts instead.
      setAwaiting(false);
      sawPendingRef.current = false;
      setOpen(false);
    }
  }, [pending, awaiting]);

  // `onClose` as ONE edge-detector rather than a call at each of the three close
  // sites (cancel/scrim/Esc, refused pre-flight, the hold-open falling edge), so
  // a close path added later cannot forget to fire it. The ref keeps the
  // callback fresh without making it an effect dependency — callers pass an
  // inline arrow, which would otherwise re-run this on every render.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (wasOpenRef.current && !open) onCloseRef.current?.();
    wasOpenRef.current = open;
  }, [open]);

  /* The trigger's disabled state (its own, and the held-open round-trip below, B-6) is ONE value, which the trigger
     wears and the form guard reads: Enter is refused wherever the trigger would be. */
  const triggerDisabled = holdOpen
    ? (awaiting || pending || (trigger.props as { disabled?: boolean }).disabled)
    : (trigger.props as { disabled?: boolean }).disabled;

  /* ⭐ S6 A8j · ONE WAY IN. The trigger's click and a submit the form guard refused both open the dialog here (B-22's
     pre-flight, then the caller's snapshot, then the dialog), so Enter in the form does exactly what the trigger does. */
  const requestOpen = () => {
    if (openGuard && !openGuard()) return;
    onOpen?.();
    setOpen(true);
  };

  /* ⭐ S6 A8j · THE FORM GUARD (`submitsForm`). One per dialog, kept for its whole life, as the Input keeps its box. */
  const guardRef = React.useRef<FormGuard | null>(null);
  if (guardRef.current === null) guardRef.current = formGuard();
  const guard = guardRef.current;
  /* What a refused submit does, read when it arrives: the listener is installed once, for the reason `onCloseRef`
     gives above. Nothing where the trigger could do nothing (disabled, or the dialog already open over it); else
     exactly what the trigger does. */
  const refuseRef = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    refuseRef.current = triggerDisabled || open ? () => {} : requestOpen;
  });
  /* The default control (see `submitsForm`): disabled until the guard listens on its form, enabled once it does. */
  const defaultRef = React.useRef<HTMLInputElement>(null);
  const [listening, setListening] = React.useState(false);
  React.useEffect(() => {
    if (!submitsForm) return undefined;
    // The form this control submits: the form its trigger sits in, since the two are drawn side by side.
    const form = defaultRef.current?.form;
    if (!form) return undefined;
    const stop = guard.listen(form, () => refuseRef.current());
    // ⛔ Refused: another dialog guards this form (in development that has thrown already). This one stays out, and
    // its default control stays disabled, so it can never be what Enter presses.
    if (!stop) return undefined;
    setListening(true);
    return () => {
      stop();
      setListening(false);
    };
  }, [submitsForm, guard]);

  // Clone the trigger so clicking it opens the dialog, but it can't
  // submit the surrounding form directly. While a held-open mutation is in
  // flight the trigger is disabled too — no queueing a second confirm (B-6).
  const triggerEl = React.cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
    type: "button",
    disabled: triggerDisabled,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      // B-22 — an invalid form never earns a confirm dialog.
      requestOpen();
    },
  });

  return (
    <>
      {/* ⭐ S6 A8j · the default control and the second text field (`submitsForm`): unseen, out of reach, unnamed, and
          kept out of Firefox's form-state restoration. */}
      {submitsForm && (
        <>
          <input type="submit" ref={defaultRef} hidden disabled={!listening} formNoValidate tabIndex={-1} aria-hidden autoComplete="off" />
          <input type="text" hidden tabIndex={-1} aria-hidden autoComplete="off" />
        </>
      )}
      {triggerEl}
      <ConfirmModal
        open={open}
        onClose={() => { if (!awaiting) setOpen(false); }}
        onConfirm={() => {
          if (holdOpen) {
            if (awaiting) return; // one confirm per round-trip
            const started = guard.confirm(onConfirm);
            if (started === false) { setOpen(false); return; } // refused pre-flight — show the field errors
            setAwaiting(true);
          } else {
            setOpen(false);
            guard.confirm(onConfirm);
          }
        }}
        title={title}
        body={body}
        tone={tone}
        size={size}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        loading={holdOpen && awaiting}
      />
    </>
  );
}

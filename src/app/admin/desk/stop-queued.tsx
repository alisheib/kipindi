"use client";

/**
 * THE ONE CONTROL ON THE ACTIVITY PANEL — stop a stake that is still queued (C7-SPEC rulings 388, 415, 432(a)).
 *
 * ⛔ **NOT ONE SENTENCE IS WRITTEN HERE** (ruling 388). Every word the dialog paints arrives in one prop built on
 * the server. Ruling 385 measured why that is not a style: most of the sentences this console can emit carry NO
 * vocabulary word at all, so one typed into a client component would ship to every visitor with
 * `test:house-bot-disclosure` and `verify:house-bot-bundle` both reporting clean. And ruling 388 measured the
 * other half — client component PROP NAMES survive minification into public chunks — so even the names crossing
 * this boundary say nothing about what this is.
 *
 * ⛔ **NOTHING HOUSE REACHES THIS FILE** (rulings 384, 401): no import from `@/lib/house-bot/**`,
 * `@/lib/server/**`, the DAL or the gate module, by value OR by type, and none from `@/lib/utils`, whose date
 * helpers pull server platform config into a chunk (trap E-322). The action arrives as a PROP, because
 * `test:admin-act-gate`'s population is every client file under `src/app/admin` that imports an actions module,
 * and on an Owner-only route a `useMayAct()` consultation would be a branch that can never be false.
 *
 * ⛔ **THE SUBMIT ID IS MINTED HERE AND ONLY HERE**, once per dialog opening. It is what makes a double press ONE
 * press: the server's insert is keyed on (officer, submit id) and answers a repeat with the FIRST press's outcome
 * rather than writing a second one. Minting it per REQUEST instead would make a retry of a dropped response a
 * second cancel, which is the whole defect the key exists against.
 *
 * ⛔ **AN OPEN DIALOG HOLDS THE DESK'S POLLER** (ruling 316), counted in React state and never queried from the DOM.
 *
 * @see src/app/admin/desk/actions.ts · src/lib/server/house-console-read.ts
 */
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useDeferredToast } from "@/components/ui/toast";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { DESK_HOLD_EVENT, DESK_RELEASE_EVENT } from "./desk-live";

/**
 * The finished copy. ⛔ Declared HERE, structurally, rather than imported from the gate module: a type import's
 * SPECIFIER survives in this file's source, and ruling 384 refuses a house module specifier in a client file in
 * ANY import form. The page passes the server's own object, so `tsc` still ties the two together.
 */
export type StopCopy = {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  reasonLabel: string;
  reasonHint: string;
  reasonCountLabel: string;
  reasonMin: number;
  reasonMax: number;
  doneTitle: string;
  failTitle: string;
};

/**
 * ⛔ THE ARMING PREDICATE IS PURE AND EXPORTED, so both branches are asserted DIRECTLY rather than through a render
 * that can only reach one of them — `Modal` returns null until it is mounted, so a static render of a dialog is not
 * measured by construction (415). ⛔ IT IS THE SERVER'S OWN BOUNDS: the door checks the same pair, because a
 * ceremony verified only in a browser is one a crafted POST walks straight through.
 */
export function stopArmed(copy: Pick<StopCopy, "reasonMin" | "reasonMax">, reason: string): boolean {
  const r = reason.trim();
  return r.length >= copy.reasonMin && r.length <= copy.reasonMax;
}

export function StopQueued({
  id,
  copy,
  act,
}: {
  /** The row this control is about. ⛔ Posted, never painted — nothing renders it. */
  id: string;
  copy: StopCopy;
  act: (input: { id: string; submitId: string; reason: string }) => Promise<
    { ok: true; changed: boolean; note: string | null; warn: boolean } | { ok: false; error: string; field?: string }
  >;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitId, setSubmitId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const firstRef = useRef<HTMLTextAreaElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (!open) return undefined;
    window.dispatchEvent(new Event(DESK_HOLD_EVENT));
    return () => {
      window.dispatchEvent(new Event(DESK_RELEASE_EVENT));
    };
  }, [open]);

  const armed = stopArmed(copy, reason);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setReason("");
    setError(null);
  };

  const submit = () => {
    if (!armed || pending) return;
    setError(null);
    start(async () => {
      let result: Awaited<ReturnType<typeof act>>;
      try {
        result = await act({ id, submitId, reason });
      } catch {
        result = { ok: false, error: transportFailure };
      }
      if (!result.ok) {
        /* ⛔ THE REFUSAL STAYS IN THE DIALOG — closing it would throw away what the officer typed and leave them to
           write it again to find out whether the second attempt is refused too. */
        setError(result.error);
        toast({ title: copy.failTitle, description: result.error, variant: "danger" });
        return;
      }
      setOpen(false);
      setReason("");
      setError(null);
      router.refresh();
      deferToast({
        title: copy.doneTitle,
        description: result.note ?? undefined,
        variant: result.warn ? "warning" : "success",
      });
    });
  };

  return (
    <>
      <Button
        type="button"
        /* ⛔ 412 · `md` IS THE SECTION'S ONE RUNG. Every control on this console is the 44px one, and a smaller
           button in a table row is both a second look for one thing and a tap target under the floor. */
        size="md"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          /* ⛔ ONE KEY PER OPENING, not one per request: a retry of a dropped response must be the SAME press. */
          setSubmitId(crypto.randomUUID());
          setReason("");
          setError(null);
          setOpen(true);
        }}
      >
        {copy.label}
      </Button>

      {/*
        ⛔ K/7d · THE EXIT GUARD, AND IT IS A REAL DEFECT THIS BRANCH SHIPPED — found by the C5-8 red-by-red as one
        of only TWO reds present here and absent from clean `origin/main`. The dialog was already scrim-proof once
        anything is typed (`closeOnScrim` below), but the scrim is not the only way out: a back gesture, the
        sidebar, or a bell link navigates the route away and the typed reason is gone without a word. On this
        console that reason is not a note — it is the operator's written account of stopping a stake, and the
        server refuses the action without it.

        ⛔ GUARDED, NOT EXEMPTED. `test:unsaved-changes` offers both; adding an EXEMPT entry would have turned the
        suite green by widening an exemption, which is the move this programme refuses by name.

        ⛔ AND IT WRITES NO SENTENCE (ruling 388). This file owns exactly one string and that is deliberate — a
        sentence typed into a client component ships to every visitor in a public chunk with both D19 instruments
        reporting clean. So the guard is rendered on its DEFAULTS: the copy lives in the shared kit component,
        already ships in every admin chunk, and names nothing about this feature. `dirty` tracks the same
        condition the scrim already refuses on, so the two doors agree rather than disagreeing.
      */}
      <UnsavedChangesGuard dirty={open && reason.length > 0} />

      <Modal
        open={open}
        onClose={close}
        role="alertdialog"
        labelledBy={headingId}
        maxWidth={420}
        /* 415 · a must-decide gate while the request is in flight, and scrim-proof once anything is typed. */
        closeOnScrim={!pending && reason.length === 0}
        /* 🔴 K/7d's OTHER HALF, AND IT WAS FOUND ON A SERVED BUILD (2026-09-21, the ops lane's panel drive).
           The guard above this dialog catches a NAVIGATION away; `closeOnScrim` catches the scrim. Escape was
           neither, so the one box had two one-gesture exits that disagreed: the scrim refused to throw away a
           typed reason and the keystroke threw it away without a word. Measured at all six widths — the dialog
           was gone and the text with it. ⛔ The condition is `closeOnScrim`'s, character for character, because
           two doors out of one room that close on different conditions is the defect, not the wording. */
        closeOnEsc={!pending && reason.length === 0}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={firstRef}
      >
        <div className="space-y-4">
          <h2 id={headingId} className="font-display text-body-lg font-semibold text-text pr-8">{copy.title}</h2>
          <p className="text-body-sm text-text-secondary">{copy.body}</p>

          <Field label={copy.reasonLabel} hint={copy.reasonHint} dataField="reason">
            <Textarea
              ref={firstRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={copy.reasonMax}
              rows={3}
              disabled={pending}
            />
          </Field>
          {/* ⛔ A LIVE COUNT WITH ITS BASIS BESIDE IT (388, §C2) — a bare number is not a reading. */}
          <p className="text-body-sm text-text-subtle" aria-live="polite">
            <span className="font-mono tabular-nums">{copy.reasonMax - reason.trim().length}</span>{" "}{copy.reasonCountLabel}
          </p>

          {error !== null && <p className="text-body-sm text-danger-fg" role="alert">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>{copy.cancelLabel}</Button>
            <Button type="button" size="md" variant="claret" onClick={submit} disabled={!armed} loading={pending}>
              {copy.confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * ⛔ THE ONE SENTENCE THIS FILE OWNS, AND IT IS ABOUT THE TRANSPORT RATHER THAN ABOUT THE STAKE. The server cannot
 * word a failure that never reached it. It names no state, no figure and no feature.
 */
const transportFailure = "That did not reach the server. Nothing changed — try again.";

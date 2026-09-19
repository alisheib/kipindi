"use client";

/**
 * THE MASTER-SWITCH CEREMONY — the desk's one control that starts money (C7-SPEC rulings 306, 388, 415;
 * owner-delegated ruling 454; replan ruling 549's 4b).
 *
 * ⛔ **THE SWITCH SHIPS OFF** (owner ruling D1). This file builds the ACT and never performs it.
 *
 * ⛔ **NOT ONE SENTENCE IS WRITTEN HERE** (ruling 388). Every word the dialog paints — its title, its body, both
 * button labels, the field labels, the typed word and both toast titles — arrives as a finished string in one prop
 * built on the server. Ruling 385 measured why that matters and it is not a style: most of the sentences this
 * console can emit carry NO vocabulary word at all, so one typed into a client component would ship to every
 * visitor with `test:house-bot-disclosure` 1.1 and `verify:house-bot-bundle` both reporting clean. Ruling 388
 * measured the other half — client component PROP NAMES survive minification into public chunks — so even the
 * names crossing this boundary say nothing.
 *
 * ⛔ **THE TYPED WORD IS NOT A GATE HERE** (ruling 454). It arms the button, and the SERVER checks it again: a
 * ceremony verified only in a browser is one a crafted POST walks straight through, and this is the single act on
 * the platform that opens money's own gate. What this file owns is that the officer cannot reach the button by
 * habit — `ConfirmModal`'s hard tier is deliberately NOT used, because it arms on the typed word ALONE and this
 * needs a reason as well (415).
 *
 * ⛔ **NOTHING HOUSE REACHES THIS FILE** (rulings 384, 401): no import from `@/lib/house-bot/**`,
 * `@/lib/server/house-bot/**`, the DAL or the gate module, by value OR by type — and none from `@/lib/utils`
 * either, whose date helpers reach server platform config from a chunk (trap E-322). The action arrives as a
 * PROP, because `test:admin-act-gate`'s population is every client file under `src/app/admin` that imports an
 * actions module, and on an Owner-only route a `useMayAct()` consultation would be a branch that can never be
 * false — the dead control 432(a) refuses and `test:house-bot-console` 1.422 bans here by name.
 *
 * ⛔ **AN OPEN DIALOG HOLDS THE PAGE'S POLLER** (ruling 316). The strip refreshes the whole page every 20 s; a
 * `router.refresh()` under a half-typed reason would replace what the officer is writing with the server's copy.
 * The hold is a COUNTED event in React state, raised while the dialog is open and dropped by the same effect's
 * cleanup, so it cannot be left standing by an early return or by an unmount mid-request.
 *
 * @see src/app/admin/desk/actions.ts · src/lib/server/house-console-read.ts
 */
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { useDeferredToast } from "@/components/ui/toast";
import { DESK_HOLD_EVENT, DESK_RELEASE_EVENT } from "./desk-live";

/**
 * One direction's finished copy. ⛔ Declared HERE, structurally, rather than imported from the gate module: a type
 * import's SPECIFIER survives in this file's source, and ruling 384 refuses a house module specifier in a client
 * file in ANY import form. The page passes the server's own object, so `tsc` still ties the two together — a field
 * that changes shape fails to compile at the page, which is where the two sides meet.
 */
export type DeskSwitchCopy = {
  ariaLabel: string;
  to: "ON" | "OFF";
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  reasonLabel: string;
  reasonHint: string;
  reasonCountLabel: string;
  reasonMin: number;
  reasonMax: number;
  word: string | null;
  wordLabel: string | null;
  wordPlaceholder: string | null;
  doneTitle: string;
  failTitle: string;
};

/**
 * ⛔ THE ARMING PREDICATE IS PURE AND EXPORTED, so all of its branches are asserted DIRECTLY rather than through a
 * render that can only reach one of them on any given state. A reason of the required length, and — on the way ON
 * only — the word typed exactly, after trimming and nothing else. ⛔ NEVER case-folded: "switch on" must not arm a
 * control whose whole purpose is that it cannot be armed by habit.
 */
export function deskSwitchArmed(copy: Pick<DeskSwitchCopy, "word" | "reasonMin" | "reasonMax">, reason: string, typed: string): boolean {
  const r = reason.trim();
  if (r.length < copy.reasonMin || r.length > copy.reasonMax) return false;
  return copy.word === null || typed.trim() === copy.word;
}

export function DeskSwitch({
  on,
  copy,
  act,
}: {
  on: boolean;
  copy: DeskSwitchCopy;
  /**
   * The server action, handed down by the page and typed structurally, so the gated writer's own result type is
   * checked against this where the two meet without a house module specifier ever entering this file (384).
   */
  act: (input: { to: "ON" | "OFF"; reason: string; typed?: string }) => Promise<
    { ok: true; on: boolean; changed: boolean; note: string | null; warn: boolean } | { ok: false; error: string }
  >;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const headingId = useId();

  /* ⛔ 316's HOLD, RAISED AND DROPPED BY ONE EFFECT so the count cannot be left standing by an early return or by
     an unmount while the request is in flight. */
  useEffect(() => {
    if (!open) return undefined;
    window.dispatchEvent(new Event(DESK_HOLD_EVENT));
    return () => {
      window.dispatchEvent(new Event(DESK_RELEASE_EVENT));
    };
  }, [open]);

  const armed = deskSwitchArmed(copy, reason, typed);
  /** Anything typed at all — what 415's `closeOnScrim` reads, so a stray click cannot discard a half-written reason. */
  const dirty = reason.length > 0 || typed.length > 0;
  const left = copy.reasonMax - reason.trim().length;

  const close = () => {
    if (pending) return;
    setOpen(false);
    setReason("");
    setTyped("");
    setError(null);
  };

  const submit = () => {
    if (!armed || pending) return;
    setError(null);
    start(async () => {
      /* ⛔ A THROWN SERVER ACTION MUST NOT END THE SPINNER IN SILENCE (B-8). The action maps every server failure
         onto the same union already, so what is left here is the TRANSPORT — a dropped POST, a serialisation
         failure — and a throw out of `startTransition` clears the pending state and shows the officer nothing at
         all, on the control that starts money. */
      let result: Awaited<ReturnType<typeof act>>;
      try {
        result = await act({ to: copy.to, reason, typed });
      } catch {
        result = { ok: false, error: transportFailure };
      }
      if (!result.ok) {
        /* ⛔ THE REFUSAL STAYS IN THE DIALOG, WITH WHAT THE OFFICER TYPED. Closing it would throw the reason away
           and leave them to write it again to find out whether the second attempt is refused too. */
        setError(result.error);
        toast({ title: copy.failTitle, description: result.error, variant: "danger" });
        return;
      }
      setOpen(false);
      setReason("");
      setTyped("");
      setError(null);
      router.refresh();
      /* ⛔ AN ACT THAT LANDED WITHOUT ITS COMPLIANCE ROW SAYS BOTH (replan rulings 537, 543). The desk really did
         move; telling the officer it did not would send them to do it again, and that is the one response this
         record cannot survive. The server owns the sentence and whether it is a warning. */
        deferToast({
          title: copy.doneTitle,
          description: result.note ?? undefined,
          variant: result.warn ? "warning" : "success",
        });
    });
  };

  return (
    <>
      <Toggle on={on} tone="brand" disabled={pending} aria-label={copy.ariaLabel} onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onClose={close}
        role="alertdialog"
        labelledBy={headingId}
        maxWidth={420}
        /* 415 · `closeOnScrim={!pending && !dirty}`, WORD FOR WORD FROM THE RULING, and both halves earn their
           place. While the request is in flight the dialog is a must-decide gate: the officer cannot lose the
           outcome of a control that starts money by clicking beside it. And once ANYTHING has been typed, a stray
           click on the scrim cannot throw the reason away — which is also why `test:unsaved-changes` classes this
           file with the kit's other in-modal reason fields rather than asking for a navigation guard: there is no
           navigation to guard, and the one accidental exit a modal has is shut. */
        closeOnScrim={!pending && !dirty}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <div className="space-y-4">
          <h2 id={headingId} className="font-display text-body-lg font-semibold text-text pr-8">{copy.title}</h2>
          <p className="text-body-sm text-text-secondary">{copy.body}</p>

          <Field label={copy.reasonLabel} hint={copy.reasonHint} dataField="reason">
            <Textarea
              ref={reasonRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={copy.reasonMax}
              rows={3}
              disabled={pending}
            />
          </Field>
          {/* ⛔ A LIVE COUNT WITH ITS BASIS BESIDE IT. Read off the first 360 tile: it painted a bare "300" and
              an officer could not tell what it counted. The WORDS are the server's (388); only the figure is ours. */}
          <p className="text-body-sm text-text-subtle" aria-live="polite">
            <span className="font-mono tabular-nums">{left}</span>{" "}{copy.reasonCountLabel}
          </p>

          {copy.word !== null && copy.wordLabel !== null && (
            <Field label={copy.wordLabel} dataField="typed">
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={copy.wordPlaceholder ?? undefined}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={pending}
              />
            </Field>
          )}

          {error !== null && <p className="text-body-sm text-danger-fg" role="alert">{error}</p>}

          {/* 415 · the footer stacks in reverse on a phone, so the confirm sits under the thumb and Cancel above
              it — never the other way round on the control that starts money. */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>{copy.cancelLabel}</Button>
            <Button type="button" size="md" variant="primary" onClick={submit} disabled={!armed} loading={pending}>
              {copy.confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * ⛔ THE ONE SENTENCE THIS FILE OWNS, AND IT IS ABOUT THE TRANSPORT RATHER THAN ABOUT THE DESK. The server cannot
 * word a failure that never reached it, so this one cannot come from a prop. It names no feature, no state and no
 * figure — only that nothing was sent.
 */
const transportFailure = "That did not reach the server. Nothing changed — try again.";

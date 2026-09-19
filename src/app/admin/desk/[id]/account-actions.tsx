"use client";

/**
 * THE ACCOUNT'S ACTION ROW — Start, Pause, Confirm permission, Remove (C7-SPEC rulings 388, 415; replan 549's 4b).
 *
 * ⛔ **NOT ONE SENTENCE IS WRITTEN HERE** (ruling 388). Every word each dialog paints arrives in one prop built on
 * the server. Ruling 385 measured why that is not a style: most of the sentences this console can emit carry NO
 * vocabulary word at all, so one typed into a client component would ship to every visitor with
 * `test:house-bot-disclosure` 1.1 and `verify:house-bot-bundle` both reporting clean. And ruling 388 measured the
 * other half — client component PROP NAMES survive minification into public chunks — so even the names crossing
 * this boundary say nothing.
 *
 * ⛔ **THE HOLDER'S PASSWORD IS TYPED HERE AND KEPT NOWHERE** (owner ruling D5; 02 §2.7). It goes into one request,
 * is checked once in memory by the one service that may, and is dropped: no session, no cookie, no sign-in record.
 * This file holds it in React state for as long as the dialog is open and clears it on every exit — including the
 * refusal path, where a wrong password must not sit on screen waiting to be sent again by a stray Enter.
 *
 * ⛔ **NOTHING HOUSE REACHES THIS FILE** (rulings 384, 401): no import from `@/lib/house-bot/**`,
 * `@/lib/server/house-bot/**`, the DAL or the gate module, by value OR by type, and none from `@/lib/utils`, whose
 * date helpers pull server platform config into a chunk (trap E-322). The action arrives as a PROP, because
 * `test:admin-act-gate`'s population is every client file under `src/app/admin` that imports an actions module and
 * on an Owner-only route a `useMayAct()` consultation would be a branch that can never be false.
 *
 * ⛔ **AN OPEN DIALOG HOLDS THE DESK'S POLLER** (ruling 316), counted in React state and never queried from the DOM.
 *
 * @see src/app/admin/desk/actions.ts · src/lib/server/house-console-read.ts
 */
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useDeferredToast } from "@/components/ui/toast";
import { DESK_HOLD_EVENT, DESK_RELEASE_EVENT } from "../desk-live";

/**
 * One act's finished copy. ⛔ Declared HERE, structurally, rather than imported from the gate module: a type
 * import's SPECIFIER survives in this file's source, and ruling 384 refuses a house module specifier in a client
 * file in ANY import form. The page passes the server's own objects, so `tsc` still ties the two together.
 */
export type DeskActCopy = {
  act: "START" | "PAUSE" | "REVERIFY" | "REMOVE";
  label: string;
  tone: "brand" | "claret";
  form: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  reasonLabel: string | null;
  reasonHint: string | null;
  reasonMin: number;
  reasonMax: number;
  passwordLabel: string | null;
  passwordHint: string | null;
  word: string | null;
  wordLabel: string | null;
  wordPlaceholder: string | null;
  doneTitle: string;
  failTitle: string;
};

/**
 * ⛔ THE ARMING PREDICATE IS PURE AND EXPORTED, so every branch is asserted DIRECTLY rather than through a render
 * that can only reach one of them — and `Modal` returns null until it is mounted, so a static render of a dialog is
 * NOT MEASURED by construction (415). A field the act does not ask for is never a reason to refuse.
 */
export function deskActArmed(copy: Pick<DeskActCopy, "form" | "reasonLabel" | "reasonMin" | "reasonMax" | "passwordLabel" | "word">, v: { reason: string; password: string; typed: string }): boolean {
  if (!copy.form) return true;
  if (copy.reasonLabel !== null) {
    const r = v.reason.trim();
    if (r.length < copy.reasonMin || r.length > copy.reasonMax) return false;
  }
  if (copy.passwordLabel !== null && v.password.length === 0) return false;
  /* ⛔ NEVER CASE-FOLDED: an arming word exists so the act cannot be reached by habit. */
  if (copy.word !== null && v.typed.trim() !== copy.word) return false;
  return true;
}

const EMPTY = { reason: "", password: "", typed: "" };

export function DeskAccountActions({
  acts,
  id,
  act,
}: {
  acts: DeskActCopy[];
  id: string;
  act: (input: { id: string; act: DeskActCopy["act"]; reason?: string; password?: string; typed?: string }) => Promise<
    { ok: true; changed: boolean; note: string | null; warn: boolean } | { ok: false; error: string; field?: string; href?: string }
  >;
}) {
  const [open, setOpen] = useState<DeskActCopy | null>(null);
  const [v, setV] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const firstRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (open === null) return undefined;
    window.dispatchEvent(new Event(DESK_HOLD_EVENT));
    return () => {
      window.dispatchEvent(new Event(DESK_RELEASE_EVENT));
    };
  }, [open]);

  const armed = open !== null && deskActArmed(open, v);
  const dirty = v.reason.length > 0 || v.password.length > 0 || v.typed.length > 0;

  /* ⛔ EVERY EXIT CLEARS THE HOLDER'S PASSWORD. A wrong one left on screen is one stray Enter from being sent
     again, and it is the one value on this page that belongs to somebody else. */
  const close = () => {
    if (pending) return;
    setOpen(null);
    setV(EMPTY);
    setError(null);
  };

  const submit = () => {
    if (open === null || !armed || pending) return;
    const copy = open;
    setError(null);
    start(async () => {
      let result: Awaited<ReturnType<typeof act>>;
      try {
        result = await act({ id, act: copy.act, reason: v.reason, password: v.password, typed: v.typed });
      } catch {
        result = { ok: false, error: transportFailure };
      }
      if (!result.ok) {
        /* ⛔ THE REFUSAL STAYS IN THE DIALOG — closing it would throw away what the officer typed and leave them to
           write it again to find out whether the second attempt is refused too. The PASSWORD still goes. */
        setError(result.error);
        setV((cur) => ({ ...cur, password: "" }));
        toast({ title: copy.failTitle, description: result.error, variant: "danger" });
        return;
      }
      setOpen(null);
      setV(EMPTY);
      setError(null);
      router.refresh();
      deferToast({
        title: copy.doneTitle,
        description: result.note ?? undefined,
        variant: result.warn ? "warning" : "success",
      });
    });
  };

  if (acts.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {acts.map((a) => (
          <Button
            key={a.act}
            type="button"
            size="md"
            variant={a.tone === "claret" ? "claret" : "primary"}
            disabled={pending}
            onClick={() => { setV(EMPTY); setError(null); setOpen(a); }}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <Modal
        open={open !== null}
        onClose={close}
        role="alertdialog"
        labelledBy={headingId}
        maxWidth={420}
        /* 415 · a must-decide gate while the request is in flight, and scrim-proof once anything is typed. */
        closeOnScrim={!pending && !dirty}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={firstRef}
      >
        {open !== null && (
          <div className="space-y-4">
            <h2 id={headingId} className="text-h3 text-text">{open.title}</h2>
            <p className="text-body-sm text-text-secondary">{open.body}</p>

            {open.passwordLabel !== null && (
              <Field label={open.passwordLabel} hint={open.passwordHint ?? undefined} dataField="password">
                <Input
                  ref={firstRef as React.RefObject<HTMLInputElement>}
                  type="password"
                  value={v.password}
                  onChange={(e) => setV((cur) => ({ ...cur, password: e.target.value }))}
                  autoComplete="off"
                  disabled={pending}
                />
              </Field>
            )}

            {open.reasonLabel !== null && (
              <>
                <Field label={open.reasonLabel} hint={open.reasonHint ?? undefined} dataField="reason">
                  <Textarea
                    ref={firstRef as React.RefObject<HTMLTextAreaElement>}
                    value={v.reason}
                    onChange={(e) => setV((cur) => ({ ...cur, reason: e.target.value }))}
                    maxLength={open.reasonMax}
                    rows={3}
                    disabled={pending}
                  />
                </Field>
                <p className="text-body-sm text-text-subtle font-mono tabular-nums" aria-live="polite">
                  {open.reasonMax - v.reason.trim().length}
                </p>
              </>
            )}

            {open.word !== null && open.wordLabel !== null && (
              <Field label={open.wordLabel} dataField="typed">
                <Input
                  value={v.typed}
                  onChange={(e) => setV((cur) => ({ ...cur, typed: e.target.value }))}
                  placeholder={open.wordPlaceholder ?? undefined}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={pending}
                />
              </Field>
            )}

            {error !== null && <p className="text-body-sm text-danger-fg" role="alert">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>{open.cancelLabel}</Button>
              <Button
                type="button"
                size="md"
                variant={open.tone === "claret" ? "claret" : "primary"}
                onClick={submit}
                disabled={!armed}
                loading={pending}
              >
                {open.confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/**
 * ⛔ THE ONE SENTENCE THIS FILE OWNS, AND IT IS ABOUT THE TRANSPORT RATHER THAN ABOUT THE ACCOUNT. The server
 * cannot word a failure that never reached it. It names no state, no figure and no feature.
 */
const transportFailure = "That did not reach the server. Nothing changed — try again.";

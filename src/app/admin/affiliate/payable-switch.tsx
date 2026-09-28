"use client";

/**
 * THE OWNER'S "PAYABLE / NOT PAYABLE" SWITCH — the state card and its two ceremonies (2026-09-26).
 *
 * Ali, on this page: *"let's have 2 options, payable and not payable; if not payable keep everything
 * locked."* This is the card that replaced the old master-switch row and its "stored, not applied"
 * banner, and the two dialogs that move it: Make payable (a reason, what pays from now, the typed
 * words) and Stop paying (a reason, one step). Both are the Owner's alone.
 *
 * ⛔ NOT ONE SENTENCE OF THE SWITCH IS WRITTEN HERE. Every word the card and both dialogs paint arrives
 * finished in `copy`, built by `invitePayableDialogs` on the server — which alone knows the ceiling, the
 * stored record and the viewer's STORED role (the desk ceremony's rule, for the same reason). A viewer
 * who is not the Owner gets no dialog at all, only the server's sentence saying who can. This file
 * decides WHEN, never WHAT.
 *
 * ⛔ THE ACTION ARRIVES AS A PROP, ALREADY WRAPPED IN `runAdminAction` by the editor that renders this.
 * `test:admin-act-gate` puts every client file under the admin tree whose imports name an actions-shaped
 * module into a population that must consult the act gate — and the wrapper's own file name is
 * actions-shaped, so this file imports neither. Here a gate consultation would be a branch that can never
 * be false: the buttons exist only for the Owner, and the Owner may always act. A thrown action reaches
 * this file as the same `{ ok: false, error }` a refusal does; a redirect still propagates.
 *
 * ⛔ THE TYPED WORDS ARM THE BUTTON; THEY ARE NOT THE GATE. The server checks, in order: the Owner's stored
 * role, the two-step status, the reason, the ceiling, the words (trimmed, never case-folded), what pays
 * from now, the price fingerprint and the seq this page was rendered on. A crafted POST meets all of it.
 */
import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field-legend";
import { I, plateGlyph } from "@/components/ui/glyphs";
import { IconPlate } from "@/components/ui/icon-plate";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useDeferredToast } from "@/components/ui/toast";
import { cleanReason } from "@/lib/affiliate-rules";
import type {
  InvitePayableCopy,
  InvitePayableDialog,
  InvitePayableInput,
  InvitePayableResult,
  InvitePayableStart,
} from "@/lib/server/invite-rewards-ceremony";

/**
 * The ceremony's action as this file receives it: `setInvitePayableAction` inside `runAdminAction`, so a
 * throw comes back as a refusal (whose `field` is then unknown) rather than ending the spinner in silence.
 */
export type PayableAct = (
  input: InvitePayableInput,
) => Promise<InvitePayableResult | { ok: false; error: string; field?: string }>;

/** A refusal, pinned to the field the server named — or to the dialog as a whole (`null`, e.g. a stale seq). */
type Refusal = { field: "reason" | "typed" | "start" | null; message: string };

/**
 * ⛔ THE ARMING PREDICATE, PURE AND EXPORTED, so every branch is asserted directly rather than through a
 * render that reaches one state at a time (`deskSwitchArmed`, same reason). Decided by DIRECTION (addendum
 * D, 2026-09-26) — never inferred from which copy fields happen to be present:
 *   · both ways, the reason inside the server's bounds as the SERVER measures it (`cleanReason`: invisible
 *     characters out, then trimmed — five zero-width spaces are not a reason);
 *   · to Payable, ALSO the words typed EXACTLY (trimmed and nothing else, never case-folded) and a choice of
 *     what pays from now — "the settings on this page" only with the fingerprint of the price shown.
 * ⛔ FAILS CLOSED: an unknown direction, bounds that are not numbers, and a Payable copy missing its words or
 * its choice never arm — a copy that lost a field must not become a one-step Make payable.
 */
export function payableCeremonyArmed(
  copy: Pick<InvitePayableDialog, "to" | "reasonMin" | "reasonMax" | "word" | "start" | "pricedFingerprint">,
  entry: { reason: string; typed: string; start: InvitePayableStart | null },
): boolean {
  if (copy.to !== "PAYABLE" && copy.to !== "NOT_PAYABLE") return false;
  if (!Number.isFinite(copy.reasonMin) || !Number.isFinite(copy.reasonMax)) return false;
  const reason = cleanReason(entry.reason);
  if (!(reason.length >= copy.reasonMin && reason.length <= copy.reasonMax)) return false;
  if (copy.to === "NOT_PAYABLE") return true;
  if (typeof copy.word !== "string" || copy.word.trim() === "" || entry.typed.trim() !== copy.word) return false;
  if (copy.start === null || typeof copy.start !== "object") return false;
  if (entry.start !== "NOTHING" && entry.start !== "AS_SHOWN") return false;
  if (entry.start === "AS_SHOWN" && !copy.pricedFingerprint) return false;
  return true;
}

/**
 * The state card. ⭐ Not payable is amber and Payable is royal — the header chip's own two tones, so the
 * page states one fact in one colour. The terms line (the enforced 50% ceiling) is painted in BOTH states.
 */
export function PayableSwitch({ copy, act }: { copy: InvitePayableCopy; act: PayableAct }) {
  const titleId = useId();
  const payable = copy.state === "PAYABLE";
  /* ⭐ BOTH MAY EXIST (addendum C, 2026-09-26): Make payable while not paying under the Owner ceiling, Stop
     paying whenever the STORED record says Payable, whatever the ceiling — so while paused at service level
     with the record ON the Owner can re-arm OR record Not payable. Neither for anyone but the Owner. */
  const dialogs = [copy.makePayable, copy.stopPaying].filter((d): d is InvitePayableDialog => d !== null);

  return (
    <section
      aria-labelledby={titleId}
      data-payable-state={copy.state}
      className="rounded-lg border p-4"
      style={{
        borderColor: payable ? "color-mix(in oklab, var(--royal-500) 28%, var(--border))" : "color-mix(in oklab, var(--warning-500) 36%, var(--border))",
        background: payable ? "var(--bg-elevated)" : "color-mix(in oklab, var(--warning-500) 8%, var(--bg-elevated))",
      }}
    >
      {/* ⭐ WRAPS, like the row it replaced: the text keeps a 14rem basis and the button drops to its own
          line at a phone's width instead of crushing the sentence to one word a line. */}
      <div className="flex flex-wrap items-start gap-4">
        <IconPlate
          size={44}
          bg={payable ? "color-mix(in oklab, var(--royal-500) 18%, transparent)" : "color-mix(in oklab, var(--warning-500) 20%, transparent)"}
          fg={payable ? "var(--royal-300)" : "var(--warning-fg)"}
        >
          {payable ? <I.unlock s={plateGlyph(44)} /> : <I.lock s={plateGlyph(44)} />}
        </IconPlate>
        <div className="min-w-0 flex-1 basis-[14rem]">
          <h2 id={titleId} className="font-display text-body-lg font-bold text-text">{copy.title}</h2>
          <p className="mt-0.5 text-body-sm text-text-secondary">{copy.body}</p>
          {copy.provenance !== null && <p className="mt-1.5 text-body-sm text-text-muted">{copy.provenance}</p>}
          {copy.notes.map((note, i) => (
            <p key={i} className="mt-1.5 text-body-sm text-text-muted">{note}</p>
          ))}
        </div>
        {dialogs.length > 0 && (
          <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2">
            {/* ⭐ Keyed by direction, so a ceremony that lands and flips the page starts the other one clean. */}
            {dialogs.map((d) => <SwitchCeremony key={d.to} dialog={d} act={act} />)}
          </div>
        )}
      </div>

      {/* Payable only: what the STORED settings pay — the reward editor below prices the draft. */}
      {copy.priceHeadline !== null && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-body-sm font-semibold text-text">{copy.priceHeadline}</p>
          {copy.priceLines.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-body-sm text-text-secondary">
              {copy.priceLines.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          )}
        </div>
      )}

      <p className="mt-3 flex items-start gap-2 text-body-sm text-text-muted">
        <span aria-hidden className="mt-0.5 shrink-0"><I.shieldcheck s={16} /></span>
        <span>{copy.terms}</span>
      </p>
    </section>
  );
}

/**
 * One direction's trigger and dialog. Its state lives here and is dropped on every exit, so a reopened
 * ceremony never carries a half-written reason from an earlier attempt.
 */
function SwitchCeremony({ dialog, act }: { dialog: InvitePayableDialog; act: PayableAct }) {
  const initialChoice: InvitePayableStart | null = dialog.start?.defaultChoice ?? null;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [choice, setChoice] = useState<InvitePayableStart | null>(initialChoice);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const headingId = useId();
  const choiceName = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const typedRef = useRef<HTMLInputElement>(null);

  const armed = payableCeremonyArmed(dialog, { reason, typed, start: choice });
  /** Anything entered at all — what the scrim and Escape read, so a stray click or key cannot discard it. */
  const dirty = reason.length > 0 || typed.length > 0 || choice !== initialChoice;
  /** Counted as the server counts it (`cleanReason`), so the figure the Owner watches is the one applied. */
  const left = dialog.reasonMax - cleanReason(reason).length;
  const errorAt = (field: Refusal["field"]) => (refusal !== null && refusal.field === field ? refusal.message : undefined);

  const reset = () => {
    setReason("");
    setTyped("");
    setChoice(initialChoice);
    setRefusal(null);
  };
  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };
  /* An edit to the field a refusal names retires that refusal — a sentence saying the reason is too short
     must not stay beside a reason that no longer is. */
  const editReason = (v: string) => { setReason(v); if (refusal?.field === "reason") setRefusal(null); };
  const editTyped = (v: string) => { setTyped(v); if (refusal?.field === "typed") setRefusal(null); };
  const pick = (v: InvitePayableStart) => { setChoice(v); if (refusal?.field === "start") setRefusal(null); };

  const submit = () => {
    if (!armed || pending) return;
    setRefusal(null);
    const input: InvitePayableInput = dialog.to === "PAYABLE"
      ? {
          to: "PAYABLE",
          reason,
          typed,
          expectSeq: dialog.expectSeq,
          start: choice ?? undefined,
          ...(choice === "AS_SHOWN" && dialog.pricedFingerprint ? { pricedFingerprint: dialog.pricedFingerprint } : {}),
        }
      : { to: "NOT_PAYABLE", reason, expectSeq: dialog.expectSeq };
    startTransition(async () => {
      const result = await act(input);
      if (!result.ok) {
        /* ⛔ THE REFUSAL STAYS IN THE DIALOG, WITH WHAT THE OWNER ENTERED, beside the field it names.
           Closing would throw the reason away and leave them to write it again to learn whether the
           second attempt is refused too. A stale seq or price names no field — reloading is the fix, and
           the server's sentence says so. */
        const field = result.field === "reason" || result.field === "typed" || result.field === "start" ? result.field : null;
        setRefusal({ field, message: result.error });
        toast({ title: dialog.failTitle, description: result.error, variant: "danger" });
        if (field === "reason") reasonRef.current?.focus();
        else if (field === "typed") typedRef.current?.focus();
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
      /* ⛔ AN ACT THAT LANDED WITHOUT ITS COMPLIANCE ROW SAYS BOTH — the switch really moved, and saying it
         did not would send the Owner to do it again. The server owns the sentence and whether it warns. */
      deferToast({ title: dialog.doneTitle, description: result.note ?? undefined, variant: result.warn ? "warning" : "success" });
    });
  };

  return (
    <>
      <Button
        type="button"
        size="md"
        variant={dialog.to === "PAYABLE" ? "primary" : "ghost"}
        aria-haspopup="dialog"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        {dialog.trigger}
      </Button>
      <Modal
        open={open}
        onClose={close}
        role="alertdialog"
        labelledBy={headingId}
        maxWidth={dialog.start !== null ? 520 : 420}
        /* ⛔ A MUST-DECIDE GATE ONCE ANYTHING IS ENTERED, AND WHILE IT IS SENDING: neither the scrim nor
           Escape can close it then — only Cancel, the close button (hidden while sending) or the confirm. */
        closeOnScrim={!pending && !dirty}
        closeOnEsc={!pending && !dirty}
        showClose={!pending}
        ariaBusy={pending}
        /* ⭐ The long dialog opens on its heading, so the money warning at the top is read first; the short
           one opens on its only field. */
        initialFocus={dialog.start !== null ? headingRef : reasonRef}
      >
        <div className="space-y-4">
          <h2 ref={headingRef} id={headingId} tabIndex={-1} className="pr-8 font-display text-body-lg font-semibold text-text outline-none">
            {dialog.title}
          </h2>
          {dialog.body.map((para, i) => (
            <p key={i} className="text-body-sm text-text-secondary">{para}</p>
          ))}

          {dialog.start !== null && (
            <fieldset className="space-y-2" data-field="start" disabled={pending}>
              <FieldLegend as="legend" className="mb-1.5">{dialog.start.legend}</FieldLegend>
              <Choice name={choiceName} value="NOTHING" checked={choice === "NOTHING"} onPick={pick} label={dialog.start.nothing.label}>
                <span className="mt-0.5 block text-text-muted">{dialog.start.nothing.hint}</span>
              </Choice>
              <Choice name={choiceName} value="AS_SHOWN" checked={choice === "AS_SHOWN"} onPick={pick} label={dialog.start.asShown.label}>
                {dialog.start.asShown.lines.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-text-secondary">
                    {dialog.start.asShown.lines.map((line, i) => <li key={i}>{line}</li>)}
                  </ul>
                )}
                <span className="mt-1 block text-text-muted">{dialog.start.asShown.exposure}</span>
              </Choice>
              {errorAt("start") !== undefined && <p className="text-body-sm text-danger-fg">{errorAt("start")}</p>}
            </fieldset>
          )}

          {dialog.effects.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-body-sm text-text-secondary">
              {dialog.effects.map((effect, i) => <li key={i}>{effect}</li>)}
            </ul>
          )}

          <Field label={dialog.reasonLabel} hint={dialog.reasonHint} error={errorAt("reason")} dataField="reason">
            <Textarea
              ref={reasonRef}
              value={reason}
              onChange={(e) => editReason(e.target.value)}
              maxLength={dialog.reasonMax}
              rows={3}
              disabled={pending}
              aria-invalid={errorAt("reason") !== undefined || undefined}
            />
          </Field>
          {/* ⛔ A LIVE COUNT WITH ITS BASIS BESIDE IT — the words are the server's; only the figure is ours. */}
          <p className="text-body-sm text-text-subtle" aria-live="polite">
            <span className="font-mono tabular-nums">{left}</span>{" "}{dialog.reasonCountLabel}
          </p>

          {dialog.word !== null && dialog.wordLabel !== null && (
            <Field label={dialog.wordLabel} error={errorAt("typed")} dataField="typed">
              <Input
                ref={typedRef}
                value={typed}
                onChange={(e) => editTyped(e.target.value)}
                placeholder={dialog.wordPlaceholder ?? undefined}
                autoComplete="off"
                /* ⭐ A phone keyboard opens in capitals (addendum G) — the words are compared exactly. The field
                   is never pre-filled: typing them is the point. */
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                disabled={pending}
                error={errorAt("typed") !== undefined}
              />
            </Field>
          )}

          {refusal !== null && refusal.field === null && (
            <p className="text-body-sm text-danger-fg" role="alert">{refusal.message}</p>
          )}

          {/* The kit's footer order: on a phone the confirm paints first and Cancel beneath it; from the
              small breakpoint up, Cancel sits left of the confirm. */}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>{dialog.cancelLabel}</Button>
            <Button type="button" size="md" variant="primary" onClick={submit} disabled={!armed} loading={pending}>
              {dialog.confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** One answer to "what pays from now": a native radio inside a bordered card, the kit's radio-card shape. */
function Choice({
  name, value, checked, onPick, label, children,
}: {
  name: string;
  value: InvitePayableStart;
  checked: boolean;
  onPick: (v: InvitePayableStart) => void;
  label: string;
  children?: ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-body-sm transition-colors ${
        checked ? "border-royal-700 bg-royal-500/10" : "border-border hover:border-border-strong"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onPick(value)}
        className="mt-0.5 shrink-0 accent-[var(--royal-500)]"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-text">{label}</span>
        {children}
      </span>
    </label>
  );
}

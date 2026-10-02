"use client";

/**
 * U22 · ADD AND EDIT ONE CONTACT — the page head's "Add contact", the dialog it opens, and the `?edit=<contact id>`
 * dialog over the list.                                                                      (S10, 2026-10-02)
 *
 * ⛔ NO CONSENT CONTROL. Nothing lawful can be chosen on a form (OD9's basis and an 18+ attestation are U33's), so the
 * dialog STATES consent instead of offering it: "Not recorded" (the list's own label, C13) and the form's one sentence
 * (`CONTACT_CONSENT_NOTE`). The request carries no consent key, and the server writes no ledger row.
 * 🔴 D19 / A1.1 · NOTHING PER-NUMBER SAYS "PLAYER" TO A MASKED VIEWER. The edit dialog's consent chip and source line
 * come from `contact.reader`, which the server sets to null for a viewer who may not read a number; the post-save
 * consent line is built only from a reply that carries `consent`, which the add action sends to a reader alone.
 * A player's duplicate reads the same sentence, with the same link, as any other.
 * ⭐ THE NUMBER'S LIVE VERDICT is `contact-number.ts`'s — the operator chip at two digits from the ONE table, "4 of 9
 * digits" while typing, too-short only once the field is left, 064 refused at two digits, every sentence
 * parseTzNumber's own, and a paste judged BEFORE PhoneInput's nine-digit cap (`onPasteRaw`).
 * ⛔ THE UNIQUE INDEX IS THE DUPLICATE CHECK. The lookup on a valid number is the officer's early answer; the ONE Save
 * posts to the ONE add action, and a duplicate — found by the lookup or by the create — offers only "Open the existing
 * contact →": `?edit=<contact id>` through the ONE href builder (`contactsHref`), so a cuid travels, never a number.
 * ⛔ THE FORM NEVER HOLDS A STORED NUMBER OR EMAIL. In edit mode both arrive as server-rendered `<Sensitive>` slots;
 * the email field starts empty, and leaving it empty KEEPS the stored address (server-side).
 * ⛔ AN ACT CONTROL: `useMayAct()` disables "Add contact" WITH its reason (`useActDisabledReason`) — never hidden — and
 * every action re-checks on the server (`softRequireStaff`). The form is `noValidate`: the verdict line speaks, not a
 * browser bubble in another language.
 *
 * Guard: `test:contacts-form` §6 (this file's shape) · red: `red:contacts-form`.
 */
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Chip } from "@/components/ui/chip";
import { FieldLegend } from "@/components/ui/field-legend";
import { I } from "@/components/ui/glyphs";
import { Field, Input } from "@/components/ui/input";
import { LinkPending } from "@/components/ui/link-pending";
import { Modal } from "@/components/ui/modal";
import { PhoneInput } from "@/components/ui/phone-input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useDeferredToast } from "@/components/ui/toast";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { contactNumberVerdict, contactOperatorChip } from "@/lib/contacts/contact-number";
import type { ContactNumberVerdict, ContactOperatorChip } from "@/lib/contacts/contact-number";
import { CONTACT_LIMITS, charCount, joinTags } from "@/lib/contacts/contact-fields";
import type { ContactFormField, ContactNumberLookup } from "@/lib/server/contacts/contact-write";
import { addContactAction, editContactAction, lookupContactNumberAction } from "./contact-form-actions";
import { contactsHref } from "./contacts-query";
import type { ContactEditView } from "./contacts-loader";
import {
  CONSENT_LABEL, CONTACT_FORM, CONTACT_CONSENT_NOTE, CONTACT_NUMBER_HINT, CONTACT_NUMBER_TITLE, CONTACT_NUMBER_FIXED,
  CONTACT_CHECKING, CONTACT_OPEN_EXISTING, CONTACT_EMAIL_HINT, CONTACT_TAGS_HINT, CONTACT_EMAIL_KEEP_HINT,
  CONTACT_EMAIL_NEW_LABEL, CONTACT_EMAIL_REMOVE, CONTACT_EMAIL_KEEP, CONTACT_EMAIL_REMOVING, CONTACT_ADDED, CONTACT_SAVED,
  CONTACT_ADD_FAILED, CONTACT_SAVE_FAILED, CONTACT_EDIT_FAILED, contactRangeTitle, contactNotesCount, contactAddedConsent,
} from "./contacts-copy";

/** What the dialog is doing: adding (with the page's link params, for the duplicate's link), or editing one row. */
type FormMode =
  | { kind: "add"; hrefParams: Record<string, string> }
  | { kind: "edit"; contact: ContactEditView; numberSlot: ReactNode; emailSlot: ReactNode };

/** The book's answer for the number on screen. `text` is the number it was asked about: an answer for a number no
 *  longer on screen is never shown. `unknown` = the check itself failed — Save stays possible, the create decides. */
type Lookup =
  | { state: "idle" }
  | { state: "checking"; text: string }
  | { state: "free"; text: string }
  | { state: "duplicate"; text: string; sentence: string; existingId: string }
  | { state: "refused"; text: string; sentence: string }
  | { state: "unknown"; text: string; sentence: string };

type Refusal = { field: ContactFormField | null; message: string; stale: boolean };
type ActionRefusal = { ok: false; error: string; field?: string; reason?: string; existingId?: string };

/** The ONE limits table's bounds for the typed fields (C12). ⚠️ Destructured, never read as `.email`: `test:read-tiers`
 *  §7 reads `{… .email …}` in an admin .tsx as a raw email render, and the rule is kept true by construction. */
const { displayName: NAME_MAX, email: MAIL_MAX, notes: NOTES_MAX } = CONTACT_LIMITS;

const FORM_FIELDS: readonly ContactFormField[] = ["number", "displayName", "email", "notes", "tags"];
const asField = (f: unknown): ContactFormField | null =>
  FORM_FIELDS.find((k) => k === f) ?? null;

/** The lookup action's reply, as the dialog keeps it. */
function lookupFrom(text: string, r: { ok: true; lookup: ContactNumberLookup } | { ok: false; error: string }): Lookup {
  if (!r.ok) return { state: "unknown", text, sentence: r.error };
  const l = r.lookup;
  if (l.state === "duplicate") return { state: "duplicate", text, sentence: l.sentence, existingId: l.existingId };
  if (l.state === "refused") return { state: "refused", text, sentence: l.sentence };
  return { state: "free", text };
}

/* ═══ THE PAGE HEAD'S BUTTON ════════════════════════════════════════════════════════════════════ */

/**
 * "Add contact". ⛔ DISABLED WITH ITS REASON for a role that may view the growth section but not act — never hidden.
 * Each opening mounts a fresh form (`round`), so a reopened dialog never carries an earlier attempt's typing.
 */
export function AddContactButton({ hrefParams, editOpen }: { hrefParams: Record<string, string>; editOpen: boolean }) {
  const mayAct = useMayAct();
  const reason = useActDisabledReason();
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  // ⭐ The duplicate's link opened the ?edit= dialog: this one steps aside, so two dialogs never stack.
  useEffect(() => {
    if (editOpen) setOpen(false);
  }, [editOpen]);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="primary"
        leading={<I.plus s={16} />}
        disabled={!mayAct}
        title={reason}
        aria-haspopup="dialog"
        data-block="contacts-add"
        onClick={() => {
          setRound((n) => n + 1);
          setOpen(true);
        }}
      >
        {CONTACT_FORM.addButton}
      </Button>
      {round > 0 && (
        <ContactForm key={round} open={open} mode={{ kind: "add", hrefParams }} onClose={() => setOpen(false)} onDone={() => setOpen(false)} />
      )}
    </>
  );
}

/* ═══ THE ?edit= DIALOG ═════════════════════════════════════════════════════════════════════════ */

/**
 * The dialog over the list for `?edit=<contact id>`. `missing` covers an unknown AND an erased row (A1.7) with one
 * sentence; `failed` is the dialog's own read failing — never called missing.
 */
export function ContactEditDialog({
  state, numberSlot, emailSlot, closeHref,
}: {
  state: { kind: "ready"; contact: ContactEditView } | { kind: "missing"; sentence: string } | { kind: "failed" };
  numberSlot: ReactNode;
  emailSlot: ReactNode;
  /** The list's own address without `edit` (`contactsHref(sp)`, built by the page). */
  closeHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  // ⭐ Closing REPLACES the address: a dialog is not a navigation, and Back must not reopen it.
  const close = () => {
    setOpen(false);
    router.replace(closeHref, { scroll: false });
  };

  if (state.kind === "ready") {
    return <ContactForm open={open} mode={{ kind: "edit", contact: state.contact, numberSlot, emailSlot }} onClose={close} onDone={close} />;
  }
  return (
    <Modal open={open} onClose={close} labelledBy={headingId} maxWidth={420} initialFocus={closeRef} ariaBusy={pending}>
      <div className="space-y-4" data-contact-dialog={state.kind}>
        <div>
          <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{CONTACT_FORM.eyebrow}</p>
          <h2 id={headingId} className="mt-0.5 pr-8 font-display text-title-sm font-bold text-text leading-tight">{CONTACT_FORM.editTitle}</h2>
        </div>
        <p className="text-body-sm text-text-secondary" role={state.kind === "failed" ? "alert" : undefined}>
          {state.kind === "missing" ? state.sentence : CONTACT_EDIT_FAILED}
        </p>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          {state.kind === "failed" && (
            <Button type="button" size="md" variant="ghost" loading={pending} onClick={() => startTransition(() => router.refresh())}>
              {CONTACT_FORM.tryAgain}
            </Button>
          )}
          <Button ref={closeRef} type="button" size="md" variant="primary" onClick={close}>
            {CONTACT_FORM.close}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══ THE FORM ══════════════════════════════════════════════════════════════════════════════════ */

function OperatorChip({ chip }: { chip: ContactOperatorChip }) {
  return (
    <Chip size="sm" variant={chip.disputed !== null ? "warning" : "info"} title={chip.disputed ?? contactRangeTitle(chip.brand)} data-operator-chip={chip.ndc}>
      {chip.brand}
    </Chip>
  );
}

/** The number's line under the field: the book's answer when there is one for this number, else the live verdict. */
function NumberVerdictLine({
  verdict, asked, chip, hrefParams,
}: {
  verdict: ContactNumberVerdict;
  asked: Lookup | null;
  chip: ContactOperatorChip | null;
  hrefParams: Record<string, string>;
}) {
  let line: ReactNode;
  if (asked !== null && asked.state === "checking") {
    line = (
      <span className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary">
        <Spinner size={12} />
        {CONTACT_CHECKING}
      </span>
    );
  } else if (asked !== null && asked.state === "duplicate") {
    // ⛔ THE ONLY WAY ON FROM A DUPLICATE: open the row that holds the number — never a second save.
    line = (
      <>
        <span className="text-body-sm text-danger-fg">{asked.sentence}</span>
        <Link
          href={contactsHref(hrefParams, { edit: asked.existingId })}
          replace
          scroll={false}
          data-open-existing
          className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-royal-300 hover:underline"
        >
          {CONTACT_OPEN_EXISTING}
          <LinkPending />
        </Link>
      </>
    );
  } else if (asked !== null && asked.state === "refused") {
    line = <span className="text-body-sm text-danger-fg">{asked.sentence}</span>;
  } else if (asked !== null && asked.state === "unknown") {
    line = <span className="text-body-sm text-text-secondary">{asked.sentence}</span>;
  } else if (verdict.stage === "refused") {
    line = <span className="text-body-sm text-danger-fg">{verdict.sentence}</span>;
  } else if (verdict.stage === "empty") {
    line = <span className="text-body-sm text-text-subtle">{CONTACT_NUMBER_HINT}</span>;
  } else {
    line = <span className="text-body-sm text-text-secondary">{verdict.sentence}</span>;
  }
  return (
    <div
      className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1"
      aria-live="polite"
      data-number-verdict={verdict.stage}
      data-number-lookup={asked === null ? "idle" : asked.state}
    >
      {chip !== null && <OperatorChip chip={chip} />}
      {line}
    </div>
  );
}

function ContactForm({
  open, mode, onClose, onDone,
}: {
  open: boolean;
  mode: FormMode;
  onClose: () => void;
  onDone: () => void;
}) {
  const editing = mode.kind === "edit" ? mode.contact : null;
  const [digits, setDigits] = useState("");
  const [pasted, setPasted] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [name, setName] = useState(editing?.displayName ?? "");
  const [mail, setMail] = useState("");
  const [removeMail, setRemoveMail] = useState(false);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [tags, setTags] = useState(editing ? joinTags(editing.tags) : "");
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [pending, startTransition] = useTransition();
  const [, startCheck] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const headingId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const pendingPaste = useRef<string | null>(null);

  const isAdd = mode.kind === "add";
  const verdict = contactNumberVerdict({ value: digits, pasted, settled });
  /** What the server parses: the paste as it was pasted, else the field's digits. */
  const numberText = pasted ?? digits;

  // ⭐ THE LOOKUP — once for each valid number on screen; an answer that arrives for a number since changed is dropped.
  useEffect(() => {
    if (!isAdd || verdict.stage !== "ok") return;
    let live = true;
    const text = numberText;
    setLookup({ state: "checking", text });
    startCheck(async () => {
      const r = await runAdminAction(() => lookupContactNumberAction(text));
      if (live) setLookup(lookupFrom(text, r));
    });
    return () => {
      live = false;
    };
  }, [isAdd, verdict.stage, numberText]);

  const onNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const paste = pendingPaste.current;
    pendingPaste.current = null;
    setDigits(e.target.value);
    setPasted(paste);
    setSettled(false);
    if (refusal !== null && refusal.field === "number") setRefusal(null);
  };
  const onPasteRaw = (text: string) => {
    pendingPaste.current = text;
    // A paste that is already clean digits is inserted by the browser after this handler, as typing — nothing to
    // judge there, so the marker is dropped before that edit arrives.
    queueMicrotask(() => {
      pendingPaste.current = null;
    });
  };
  const clearRefusal = (field: ContactFormField) => {
    if (refusal !== null && refusal.field === field) setRefusal(null);
  };

  const dirty = isAdd
    ? digits !== "" || name !== "" || mail !== "" || notes !== "" || tags !== ""
    : name !== (editing?.displayName ?? "") || notes !== (editing?.notes ?? "") || tags !== joinTags(editing?.tags ?? [])
      || mail !== "" || removeMail;
  const asked = lookup.state !== "idle" && lookup.text === numberText ? lookup : null;
  // ⛔ THE ONE SAVE: a valid number the book did not refuse. A duplicate, an erased number or a check still running
  // keeps it disabled — and there is no second way to save.
  const canSave = !pending && (isAdd
    ? verdict.stage === "ok" && asked !== null && asked.state !== "checking" && asked.state !== "duplicate" && asked.state !== "refused"
    : true);
  const errorAt = (field: ContactFormField): string | undefined =>
    (refusal !== null && refusal.field === field ? refusal.message : undefined);
  const chip = verdict.operator !== null && (verdict.stage === "typing" || verdict.stage === "ok") ? verdict.operator : null;
  const editChip = editing ? contactOperatorChip(editing.ndc) : null;

  const close = () => {
    if (!pending) onClose();
  };

  /** A refusal stays in the dialog, beside what the officer typed. A duplicate or an erased number answers on the
   *  number's own line (the existing contact's link, or nothing to open); a field refusal sits under its field; the
   *  gate, the rate rule, a stale edit or a failure is said above the buttons. */
  const refuse = (r: ActionRefusal) => {
    if (r.reason === "duplicate" && typeof r.existingId === "string") {
      setLookup({ state: "duplicate", text: numberText, sentence: r.error, existingId: r.existingId });
    } else if (r.reason === "erased") {
      setLookup({ state: "refused", text: numberText, sentence: r.error });
    } else {
      const field = asField(r.field);
      setRefusal({ field, message: r.error, stale: r.reason === "stale" });
      if (field !== null) focusFirstInvalid(formRef.current, [field]);
    }
    toast({ title: isAdd ? CONTACT_ADD_FAILED : CONTACT_SAVE_FAILED, description: r.error, variant: "danger" });
  };

  const submit = () => {
    if (pending) return;
    setSettled(true);
    if (!canSave) return;
    setRefusal(null);
    if (mode.kind === "add") {
      const request = { number: numberText, displayName: name, email: mail, notes, tags };
      startTransition(async () => {
        const r = await runAdminAction(() => addContactAction(request));
        if (!r.ok) {
          refuse(r);
          return;
        }
        onDone();
        router.refresh();
        deferToast({
          title: CONTACT_ADDED,
          // 🔴 A1.1 · the mirrored consent is read off the REPLY, which carries it for a reader only.
          description: "consent" in r && r.consent !== undefined ? contactAddedConsent(CONSENT_LABEL[r.consent].label) : undefined,
          variant: "success",
        });
      });
      return;
    }
    const contact = mode.contact;
    const request = {
      id: contact.id,
      displayName: name,
      // null KEEPS the stored address (the dialog never holds it); "" removes it; any text replaces it.
      email: removeMail ? "" : mail.trim() === "" ? null : mail,
      notes,
      tags,
      expectedUpdatedAt: contact.updatedAt,
    };
    startTransition(async () => {
      const r = await runAdminAction(() => editContactAction(request));
      if (!r.ok) {
        refuse(r);
        return;
      }
      onDone();
      deferToast({ title: CONTACT_SAVED, variant: "success" });
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      labelledBy={headingId}
      maxWidth={480}
      closeOnScrim={!dirty && !pending}
      closeOnEsc={!dirty && !pending}
      showClose={!pending}
      ariaBusy={pending}
      initialFocus={isAdd ? numberRef : nameRef}
    >
      <div>
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{CONTACT_FORM.eyebrow}</p>
        <h2 id={headingId} className="mt-0.5 pr-8 font-display text-title-sm font-bold text-text leading-tight">
          {isAdd ? CONTACT_FORM.addTitle : CONTACT_FORM.editTitle}
        </h2>
      </div>
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-4 space-y-4"
        data-contact-form={mode.kind}
      >
        {mode.kind === "add" ? (
          <div>
            <Field label={CONTACT_FORM.numberLabel} error={errorAt("number")} dataField="number">
              <PhoneInput
                ref={numberRef}
                value={digits}
                onChange={onNumberChange}
                onPasteRaw={onPasteRaw}
                onBlur={() => setSettled(true)}
                title={CONTACT_NUMBER_TITLE}
                disabled={pending}
              />
            </Field>
            <NumberVerdictLine verdict={verdict} asked={asked} chip={chip} hrefParams={mode.hrefParams} />
          </div>
        ) : (
          <div data-field="number">
            <FieldLegend className="block mb-1.5">{CONTACT_FORM.numberLabel}</FieldLegend>
            <div className="flex flex-wrap items-center gap-2">
              <span data-contact-number>{mode.numberSlot}</span>
              {editChip !== null && <OperatorChip chip={editChip} />}
            </div>
            <p className="mt-1.5 text-body-sm text-text-subtle">{CONTACT_NUMBER_FIXED}</p>
          </div>
        )}

        <Field label={CONTACT_FORM.nameLabel} error={errorAt("displayName")} dataField="displayName">
          <Input
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearRefusal("displayName");
            }}
            maxLength={NAME_MAX}
            autoComplete="off"
            disabled={pending}
            error={errorAt("displayName") !== undefined}
          />
        </Field>

        {mode.kind === "edit" && mode.contact.hasEmail ? (
          <div data-field="email">
            <FieldLegend className="block mb-1.5">{CONTACT_FORM.emailLabel}</FieldLegend>
            <div className="flex flex-wrap items-center gap-2" data-contact-email>{mode.emailSlot}</div>
            {!removeMail && (
              <div className="mt-2">
                <Input
                  type="email"
                  inputMode="email"
                  aria-label={CONTACT_EMAIL_NEW_LABEL}
                  value={mail}
                  onChange={(e) => {
                    setMail(e.target.value);
                    clearRefusal("email");
                  }}
                  maxLength={MAIL_MAX}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={pending}
                  error={errorAt("email") !== undefined}
                />
              </div>
            )}
            {errorAt("email") !== undefined
              ? <p className="mt-1.5 text-body-sm text-danger-fg">{errorAt("email")}</p>
              : <p className="mt-1.5 text-body-sm text-text-subtle">{removeMail ? CONTACT_EMAIL_REMOVING : CONTACT_EMAIL_KEEP_HINT}</p>}
            <div className="mt-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setRemoveMail((v) => !v);
                  setMail("");
                  clearRefusal("email");
                }}
              >
                {removeMail ? CONTACT_EMAIL_KEEP : CONTACT_EMAIL_REMOVE}
              </Button>
            </div>
          </div>
        ) : (
          <Field label={CONTACT_FORM.emailLabel} hint={CONTACT_EMAIL_HINT} error={errorAt("email")} dataField="email">
            <Input
              type="email"
              inputMode="email"
              value={mail}
              onChange={(e) => {
                setMail(e.target.value);
                clearRefusal("email");
              }}
              maxLength={MAIL_MAX}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={pending}
              error={errorAt("email") !== undefined}
            />
          </Field>
        )}

        <Field
          label={CONTACT_FORM.notesLabel}
          hint={contactNotesCount(charCount(notes), NOTES_MAX)}
          error={errorAt("notes")}
          dataField="notes"
        >
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              clearRefusal("notes");
            }}
            maxLength={NOTES_MAX}
            rows={3}
            disabled={pending}
            aria-invalid={errorAt("notes") !== undefined || undefined}
          />
        </Field>

        <Field label={CONTACT_FORM.tagsLabel} hint={CONTACT_TAGS_HINT} error={errorAt("tags")} dataField="tags">
          <Input
            value={tags}
            onChange={(e) => {
              setTags(e.target.value);
              clearRefusal("tags");
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={pending}
            error={errorAt("tags") !== undefined}
          />
        </Field>

        {/* ⛔ NO CONSENT CONTROL: a statement, never a choice. The add dialog states the list's own "Not recorded";
            the edit dialog shows the row's mirrored consent ONLY when the server handed a reader's view (A1.1). */}
        <div data-block="contact-consent" className="rounded-md border border-border-subtle p-3">
          <FieldLegend className="block mb-1.5">{CONTACT_FORM.consent}</FieldLegend>
          {mode.kind === "add" ? (
            <Chip size="sm" variant={CONSENT_LABEL.UNKNOWN.variant}>{CONSENT_LABEL.UNKNOWN.label}</Chip>
          ) : mode.contact.reader !== null ? (
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm" variant={mode.contact.reader.consentVariant}>{mode.contact.reader.consentLabel}</Chip>
              <span className="text-body-sm text-text-secondary">{`${CONTACT_FORM.source}: ${mode.contact.reader.sourceLabel}`}</span>
            </div>
          ) : null}
          <p className="mt-1.5 text-body-sm text-text-secondary">{CONTACT_CONSENT_NOTE}</p>
        </div>

        {editing !== null && <p className="text-body-sm text-text-subtle">{`${CONTACT_FORM.added} ${editing.addedLabel}`}</p>}

        {refusal !== null && refusal.field === null && (
          <Callout tone="danger" role="alert">
            <span className="block">{refusal.message}</span>
            {refusal.stale && (
              <span className="mt-2 block">
                <Button type="button" size="sm" variant="ghost" onClick={() => router.refresh()}>
                  {CONTACT_FORM.reload}
                </Button>
              </span>
            )}
          </Callout>
        )}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>
            {CONTACT_FORM.cancel}
          </Button>
          <Button type="submit" size="md" variant="primary" disabled={!canSave} loading={pending}>
            {isAdd ? CONTACT_FORM.save : CONTACT_FORM.saveEdit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

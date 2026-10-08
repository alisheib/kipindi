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
 * ⭐ vb7 · EVERY FIELD SAYS ITS OWN PROBLEM BEFORE SAVE — the shared rule, live (`contactFormProblems`, the very rule the
 * server answers with): a name holding a number or past 120 characters, an email that is not one (judged once its box is
 * left), notes past 1,000, a bad tag — all at once, each under its field, with counters that stay beside an error. Save
 * stays off, EVERY problem that holds it said in words (the email's too, before its box is left), until every field is
 * within its rule AND something was typed or changed (an edit with nothing changed no longer writes). ⛔ NOTHING IS EVER
 * CUT: no box has a `maxLength` (it counts UTF-16 units, the rules count characters) — the counter and the sentence
 * refuse. A refused number paints the box and is read as invalid; only a settled answer is spoken, never "4 of 9 digits".
 * A number check refused for the 2-step sign-in holds Save with that sentence — the Save's step-up would redirect and lose
 * the typing. ✕ and Cancel ask before typing is thrown away, and the page guard asks before a link or the tab leaves typed
 * fields (never for the number alone); a view-only officer's boxes are read-only, the reason on screen. The toasts name
 * the contact, and a field's refusal is the "factual" toast.
 *
 * Guard: `test:contacts-form` §6 (this file's shape) · red: `red:contacts-form`.
 */
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { ChangeEvent, ReactNode, RefObject } from "react";
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
import { useT } from "@/lib/i18n";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { contactNumberVerdict, contactOperatorChip, governingPaste } from "@/lib/contacts/contact-number";
import type { ContactNumberVerdict, ContactOperatorChip } from "@/lib/contacts/contact-number";
import { CONTACT_LIMITS, charCount, cleanDisplayName, cleanNotes, contactFormProblems, joinTags, splitTags } from "@/lib/contacts/contact-fields";
import type { ContactFormFieldKey } from "@/lib/contacts/contact-fields";
import type { ContactFormField, ContactNumberLookup } from "@/lib/server/contacts/contact-write";
import { addContactAction, editContactAction, lookupContactNumberAction } from "./contact-form-actions";
import { contactsHref } from "./contacts-query";
import type { ContactEditView } from "./contacts-loader";
import {
  CONSENT_LABEL, CONTACT_FORM, CONTACT_CONSENT_NOTE, CONTACT_NUMBER_HINT, CONTACT_NUMBER_TITLE, CONTACT_NUMBER_FIXED,
  CONTACT_CHECKING, CONTACT_OPEN_EXISTING, CONTACT_EMAIL_HINT, CONTACT_TAGS_HINT, CONTACT_EMAIL_KEEP_HINT,
  CONTACT_EMAIL_NEW_LABEL, CONTACT_EMAIL_REMOVE, CONTACT_EMAIL_KEEP, CONTACT_EMAIL_REMOVING, CONTACT_ADDED,
  CONTACT_ADDED_FILTERED, CONTACT_ADD_FAILED, CONTACT_SAVE_FAILED, CONTACT_EDIT_FAILED, contactRangeTitle,
  contactRangeDisputedTitle, contactCharacterCount, contactTagsCount, contactAddedConsent, contactAddedWho, contactSavedTitle,
} from "./contacts-copy";

/** What the dialog is doing: adding (with the page's link params, for the duplicate's link), or editing one row. */
type FormMode =
  | { kind: "add"; hrefParams: Record<string, string> }
  | { kind: "edit"; contact: ContactEditView; numberSlot: ReactNode; emailSlot: ReactNode };

/** The book's answer for the number on screen. `text` is the number it was asked about: an answer for a number no
 *  longer on screen is never shown. `unknown` = the check itself failed — Save stays possible, the create decides.
 *  `factor` (vb7 review m3) = the check was refused for the 2-step sign-in (lapsed, or never set up) — Save is HELD,
 *  because the Save's own step-up would redirect and lose the typing; the sentence says what to do in another tab. */
type Lookup =
  | { state: "idle" }
  | { state: "checking"; text: string }
  | { state: "free"; text: string }
  | { state: "duplicate"; text: string; sentence: string; existingId: string }
  | { state: "refused"; text: string; sentence: string }
  | { state: "unknown"; text: string; sentence: string }
  | { state: "factor"; text: string; sentence: string };

type Refusal = { field: ContactFormField | null; message: string; stale: boolean };
type ActionRefusal = { ok: false; error: string; field?: string; reason?: string; existingId?: string };

/** The ONE limits table's bounds for the typed fields (C12). ⚠️ Destructured, never read as `.email`: `test:read-tiers`
 *  §7 reads `{… .email …}` in an admin .tsx as a raw email render, and the rule is kept true by construction.
 *  ⛔ vb7 (review m7) · NO BOX HAS A `maxLength`. It counts UTF-16 units while the rules count characters, so a cap at a
 *  limit cut 121 emoji to an accepted 120, and any cap can cut a paste — leading spaces and all — down to a value the rule
 *  accepts. The counters and the rule's own sentences refuse; nothing is ever cut. */
const { displayName: NAME_MAX, notes: NOTES_MAX, tags: TAGS_MAX } = CONTACT_LIMITS;

const FORM_FIELDS: readonly ContactFormField[] = ["number", "displayName", "email", "notes", "tags"];
const asField = (f: unknown): ContactFormField | null =>
  FORM_FIELDS.find((k) => k === f) ?? null;

/** The lookup action's reply, as the dialog keeps it. */
function lookupFrom(text: string, r: { ok: true; lookup: ContactNumberLookup } | { ok: false; error: string; secondFactor?: true }): Lookup {
  // vb7 (review m3) · refused for the 2-step sign-in: Save is held on it — never left to meet the step-up redirect.
  if (!r.ok) return r.secondFactor === true ? { state: "factor", text, sentence: r.error } : { state: "unknown", text, sentence: r.error };
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

/** The operator chip. vb7: a disputed prefix (060) is explained in plain words (`contactRangeDisputedTitle`), never with
 *  the numbering table's developer note. */
function OperatorChip({ chip }: { chip: ContactOperatorChip }) {
  return (
    <Chip size="sm" variant={chip.disputed !== null ? "warning" : "info"} title={chip.disputed !== null ? contactRangeDisputedTitle(chip.brand) : contactRangeTitle(chip.brand)} data-operator-chip={chip.ndc}>
      {chip.brand}
    </Chip>
  );
}

/** ⭐ vb7 · A FIELD'S COUNTER, outside the Field — the Field's error replaces its hint, and the counter must stay on screen
 *  next to an error — red once the count passes the limit. */
function FieldCount({ id, over, children }: { id: string; over: boolean; children: ReactNode }) {
  return (
    <p id={id} className={over ? "mt-1 text-body-sm tabular-nums text-danger-fg" : "mt-1 text-body-sm tabular-nums text-text-subtle"} data-field-count>
      {children}
    </p>
  );
}

/**
 * The number's line under the field: the book's answer when there is one for this number, else the live verdict.
 * ⭐ vb7 · it carries an id — the number box and Save are described by it — and it is NOT a live region: "4 of 9 digits"
 * announced on every keystroke is noise. A settled answer (refused, ok, or the book's) is spoken through the one region
 * beside it.
 */
function NumberVerdictLine({
  id, verdict, asked, chip, hrefParams, existingRef, onRecheck,
}: {
  id: string;
  verdict: ContactNumberVerdict;
  asked: Lookup | null;
  chip: ContactOperatorChip | null;
  hrefParams: Record<string, string>;
  existingRef: RefObject<HTMLAnchorElement | null>;
  /** vb7 (review m3) · ask the book again — once the 2-step sign-in is put right in another tab. */
  onRecheck: () => void;
}) {
  let line: ReactNode;
  let announce = "";
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
          ref={existingRef}
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
    announce = asked.sentence;
  } else if (asked !== null && asked.state === "refused") {
    line = <span className="text-body-sm text-danger-fg">{asked.sentence}</span>;
    announce = asked.sentence;
  } else if (asked !== null && asked.state === "factor") {
    // vb7 (review m3) · the 2-step sign-in to put right, in another tab — Save waits on it, and "Check again" asks anew.
    line = (
      <>
        <span className="text-body-sm text-danger-fg">{asked.sentence}</span>
        <Button type="button" size="sm" variant="ghost" onClick={onRecheck} data-number-recheck>
          {CONTACT_FORM.checkAgain}
        </Button>
      </>
    );
    announce = asked.sentence;
  } else if (asked !== null && asked.state === "unknown") {
    line = <span className="text-body-sm text-text-secondary">{asked.sentence}</span>;
    announce = asked.sentence;
  } else if (verdict.stage === "refused") {
    line = <span className="text-body-sm text-danger-fg">{verdict.sentence}</span>;
    announce = verdict.sentence ?? "";
  } else if (verdict.stage === "empty") {
    line = <span className="text-body-sm text-text-subtle">{CONTACT_NUMBER_HINT}</span>;
  } else {
    line = <span className="text-body-sm text-text-secondary">{verdict.sentence}</span>;
    if (verdict.stage === "ok") announce = verdict.sentence ?? "";
  }
  return (
    <>
      <div
        id={id}
        className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1"
        data-number-verdict={verdict.stage}
        data-number-lookup={asked === null ? "idle" : asked.state}
      >
        {chip !== null && <OperatorChip chip={chip} />}
        {line}
      </div>
      {/* ⭐ vb7 · the number's ONE live region: a settled answer only — never the "N of 9 digits" progress line. */}
      <p className="sr-only" aria-live="polite" data-number-announce>{announce}</p>
    </>
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
  // §A7 · the optional mark is the dictionary's (t.common.optional), never typed into a label.
  const { t } = useT();
  // ⛔ THE DIALOG IS AN ACT CONTROL TOO (the U22 review): a view-only officer reaches ?edit= by a typed or shared link,
  // or keeps a dialog open across a revoked grant — Save and the email toggle are disabled WITH the reason, never
  // pressed into a refusal that writes a SECURITY row.
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const [digits, setDigits] = useState("");
  const [pasted, setPasted] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  // ⭐ C2 · a "+" typed into the EMPTY box: the number is being written internationally, so its digits are judged as
  // written (`contactNumberVerdict`'s typedPlus) — a typed +254… is foreign, never "a landline in Mbeya". Cleared when a
  // paste governs the box or the box empties (`+255` itself empties it: Tanzania's own code is stripped).
  const [typedPlus, setTypedPlus] = useState(false);
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  // vb7 (review m3) · bumped by "Check again": the same number asked anew once the 2-step sign-in is put right.
  const [checkRound, setCheckRound] = useState(0);
  const [name, setName] = useState(editing?.displayName ?? "");
  const [mail, setMail] = useState("");
  // vb7 · the email is judged once its box has been left (or Save pressed) — never mid-word.
  const [mailTouched, setMailTouched] = useState(false);
  const [removeMail, setRemoveMail] = useState(false);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [tags, setTags] = useState(editing ? joinTags(editing.tags) : "");
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  // vb7 · ✕ or Cancel pressed with typing in the boxes: the dialog asks before throwing it away.
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [, startCheck] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const headingId = useId();
  const numberLineId = useId();
  const nameCountId = useId();
  const notesCountId = useId();
  const tagsCountId = useId();
  const saveReasonId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const existingRef = useRef<HTMLAnchorElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const pendingPaste = useRef<string | null>(null);
  /** vb7 · where focus goes once a refused Save's answer is on screen: the existing contact's link, or the number. */
  const focusAfter = useRef<"existing" | "number" | null>(null);

  const isAdd = mode.kind === "add";
  const verdict = contactNumberVerdict({ value: digits, pasted, settled, typedPlus });
  /** What the server parses: the paste as it was pasted when it produced the whole field (`governingPaste`), else the
   *  field's digits. */
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
  }, [isAdd, verdict.stage, numberText, checkRound]);

  // ⭐ vb7 · after a duplicate or an erased answer to Save, focus goes to the answer — "Open the existing contact", or the
  // number — so the next key acts on it.
  useEffect(() => {
    const want = focusAfter.current;
    if (want === null) return;
    focusAfter.current = null;
    if (want === "existing") existingRef.current?.focus();
    else numberRef.current?.focus();
  }, [lookup]);

  // vb7 · the discard question takes focus to its safe answer, "Keep editing".
  useEffect(() => {
    if (asking) keepEditingRef.current?.focus();
  }, [asking]);

  const onNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const paste = pendingPaste.current;
    pendingPaste.current = null;
    // C2 · a paste replaces what was typed, and a box emptied after holding digits starts again (see `typedPlus`).
    if (paste !== null || (e.target.value === "" && digits !== "")) setTypedPlus(false);
    setDigits(e.target.value);
    setPasted(governingPaste(paste, e.target.value));
    setSettled(false);
    if (refusal !== null && refusal.field === "number") setRefusal(null);
  };
  const onPasteRaw = (text: string) => {
    pendingPaste.current = text;
    // A short paste of clean digits that fits the box is inserted by the browser after this handler, as typing — nothing
    // to judge there, so the marker is dropped before that edit arrives. A whole-number or overflowing paste replaces the
    // box inside the handler, before this microtask, so its marker governs (vb3).
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
  // vb7 (review m5a) · what the page guard keeps: anything typed into the four free fields — never the number alone, so
  // following a duplicate's "Open the existing contact" after typing only the number asks nothing.
  const fieldsTyped = isAdd ? name !== "" || mail !== "" || notes !== "" || tags !== "" : dirty;
  /* ⭐ vb7 · THE SHARED RULE, LIVE — every field's problem at once, in the dialog's words (`contactFormProblems`, the very
     rule `addContact` and `editContact` answer with). An edit's empty replacement box keeps the stored address, so it is
     no problem; the email is shown once its box has been left. */
  const typedMail = removeMail ? "" : mail;
  const problems = contactFormProblems({ displayName: name, email: typedMail, notes, tags });
  const firstProblem = problems[0]?.sentence ?? null;
  // What is SAID: an email's problem waits until its box has been left (or Save pressed) — Save waits on it regardless.
  const shownProblems = problems.filter((p) => p.field !== "email" || mailTouched);
  const problemAt = (field: ContactFormFieldKey): string | undefined => shownProblems.find((p) => p.field === field)?.sentence;
  const nameUsed = charCount(cleanDisplayName(name) ?? "");
  const notesUsed = charCount(cleanNotes(notes) ?? "");
  const tagsUsed = splitTags(tags).length;
  // ⛔ THE ONE SAVE: a valid number the book did not refuse. A duplicate, an erased number or a check still running
  // keeps it disabled — and there is no second way to save. ⭐ vb7 · and only with something to save and every field within
  // its rule: an edit with nothing changed (it used to write anyway, moving the stamp under another officer's open dialog)
  // or a field the rule refuses keeps it disabled, the first problem its stated reason.
  const canSave = !pending && mayAct && dirty && firstProblem === null && (isAdd
    ? verdict.stage === "ok" && asked !== null && asked.state !== "checking" && asked.state !== "duplicate" && asked.state !== "refused"
      && asked.state !== "factor"
    : true);
  /** A field's line: the server's refusal for it, else (vb7) the shared rule's live problem. */
  const errorAt = (field: ContactFormField): string | undefined => {
    if (refusal !== null && refusal.field === field) return refusal.message;
    return field === "number" ? undefined : problemAt(field);
  };
  // vb7 (review m6) · WHY SAVE IS OFF, in words a phone can see (a disabled button's title is not): the act gate's reason
  // for a view-only officer; else EVERY problem that holds it — the 2-step sign-in the number check was refused for, and
  // each field the rule refuses, the email's too while its box is still being typed in (its line under the box waits for
  // the blur; this reason does not). A refused or booked number is said on the number's own line, which Save names too.
  const blockers = [...(asked !== null && asked.state === "factor" ? [asked.sentence] : []), ...problems.map((p) => p.sentence)];
  const saveReason = !mayAct ? (actReason ?? null) : blockers.length > 0 ? blockers.join(" ") : null;
  const saveTitle = blockers.length > 0 ? blockers.join(" ") : undefined;
  const saveDescribedBy = [isAdd ? numberLineId : null, saveReason !== null ? saveReasonId : null].filter((x) => x !== null).join(" ") || undefined;
  const chip = verdict.operator !== null && (verdict.stage === "typing" || verdict.stage === "ok") ? verdict.operator : null;
  const editChip = editing ? contactOperatorChip(editing.ndc) : null;

  /** ✕ and Cancel. ⭐ vb7 · with typing in the boxes they ASK first (Escape and the scrim already refuse while it is
   *  there); "Discard" is the deliberate press that throws it away. */
  const close = () => {
    if (pending) return;
    if (dirty) {
      setAsking(true);
      return;
    }
    onClose();
  };

  /** A refusal stays in the dialog, beside what the officer typed. A duplicate or an erased number answers on the
   *  number's own line (the existing contact's link, or nothing to open); a field refusal sits under its field; the
   *  gate, the rate rule, a stale edit or a failure is said above the buttons. */
  const refuse = (r: ActionRefusal) => {
    const field = asField(r.field);
    if (r.reason === "duplicate" && typeof r.existingId === "string") {
      setLookup({ state: "duplicate", text: numberText, sentence: r.error, existingId: r.existingId });
      focusAfter.current = "existing";
    } else if (r.reason === "erased") {
      setLookup({ state: "refused", text: numberText, sentence: r.error });
      focusAfter.current = "number";
    } else {
      setRefusal({ field, message: r.error, stale: r.reason === "stale" });
      if (field !== null) focusFirstInvalid(formRef.current, [field]);
    }
    // vb7 · a refusal about what was typed is a FACT about a field (the "factual" toast); the gate, the rate rule, a stale
    // edit or a failure stays the danger one.
    toast({ title: isAdd ? CONTACT_ADD_FAILED : CONTACT_SAVE_FAILED, description: r.error, variant: field !== null ? "factual" : "danger" });
  };

  const submit = () => {
    if (pending) return;
    setSettled(true);
    setMailTouched(true);
    if (!canSave) {
      // vb7 · Save pressed with a field the rule refuses: focus goes to the first such field, in screen order.
      const fields = problems.map((p) => p.field);
      if (fields.length > 0) focusFirstInvalid(formRef.current, fields);
      return;
    }
    setRefusal(null);
    if (mode.kind === "add") {
      const request = { number: numberText, displayName: name, email: mail, notes, tags };
      // vb7 · the toast's words, taken now: who was added, and whether the list on screen is narrowed.
      const addedName = cleanDisplayName(name);
      const lastTwo = digits.slice(-2);
      const filtered = Object.keys(mode.hrefParams).some((k) => k !== "sort" && k !== "dir");
      startTransition(async () => {
        const r = await runAdminAction(() => addContactAction(request));
        if (!r.ok) {
          refuse(r);
          return;
        }
        onDone();
        router.refresh();
        // 🔴 A1.1 · the mirrored consent is read off the REPLY, which carries it for a reader only.
        const consentLine = "consent" in r && r.consent !== undefined ? contactAddedConsent(CONSENT_LABEL[r.consent].label) : null;
        deferToast({
          title: CONTACT_ADDED,
          // ⭐ vb7 · the toast names the contact, and says when the list on screen may not show it.
          description: [contactAddedWho(addedName, lastTwo), filtered ? CONTACT_ADDED_FILTERED : null, consentLine].filter((x) => x !== null).join(" "),
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
      // vb7 · the toast names what changed ("Contact saved — name and tags updated.").
      deferToast({ title: contactSavedTitle(r.changed), variant: "success" });
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
                onKeyDown={(e) => { if (e.key === "+" && digits === "") setTypedPlus(true); }}
                onBeforeInput={(e) => { if (((e.nativeEvent as InputEvent).data ?? "").includes("+") && digits === "") setTypedPlus(true); }}
                onBlur={() => setSettled(true)}
                title={CONTACT_NUMBER_TITLE}
                disabled={pending}
                readOnly={!mayAct}
                error={verdict.stage === "refused" || errorAt("number") !== undefined}
                aria-describedby={numberLineId}
              />
            </Field>
            <NumberVerdictLine
              id={numberLineId}
              verdict={verdict}
              asked={asked}
              chip={chip}
              hrefParams={mode.hrefParams}
              existingRef={existingRef}
              onRecheck={() => setCheckRound((n) => n + 1)}
            />
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

        <div>
          <Field label={CONTACT_FORM.nameLabel} optional error={errorAt("displayName")} dataField="displayName">
            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearRefusal("displayName");
              }}
              autoComplete="off"
              disabled={pending}
              readOnly={!mayAct}
              error={errorAt("displayName") !== undefined}
              aria-describedby={nameCountId}
            />
          </Field>
          <FieldCount id={nameCountId} over={nameUsed > NAME_MAX}>{contactCharacterCount(nameUsed, NAME_MAX)}</FieldCount>
        </div>

        {mode.kind === "edit" && mode.contact.hasEmail ? (
          <div>
            <FieldLegend className="block mb-1.5">{CONTACT_FORM.emailLabel}{" "}<span className="font-normal">{t.common.optional}</span></FieldLegend>
            <div className="flex flex-wrap items-center gap-2" data-contact-email>{mode.emailSlot}</div>
            {!removeMail && (
              // ⭐ The field marker sits on the INPUT's wrapper, not the block's: focusFirstInvalid takes the first
              // control inside it, and the block opens with the reveal eye (the U22 review).
              <div className="mt-2" data-field="email">
                <Input
                  type="email"
                  inputMode="email"
                  aria-label={CONTACT_EMAIL_NEW_LABEL}
                  value={mail}
                  onChange={(e) => {
                    setMail(e.target.value);
                    clearRefusal("email");
                  }}
                  onBlur={() => setMailTouched(true)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={pending}
                  readOnly={!mayAct}
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
                disabled={pending || !mayAct}
                title={mayAct ? undefined : actReason}
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
          <Field label={CONTACT_FORM.emailLabel} optional hint={CONTACT_EMAIL_HINT} error={errorAt("email")} dataField="email">
            <Input
              type="email"
              inputMode="email"
              value={mail}
              onChange={(e) => {
                setMail(e.target.value);
                clearRefusal("email");
              }}
              onBlur={() => setMailTouched(true)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={pending}
              readOnly={!mayAct}
              error={errorAt("email") !== undefined}
            />
          </Field>
        )}

        <div>
          <Field label={CONTACT_FORM.notesLabel} optional error={errorAt("notes")} dataField="notes">
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                clearRefusal("notes");
              }}
              rows={3}
              disabled={pending}
              readOnly={!mayAct}
              aria-invalid={errorAt("notes") !== undefined || undefined}
              aria-describedby={notesCountId}
            />
          </Field>
          <FieldCount id={notesCountId} over={notesUsed > NOTES_MAX}>{contactCharacterCount(notesUsed, NOTES_MAX)}</FieldCount>
        </div>

        <div>
          <Field label={CONTACT_FORM.tagsLabel} optional hint={CONTACT_TAGS_HINT} error={errorAt("tags")} dataField="tags">
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
              readOnly={!mayAct}
              error={errorAt("tags") !== undefined}
              aria-describedby={tagsCountId}
            />
          </Field>
          <FieldCount id={tagsCountId} over={tagsUsed > TAGS_MAX}>{contactTagsCount(tagsUsed, TAGS_MAX)}</FieldCount>
        </div>

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

        {asking ? (
          // ⭐ vb7 · ✕ and Cancel asked first — Discard throws the typing away, Keep editing (focused) goes back to it.
          <div className="space-y-2" data-discard-ask>
            <Callout tone="warning" role="alert">{CONTACT_FORM.discardAsk}</Callout>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" size="md" variant="ghost" onClick={onClose}>
                {CONTACT_FORM.discard}
              </Button>
              <Button ref={keepEditingRef} type="button" size="md" variant="primary" onClick={() => setAsking(false)}>
                {CONTACT_FORM.keepEditing}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* vb7 · why Save is off, in words a phone can see — the act gate's reason, or the first field's problem. */}
            {saveReason !== null && (
              <p id={saveReasonId} className="text-body-sm text-text-secondary" data-save-reason>{saveReason}</p>
            )}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>
                {CONTACT_FORM.cancel}
              </Button>
              <Button type="submit" size="md" variant="primary" disabled={!canSave} loading={pending} title={mayAct ? saveTitle : actReason} aria-describedby={saveDescribedBy}>
                {isAdd ? CONTACT_FORM.save : CONTACT_FORM.saveEdit}
              </Button>
            </div>
          </>
        )}
      </form>
      {/* ⭐ vb7 (review m5a) · the tab closing, or a link leaving, with typed fields: the kit's own ask. ✕ and Cancel keep
          the dialog's own question above. */}
      <UnsavedChangesGuard dirty={open && fieldsTyped} body={CONTACT_FORM.unsavedBody} />
    </Modal>
  );
}

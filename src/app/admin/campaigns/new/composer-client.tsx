"use client";

/**
 * U37b · THE COMPOSER — the Message card's form, the Audience card's words and the Test card, sharing ONE state.
 *
 * ⭐ THE CARDS ARE THE SERVER'S, THE STATE IS OURS. The page renders each `AdminCard` (its chrome lives in
 * `admin-shell`, which a client module must never import — it reaches the store), and `ComposerProvider`, a client
 * provider wrapped around all three, holds what they share: the five fields, the saved snapshot, the refusal, the test.
 * The three bodies (`ComposerMessage`, `ComposerAudience`, `ComposerTest`) read it through one hook.
 *
 * ⭐ THE COUNTER IS THE RENDERER'S. Each variant's live counter is `validateCampaignTemplate` → `counterFor` — the ONE
 * worst-case counter in `campaign-template.ts` (the reserved name, the source line or its room, the statutory footer) —
 * and nothing in this directory sizes a message itself (`test:campaign-compose` §16.2). The server re-validates on
 * save and stores ITS figures; the screen is a preview of that verdict, never a substitute for it.
 * ⛔ OD45 · NO SENDER INPUT: the sender line is the server's, read-only. ⛔ NO NUMBER INPUT: the test card names the
 * officer's own number, masked, and has nothing to type into. ⛔ OD24 · NO MONEY on this page.
 * ⭐ ONE SAVE. Save is disabled WITH its reason (beside it and in its title), never hidden; a refusal keeps the text.
 * ⭐ THE TEST SENDS THE SAVED TEXT: unsaved or edited text disables it ("Save first"), and the preview is the server's
 * rendering of the saved revision — the exact text, its footer's line break and its real link included.
 * ⛔ AN ACT CONTROL: `useMayAct()` disables Save and the tests with the reason for a view-only role, and both actions
 * re-check on the server (`softRequireStaff`).
 * ⭐ VALIDATION TAKES YOU THERE (validation audit, 2026-10-03): the "Can't save yet" reason is a button to the field it
 * names (`focusFirstInvalid`, its result read) — the Audience card included, which carries `data-field="audience"` and
 * takes focus only while it shows a problem. The name is never cut by `maxLength`: the verdict's sentence refuses past
 * the limit. A refusal offers only the next step that can work — a stale save, or a draft confirmed since, loads the
 * stored version only after a confirmation, and either can keep the officer's text as a NEW draft; a missing draft can
 * be saved as a new one; and the budget's, the role's and an unfinished save's sentences print alone, with no blind
 * retry. ⛔ A new draft keeps the audience on screen (`carry`), or is not offered — never the whole book by omission.
 * The saved line names the test below only when this page can send one.
 */
import { createContext, useContext, useRef, useState, useTransition } from "react";
import type { ReactNode, RefObject } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ui/modal";
import { FormColumn } from "@/components/ui/form-column";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { validateCampaignTemplate, scanPlaceholders } from "@/lib/marketing/campaign-template";
import type { CampaignDraftFields, CampaignVariant, TemplateVerdict } from "@/lib/marketing/campaign-template";
import { campaignDraftHref } from "@/lib/marketing/campaign-status";
import { foldToGsm7 } from "@/lib/sms-compose";
import type { CampaignDraftField } from "@/lib/server/marketing/campaign-draft";
import type { CampaignTestResult } from "@/lib/server/marketing/campaign-test-send";
import { saveCampaignDraftAction, sendCampaignTestAction } from "./actions";
import { ComposerCounter } from "./composer-counter";
import type { ComposeView } from "./composer-loader";
import {
  COMPOSE_AUDIENCE_CLEAR, COMPOSE_AUDIENCE_EVERYONE, COMPOSE_AUDIENCE_LEAD, COMPOSE_AUDIENCE_NOTE, COMPOSE_BODY_SW_HINT,
  COMPOSE_DISCARD_BODY, COMPOSE_DISCARD_CANCEL, COMPOSE_DISCARD_CONFIRM, COMPOSE_DISCARD_TITLE, COMPOSE_EN_NONE,
  COMPOSE_EN_RULE, COMPOSE_FIELD, COMPOSE_NO_CHANGES, COMPOSE_READ_ONLY, COMPOSE_RELOAD, COMPOSE_SAVE, COMPOSE_SAVE_AS_NEW,
  COMPOSE_SAVE_AS_NEW_AUDIENCE, COMPOSE_SAVE_FAILED, COMPOSE_TEST_BUDGET, COMPOSE_TEST_CONSENT_LINK, COMPOSE_TEST_EXACT,
  COMPOSE_TEST_NOT_DRAFT, COMPOSE_TEST_PREVIEW, COMPOSE_TEST_SAVE_FIRST, COMPOSE_TEST_SEND, COMPOSE_TEST_TOKEN_NOTE,
  COMPOSE_TEST_UPDATING, COMPOSE_TRY_AGAIN, composeSaveBlocked, composeSaved, composeTestHandedOver, composeTestTo,
} from "./composer-copy";

type ReadyView = Extract<ComposeView, { kind: "ready" }>;
type Fields = CampaignDraftFields;
type FieldKey = keyof Fields;
type Problems = Partial<Record<CampaignDraftField, string[]>>;

/** What was last saved, and when (null = loaded, not saved in this visit). */
type Saved = { id: string; draftRevision: number; savedAt: string | null; fields: Fields };
/**
 * A refusal, by its reason. `failed` is a save lost in transit (no reason came back): the text is kept and Try again
 * offered. `role`, `rate_limited` and `unfinished` are the actions' own — printed alone, with no retry that cannot work.
 */
type Refusal = {
  kind: "invalid" | "not_found" | "not_draft" | "stale" | "failed" | "role" | "rate_limited" | "unfinished";
  message: string;
};
type TestState =
  | { kind: "idle" }
  | { kind: "handed_over"; via: "stub" | "open"; at: string; text: string }
  | { kind: "refused"; reason: string; error: string }
  | { kind: "unconfirmed"; error: string; text: string }
  | { kind: "error"; error: string };

const EMPTY: Fields = { name: "", bodySw: "", bodyEn: "", nameFallbackSw: "", nameFallbackEn: "" };
const FIELD_ORDER: CampaignDraftField[] = ["name", "bodySw", "nameFallbackSw", "bodyEn", "nameFallbackEn", "sourcePhrase", "audience"];
/** The fields this page renders a `data-field` for — the source line is the server's, so a reason about it has no place to go. */
const ON_PAGE: ReadonlySet<CampaignDraftField> = new Set(["name", "bodySw", "nameFallbackSw", "bodyEn", "nameFallbackEn", "audience"]);
/** The refusals whose remedy is the officer's own consent switch, on their own profile. */
const CONSENT_REASONS = ["no_consent", "consent_withdrawn", "suppressed"];

const trimmed = (f: Fields): Fields => ({
  name: f.name.trim(), bodySw: f.bodySw.trim(), bodyEn: f.bodyEn.trim(), nameFallbackSw: f.nameFallbackSw.trim(), nameFallbackEn: f.nameFallbackEn.trim(),
});
const sameFields = (a: Fields, b: Fields): boolean => {
  const x = trimmed(a);
  const y = trimmed(b);
  return x.name === y.name && x.bodySw === y.bodySw && x.bodyEn === y.bodyEn && x.nameFallbackSw === y.nameFallbackSw && x.nameFallbackEn === y.nameFallbackEn;
};
const savedFrom = (view: ReadyView): Saved | null =>
  (view.draft === null ? null : { id: view.draft.id, draftRevision: view.draft.draftRevision, savedAt: null, fields: view.draft.fields });
/** The first refused field, in the screen's order — the one the Save reason names and takes the officer to. */
const firstKeyOf = (problems: Problems): CampaignDraftField | null => {
  for (const k of FIELD_ORDER) if (problems[k]?.[0]) return k;
  return null;
};

function testStateOf(r: CampaignTestResult | { ok: false; error: string }): TestState {
  if (!("outcome" in r)) return { kind: "error", error: r.error };
  if (r.outcome === "handed_over") return { kind: "handed_over", via: r.via, at: r.at, text: r.text };
  if (r.outcome === "unconfirmed") return { kind: "unconfirmed", error: r.error, text: r.text };
  return { kind: "refused", reason: r.reason, error: r.error };
}

/* ═══ THE SHARED STATE ═══════════════════════════════════════════════════════════════════════════════════════════ */

type Composer = {
  view: ReadyView;
  fields: Fields;
  setField: (k: FieldKey, v: string) => void;
  verdict: TemplateVerdict;
  problemAt: (k: CampaignDraftField) => string | undefined;
  saved: Saved | null;
  dirty: boolean;
  saving: boolean;
  canSave: boolean;
  saveBlocked: string | null;
  /** The field the Save reason names, when this page renders it — the reason is then a button that goes there. */
  blockedField: CampaignDraftField | null;
  goToBlocked: () => void;
  save: () => void;
  /** After `stale`, `not_draft` or `not_found`: the same text, saved as a NEW draft (no id) with the audience on screen. */
  saveAsNew: () => void;
  canSaveAsNew: boolean;
  /** Why "Save as a new draft" is off — said beside it, never hidden — or null. */
  saveAsNewBlocked: string | null;
  /**
   * After `stale` or `not_draft`: loading the stored version replaces the officer's text, so it is ASKED — the
   * provider's confirmation holds the only reload, and no card can call it directly.
   */
  askDiscard: (open: boolean) => void;
  refusal: Refusal | null;
  mayAct: boolean;
  actReason: string | undefined;
  test: TestState;
  testing: CampaignVariant | null;
  sendTest: (v: CampaignVariant) => void;
  formRef: RefObject<HTMLFormElement | null>;
};

const ComposerCtx = createContext<Composer | null>(null);

function useComposer(): Composer {
  const c = useContext(ComposerCtx);
  if (c === null) throw new Error("the composer cards render inside <ComposerProvider>");
  return c;
}

export function ComposerProvider({ view, children }: { view: ReadyView; children: ReactNode }) {
  const router = useRouter();
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<Fields>(view.draft?.fields ?? EMPTY);
  const [saved, setSaved] = useState<Saved | null>(savedFrom(view));
  const [boundId, setBoundId] = useState<string | null>(view.draft?.id ?? null);
  const [adopt, setAdopt] = useState(false);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [serverProblems, setServerProblems] = useState<Problems>({});
  const [discardAsked, setDiscardAsked] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: "idle" });
  const [testing, setTesting] = useState<CampaignVariant | null>(null);
  const [saving, startSave] = useTransition();
  const [, startTest] = useTransition();

  // ⭐ THE ADDRESS NAMES ANOTHER DRAFT, OR A NEWER REVISION WAS ASKED FOR. After this form's own create the address names
  // the draft just saved — adopted silently; a different draft is loaded fresh; and after "Reload" (a stale save, once
  // the officer confirmed it; or a draft confirmed since) the stored version replaces the text — a newer revision, or the
  // same one now read-only. Derived from props during render, as React allows, so no frame shows a mismatch.
  const loadedId = view.draft?.id ?? null;
  if (loadedId !== boundId) {
    setBoundId(loadedId);
    if (loadedId === null || loadedId !== saved?.id) {
      setFields(view.draft?.fields ?? EMPTY);
      setSaved(savedFrom(view));
      setRefusal(null);
      setServerProblems({});
      setTest({ kind: "idle" });
    }
  } else if (adopt && view.draft !== null && saved !== null && (view.draft.draftRevision !== saved.draftRevision || view.readOnly)) {
    setAdopt(false);
    setFields(view.draft.fields);
    setSaved(savedFrom(view));
    setRefusal(null);
    setServerProblems({});
  }

  const verdict = validateCampaignTemplate(fields, view.sourcePhrase);
  const dirty = saved === null ? !sameFields(fields, EMPTY) : !sameFields(fields, saved.fields);

  /** What a field shows: the server's refusal after a save, else the live verdict once there is something to judge. */
  const problemAt = (k: CampaignDraftField): string | undefined => {
    const server = serverProblems[k]?.[0];
    if (server) return server;
    if (k === "audience" || k === "sourcePhrase") return undefined;
    const live = verdict.problems[k]?.[0];
    if (!live) return undefined;
    if (k === "name" || k === "bodySw") return fields[k].trim() === "" ? undefined : live;
    if (k === "bodyEn" || k === "nameFallbackEn") return fields.bodyEn.trim() === "" ? undefined : live;
    return live;
  };

  // ⭐ Why a save can't go, and — when the reason is a field on this page — which one, so the reason can take the officer
  // there. These bar both saves; "nothing changed" bars only the save of the same draft, below.
  const liveProblems: Problems = verdict.problems;
  const firstKey = firstKeyOf(liveProblems);
  const shared: { reason: string; field: CampaignDraftField | null } | null = view.readOnly
    ? { reason: COMPOSE_READ_ONLY, field: null }
    : !mayAct
      ? { reason: actReason ?? COMPOSE_READ_ONLY, field: null }
      : view.audience.problem !== null
        ? { reason: composeSaveBlocked(view.audience.problem), field: "audience" }
        : !verdict.ok
          ? {
              reason: composeSaveBlocked((firstKey !== null ? liveProblems[firstKey]?.[0] : undefined) ?? COMPOSE_SAVE_FAILED),
              field: firstKey !== null && ON_PAGE.has(firstKey) ? firstKey : null,
            }
          : null;
  const blocked = shared ?? (saved !== null && !dirty ? { reason: COMPOSE_NO_CHANGES, field: null } : null);
  const saveBlocked: string | null = blocked?.reason ?? null;
  const blockedField: CampaignDraftField | null = blocked?.field ?? null;
  const canSave = saveBlocked === null && !saving;
  // ⛔ A NEW draft keeps the audience on screen (`carry`) or is not offered: posting none would make it the whole book.
  const saveAsNewBlocked: string | null = shared?.reason ?? (view.audience.carry === null ? COMPOSE_SAVE_AS_NEW_AUDIENCE : null);
  const canSaveAsNew = saveAsNewBlocked === null && !saving;

  /**
   * ⭐ TAKE THE OFFICER TO THE FIELD (`focusFirstInvalid`, in document order). The Message form and the Audience card are
   * sibling cards, so the search spans the page's main region. ⛔ The result is READ (§K rule 7d): a field that is not
   * rendered — nothing on this page today, since a reason only becomes a button for a field the page draws — is said in
   * the console, never dropped in silence.
   */
  const goToField = (keys: string[]) => {
    const root = formRef.current?.closest("main") ?? formRef.current;
    const landed = focusFirstInvalid(root, keys);
    if (!landed.ok && landed.reason === "not-rendered") {
      console.warn(`[campaign composer] "${landed.field}" is refused but not on screen`);
    }
  };
  const goToBlocked = () => {
    if (blockedField !== null) goToField([blockedField]);
  };

  const setField = (k: FieldKey, v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    if (serverProblems[k]) {
      setServerProblems((p) => {
        const next: Problems = { ...p };
        delete next[k];
        return next;
      });
    }
    if (refusal !== null && refusal.kind === "invalid") setRefusal(null);
  };

  /**
   * One save: the draft this form edits, or (`asNew`) a NEW draft carrying the same text — and the audience on screen,
   * written out (`carry`), because a new draft has no stored filter to keep.
   */
  const submit = (asNew: boolean) => {
    const submitted = trimmed(fields);
    const request = {
      id: asNew ? null : saved?.id ?? null,
      draftRevision: asNew ? null : saved?.draftRevision ?? null,
      ...submitted,
      audience: asNew ? view.audience.carry : view.audience.params,
    };
    setRefusal(null);
    startSave(async () => {
      const r = await runAdminAction(() => saveCampaignDraftAction(request));
      if (r.ok) {
        setSaved({ id: r.id, draftRevision: r.draftRevision, savedAt: r.savedAt, fields: submitted });
        setServerProblems({});
        setTest({ kind: "idle" });
        // ⭐ A new draft gets its address (?draft=<id>), so a reload reopens it; an edit re-reads the saved preview.
        if (r.created) router.replace(campaignDraftHref(r.id) as never, { scroll: false });
        else router.refresh();
        return;
      }
      if ("reason" in r && r.reason === "invalid") {
        setServerProblems(r.problems);
        goToField(Object.keys(r.problems));
        setRefusal({ kind: "invalid", message: r.error });
        return;
      }
      const kind: Refusal["kind"] = "reason" in r ? r.reason : "failed";
      // ⛔ A failure keeps every character the officer typed — the state is not touched. Only a save lost in transit
      // carries "Couldn't save … Try again." — every reason that came back is its own whole sentence.
      setRefusal({ kind, message: kind === "failed" ? `${COMPOSE_SAVE_FAILED} ${r.error}` : r.error });
    });
  };
  const save = () => {
    if (canSave) submit(false);
  };
  const saveAsNew = () => {
    if (canSaveAsNew) submit(true);
  };

  /** After a stale save, or a draft confirmed since — once the officer confirmed it: put the stored version on screen. */
  const reload = () => {
    setDiscardAsked(false);
    setAdopt(true);
    router.refresh();
  };

  const sendTest = (variant: CampaignVariant) => {
    const s = saved;
    if (s === null || dirty || testing !== null || !mayAct || view.readOnly) return;
    setTesting(variant);
    setTest({ kind: "idle" });
    startTest(async () => {
      const r = await runAdminAction(() => sendCampaignTestAction(s.id, variant));
      setTest(testStateOf(r));
      setTesting(null);
      // The preview now carries the officer's real stop link (minted by the first test).
      if ("outcome" in r && r.outcome === "handed_over") router.refresh();
    });
  };

  const value: Composer = {
    view, fields, setField, verdict, problemAt, saved, dirty, saving, canSave, saveBlocked, blockedField, goToBlocked, save,
    saveAsNew, canSaveAsNew, saveAsNewBlocked, askDiscard: setDiscardAsked, refusal, mayAct, actReason, test, testing,
    sendTest, formRef,
  };
  return (
    <ComposerCtx.Provider value={value}>
      {children}
      <UnsavedChangesGuard dirty={dirty && !saving} />
      {/* ⭐ Outside every <form>: a portal's events still bubble through React's tree, so the dialog never sits inside
          the composer's form, whose submit is Save. Loading the stored version replaces the officer's text — asked first. */}
      <ConfirmModal
        open={discardAsked}
        onClose={() => setDiscardAsked(false)}
        onConfirm={reload}
        title={COMPOSE_DISCARD_TITLE}
        body={COMPOSE_DISCARD_BODY}
        confirmLabel={COMPOSE_DISCARD_CONFIRM}
        cancelLabel={COMPOSE_DISCARD_CANCEL}
        tone="warning"
        tier="medium"
      />
    </ComposerCtx.Provider>
  );
}

/* ═══ THE MESSAGE CARD ═══════════════════════════════════════════════════════════════════════════════════════════ */

export function ComposerMessage() {
  const c = useComposer();
  const { view, fields, verdict } = c;
  const off = c.saving || view.readOnly || !c.mayAct;
  const phraseSet = view.sourcePhrase.trim() !== "";
  const swJina = scanPlaceholders(fields.bodySw).jina > 0;
  const enWritten = fields.bodyEn.trim() !== "";
  const enJina = enWritten && scanPlaceholders(fields.bodyEn).jina > 0;
  // ⛔ The saved line invites a test only when the test card beside it can send one — never one it would refuse.
  const canTest = view.test.liveNote === null && view.test.ownNumberMasked !== null && !view.sender.dead;
  const savedLine = c.saved?.savedAt && !c.dirty ? composeSaved(c.saved.savedAt, canTest) : null;
  const showReason = c.saveBlocked !== null && !c.saving && !(savedLine !== null && c.saveBlocked === COMPOSE_NO_CHANGES);

  return (
    <form
      ref={c.formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        c.save();
      }}
      className="space-y-4"
      data-compose-form={view.readOnly ? "read-only" : "draft"}
    >
      {view.readOnly && (
        <Callout tone="info" role="note">
          <span className="block" data-compose-read-only>{COMPOSE_READ_ONLY}</span>
        </Callout>
      )}
      <FormColumn measure="form" className="space-y-4">
        {/* ⛔ No maxLength: a pasted name is never cut silently — the verdict's sentence refuses it past the limit. */}
        <Field label={COMPOSE_FIELD.name} hint={COMPOSE_FIELD.nameHint} error={c.problemAt("name")} dataField="name">
          <Input
            value={fields.name}
            onChange={(e) => c.setField("name", e.target.value)}
            autoComplete="off"
            disabled={off}
            error={c.problemAt("name") !== undefined}
          />
        </Field>

        <div data-variant="SW">
          <Field label={COMPOSE_FIELD.bodySw} hint={COMPOSE_BODY_SW_HINT} error={c.problemAt("bodySw")} dataField="bodySw">
            {/* The Textarea atom has no error prop yet: the danger border is the markets wizard's own idiom. */}
            <Textarea
              value={fields.bodySw}
              onChange={(e) => c.setField("bodySw", e.target.value)}
              rows={4}
              disabled={off}
              aria-invalid={c.problemAt("bodySw") !== undefined || undefined}
              className={c.problemAt("bodySw") !== undefined ? "border-danger-500" : undefined}
            />
          </Field>
          <ComposerCounter
            counter={verdict.counters.SW}
            phraseSet={phraseSet}
            disabled={off}
            onFold={() => c.setField("bodySw", foldToGsm7(fields.bodySw))}
          />
        </div>
        {swJina && (
          <Field label={COMPOSE_FIELD.fallbackSw} hint={COMPOSE_FIELD.fallbackHint} error={c.problemAt("nameFallbackSw")} dataField="nameFallbackSw">
            <Input
              value={fields.nameFallbackSw}
              onChange={(e) => c.setField("nameFallbackSw", e.target.value)}
              autoComplete="off"
              disabled={off}
              error={c.problemAt("nameFallbackSw") !== undefined}
            />
          </Field>
        )}

        <div data-variant="EN">
          <Field label={COMPOSE_FIELD.bodyEn} error={c.problemAt("bodyEn")} dataField="bodyEn">
            <Textarea
              value={fields.bodyEn}
              onChange={(e) => c.setField("bodyEn", e.target.value)}
              rows={4}
              disabled={off}
              aria-invalid={c.problemAt("bodyEn") !== undefined || undefined}
              className={c.problemAt("bodyEn") !== undefined ? "border-danger-500" : undefined}
            />
          </Field>
          {verdict.counters.EN !== null && enWritten ? (
            <>
              <ComposerCounter
                counter={verdict.counters.EN}
                phraseSet={phraseSet}
                disabled={off}
                onFold={() => c.setField("bodyEn", foldToGsm7(fields.bodyEn))}
              />
              <p className="mt-1.5 text-body-sm text-text-secondary" data-compose-en-rule>{COMPOSE_EN_RULE}</p>
            </>
          ) : (
            <p className="mt-1.5 text-body-sm text-text-secondary" data-compose-en-rule>{COMPOSE_EN_NONE}</p>
          )}
        </div>
        {enJina && (
          <Field label={COMPOSE_FIELD.fallbackEn} hint={COMPOSE_FIELD.fallbackHint} error={c.problemAt("nameFallbackEn")} dataField="nameFallbackEn">
            <Input
              value={fields.nameFallbackEn}
              onChange={(e) => c.setField("nameFallbackEn", e.target.value)}
              autoComplete="off"
              disabled={off}
              error={c.problemAt("nameFallbackEn") !== undefined}
            />
          </Field>
        )}

        {/* ⛔ OD45 · the sender is a server constant: a line of text, never a control. */}
        <p className={`text-body-sm break-words ${view.sender.dead ? "text-danger-fg" : "text-text-secondary"}`} data-sender-line={view.sender.dead ? "dead" : "ok"}>
          {view.sender.line}
        </p>
        {view.sender.vars.length > 0 && (
          <p className="font-mono text-body-sm break-words text-text">
            {view.sender.vars.map((name) => <span key={name} className="block">{name}</span>)}
          </p>
        )}
      </FormColumn>

      {c.refusal !== null && c.refusal.kind !== "invalid" && (
        <Callout tone="danger" role="alert">
          <span className="block" data-compose-refusal={c.refusal.kind}>{c.refusal.message}</span>
          {/* ⭐ Only the next step that can work. A stale save, or a draft confirmed since: load the stored version — only
              through the confirmation, since it replaces the officer's text — or keep that text as a NEW draft. A missing
              draft: save as new. A save lost in transit: retry. The role's, the budget's and an unfinished save's
              sentences stand alone. */}
          {(c.refusal.kind === "stale" || c.refusal.kind === "not_draft") && (
            <span className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => c.askDiscard(true)} data-compose-reload={c.refusal.kind}>
                {COMPOSE_RELOAD}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={c.saveAsNew} disabled={!c.canSaveAsNew} title={c.saveAsNewBlocked ?? undefined} data-compose-save-new={c.refusal.kind}>
                {COMPOSE_SAVE_AS_NEW}
              </Button>
            </span>
          )}
          {c.refusal.kind === "not_found" && (
            <span className="mt-2 block">
              <Button type="button" size="sm" variant="ghost" onClick={c.saveAsNew} disabled={!c.canSaveAsNew} title={c.saveAsNewBlocked ?? undefined} data-compose-save-new="not_found">
                {COMPOSE_SAVE_AS_NEW}
              </Button>
            </span>
          )}
          {/* Why "Save as a new draft" is off, when the Save reason below does not already say it (its audience can't travel). */}
          {(c.refusal.kind === "stale" || c.refusal.kind === "not_draft" || c.refusal.kind === "not_found")
            && c.saveAsNewBlocked !== null && c.saveAsNewBlocked !== c.saveBlocked && (
            <span className="mt-1 block text-body-sm" data-compose-save-new-reason>{c.saveAsNewBlocked}</span>
          )}
          {c.refusal.kind === "failed" && (
            <span className="mt-2 block">
              <Button type="button" size="sm" variant="ghost" onClick={c.save} disabled={!c.canSave}>{COMPOSE_TRY_AGAIN}</Button>
            </span>
          )}
        </Callout>
      )}
      {c.refusal !== null && c.refusal.kind === "invalid" && (
        <p className="text-body-sm text-danger-fg" role="alert" data-compose-refusal="invalid">{c.refusal.message}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
        <Button
          type="submit"
          size="md"
          variant="primary"
          disabled={!c.canSave}
          loading={c.saving}
          title={c.saveBlocked ?? undefined}
          data-compose-save
        >
          {COMPOSE_SAVE}
        </Button>
        {/* ⭐ A reason about a field on this page is a button that goes there ("validation takes you to the place where
            the missing item is"); any other reason — read-only, the role, nothing to save — is plain text. */}
        {showReason && c.blockedField !== null && (
          <button
            type="button"
            onClick={c.goToBlocked}
            className="inline-flex items-center min-h-[var(--tap-min)] text-left text-body-sm text-text-secondary underline underline-offset-2 hover:text-text"
            data-compose-save-reason={c.blockedField}
          >
            {c.saveBlocked}
          </button>
        )}
        {showReason && c.blockedField === null && <span className="text-body-sm text-text-secondary" data-compose-save-reason>{c.saveBlocked}</span>}
        {savedLine !== null && <span className="text-body-sm text-success-fg" role="status" data-compose-saved>{savedLine}</span>}
      </div>
    </form>
  );
}

/* ═══ THE AUDIENCE CARD ══════════════════════════════════════════════════════════════════════════════════════════ */

export function ComposerAudience() {
  const c = useComposer();
  const router = useRouter();
  const a = c.view.audience;
  const problem = c.problemAt("audience") ?? a.problem;
  const flagged = problem !== null && problem !== undefined;
  return (
    // ⭐ `data-field="audience"`: the Save reason and a refused save take the officer HERE. ⛔ The programmatic tab stop and
    // its ring exist only while the card shows a problem — a tab stop that is always there takes focus on any click inside
    // the card, and the ring would then frame a card with nothing wrong.
    <div
      className={flagged ? "space-y-2 rounded-md brand-focus" : "space-y-2 rounded-md"}
      tabIndex={flagged ? -1 : undefined}
      data-field="audience"
      data-audience={a.everyone ? "everyone" : a.note !== null ? "hidden" : "filtered"}
    >
      {a.note !== null && <p className="text-body-sm text-text-secondary" data-audience-note>{a.note}</p>}
      {a.everyone ? (
        <p className="text-body-sm text-text" data-audience-line>{COMPOSE_AUDIENCE_EVERYONE}</p>
      ) : a.lines.length > 0 ? (
        <div className="space-y-1">
          <p className="text-body-sm text-text-secondary">{COMPOSE_AUDIENCE_LEAD}</p>
          <ul className="space-y-0.5">
            {a.lines.map((line) => <li key={line} className="text-body-sm text-text" data-audience-line>{line}</li>)}
          </ul>
        </div>
      ) : null}
      {problem !== null && problem !== undefined && (
        <p className="text-body-sm text-danger-fg" role="alert" data-audience-problem>{problem}</p>
      )}
      {/* ⭐ The refused filter came from the ADDRESS — the one control that takes it out. A replace, not a link: the
          composer stays mounted, so the officer's text is kept and no "leave without saving?" is asked. */}
      {a.clearHref !== null && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={c.saving}
          onClick={() => router.replace((a.clearHref ?? "") as never, { scroll: false })}
          data-audience-clear
        >
          {COMPOSE_AUDIENCE_CLEAR}
        </Button>
      )}
      <p className="text-body-sm text-text-tertiary">{COMPOSE_AUDIENCE_NOTE}</p>
    </div>
  );
}

/* ═══ THE TEST CARD ══════════════════════════════════════════════════════════════════════════════════════════════ */

const PRE = "whitespace-pre-wrap break-words rounded-md border border-border-subtle bg-bg-inset p-3 font-mono text-body-sm text-text";

function TestOutcome({ state }: { state: TestState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "handed_over") {
    return (
      <div className="space-y-1.5" role="status" data-test-outcome="handed_over">
        <p className="text-body-sm text-success-fg">{composeTestHandedOver(state.at, state.via)}</p>
        <p className="text-body-sm text-text-secondary">{COMPOSE_TEST_EXACT}</p>
        <pre className={PRE} data-operator-text="message" data-test-sent>{state.text}</pre>
      </div>
    );
  }
  if (state.kind === "unconfirmed") {
    return (
      <div className="space-y-1.5" role="status" data-test-outcome="unconfirmed">
        <Callout tone="warning" role="status">
          <span className="block">{state.error}</span>
        </Callout>
        <pre className={PRE} data-operator-text="message">{state.text}</pre>
      </div>
    );
  }
  if (state.kind === "refused") {
    return (
      <Callout tone="danger" role="alert">
        <span className="block" data-test-outcome="refused" data-test-reason={state.reason}>{state.error}</span>
        {/* ⛔ A plain <a>: /profile is the player shell, and crossing shells is a hard navigation (test:shell-boundary). */}
        {CONSENT_REASONS.includes(state.reason) && (
          <a href="/profile/notifications" className="mt-1 inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-royal-300 hover:underline" data-test-consent-link>
            {COMPOSE_TEST_CONSENT_LINK}
          </a>
        )}
      </Callout>
    );
  }
  return (
    <Callout tone="danger" role="alert">
      <span className="block" data-test-outcome="error">{state.error}</span>
    </Callout>
  );
}

export function ComposerTest() {
  const c = useComposer();
  const { view, saved } = c;
  const t = view.test;
  const preview = t.preview;
  const fresh = preview !== null && saved !== null && preview.revision === saved.draftRevision;
  const blocked: string | null = view.readOnly
    ? COMPOSE_TEST_NOT_DRAFT
    : !c.mayAct
      ? c.actReason ?? COMPOSE_TEST_NOT_DRAFT
      : saved === null || c.dirty
        ? COMPOSE_TEST_SAVE_FIRST
        : !fresh
          ? COMPOSE_TEST_UPDATING
          : null;
  const ready = blocked === null && t.ownNumberMasked !== null && c.testing === null;
  const variants: CampaignVariant[] = fresh && preview !== null && preview.EN !== null ? ["SW", "EN"] : ["SW"];

  return (
    <div className="space-y-3" data-test-card={ready ? "ready" : "blocked"}>
      {t.ownNumberMasked !== null ? (
        <p className="text-body-sm text-text" data-test-to>{composeTestTo(t.ownNumberMasked)}</p>
      ) : (
        <p className="text-body-sm text-danger-fg" data-test-to="unusable">{t.ownNumberProblem}</p>
      )}
      {t.liveNote !== null && <p className="text-body-sm text-text-secondary" data-test-live-note>{t.liveNote}</p>}
      {fresh && preview !== null && variants.map((v) => (
        <div key={v} className="space-y-1.5">
          <p className="text-body-sm text-text-secondary">{COMPOSE_TEST_PREVIEW[v]}</p>
          <pre className={PRE} data-operator-text="message" data-test-preview={v}>{v === "EN" ? preview.EN : preview.SW}</pre>
        </div>
      ))}
      {fresh && !t.tokenReady && <p className="text-body-sm text-text-tertiary">{COMPOSE_TEST_TOKEN_NOTE}</p>}
      {blocked !== null && <p className="text-body-sm text-text-secondary" data-test-blocked>{blocked}</p>}
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <Button
            key={v}
            type="button"
            size="md"
            variant="ghost"
            disabled={!ready}
            loading={c.testing === v}
            title={blocked ?? undefined}
            onClick={() => c.sendTest(v)}
            data-test-send={v}
          >
            {COMPOSE_TEST_SEND[v]}
          </Button>
        ))}
      </div>
      <p className="text-body-sm text-text-tertiary">{COMPOSE_TEST_BUDGET}</p>
      <TestOutcome state={c.test} />
    </div>
  );
}

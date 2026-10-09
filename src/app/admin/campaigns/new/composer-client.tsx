"use client";

/**
 * U37b · THE COMPOSER — the Message card's form, the Audience card's words and the Test card, sharing ONE state.
 *
 * ⭐ THE CARDS ARE THE SERVER'S, THE STATE IS OURS. The page renders each `AdminCard` (its chrome lives in
 * `admin-shell`, which a client module must never import — it reaches the store), and `ComposerProvider`, a client
 * provider wrapped around all three, holds what they share: the five fields, the saved snapshot, the refusal, the test.
 * The three bodies (`ComposerMessage`, `ComposerAudience`, `ComposerTest`) read it through one hook.
 * ⭐ U38b · THE AUDIENCE CARD HOSTS TWO SERVER CHILDREN, handed in by the page: the audience rail (`audience-rail.tsx`,
 * FilterPills built on the server) and the count — a Suspense keyed by the filter's ONE key around the async split card
 * (`audience-split-card.tsx`), which renders the server's view-model and nothing else. Nothing here counts, adds or
 * subtracts a figure; this file only says whether "Who" was chosen and which words describe it.
 *
 * ⭐ THE COUNTER IS THE RENDERER'S. Each variant's live counter is `validateCampaignTemplate` → `counterFor` — the ONE
 * worst-case counter in `campaign-template.ts` (the reserved name; nothing is appended since the owner's ruling of 2026-10-09) —
 * and nothing in this directory sizes a message itself (`test:campaign-compose` §16.2). The server re-validates on
 * save and stores ITS figures; the screen is a preview of that verdict, never a substitute for it.
 * ⛔ OD45 · NO SENDER INPUT: the sender line is the server's, read-only. ⛔ NO NUMBER INPUT: the test card names the
 * officer's own number, masked, and has nothing to type into. ⛔ OD24 · NO MONEY on this page.
 * ⭐ ONE SAVE. Save is disabled WITH its reason (beside it and in its title), never hidden; a refusal keeps the text.
 * ⭐ THE TEST SENDS THE SAVED TEXT: unsaved or edited text disables it ("Save first"), and the preview is the server's
 * rendering of the saved revision — the exact text sent, with nothing appended (the owner's ruling of 2026-10-09).
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
 * ⭐ U40b · THE CONFIRM CARD (`campaign-confirm.tsx`) READS THIS STATE (`useComposerSaved`) — it opens only on the SAVED
 * draft — and an audience on screen that the draft does not store (`view.audience.unsaved`, a rail pick) is a change Save
 * takes, never "Nothing to save".
 */
import { createContext, useContext, useRef, useState, useTransition } from "react";
import type { ReactNode, RefObject } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ui/modal";
import { FormColumn } from "@/components/ui/form-column";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { validateCampaignTemplate, scanPlaceholders } from "@/lib/marketing/campaign-template";
import type { CampaignDraftFields, CampaignVariant, TemplateVerdict } from "@/lib/marketing/campaign-template";
import { foldToGsm7 } from "@/lib/sms-compose";
import { parseTzNumber } from "@/lib/tz-msisdn";
import type { CampaignDraftField } from "@/lib/server/marketing/campaign-draft";
import type { SmsCampaignStatus } from "@/lib/server/store";
import type { CampaignTestResult } from "@/lib/server/marketing/campaign-test-send";
import { saveCampaignDraftAction, sendCampaignTestAction } from "./actions";
import { ComposerCounter } from "./composer-counter";
import type { ComposeView } from "./composer-loader";
import { AUDIENCE_COUNT_AGAIN, AUDIENCE_EVERYONE, AUDIENCE_NOT_CHOSEN, AUDIENCE_RECHECK } from "./audience-copy";
import {
  COMPOSE_AUDIENCE_CLEAR, COMPOSE_AUDIENCE_LEAD, COMPOSE_BODY_SW_HINT,
  COMPOSE_DISCARD_BODY, COMPOSE_DISCARD_CANCEL, COMPOSE_DISCARD_CONFIRM, COMPOSE_DISCARD_TITLE, COMPOSE_EN_NONE,
  COMPOSE_EN_RULE, COMPOSE_FIELD, COMPOSE_NO_CHANGES, COMPOSE_READ_ONLY, COMPOSE_RELOAD, COMPOSE_SAVE, COMPOSE_SAVE_AS_NEW,
  COMPOSE_SAVE_AS_NEW_AUDIENCE, COMPOSE_SAVE_FAILED, COMPOSE_TEST_BUDGET, COMPOSE_TEST_CONSENT_LINK, COMPOSE_TEST_EXACT,
  COMPOSE_TEST_NOT_DRAFT, COMPOSE_TEST_PREVIEW, COMPOSE_TEST_SAVE_FIRST, COMPOSE_TEST_SEND,
  COMPOSE_TEST_UPDATING, COMPOSE_TRY_AGAIN, composeSaveBlocked, composeSaved, composeTestHandedOver,
  COMPOSE_TEST_TO_LEGEND, COMPOSE_TEST_TO_OWN_UNUSABLE, COMPOSE_TEST_TO_TYPED, COMPOSE_TEST_NUMBER_LABEL, COMPOSE_TEST_NUMBER_HINT,
  COMPOSE_TEST_TYPED_PREVIEW, COMPOSE_TEST_TYPED_NOTE, COMPOSE_TEST_NEED_NUMBER, COMPOSE_TEST_FIX_NUMBER, COMPOSE_TEST_NEED_TICK, composeTestToOwn,
  composeTypedHandedOver,
} from "./composer-copy";

type ReadyView = Extract<ComposeView, { kind: "ready" }>;
type Fields = CampaignDraftFields;
type FieldKey = keyof Fields;
type Problems = Partial<Record<CampaignDraftField, string[]>>;

/** What was last saved, and when (null = loaded, not saved in this visit). */
type Saved = { id: string; draftRevision: number; savedAt: string | null; fields: Fields };
/**
 * A refusal, by its reason. `failed` is a save lost in transit (no reason came back): the text is kept and Try again
 * offered. (U37s's `source_unreadable` — the source line's fresh read did not answer — is gone since the owner's ruling
 * of 2026-10-09: the save reads no line.) `role`, `rate_limited` and `unfinished` are the actions' own — printed alone,
 * with no retry that cannot work.
 */
type Refusal = {
  kind: "invalid" | "not_found" | "not_draft" | "stale" | "failed" | "role" | "rate_limited" | "unfinished";
  message: string;
  /** A stale save (or a draft confirmed since): the stored draft's own address, which "Reload" goes to. */
  href?: string;
};
/** U37c-2 · who a test went to — a typed number the officer's own is `own` (the server decides it, never the screen). */
type TestTarget = "own" | "typed";
type TestState =
  | { kind: "idle" }
  | { kind: "handed_over"; via: "stub" | "open"; at: string; text: string; target: TestTarget }
  | { kind: "refused"; reason: string; error: string; target: TestTarget }
  | { kind: "unconfirmed"; error: string; text: string; target: TestTarget }
  | { kind: "error"; error: string };
/** U37c-2 · a test to ANOTHER number, as the Test card posts it — the server re-types it (`testRecipientOf`). */
type TypedTestRecipient = { kind: "typed"; number: string; adultAttested: boolean; attestedVersion: number | null };

const EMPTY: Fields = { name: "", bodySw: "", bodyEn: "", nameFallbackSw: "", nameFallbackEn: "" };
const FIELD_ORDER: CampaignDraftField[] = ["name", "bodySw", "nameFallbackSw", "bodyEn", "nameFallbackEn", "sourcePhrase", "audience"];
/** The fields this page renders a `data-field` for — the source line is the server's, so a reason about it has no place to go. */
const ON_PAGE: ReadonlySet<CampaignDraftField> = new Set(["name", "bodySw", "nameFallbackSw", "bodyEn", "nameFallbackEn", "audience"]);
/** The refusals whose remedy is the officer's own consent switch, on their own profile. */
const CONSENT_REASONS = ["no_consent", "consent_withdrawn", "suppressed"];
/** U37c-2 · the typed refusals that mean THIS PAGE is out of date (the words or the record changed since it loaded): the
 *  page re-reads, so the card shows the world the server just answered from. (`typed_needs_source_line` is gone since the
 *  owner's ruling of 2026-10-09: a typed test needs no source line.) */
const PAGE_STALE_REASONS = ["attestation_stale", "typed_outreach_closed", "typed_no_attestation_wording"];

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

/** ⛔ D19 · the state is the RESULT's, field for field — the reason, the sentence and the target come back from the server
 *  and the screen decides none of them. */
function testStateOf(r: CampaignTestResult | { ok: false; error: string }): TestState {
  if (!("outcome" in r)) return { kind: "error", error: r.error };
  if (r.outcome === "handed_over") return { kind: "handed_over", via: r.via, at: r.at, text: r.text, target: r.target };
  if (r.outcome === "unconfirmed") return { kind: "unconfirmed", error: r.error, text: r.text, target: r.target };
  return { kind: "refused", reason: r.reason, error: r.error, target: r.target };
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
  /** Focus the first of these fields this page draws (`[data-field]`) — the Save reason's way there, and the Test card's. */
  goToField: (keys: string[]) => void;
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
  /** Test the saved draft — on the officer's own number, or (U37c-2) the typed one the Test card holds. */
  sendTest: (v: CampaignVariant, recipient?: TypedTestRecipient) => void;
  formRef: RefObject<HTMLFormElement | null>;
};

const ComposerCtx = createContext<Composer | null>(null);

function useComposer(): Composer {
  const c = useContext(ComposerCtx);
  if (c === null) throw new Error("the composer cards render inside <ComposerProvider>");
  return c;
}

/** U40b · what the Confirm card reads of the shared state. */
export type ComposerSaved = {
  savedId: string | null;
  /** The revision whose text this form holds, and the revision this page was last read at — two saves apart means another
   *  tab saved the draft (the page is ahead), or this tab's save is still being read back (the form is ahead). */
  savedRevision: number | null;
  pageRevision: number | null;
  /** The draft this page was read for, and its status as read (null for a new composer). */
  pageDraftId: string | null;
  status: SmsCampaignStatus | null;
  dirty: boolean;
  audienceUnsaved: boolean;
  /** Why the audience on screen cannot be saved — the composer's own sentence (a refused save's, else the address's) — or null. */
  audienceProblem: string | null;
  /** The address keys of the audience on screen (null when the address carries none: the stored one is on screen) — what the
   *  card's read posts, so the server counts nothing for an audience the draft does not store. */
  audienceParams: Record<string, string> | null;
  saving: boolean;
  swBlank: boolean;
};

/**
 * ⭐ U40b · IS WHAT THE FORM SHOWS THE SAVED DRAFT? — asked by the Confirm card (`campaign-confirm.tsx`), because the server
 * confirms the STORED message and audience and cannot see this form (decision 1: "Save first — confirming freezes the saved
 * message"): the saved draft's id and the revision the form holds against the page's, the page's draft and its status,
 * unsaved text, an audience on screen the draft does not store (and its keys, which the card's read posts), the audience's
 * problem, a save in flight, and a blank Swahili message. Read-only: the card can neither save nor edit through it.
 */
export function useComposerSaved(): ComposerSaved {
  const c = useComposer();
  return {
    savedId: c.saved?.id ?? null,
    savedRevision: c.saved?.draftRevision ?? null,
    pageRevision: c.view.draft?.draftRevision ?? null,
    pageDraftId: c.view.draft?.id ?? null,
    status: c.view.draft?.status ?? null,
    dirty: c.dirty,
    audienceUnsaved: c.view.audience.unsaved,
    audienceProblem: c.problemAt("audience") ?? c.view.audience.problem ?? null,
    audienceParams: c.view.audience.params,
    saving: c.saving,
    swBlank: c.fields.bodySw.trim() === "",
  };
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

  // ⛔ No source line is handed to the verdict (the owner's ruling of 2026-10-09) — the save's own call hands none either.
  const verdict = validateCampaignTemplate(fields, "");
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
  // ⭐ An audience on screen that the draft does not store (a rail pick) is never "no changes": only a save keeps it
  // (`audience.unsaved`) — and the Confirm card (U40b) will not open on it, since a confirmation freezes the STORED
  // audience. (U37s's stale source line no longer counts as a change: no draft's line matters since 2026-10-09.)
  const blocked = shared ?? (saved !== null && !dirty && !view.audience.unsaved ? { reason: COMPOSE_NO_CHANGES, field: null } : null);
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
        // ⭐ Every save goes to the draft's own address — the composer's canonical one, built by the server (STD-1: a bare
        // ?draft=<id> would meet the page's redirect inside this mounted page and unmount the composer) — so a reload reopens
        // it, and an address that named its window by a preset becomes the window the save stored (else the next minute
        // would read the saved draft as unsaved). Already there: re-read the saved preview.
        const here = window.location.pathname + window.location.search;
        if (r.href && r.href !== here) router.replace(r.href as never, { scroll: false });
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
      setRefusal({
        kind, message: kind === "failed" ? `${COMPOSE_SAVE_FAILED} ${r.error}` : r.error,
        href: "href" in r && typeof r.href === "string" && r.href !== "" ? r.href : undefined,
      });
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
    // ⭐ The stored draft's own address when the server named it: its audience is the one somebody else saved, not the one
    // left in this page's address (which a next save would post back over theirs).
    if (refusal?.href) router.replace(refusal.href as never, { scroll: false });
    else router.refresh();
  };

  const sendTest = (variant: CampaignVariant, recipient?: TypedTestRecipient) => {
    const s = saved;
    if (s === null || dirty || testing !== null || !mayAct || view.readOnly) return;
    setTesting(variant);
    setTest({ kind: "idle" });
    startTest(async () => {
      const r = await runAdminAction(() => sendCampaignTestAction(s.id, variant, recipient ?? { kind: "own" }));
      setTest(testStateOf(r));
      setTesting(null);
      // ⭐ A handed-over test changes nothing the page shows: the preview is the text as sent, and since the owner's ruling
      // of 2026-10-09 nothing is appended to it — no stop link, so no token to re-read (§16.22).
      // ⛔ §18.32 · the 18+ words (or the record) changed since this page opened: read again, so the box shows
      // the words a tick confirms and "Another number" is offered only as the server now answers.
      if ("outcome" in r && r.outcome === "refused" && PAGE_STALE_REASONS.includes(r.reason)) router.refresh();
    });
  };

  const value: Composer = {
    view, fields, setField, verdict, problemAt, saved, dirty, saving, canSave, saveBlocked, blockedField, goToBlocked, goToField, save,
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
  const swJina = scanPlaceholders(fields.bodySw).jina > 0;
  const enWritten = fields.bodyEn.trim() !== "";
  const enJina = enWritten && scanPlaceholders(fields.bodyEn).jina > 0;
  // ⛔ The saved line invites a test only when the test card beside it can send one — never one it would refuse.
  const canTest = view.test.liveNote === null && view.test.windowNote === null && view.test.ownNumberMasked !== null && !view.sender.dead;
  const savedLine = c.saved?.savedAt && !c.dirty && !view.audience.unsaved ? composeSaved(c.saved.savedAt, canTest) : null;
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

export function ComposerAudience({ rail, count }: { rail: ReactNode; count: ReactNode }) {
  const c = useComposer();
  const router = useRouter();
  const a = c.view.audience;
  const problem = c.problemAt("audience") ?? a.problem;
  const flagged = problem !== null && problem !== undefined;
  // ⭐ U38b · what the card is showing: nothing chosen yet, the whole of a population, a stored filter this viewer may not
  // see, or a filter — the drive's handle, never a style hook.
  const state = !a.chosen ? "not-chosen" : a.note !== null ? "hidden" : a.everyone ? "everyone" : "filtered";
  return (
    // ⭐ `data-field="audience"`: the Save reason and a refused save take the officer HERE. ⛔ The programmatic tab stop and
    // its ring exist only while the card shows a problem — a tab stop that is always there takes focus on any click inside
    // the card, and the ring would then frame a card with nothing wrong.
    <div
      className={flagged ? "space-y-2 rounded-md brand-focus" : "space-y-2 rounded-md"}
      tabIndex={flagged ? -1 : undefined}
      data-field="audience"
      data-audience={state}
    >
      {/* ⭐ U38b · the server's rail (null on a campaign past DRAFT — its audience can no longer change). */}
      {rail}
      {/* ⭐ U38b · "Who" is an explicit choice: until it is made nothing is counted, and the card says so (decision 3). */}
      {!a.chosen && <p className="text-body-sm text-text" data-audience-not-chosen>{AUDIENCE_NOT_CHOSEN}</p>}
      {a.note !== null && <p className="text-body-sm text-text-secondary" data-audience-note>{a.note}</p>}
      {a.everyone && a.who !== null ? (
        <p className="text-body-sm text-text" data-audience-line>{AUDIENCE_EVERYONE[a.who]}</p>
      ) : a.lines.length > 0 ? (
        <div className="space-y-1">
          {/* The contact book is led in; a population's own first line already says who ("Player accounts"). */}
          {a.who === "book" && <p className="text-body-sm text-text-secondary">{COMPOSE_AUDIENCE_LEAD}</p>}
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
      {/* ⭐ U38b · the count — the server's keyed Suspense around the split card (page.tsx); null when nothing may be counted. */}
      {count}
      {/* ⭐ U38b · the permanent callout (decision 10): every figure above is a forecast, and the gate is asked again at send. */}
      <Callout tone="info" role="note">
        <span className="block" data-audience-recheck>{AUDIENCE_RECHECK}</span>
      </Callout>
    </div>
  );
}

/**
 * ⭐ U38b · "COUNT AGAIN" — the same address, read again (`router.refresh`): the card's error is a read that failed, never a
 * zero, and a refresh keeps this client tree mounted, so every character the officer typed stays. The count's Suspense
 * keeps its key, so the sentence stays on screen until the new answer replaces it; the button says it is working.
 */
export function AudienceCountAgain() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button type="button" size="sm" variant="ghost" loading={pending} onClick={() => start(() => router.refresh())} data-audience-count-again>
      {AUDIENCE_COUNT_AGAIN}
    </Button>
  );
}

/* ═══ THE TEST CARD ══════════════════════════════════════════════════════════════════════════════════════════════ */

const PRE = "whitespace-pre-wrap break-words rounded-md border border-border-subtle bg-bg-inset p-3 font-mono text-body-sm text-text";

function TestOutcome({ state }: { state: TestState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "handed_over") {
    return (
      <div className="space-y-1.5" role="status" data-test-outcome="handed_over" data-test-target={state.target}>
        <p className="text-body-sm text-success-fg">
          {state.target === "typed" ? composeTypedHandedOver(state.at, state.via) : composeTestHandedOver(state.at, state.via)}
        </p>
        <p className="text-body-sm text-text-secondary">{COMPOSE_TEST_EXACT}</p>
        <pre className={PRE} data-operator-text="message" data-test-sent>{state.text}</pre>
      </div>
    );
  }
  if (state.kind === "unconfirmed") {
    return (
      <div className="space-y-1.5" role="status" data-test-outcome="unconfirmed" data-test-target={state.target}>
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
        <span className="block" data-test-outcome="refused" data-test-reason={state.reason} data-test-target={state.target}>{state.error}</span>
        {/* ⛔ A plain <a>: /profile is the player shell, and crossing shells is a hard navigation (test:shell-boundary).
            ⛔ U37c-2 · only for the officer's OWN number: a typed refusal's remedy is never their own consent switch. */}
        {state.target === "own" && CONSENT_REASONS.includes(state.reason) && (
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

/** U37c-2 · one answer to "Send the test to": a native radio inside a bordered card — the console's radio-card shape
 *  (`/admin/affiliate`'s Choice), with no value of its own. A disabled choice says why beside it, never hidden. */
function TestToChoice({
  value, checked, disabled, onPick, label, why,
}: {
  value: TestTarget;
  checked: boolean;
  disabled: boolean;
  onPick: (v: TestTarget) => void;
  label: string;
  why: string | null;
}) {
  return (
    <label
      className={`flex min-h-[var(--tap-min)] items-start gap-[10px] rounded-md border px-3 py-[10px] text-body-sm transition-colors ${
        disabled ? "cursor-not-allowed border-border-subtle" : "cursor-pointer"
      } ${checked ? "border-royal-700 bg-royal-500/10" : disabled ? "" : "border-border hover:border-border-strong"}`}
      data-test-choice={value}
    >
      <input
        type="radio"
        name="test-to"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onPick(value)}
        className={`mt-0.5 shrink-0 accent-[var(--royal-500)] ${disabled ? "opacity-70" : ""}`}
      />
      <span className="min-w-0">
        <span className={`block font-semibold ${disabled ? "text-text-tertiary" : "text-text"}`}>{label}</span>
        {why !== null && <span className="mt-0.5 block text-body-sm text-text-secondary" data-test-choice-why={value}>{why}</span>}
      </span>
    </label>
  );
}

export function ComposerTest() {
  const c = useComposer();
  const { view, saved } = c;
  const t = view.test;
  const typedView = t.typed;
  // ⛔ U37c-2 · THE TYPED NUMBER LIVES HERE, AND NOWHERE ELSE — never the address, never storage, never the provider:
  // this card holds the digits, posts them once with the test, and the server re-types them.
  const [target, setTarget] = useState<TestTarget>(t.ownNumberMasked !== null ? "own" : "typed");
  const [digits, setDigits] = useState("");
  // ⛔ THE 18+ TICK CONFIRMS ONE THING: this draft, these words, this number, this send. It is held as the key it was
  // given for — so a changed number, a reworded `adult.test`, another draft or a switch of target unticks it — and every
  // Send spends it (the server records a confirmation for one attempt only, §18.32).
  const [tickedFor, setTickedFor] = useState<string | null>(null);
  const typed = target === "typed";
  const tickKey = `${saved?.id ?? ""}|${typedView.attestation?.version ?? ""}|${digits}`;
  const ticked = tickedFor === tickKey;
  const pick = (v: TestTarget) => { setTarget(v); setTickedFor(null); };
  // A typed test the server would refuse up front, said BEFORE "updating": its preview is null, so it never freshens.
  const typedOff = typed && !typedView.allowed;
  // A view with no reason of its own has no draft yet: read-only, "save first" — or, just saved and not yet re-read, "updating".
  const typedWhy = typedView.why ?? (view.readOnly ? COMPOSE_TEST_NOT_DRAFT : saved !== null && !c.dirty ? COMPOSE_TEST_UPDATING : COMPOSE_TEST_SAVE_FIRST);

  const preview = typed ? (typedView.allowed ? typedView.preview : null) : t.preview;
  const fresh = preview !== null && saved !== null && preview.revision === saved.draftRevision;
  const blocked: string | null = view.readOnly
    ? COMPOSE_TEST_NOT_DRAFT
    : !c.mayAct
      ? c.actReason ?? COMPOSE_TEST_NOT_DRAFT
      : saved === null || c.dirty
        ? COMPOSE_TEST_SAVE_FIRST
        : typedOff
          ? typedWhy
          : !fresh
            ? COMPOSE_TEST_UPDATING
            : null;
  // The typed number as the server will parse it — `+255` and the nine digits the kit's field holds.
  const parsed = digits.length === 9 ? parseTzNumber(`+255${digits}`) : null;
  const numberProblem = parsed !== null && parsed.verdict !== "ok" ? parsed.reason : null;
  const typedBlocked: string | null = !typed
    ? null
    : !typedView.allowed
      ? typedWhy
      : parsed === null
        ? COMPOSE_TEST_NEED_NUMBER
        : numberProblem !== null
          ? numberProblem
          : !ticked
            ? COMPOSE_TEST_NEED_TICK
            : null;
  const reason = blocked ?? typedBlocked;
  // ⭐ The plan's sentence is already under the number field: beside Send it is not said twice — a button goes back to it.
  const backToNumber = blocked === null && numberProblem !== null && typedBlocked === numberProblem;
  const ready = reason === null && (typed || t.ownNumberMasked !== null) && c.testing === null;
  const variants: CampaignVariant[] = fresh && preview !== null && preview.EN !== null ? ["SW", "EN"] : ["SW"];
  const headings = typed ? COMPOSE_TEST_TYPED_PREVIEW : COMPOSE_TEST_PREVIEW;
  const recipient = (): TypedTestRecipient | undefined =>
    (typed ? { kind: "typed", number: `+255${digits}`, adultAttested: ticked, attestedVersion: typedView.attestation?.version ?? null } : undefined);
  /** One click, one confirmation: the recipient is read, THEN the tick is spent, then the test goes. */
  const send = (v: CampaignVariant) => {
    const r = recipient();
    setTickedFor(null);
    c.sendTest(v, r);
  };

  return (
    <div className="space-y-3" data-test-card={ready ? "ready" : "blocked"} data-test-target={target}>
      <fieldset className="space-y-2" data-test-to-choice>
        <legend className="mb-1 text-body-sm font-semibold text-text">{COMPOSE_TEST_TO_LEGEND}</legend>
        <TestToChoice
          value="own"
          checked={!typed}
          disabled={t.ownNumberMasked === null || c.testing !== null}
          onPick={pick}
          label={t.ownNumberMasked !== null ? composeTestToOwn(t.ownNumberMasked) : COMPOSE_TEST_TO_OWN_UNUSABLE}
          why={t.ownNumberMasked !== null ? null : t.ownNumberProblem}
        />
        <TestToChoice
          value="typed"
          checked={typed}
          disabled={!typedView.allowed || c.testing !== null}
          onPick={pick}
          label={COMPOSE_TEST_TO_TYPED}
          why={typedView.allowed ? null : typedWhy}
        />
      </fieldset>

      {typed && typedView.allowed && (
        <div className="space-y-3" data-test-typed>
          <Field label={COMPOSE_TEST_NUMBER_LABEL} hint={COMPOSE_TEST_NUMBER_HINT} error={numberProblem ?? undefined} dataField="testNumber">
            <PhoneInput
              value={digits}
              onChange={(e) => { setDigits(e.target.value); setTickedFor(null); }}
              autoComplete="off"
              disabled={c.testing !== null}
              error={numberProblem !== null}
              title={COMPOSE_TEST_NUMBER_HINT}
              data-test-recipient="typed"
            />
          </Field>
          {typedView.attestation !== null && (
            <Checkbox checked={ticked} onChange={(on) => setTickedFor(on ? tickKey : null)} label={typedView.attestation.text} />
          )}
        </div>
      )}

      {t.liveNote !== null && <p className="text-body-sm text-text-secondary" data-test-live-note>{t.liveNote}</p>}
      {t.windowNote !== null && <p className="text-body-sm text-text-secondary" data-test-window-note>{t.windowNote}</p>}
      {fresh && preview !== null && variants.map((v) => (
        <div key={v} className="space-y-1.5">
          <p className="text-body-sm text-text-secondary">{headings[v]}</p>
          <pre className={PRE} data-operator-text="message" data-test-preview={v}>{v === "EN" ? preview.EN : preview.SW}</pre>
        </div>
      ))}
      {fresh && typed && <p className="text-body-sm text-text-tertiary" data-test-typed-note>{COMPOSE_TEST_TYPED_NOTE}</p>}
      {reason !== null && backToNumber && (
        <button
          type="button"
          onClick={() => c.goToField(["testNumber"])}
          className="inline-flex items-center min-h-[var(--tap-min)] text-left text-body-sm text-text-secondary underline underline-offset-2 hover:text-text"
          data-test-blocked="testNumber"
        >
          {COMPOSE_TEST_FIX_NUMBER}
        </button>
      )}
      {reason !== null && !backToNumber && <p className="text-body-sm text-text-secondary" data-test-blocked>{reason}</p>}
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <Button
            key={v}
            type="button"
            size="md"
            variant="ghost"
            disabled={!ready}
            loading={c.testing === v}
            title={reason ?? undefined}
            onClick={() => send(v)}
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

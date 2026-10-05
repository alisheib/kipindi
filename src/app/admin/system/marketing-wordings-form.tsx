"use client";

/**
 * U33w · THE "MARKETING WORDINGS" CARD — every basis wording, 18+ confirmation, the bought-list notice and the source line,
 * each with its saved history, edited on its own tab of /admin/system (`?tab=wordings`; spec §5.1; the owner rule of
 * 2026-10-03).
 *
 * ⭐ A BOX NOBODY SAVED HOLDS A SUGGESTION, AND SAYS SO. It is prefilled with the code's default (`WORDING_DEFAULTS` — the
 * card's prefill is the one place a default may be read, W1c) and marked "Not saved — this is a suggestion". ⛔ It is NOT
 * saved by a save of some other box: an admin approves it on purpose, by ticking "Approve and save this wording" — or by
 * editing it, which ticks the box (`approvesOnEdit`; it can be unticked). So approving the bought-list notice never
 * approves the licence basis by accident, and the source line (Ali's words, G5) is never saved alongside the G4 drafts
 * unless it was typed. A box already saved is saved again only when its words changed — the server appends a version.
 * ⛔ M2 · WHAT IS SENT IS DECIDED BY THE PURE MODULE (`wordingsToSave`), AND THE SERVER HOLDS THE SAME RULE: the request
 * says `approve.<key>=1` for a suggestion it approves and `base.<key>` for the version count each wording was edited from
 * (`wordingsPostEntries`), and the server refuses a suggestion sent without its approval and a page that is out of date.
 *
 * ⭐ EVERY BOX IS VALIDATED LIVE WITH THE SERVER'S OWN RULE (`wordingProblems`), every problem at once, under the box; a
 * refusal from the server lands under the box it names (`wordingFieldName`, one spelling on both sides) and the cursor is
 * taken there (DG-S-06). Save is off, with its reason beside it, while nothing is to be saved or a box has a problem — and
 * a save asked for anyway (Enter in a box, the pending bar's Save) is never a silent no-op: it goes to the first problem,
 * or says there is nothing to save yet (m4). Each box names its status line for a screen reader (`aria-describedby`), and
 * each approval tick names its wording.
 *
 * ⛔ A SEPARATE FILE, NOT `system-client.tsx`, ON PURPOSE: `test:admin-act-gate` judges a whole FILE, and
 * `system-client.tsx` is a declared, ungated entry on its shrink-only allowlist. An ungated control added there would
 * hide behind that entry; a gate consulted there would strike the entry off while its four forms stay ungated. This card
 * consults the gate itself (`useMayAct`), and a viewer who may not act reads the wordings — and the suggestions — and
 * changes nothing.
 */
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FormColumn } from "@/components/ui/form-column";
import { I } from "@/components/ui/glyphs";
import { useDeferredToast } from "@/components/ui/toast";
import { PendingChangesBar, UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { ActReadOnly, useMayAct } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { consentBasisFor, type ConsentBasisKey } from "@/lib/marketing/consent-basis";
import { SOURCE_PHRASE_MAX_CHARS } from "@/lib/marketing/campaign-template";
import {
  WORDING_DEFAULTS, WORDING_KEYS, WORDING_RULE, approvesOnEdit, normalizeWording, wordingFieldName, wordingProblems,
  wordingsPostEntries, wordingsToSave, type WordingCardState, type WordingKey,
} from "@/lib/marketing/marketing-wordings";
import { saveMarketingWordingsAction } from "./actions";

/** One saved version as the page hands it over — the admin's NAME and the save's time already in words. */
export type WordingVersionView = { v: number; text: string; savedAtLabel: string; savedByName: string };
/** One wording's saved versions, oldest first; `[]` when it was never saved. */
export type WordingRowView = { key: WordingKey; versions: WordingVersionView[] };

const basisLabel = (key: ConsentBasisKey): string => consentBasisFor(key)?.label ?? "Basis";

const CONSENT_HINT = "Stored with each consent recorded under it, and shown to the person if they ask for their data. It must say the person agreed, and name 50pick and SMS.";

/** The approval tick's visible words — the drive and the admin guide find the tick by them, so they never change per
 *  wording; its accessible name adds the wording's own label. */
const APPROVE_LABEL = "Approve and save this wording";
/** Why Save is off when nothing is to be saved — beside the button, and in the toast of a save asked for anyway. */
const HELD_IDLE = "Change a wording, or tick “Approve and save this wording”, to save.";

/** The card's labels and hints — English console copy, in plain words; the rules they state are `WORDING_RULE`'s. */
const WORDING_COPY: Readonly<Record<WordingKey, { label: string; hint: string }>> = {
  "basis.OWN_FORM": { label: `Basis · ${basisLabel("OWN_FORM")}`, hint: CONSENT_HINT },
  "basis.OWN_EVENT": { label: `Basis · ${basisLabel("OWN_EVENT")}`, hint: CONSENT_HINT },
  "basis.AGENT_ROSTER": { label: `Basis · ${basisLabel("AGENT_ROSTER")}`, hint: CONSENT_HINT },
  "basis.THIRD_PARTY": {
    label: `Basis · ${basisLabel("THIRD_PARTY")}`,
    hint: "Shown to the officer who chooses it, and never stored as anyone's consent. It must name 50pick and say the person has not agreed.",
  },
  "basis.LICENCE_OUTREACH": {
    label: `Basis · ${basisLabel("LICENCE_OUTREACH")}`,
    hint: "Stored with each list recorded under our licence, and shown to the person if they ask for their data. It must name 50pick and the licence, say the person has not agreed, and say how they stop the messages.",
  },
  "adult.consent": {
    label: "18+ · stored with a consent",
    hint: "Added after a consent basis's words on every consent recorded under it. It must name 18.",
  },
  "adult.list": {
    label: "18+ · confirming a list",
    hint: "The box an officer ticks to record a list under our licence; it is stored with the list. It must name 18 and refer to the list.",
  },
  "adult.test": {
    label: "18+ · a test to another number",
    hint: "The box an officer ticks to send a test to a number that is not their own; it is kept in the test's record. It must name 18.",
  },
  "notice.thirdParty": {
    label: "Notice · before a bought list is stored",
    hint: "Shown to the officer before a bought or third-party list is stored.",
  },
  "source.phrase": {
    label: "Source line",
    hint: "Says where the number came from, in every message to a number that is not a player's own account. Blank means those numbers can't be sent a campaign. A draft takes the line when it is next saved; a confirmed campaign keeps the line it was confirmed with.",
  },
};

/** The length a box allows, said before it is typed into (DESIGN_AUTHORITY §A7). */
function lengthLine(key: WordingKey): string {
  const rule = WORDING_RULE[key];
  return rule.min !== null && rule.max !== null
    ? `${rule.min} to ${rule.max} characters.`
    : `At most ${SOURCE_PHRASE_MAX_CHARS} characters, on one line.`;
}

/** The id of a wording's status line — named by its box's `aria-describedby`, so the version and the "not saved" are read
 *  with the box. Letters, digits, dash and low line only: an id is also written into selectors. */
const statusIdOf = (key: WordingKey): string => `wording-status-${key.replace(/[^A-Za-z0-9_-]/g, "-")}`;

/**
 * A wording box exactly as tall as its words, at every width — the invite page's `LinkField` recipe (collapse, measure,
 * add the borders back; a `ResizeObserver` re-measures on every width change). ⛔ A fixed `rows` was wrong at both ends:
 * on a phone the licence basis was cut off mid-sentence in its box, and an admin approving words must SEE all of them.
 */
function WordingBox({ className, ...props }: React.ComponentProps<typeof Textarea>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { value } = props;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "0px";
      const cs = getComputedStyle(el);
      const border = parseFloat(cs.borderTopWidth || "0") + parseFloat(cs.borderBottomWidth || "0");
      el.style.height = `${el.scrollHeight + border}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);
  return <Textarea ref={ref} rows={2} {...props} className={cn("resize-none overflow-hidden", className)} />;
}

export function MarketingWordingsForm({ rows }: { rows: WordingRowView[] }) {
  const mayAct = useMayAct();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  /* The card's own Save. The bar draws no second one while this is on screen (owner, 2026-09-22). */
  const saveRef = useRef<HTMLButtonElement>(null);
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);

  const byKey = new Map(rows.map((r) => [r.key, r] as const));
  const versionsOf = (key: WordingKey): WordingVersionView[] => byKey.get(key)?.versions ?? [];
  const newest = (key: WordingKey): WordingVersionView | null => {
    const versions = versionsOf(key);
    return versions.length > 0 ? versions[versions.length - 1] : null;
  };
  /* ⭐ What each box starts with: the newest saved words, or the suggestion. The page remounts this card after a save
     (its `key` is the version counts), so the boxes always start from the row, never from what was typed. */
  const initial = Object.fromEntries(
    WORDING_KEYS.map((key) => [key, newest(key)?.text ?? WORDING_DEFAULTS[key]]),
  ) as Record<WordingKey, string>;

  const [text, setText] = useState<Record<WordingKey, string>>(() => ({ ...initial }));
  /* The suggestions an admin chose to approve as they stand (or edited, which ticks the box). */
  const [approve, setApprove] = useState<Partial<Record<WordingKey, boolean>>>({});
  /* The server's sentences from the last refused save, by wording — cleared for a box as soon as it is typed into. */
  const [serverProblems, setServerProblems] = useState<Partial<Record<WordingKey, string[]>>>({});

  const edited = (key: WordingKey): boolean => normalizeWording(text[key]) !== normalizeWording(initial[key]);
  /* ⛔ M2 · what a save sends is the pure module's decision — a saved box whose words changed, a source line typed, and a
     suggestion ONLY when its box is ticked — each with the version count it was edited from. */
  const cardState: WordingCardState = {
    texts: text,
    saved: Object.fromEntries(
      WORDING_KEYS.map((key) => [key, { count: versionsOf(key).length, text: newest(key)?.text ?? null }]),
    ) as WordingCardState["saved"],
    approved: approve,
  };
  const sending = wordingsToSave(cardState);
  const toSave = sending.map((w) => w.key);
  const included = (key: WordingKey): boolean => toSave.includes(key);
  const shownError = (key: WordingKey): string | undefined => {
    const fromServer = serverProblems[key];
    if (fromServer && fromServer.length > 0) return fromServer.join(" ");
    if (!included(key) && !edited(key)) return undefined;
    const said = wordingProblems(key, text[key]).map((p) => p.sentence);
    return said.length > 0 ? said.join(" ") : undefined;
  };
  const blocked = toSave.filter((key) => wordingProblems(key, text[key]).length > 0);
  const canSave = toSave.length > 0 && blocked.length === 0;
  /* Work that leaving would lose: a box typed into, or a suggestion ticked. */
  const dirty = WORDING_KEYS.some((key) => edited(key) || approve[key] === true);
  const savedCount = WORDING_KEYS.filter((key) => newest(key) !== null).length;

  const onText = (key: WordingKey, value: string) => {
    setText((cur) => ({ ...cur, [key]: value }));
    setServerProblems((cur) => {
      if (cur[key] === undefined) return cur;
      const next = { ...cur };
      delete next[key];
      return next;
    });
    // ⭐ Editing a suggestion nobody saved IS the intent to save it: its box ticks itself, and can be unticked.
    if (approvesOnEdit(key, versionsOf(key).length)) setApprove((cur) => (cur[key] ? cur : { ...cur, [key]: true }));
  };

  const discard = () => {
    setText({ ...initial });
    setApprove({});
    setServerProblems({});
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    /* ⛔ CAPTURED BEFORE THE ASYNC BOUNDARY — `e.currentTarget` is null inside the transition, and the form is the
       scope `focusFirstInvalid` searches (several forms share this page). */
    const form = e.currentTarget;
    // ⛔ m4 · NEVER A SILENT NO-OP. Enter in a box and the pending bar's Save both land here: a held save takes the admin
    // to the first box with a problem, where the reason is written — or says there is nothing to save yet.
    if (blocked.length > 0) { focusFirstInvalid(form, blocked.map((key) => wordingFieldName(key))); return; }
    if (sending.length === 0) { toast({ title: "Nothing to save yet", description: HELD_IDLE }); return; }
    const fd = new FormData();
    for (const [name, value] of wordingsPostEntries(sending)) fd.set(name, value);
    start(async () => {
      const r = await runAdminAction(() => saveMarketingWordingsAction(fd));
      if (!r.ok) {
        const problems = ("problems" in r && r.problems ? r.problems : {}) as Partial<Record<WordingKey, string[]>>;
        setServerProblems(problems);
        toast({ title: "Couldn't save the wordings", description: r.error, variant: "danger" });
        const fields = WORDING_KEYS.filter((key) => (problems[key]?.length ?? 0) > 0).map((key) => wordingFieldName(key));
        if (fields.length > 0) focusFirstInvalid(form, fields);
        else if (r.field) focusFirstInvalid(form, [r.field]);
        return;
      }
      router.refresh();
      deferToast(r.changed > 0
        ? { title: "Wordings saved", description: `${r.changed} wording${r.changed === 1 ? "" : "s"} saved as a new version.`, variant: "success" }
        : { title: "Nothing changed", description: "Every wording already reads that way." });
    });
  };

  const statusOf = (key: WordingKey): { line: string; saved: boolean } => {
    const n = newest(key);
    if (n !== null) {
      const cleared = WORDING_RULE[key].clearable && n.text === "" ? " No source line is set." : "";
      return { line: `Version ${n.v}, saved ${n.savedAtLabel} by ${n.savedByName}.${cleared}`, saved: true };
    }
    if (WORDING_RULE[key].clearable) return { line: "Not set yet.", saved: false };
    return { line: "Not saved — this is a suggestion. Nothing is recorded with it until it is saved.", saved: false };
  };

  const historyOf = (key: WordingKey) => {
    const versions = versionsOf(key);
    if (versions.length === 0) return null;
    return (
      <details className="group mt-1.5" data-wording-history={key}>
        <summary className="flex min-h-[var(--tap-min)] cursor-pointer list-none items-center gap-1.5 text-body-sm text-text-subtle hover:text-text-muted">
          <span className="shrink-0 group-open:rotate-90"><I.chevronRight s={13} /></span>
          <span>History · {versions.length} {versions.length === 1 ? "version" : "versions"}</span>
        </summary>
        <ol className="mt-1.5 space-y-2 border-l-2 border-border pl-2">
          {[...versions].reverse().map((v) => (
            <li key={v.v} className="text-body-sm">
              <p className="text-text-subtle">Version {v.v} · {v.savedAtLabel} · {v.savedByName}</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-text-secondary">{v.text === "" ? "Blank — no source line." : v.text}</p>
            </li>
          ))}
        </ol>
      </details>
    );
  };

  // ⛔ BELOW EVERY HOOK — a viewer without the act reads the wordings, the suggestions and their history, and changes
  // nothing.
  if (!mayAct) {
    return (
      <div className="space-y-3">
        <ActReadOnly note="Only an admin can change the marketing wordings." />
        <ul className="space-y-4">
          {WORDING_KEYS.map((key) => {
            const n = newest(key);
            const suggestion = WORDING_DEFAULTS[key];
            return (
              <li key={key} className="text-body-sm" data-wording={key}>
                <p className="font-semibold text-text">{WORDING_COPY[key].label}</p>
                <p className="mt-1 text-text-subtle">{statusOf(key).line}</p>
                {n !== null ? (
                  n.text !== "" ? <p className="mt-1 whitespace-pre-wrap break-words text-text-secondary">{n.text}</p> : null
                ) : suggestion !== "" ? (
                  /* ⭐ The words an admin would be approving — a viewer is told what is NOT saved, and shown it. */
                  <p className="mt-1 whitespace-pre-wrap break-words text-text-tertiary" data-wording-suggestion={key}>
                    Suggestion: {suggestion}
                  </p>
                ) : null}
                {historyOf(key)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate data-testid="marketing-wordings-form">
      <p className="text-body-sm text-text-secondary">{savedCount} of {WORDING_KEYS.length} wordings saved.</p>
      <FormColumn measure="form" className="space-y-5">
        {WORDING_KEYS.map((key) => {
          const status = statusOf(key);
          const error = shownError(key);
          const clearable = WORDING_RULE[key].clearable;
          const statusId = statusIdOf(key);
          return (
            <div key={key} data-wording={key}>
              <Field
                label={WORDING_COPY[key].label}
                hint={`${WORDING_COPY[key].hint} ${lengthLine(key)}`}
                error={error}
                dataField={wordingFieldName(key)}
                optional={clearable}
              >
                {/* ⛔ No box is ever disabled or read-only (the owner rule: no locked box) — the Support contacts card's
                    shape; a viewer who may not act gets the read-only view above, not greyed boxes. */}
                {clearable ? (
                  <Input value={text[key]} onChange={(e) => onText(key, e.currentTarget.value)} autoComplete="off" error={error !== undefined} aria-describedby={statusId} />
                ) : (
                  <WordingBox value={text[key]} onChange={(e) => onText(key, e.currentTarget.value)} error={error !== undefined} aria-describedby={statusId} />
                )}
              </Field>
              <p id={statusId} className={`mt-1.5 text-body-sm ${status.saved ? "text-text-subtle" : "text-warning-fg"}`} data-wording-status={status.saved ? "saved" : "unsaved"}>
                {status.line}
              </p>
              {newest(key) === null && !clearable && (
                <Checkbox
                  checked={approve[key] === true}
                  onChange={(on) => setApprove((cur) => ({ ...cur, [key]: on }))}
                  label={APPROVE_LABEL}
                  ariaLabel={`${APPROVE_LABEL}: ${WORDING_COPY[key].label}`}
                />
              )}
              {historyOf(key)}
            </div>
          );
        })}
      </FormColumn>
      <div className="flex flex-wrap items-center gap-3">
        <Button ref={saveRef} type="submit" variant="primary" loading={pending} disabled={!canSave}>
          Save wordings
        </Button>
        {/* A disabled control says why — a greyed button with no reason reads as a broken console. */}
        {!pending && !canSave && (
          <span className="text-body-sm text-text-tertiary" aria-live="polite">
            {blocked.length > 0 ? "Fix the problems shown under the wordings to save." : HELD_IDLE}
          </span>
        )}
      </div>
      <PendingChangesBar
        dirty={dirty}
        saving={pending}
        detail="Saved wordings are kept for good — each save adds a version."
        saveAnchor={saveRef}
        onSave={() => {
          // The bar's Save is offered while the card's own is off screen — so a held save must not be a silent no-op
          // there: it takes the admin to the first box with a problem, where the reason is written.
          const form = formRef.current;
          if (!form) return;
          if (blocked.length > 0) { focusFirstInvalid(form, blocked.map((key) => wordingFieldName(key))); return; }
          form.requestSubmit();
        }}
        onDiscard={discard}
        saveLabel="Save wordings"
      />
      <UnsavedChangesGuard dirty={dirty} body="The marketing wordings have been changed but not saved. Leaving now discards the change." />
    </form>
  );
}

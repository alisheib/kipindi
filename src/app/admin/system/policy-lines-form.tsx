"use client";

/**
 * U33p · THE "PUBLIC POLICY LINES" CARD — the five lines the public pages print from config, each in English, Swahili and
 * Chinese, edited on their own tab of /admin/system (`?tab=policy`; spec §5.2 · §6 U33p · §7.7; OD58 · S15; the owner rule
 * of 2026-10-03, "admins can change everything"; the U33p review).
 *
 * ⭐ A LINE WITH NO SAVED WORDS SHOWS TODAY'S WORDS, AND SAYS SO. Its boxes are prefilled with the page's own text
 * (`POLICY_LINE_DEFAULTS`, byte for byte the page — test:policy-lines L1) and marked "Not saved — the page prints today's
 * words". ⛔ It is NOT saved by a save of some other line: a line is sent only when its words change, or — to keep today's
 * words and mark the line reviewed (licence outreach needs the Consent bullet reviewed, spec §5.3) — when its "Mark today's
 * words reviewed" box is ticked. A review stores a MARKER, no text (review F4): the page keeps printing the code's words,
 * the page's version does not move (review F1), and the server writes a marker only with that tick. Every line sent carries
 * the revision it was edited from (`base.<key>`), and a page left open is refused if someone saved since.
 *
 * ⭐ EVERY BOX IS VALIDATED LIVE WITH THE SERVER'S OWN RULE (`policyLineProblems`, against the words the page prints now),
 * every problem at once, under its box: a blank language, the length, plain text, a phone number, an unbroken run, the words
 * a line must keep, and — for the RG promise, in any language — a promise the code does not keep, refused by name. Notes
 * under the line never block: a kept promise the new words drop, a language left saying the old thing. A refusal from the
 * server lands under the box it names (`policyLineFieldName`, one spelling on both sides) and the cursor is taken there
 * (DG-S-06). Save is off, with its reason beside it, while nothing is to be saved or a box has a problem — and a save asked
 * for anyway (Enter, the pending bar's Save) is never a silent no-op.
 *
 * ⭐ ON LOAD, EVERY SAVED LINE IS READ AGAIN (review F4): saved words that no longer pass today's rules or KEPT_PROMISES, a
 * code default that changed since the words were saved, or a review of words the code has since replaced — each is said in
 * words under its line, so nothing published goes stale unseen. Each line's history opens below it (review F12).
 *
 * ⚠️ THE PROFILE NOTE IS STORED HERE AND PRINTED BY NOTHING YET — its printer is U33a-P, once licence outreach exists; its
 * hint says so, so nobody saves it and goes looking for it on /profile/notifications.
 *
 * ⛔ A SEPARATE FILE, NOT `system-client.tsx`, ON PURPOSE (the U33w card's reason): `test:admin-act-gate` judges a whole
 * FILE, and `system-client.tsx` is a declared, ungated entry on its shrink-only allowlist. This card consults the gate itself
 * (`useMayAct`); a viewer who may not act reads every line as the public reads it now, and changes nothing.
 */
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FormColumn } from "@/components/ui/form-column";
import { I } from "@/components/ui/glyphs";
import { useDeferredToast } from "@/components/ui/toast";
import { PendingChangesBar, UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { ActReadOnly, useMayAct } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import {
  POLICY_LINE_DEFAULTS, POLICY_LINE_KEYS, POLICY_LINE_SENTENCE, POLICY_LINE_SPEC, POLICY_LOCALES, normalizedPolicyTexts,
  policyDefaultFingerprint, policyLineFieldName, policyLineProblems, policyLinesPostEntries, policyLinesToSave,
  samePolicyTexts, type PolicyCardState, type PolicyLineKey, type PolicyLocale, type PolicyTexts,
} from "@/lib/legal/policy-lines";
import { savePolicyLinesAction } from "./actions";

/** One saved version as the page hands it over — new words or a review marker, the admin's NAME and the save's time
 *  already in words. */
export type PolicyLineVersionView = {
  rev: number;
  kind: "words" | "review";
  /** The words saved (a WORDS version), or `null` (a review marker — the page printed today's words). */
  texts: PolicyTexts | null;
  /** The fingerprint of the code default when it was saved (words) or reviewed (marker). */
  fingerprint: string;
  savedAtLabel: string;
  savedByName: string;
};

/** One line's saved versions, oldest first; `[]` when it was never saved. */
export type PolicyLineRowView = { key: PolicyLineKey; versions: PolicyLineVersionView[] };

/** A page's version as the page hands it over: the code's, and the one the page prints now. */
export type PolicyPageVersionView = { page: "rg" | "privacy"; title: string; code: string; printed: string };

/** What the server said was wrong, by line and language — the sentences shown under each box. */
type ServerProblems = Partial<Record<PolicyLineKey, Partial<Record<PolicyLocale, string[]>>>>;

/** The card's labels and hints — English console copy, in plain words; the rules they state are `POLICY_LINE_SPEC`'s. */
const LINE_COPY: Readonly<Record<PolicyLineKey, { label: string; hint: string }>> = {
  "rg.marketing": {
    label: "Responsible Gambling · §4, the marketing promise",
    hint: "The first bullet of §4 on /legal/responsible-gambling. Every language is checked against what the platform does: a promise it does not keep yet (a late-night window, a limit on how many messages) is refused, and dropping one it still keeps gets a note.",
  },
  "privacy.lawfulConsent": {
    label: "Privacy · §3, the Consent bullet",
    hint: "On /legal/privacy. The words before the first colon print in bold. It must keep saying where consent is withdrawn and that analytics runs only with it.",
  },
  "privacy.lawfulLicence": {
    label: "Privacy · §3, the licence bullet (new)",
    hint: "A new bullet after Consent on /legal/privacy, printed only once it is saved with words in all three languages; blank in all three means no bullet. The words before the first colon print in bold.",
  },
  "privacy.smsGateway": {
    label: "Privacy · §4, the SMS gateway (Blackball)",
    hint: "On /legal/privacy. It must keep naming the gateway, its role and what it receives — they are facts about the gateway.",
  },
  "profile.outreachNote": {
    label: "Profile · the note under the offers switch",
    hint: "Stored now and printed nowhere yet: the offers switch on /profile/notifications shows it once licence outreach is built (a later update). Blank in all three means no note.",
  },
};

const LOCALE_LABEL: Readonly<Record<PolicyLocale, string>> = { en: "English — the binding text", sw: "Swahili", zh: "Chinese" };

/** The review tick's visible words — the drive finds the tick by them; its accessible name adds the line's own label. */
const REVIEW_LABEL = "Mark today's words reviewed (the page and its version stay as they are)";
/** Why Save is off when nothing is to be saved — beside the button, and in the toast of a save asked for anyway. */
const HELD_IDLE = "Change a line, or tick “Mark today's words reviewed”, to save.";
const HELD_PROBLEMS = "Fix the problems shown under the lines to save.";

/** The length a box allows, said before it is typed into (DESIGN_AUTHORITY §A7). */
function lengthLine(key: PolicyLineKey): string {
  const spec = POLICY_LINE_SPEC[key];
  return spec.clearable
    ? `${spec.min} to ${spec.max} characters in every language — or blank in all three.`
    : `${spec.min} to ${spec.max} characters.`;
}

/** The id of a line's status line — named by each of its boxes' `aria-describedby`. Letters, digits, dash and low line
 *  only: an id is also written into selectors. */
const statusIdOf = (key: PolicyLineKey): string => `policy-status-${key.replace(/[^A-Za-z0-9_-]/g, "-")}`;

/** Every box of these lines that holds a problem, in the card's order — what `focusFirstInvalid` is handed. */
function problemFields(keys: readonly PolicyLineKey[], hasProblem: (key: PolicyLineKey, l: PolicyLocale) => boolean): string[] {
  return POLICY_LINE_KEYS.filter((key) => keys.includes(key))
    .flatMap((key) => POLICY_LOCALES.filter((l) => hasProblem(key, l)).map((l) => policyLineFieldName(key, l)));
}

/**
 * A box exactly as tall as its words, at every width — the wordings card's `WordingBox` recipe (collapse, measure, add the
 * borders back; a `ResizeObserver` re-measures on every width change). ⛔ A fixed `rows` cut the Swahili off on a phone, and
 * an admin publishing words must SEE all of them.
 */
function LineBox({ className, ...props }: React.ComponentProps<typeof Textarea>) {
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

/** What a line is now, from the versions the page handed over. */
type LineNow = {
  latest: PolicyLineVersionView | null;
  /** The saved words the page prints, or `null` while it prints today's text. */
  words: PolicyTexts | null;
  /** The words the page prints now. */
  printed: PolicyTexts;
  reviewedCurrent: boolean;
  defaultChanged: boolean;
};

function lineNow(key: PolicyLineKey, versions: PolicyLineVersionView[]): LineNow {
  const latest = versions.length > 0 ? versions[versions.length - 1] : null;
  const fingerprint = policyDefaultFingerprint(key);
  if (latest === null) return { latest, words: null, printed: POLICY_LINE_DEFAULTS[key], reviewedCurrent: false, defaultChanged: false };
  if (latest.kind === "review" || latest.texts === null) {
    const current = latest.fingerprint === fingerprint;
    return { latest, words: null, printed: POLICY_LINE_DEFAULTS[key], reviewedCurrent: current, defaultChanged: !current };
  }
  return { latest, words: latest.texts, printed: latest.texts, reviewedCurrent: false, defaultChanged: latest.fingerprint !== fingerprint };
}

export function PolicyLinesForm({ rows, pages }: { rows: PolicyLineRowView[]; pages: PolicyPageVersionView[] }) {
  const mayAct = useMayAct();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  /* The card's own Save. The bar draws no second one while this is on screen (owner, 2026-09-22). */
  const saveRef = useRef<HTMLButtonElement>(null);
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);

  const byKey = new Map(rows.map((r) => [r.key, r] as const));
  const versionsOf = (key: PolicyLineKey): PolicyLineVersionView[] => byKey.get(key)?.versions ?? [];
  const now = Object.fromEntries(POLICY_LINE_KEYS.map((key) => [key, lineNow(key, versionsOf(key))])) as Record<PolicyLineKey, LineNow>;
  /* ⭐ What each box starts with: the words the page prints now. The page remounts this card after a save (its `key` is the
     version counts), so the boxes always start from the row, never from what was typed. */
  const initial = Object.fromEntries(POLICY_LINE_KEYS.map((key) => [key, { ...now[key].printed }])) as Record<PolicyLineKey, PolicyTexts>;

  const [text, setText] = useState<Record<PolicyLineKey, PolicyTexts>>(() => ({ ...initial }));
  /* The lines an admin chose to mark reviewed as they stand. */
  const [review, setReview] = useState<Partial<Record<PolicyLineKey, boolean>>>({});
  /* The server's sentences from the last refused save, by line and language — cleared for a box as soon as it is typed into. */
  const [serverProblems, setServerProblems] = useState<ServerProblems>({});

  const edited = (key: PolicyLineKey): boolean =>
    !samePolicyTexts(normalizedPolicyTexts(key, text[key]), normalizedPolicyTexts(key, initial[key]));
  /* ⛔ What a save sends is the pure module's decision — a line whose words changed, or one printing today's words whose
     review box is ticked — each with the revision it was edited from. */
  const cardState: PolicyCardState = {
    texts: text,
    saved: Object.fromEntries(
      POLICY_LINE_KEYS.map((key) => [key, { rev: versionsOf(key).length, words: now[key].words, reviewedCurrent: now[key].reviewedCurrent }]),
    ) as PolicyCardState["saved"],
    review,
  };
  const sending = policyLinesToSave(cardState);
  const toSave = sending.map((line) => line.key);
  const included = (key: PolicyLineKey): boolean => toSave.includes(key);
  const verdicts = Object.fromEntries(
    POLICY_LINE_KEYS.map((key) => [key, policyLineProblems(key, text[key], now[key].printed)]),
  ) as Record<PolicyLineKey, ReturnType<typeof policyLineProblems>>;
  const hasProblem = (key: PolicyLineKey, l: PolicyLocale): boolean => verdicts[key].problems[l].length > 0;
  const shownError = (key: PolicyLineKey, l: PolicyLocale): string | undefined => {
    const fromServer = serverProblems[key]?.[l];
    if (fromServer && fromServer.length > 0) return fromServer.join(" ");
    if (!included(key) && !edited(key)) return undefined;
    const said = verdicts[key].problems[l].map((p) => p.sentence);
    return said.length > 0 ? said.join(" ") : undefined;
  };
  const shownHints = (key: PolicyLineKey): readonly string[] => (edited(key) ? verdicts[key].hints : []);
  /* ⭐ F4 · what the card must say about a SAVED line on load, edited or not. */
  const savedFlags = (key: PolicyLineKey): string[] => {
    const line = now[key];
    if (line.latest === null) return [];
    if (line.words === null) return line.defaultChanged ? [POLICY_LINE_SENTENCE.reviewStale] : [];
    const out: string[] = [];
    const judged = policyLineProblems(key, line.words, line.words);
    const failing = POLICY_LOCALES.flatMap((l) => judged.problems[l].map((p) => p.sentence));
    if (failing.length > 0) out.push(POLICY_LINE_SENTENCE.savedNowFails([...new Set(failing)]));
    if (line.defaultChanged) out.push(POLICY_LINE_SENTENCE.defaultChanged);
    return out;
  };
  const blocked = toSave.filter((key) => POLICY_LOCALES.some((l) => hasProblem(key, l)));
  const canSave = toSave.length > 0 && blocked.length === 0;
  /* Work that leaving would lose: a box typed into, or a review box ticked. */
  const dirty = POLICY_LINE_KEYS.some((key) => edited(key) || review[key] === true);
  const savedCount = POLICY_LINE_KEYS.filter((key) => versionsOf(key).length > 0).length;

  const onText = (key: PolicyLineKey, l: PolicyLocale, value: string) => {
    setText((cur) => ({ ...cur, [key]: { ...cur[key], [l]: value } }));
    setServerProblems((cur) => {
      const forKey = cur[key];
      if (forKey === undefined || forKey[l] === undefined) return cur;
      const nextForKey = { ...forKey };
      delete nextForKey[l];
      return { ...cur, [key]: nextForKey };
    });
  };

  const discard = () => {
    setText({ ...initial });
    setReview({});
    setServerProblems({});
  };

  /** The success toast: new words and reviews counted apart, and each page whose printed version moved. */
  const savedSentence = (changed: number, moved: number, versions: { rg: string; privacy: string }): string => {
    const reviewed = changed - moved;
    const parts: string[] = [];
    if (moved > 0) parts.push(`${moved} line${moved === 1 ? "" : "s"} saved — the public pages print ${moved === 1 ? "it" : "them"} now`);
    if (reviewed > 0) parts.push(`${reviewed} line${reviewed === 1 ? "" : "s"} marked reviewed — ${reviewed === 1 ? "its page is" : "their pages are"} unchanged`);
    const bumped = pages.filter((p) => versions[p.page] !== p.printed).map((p) => `the ${p.title} now prints version ${versions[p.page]}`);
    return `${parts.join("; ")}${bumped.length > 0 ? `, and ${bumped.join(" and ")}` : ""}.`;
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    /* ⛔ CAPTURED BEFORE THE ASYNC BOUNDARY — `e.currentTarget` is null inside the transition, and the form is the scope
       `focusFirstInvalid` searches (several forms share this page). */
    const form = e.currentTarget;
    // ⛔ NEVER A SILENT NO-OP. Enter in a box and the pending bar's Save both land here: a held save takes the admin to the
    // first box with a problem, where the reason is written — or says there is nothing to save yet.
    if (blocked.length > 0) { focusFirstInvalid(form, problemFields(blocked, hasProblem)); return; }
    if (sending.length === 0) { toast({ title: "Nothing to save yet", description: HELD_IDLE }); return; }
    const fd = new FormData();
    for (const [name, value] of policyLinesPostEntries(sending)) fd.set(name, value);
    start(async () => {
      const r = await runAdminAction(() => savePolicyLinesAction(fd));
      if (!r.ok) {
        const problems = ("problems" in r && r.problems ? r.problems : {}) as ServerProblems;
        setServerProblems(problems);
        toast({ title: "Couldn't save the policy lines", description: r.error, variant: "danger" });
        const fields = problemFields(POLICY_LINE_KEYS, (key, l) => (problems[key]?.[l]?.length ?? 0) > 0);
        if (fields.length > 0) focusFirstInvalid(form, fields);
        else if (r.field) focusFirstInvalid(form, [r.field]);
        return;
      }
      router.refresh();
      deferToast(r.changed > 0
        ? { title: r.moved > 0 ? "Policy lines saved" : "Marked reviewed", description: savedSentence(r.changed, r.moved, r.versions), variant: "success" }
        : { title: "Nothing changed", description: "Every line already reads that way." });
    });
  };

  const statusOf = (key: PolicyLineKey): { line: string; saved: boolean } => {
    const line = now[key];
    const latest = line.latest;
    if (latest !== null) {
      const revision = latest.rev > 1 ? ` (revision ${latest.rev})` : "";
      if (line.words === null) {
        return { line: `Reviewed ${latest.savedAtLabel} by ${latest.savedByName}${revision} — the page prints today's words.`, saved: true };
      }
      const blank = POLICY_LINE_SPEC[key].clearable && POLICY_LOCALES.every((l) => line.words?.[l] === "") ? " Blank — nothing is printed." : "";
      return { line: `Saved ${latest.savedAtLabel} by ${latest.savedByName}${revision}.${blank}`, saved: true };
    }
    if (POLICY_LINE_SPEC[key].clearable) return { line: "Not set — nothing is printed.", saved: false };
    return { line: "Not saved — the page prints today's words, shown here.", saved: false };
  };

  const historyOf = (key: PolicyLineKey) => {
    const versions = versionsOf(key);
    if (versions.length === 0) return null;
    return (
      <details className="group mt-1.5" data-policy-history={key}>
        <summary className="flex min-h-[var(--tap-min)] cursor-pointer list-none items-center gap-1.5 text-body-sm text-text-subtle hover:text-text-muted">
          <span className="shrink-0 group-open:rotate-90"><I.chevronRight s={13} /></span>
          <span>History · {versions.length} {versions.length === 1 ? "version" : "versions"}</span>
        </summary>
        <ol className="mt-1.5 space-y-2 border-l-2 border-border pl-2">
          {[...versions].reverse().map((v) => (
            <li key={v.rev} className="text-body-sm">
              <p className="text-text-subtle">Version {v.rev} · {v.savedAtLabel} · {v.savedByName}</p>
              {v.texts === null ? (
                <p className="mt-0.5 text-text-secondary">Today&apos;s words, marked reviewed — the page kept printing them.</p>
              ) : (
                POLICY_LOCALES.filter((l) => v.texts?.[l] !== "").map((l) => (
                  <p key={l} lang={l} className="mt-0.5 whitespace-pre-wrap break-words text-text-secondary">
                    <span className="text-text-tertiary">{LOCALE_LABEL[l]}: </span>{v.texts?.[l]}
                  </p>
                ))
              )}
            </li>
          ))}
        </ol>
      </details>
    );
  };

  const flagsOf = (key: PolicyLineKey) => {
    const flags = savedFlags(key);
    if (flags.length === 0) return null;
    return (
      <ul className="space-y-1" data-policy-flags={key}>
        {flags.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-body-sm text-warning-fg">
            <I.alertCircle s={14} className="mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    );
  };

  const versionsBlock = (
    <dl className="rounded-md border border-border bg-bg-overlay px-3 py-2 text-body-sm" data-policy-versions>
      {pages.map((p) => (
        <div key={p.page} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5" data-policy-version={p.page}>
          <dt className="text-text-muted">{p.title}</dt>
          <dd className="font-mono tabular-nums text-text">
            Version {p.printed}{p.printed !== p.code ? " — moved by saved words" : " — the code's"}
          </dd>
        </div>
      ))}
    </dl>
  );

  // ⛔ BELOW EVERY HOOK — a viewer without the act reads every line as the public reads it now, and changes nothing.
  if (!mayAct) {
    return (
      <div className="space-y-3">
        <ActReadOnly note="Only an admin can change the public policy lines." />
        {versionsBlock}
        <ul className="space-y-4">
          {POLICY_LINE_KEYS.map((key) => {
            const shown = now[key].printed;
            return (
              <li key={key} className="text-body-sm" data-policy-line={key}>
                <p className="font-semibold text-text">{LINE_COPY[key].label}</p>
                <p className="mt-1 text-text-subtle">{statusOf(key).line}</p>
                {POLICY_LOCALES.filter((l) => shown[l] !== "").map((l) => (
                  <p key={l} lang={l} className="mt-1 whitespace-pre-wrap break-words text-text-secondary">
                    <span className="text-text-tertiary">{LOCALE_LABEL[l]}: </span>{shown[l]}
                  </p>
                ))}
                {flagsOf(key)}
                {historyOf(key)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate data-testid="policy-lines-form">
      <p className="text-body-sm text-text-secondary" data-policy-count>{savedCount} of {POLICY_LINE_KEYS.length} lines saved.</p>
      {versionsBlock}
      <FormColumn measure="form" className="space-y-6">
        {POLICY_LINE_KEYS.map((key) => {
          const status = statusOf(key);
          const statusId = statusIdOf(key);
          const hints = shownHints(key);
          const clearable = POLICY_LINE_SPEC[key].clearable;
          const offersReview = now[key].words === null && !clearable && !now[key].reviewedCurrent;
          return (
            <div key={key} className="space-y-3" data-policy-line={key}>
              <div>
                <p className="font-semibold text-text">{LINE_COPY[key].label}</p>
                <p className="mt-0.5 text-body-sm text-text-subtle">{LINE_COPY[key].hint}</p>
                <p id={statusId} className={`mt-1 text-body-sm ${status.saved ? "text-text-subtle" : "text-warning-fg"}`} data-policy-status={status.saved ? (now[key].words === null ? "reviewed" : "saved") : "unsaved"}>
                  {status.line}
                </p>
              </div>
              {flagsOf(key)}
              {POLICY_LOCALES.map((l) => {
                const error = shownError(key, l);
                return (
                  <div key={l} data-policy-locale={l}>
                    <Field
                      label={LOCALE_LABEL[l]}
                      hint={lengthLine(key)}
                      error={error}
                      dataField={policyLineFieldName(key, l)}
                      optional={clearable}
                    >
                      {/* ⛔ No box is ever disabled or read-only (the owner rule: no locked box) — a viewer who may not act
                          gets the read-only view above, not greyed boxes. */}
                      <LineBox
                        value={text[key][l]}
                        onChange={(e) => onText(key, l, e.currentTarget.value)}
                        error={error !== undefined}
                        aria-describedby={statusId}
                        lang={l}
                      />
                    </Field>
                  </div>
                );
              })}
              {hints.length > 0 && (
                <ul className="space-y-1" data-policy-hints={key}>
                  {hints.map((h) => (
                    <li key={h} className="text-body-sm text-warning-fg">{h}</li>
                  ))}
                </ul>
              )}
              {offersReview && (
                <Checkbox
                  checked={review[key] === true}
                  onChange={(on) => setReview((cur) => ({ ...cur, [key]: on }))}
                  label={REVIEW_LABEL}
                  ariaLabel={`${REVIEW_LABEL}: ${LINE_COPY[key].label}`}
                />
              )}
              {historyOf(key)}
            </div>
          );
        })}
      </FormColumn>
      <div className="flex flex-wrap items-center gap-3">
        <Button ref={saveRef} type="submit" variant="primary" loading={pending} disabled={!canSave}>
          Save policy lines
        </Button>
        {/* A disabled control says why — a greyed button with no reason reads as a broken console. */}
        {!pending && !canSave && (
          <span className="text-body-sm text-text-tertiary" aria-live="polite">
            {blocked.length > 0 ? HELD_PROBLEMS : HELD_IDLE}
          </span>
        )}
      </div>
      <PendingChangesBar
        dirty={dirty}
        saving={pending}
        detail="New words print on the public pages at once and move their page's version; a review changes nothing on the page."
        saveAnchor={saveRef}
        onSave={() => {
          // The bar's Save is offered while the card's own is off screen — so a held save must not be a silent no-op
          // there: it takes the admin to the first box with a problem, where the reason is written.
          const form = formRef.current;
          if (!form) return;
          if (blocked.length > 0) { focusFirstInvalid(form, problemFields(blocked, hasProblem)); return; }
          form.requestSubmit();
        }}
        onDiscard={discard}
        saveLabel="Save policy lines"
      />
      <UnsavedChangesGuard dirty={dirty} body="The public policy lines have been changed but not saved. Leaving now discards the change." />
    </form>
  );
}

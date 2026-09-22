"use client";

/**
 * ONE ACCOUNT'S RULES AND ITS FOURTEEN LIMITS, AS A FORM (2026-09-21).
 *
 * ⛔ WHY IT EXISTS, MEASURED ON PRODUCTION. Until today this tab drew VALUES and no inputs, and its own caption
 * said editing was not ready on this build. So designation created every account with all fourteen limits NULL
 * and no product and no entry mode; `Start` refused on exactly those; and the refusal told the officer to open
 * this tab and save — where there was nothing to save with. An owner and a manager spent half an hour obeying
 * it on the live desk. The validator was green at 529/0 and the CAS write existed in both twins; only the door
 * and this form were missing.
 *
 * ⛔ THIS FILE NAMES NO SERVER MODULE, NOT EVEN FOR A TYPE (1.330, 1.384). `import type` is erased at build
 * time, and the guard refuses it anyway — in ANY import form — because the specifier itself is the leak. So
 * the props below are declared STRUCTURALLY here and the server's shape is checked against them where the two
 * meet, in the page, which is a server file.
 *
 * ⛔ AND NO PROP NAME IS HOUSE-SHAPED (1.384, 401): the account arrives as `accountId`. The column's own name
 * would cross this boundary as a prop name, which is the one thing that guard exists to refuse.
 *
 * ⛔ IT OWNS NO SENTENCE. `CLIENT_OWNED_COPY` holds the console's client files to a CLOSED set of six strings
 * of 25 characters or more and asserts its size, and 1.385 refuses any sentence the gate module can also emit.
 * Every sentence here arrives in `copy`; the literals below are short labels the kit needs.
 *
 * ⛔ IT DRAWS ITS OWN `PendingChangesBar`, AND ONE DRAFT WRONGLY DROPPED IT (peer review, read at source).
 * `unsaved-changes.tsx` runs a REGISTRY: every instance registers, the lowest id paints, and what it paints is
 * the entry dirtied most recently — the form the officer just touched (`:173-174`, `:208`). Two bars never land
 * in the same pixels, which is why `/admin/ai-usage` and `/admin/bonuses` render two. What dropping it cost was
 * the PROACTIVE half: `UnsavedChangesGuard` catches an officer leaving, while the bar is the only thing that
 * stands on screen saying there is unsaved work — not the half to give up on the form that sets what an
 * account may stake. The section's guard now asserts one bar PER FORM FILE rather than one per section.
 *
 * ⛔ IT IS UNCONTROLLED — fourteen `defaultValue` inputs and ten `defaultChecked` boxes, with `useFormDirty`
 * snapshotting the form so a value typed back to what it was stops being dirty rather than warning over
 * nothing.
 *
 * ⛔ AND IT POSTS THE WHOLE FORM, ALWAYS. An unchecked checkbox submits NOTHING in `FormData`, so the ten
 * switches are read off their own DOM nodes as explicit booleans. Reading absence as "off" is how a form that
 * failed to render a control silently turns a mode off on save; the server refuses a missing key rather than
 * guessing, and the two are halves of one decision.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/input";
import { FormColumn } from "@/components/ui/form-column";
import { ConfirmModal } from "@/components/ui/modal";
import { useDeferredToast } from "@/components/ui/toast";
import { PendingChangesBar, UnsavedChangesGuard, useFormDirty, useFormDraft } from "@/components/ui/unsaved-changes";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";

/** The rows and sentences the server hands down. ⛔ Declared here, never imported (see the block above). */
export type RulesFormModel = {
  baseVersion: number;
  caps: readonly {
    key: string; label: string; value: string;
    /** The same figure formatted, for the hint — the input is seeded from `value`, never from this. */
    saved: string;
    /** The consequence of leaving this limit unset. ⛔ Always present — this form decides when it applies. */
    caption: string;
    unit: "TZS" | "count"; required: boolean;
    /** What this limit governs, in one sentence. The server's; this file owns no copy. */
    help: string;
    /** A starting value as plain digits, or "" — it FILLS the box and never saves. */
    recommended: string;
  }[];
  flags: readonly { key: string; section: string; label: string; on: boolean; help: string }[];
  copy: {
    barDetail: string; guardBody: string;
    clearLabel: string; clearTitle: string; clearBody: string; clearConfirm: string; clearDone: string;
    fillLabel: string; fillDone: string; fillNothing: string;
    byHandNote: string; manyProblems: string; noFieldToMark: string;
    draftTitle: string; draftBody: string; draftRestore: string; draftDrop: string; draftRestored: string;
    notSavedYet: string;
  };
};

type SaveAnswer =
  | { ok: true; rulesVersion: number; changed: number; rulesChanged: boolean; recorded: boolean; warnings: string[] }
  /** ⛔ `fields` is EVERY field that is wrong, by neutral key; `field` is the first of them (server-side note). */
  | { ok: false; error: string; field?: string; fields?: Readonly<Record<string, string>> };

export function DeskRulesForm({
  accountId,
  model,
  onSave,
}: {
  accountId: string;
  model: RulesFormModel;
  onSave: (input: {
    accountId: string;
    baseVersion: number;
    values: Record<string, string>;
    flags: Record<string, boolean>;
  }) => Promise<SaveAnswer>;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /**
   * ⚠️ THE VALIDATOR'S WARNINGS, WHICH ARE ADVICE AND NEVER A REFUSAL. The one that matters is "no automatic
   * mode": an account can be saved legally, completely, and silently unable to do anything by itself.
   * ⚠️ IT CLEARS ON THE NEXT SAVE, INCLUDING A FAILED ONE — a warning about the state before an edit reads as
   * a warning about the state after it, which is worse than none.
   */
  const [warnings, setWarnings] = useState<string[]>([]);
  /** The empty-every-limit confirmation. ⛔ React state, never a DOM query — a closed dialog left in the tree
   *  has silenced a control on this platform once already. */
  const [clearing, setClearing] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  /* The form's own Save. The bar draws no second one while this is on screen (owner, 2026-09-22). */
  const saveRef = useRef<HTMLButtonElement>(null);
  const { dirty, markSaved, formProps } = useFormDirty(formRef);

  /**
   * ⭐ THE EXIT NOBODY CAN STAND AT (owner's request, 2026-09-21: *"perfectly sealed from all directions, if
   * someone suddenly quits"*). `UnsavedChangesGuard` below covers the tab closing and an in-app link; this
   * covers the Back button, a crash, a sleeping laptop, an expired session and a power cut — none of which any
   * listener can intercept. ⛔ It OFFERS; it never restores by itself, and a draft taken against a different
   * row version is refused outright rather than shown (the hook's own rule): somebody else changing this
   * account is exactly when stale limits must not be put back over theirs.
   * ⛔ THE KEY IS HASHED INSIDE THE HOOK, so the record id never lands on the officer's disk (D19).
   */
  const draft = useFormDraft({
    formRef,
    storageKey: `desk-rules:${accountId}`,
    version: String(model.baseVersion),
    dirty,
  });

  /* Sections in the order the server puts them in — derived from the rows, never a second list here. */
  const sections: Array<{ name: string; rows: RulesFormModel["flags"][number][] }> = [];
  for (const flag of model.flags) {
    const last = sections[sections.length - 1];
    if (last && last.name === flag.section) last.rows.push(flag);
    else sections.push({ name: flag.section, rows: [flag] });
  }

  /**
   * ⛔ SET A VALUE THE WAY A PERSON WOULD, OR THE FORM NEVER HEARS IT.
   *
   * These boxes are UNCONTROLLED, so assigning `input.value` changes the pixels and fires NOTHING: no `input`,
   * no `change`, and therefore no `useFormDirty` — the pending bar would stay hidden over a form full of values
   * nobody had saved. That is the identical failure this whole pass exists to close, one layer down, and it
   * would have shipped inside the fix for it.
   * ⚠️ `input` (not `change`) and `bubbles: true`: the form listens for both, `input` is the one a keystroke
   * raises, and an event that does not bubble never reaches the `<form>` the listener is on.
   */
  /**
   * ⛔ WHICH LIMIT BOXES ARE EMPTY RIGHT NOW — the only thing this form keeps in React state about the caps,
   * and it exists so the sentence under a field can be true of the FIELD rather than of the stored row (see
   * the hint below). ⚠️ Seeded from the server's values so the first paint is right before any event fires.
   */
  const [boxEmpty, setBoxEmpty] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(model.caps.map((c) => [c.key, c.value === ""])));

  /* ⚠️ Returns the SAME object when nothing moved, so an ordinary keystroke inside a box that was already
     filled does not re-render fourteen fields. */
  const syncEmptiness = () => {
    const form = formRef.current;
    if (!form) return;
    const next: Record<string, boolean> = {};
    for (const cap of model.caps) {
      const node = form.elements.namedItem(cap.key);
      next[cap.key] = !(node instanceof HTMLInputElement) || node.value.trim() === "";
    }
    setBoxEmpty((cur) => (model.caps.some((c) => cur[c.key] !== next[c.key]) ? next : cur));
  };

  const setBox = (node: HTMLInputElement, next: string) => {
    if (node.value === next) return false;
    node.value = next;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  };

  /** Fill every EMPTY limit with its starting value. ⛔ Never overwrites a value an officer already chose. */
  const fillStarting = () => {
    const form = formRef.current;
    if (!form) return;
    let filled = 0;
    for (const cap of model.caps) {
      if (cap.recommended === "") continue;
      const node = form.elements.namedItem(cap.key);
      if (!(node instanceof HTMLInputElement) || node.value.trim() !== "") continue;
      if (setBox(node, cap.recommended)) filled++;
    }
    setErrors({});
    setWarnings([]);
    toast({
      title: model.copy.fillLabel,
      description: filled > 0 ? model.copy.fillDone : model.copy.fillNothing,
      variant: filled > 0 ? "success" : "factual",
    });
  };

  /** Empty every limit box. ⛔ Saves nothing — the bar's Save or Discard decides what happens to it. */
  const emptyEveryLimit = () => {
    const form = formRef.current;
    if (!form) return;
    for (const cap of model.caps) {
      const node = form.elements.namedItem(cap.key);
      if (node instanceof HTMLInputElement) setBox(node, "");
    }
    setErrors({});
    setWarnings([]);
    toast({ title: model.copy.clearTitle, description: model.copy.clearDone, variant: "warning" });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    /**
     * 🔴 A CONTROL THAT IS NOT THERE IS A REFUSAL, NEVER A VALUE — and this file's own header has said so since
     * it was written while the code below did the opposite (found by reading it against its docblock, 2026-09-21).
     *
     * The old form read `node instanceof HTMLInputElement ? node.value.trim() : ""` and
     * `… ? node.checked : false`. Both fall back to the state that means LESS: `""` is what the server reads as
     * UNSET, and `false` turns a mode off. So a control that failed to render — a future conditional section, a
     * hydration that half-finished, a name that drifted — would not have produced an error. It would have
     * produced a SAVE that silently cleared a ceiling which stops money, or silently switched an entry mode off,
     * and reported "Saved".
     * ⛔ THE FAILURE DIRECTION MATTERS MORE THAN THE FAILURE RATE. The server already refuses a missing key
     * rather than guessing; this is the client half of that same decision, and the two are one rule.
     */
    const missing: string[] = [];
    const values: Record<string, string> = {};
    for (const cap of model.caps) {
      const node = el.elements.namedItem(cap.key);
      if (!(node instanceof HTMLInputElement)) { missing.push(cap.key); continue; }
      values[cap.key] = node.value.trim();
    }
    /* ⛔ READ OFF THE NODES, NOT OFF `FormData` — an unchecked box submits nothing at all. */
    const flags: Record<string, boolean> = {};
    for (const flag of model.flags) {
      const node = el.elements.namedItem(flag.key);
      if (!(node instanceof HTMLInputElement)) { missing.push(flag.key); continue; }
      flags[flag.key] = node.checked;
    }
    if (missing.length > 0) {
      /* The server's own stale-form sentence is the right one here: the page no longer matches what it posts. */
      toast({ title: "Couldn't save", description: model.copy.noFieldToMark, variant: "danger" });
      return;
    }
    start(async () => {
      /* ⛔ A THROWN SERVER ACTION MUST NOT END THE SPINNER IN SILENCE. The action maps every server failure
         onto the union already, so what is left here is the TRANSPORT — a dropped POST, a serialisation
         failure — and a throw out of `startTransition` clears the pending state and shows nothing at all. */
      let result: SaveAnswer;
      try {
        result = await onSave({ accountId, baseVersion: model.baseVersion, values, flags });
      } catch {
        result = { ok: false, error: "Not saved — try again." };
      }
      if (!result.ok) {
        setWarnings([]);
        /**
         * ⛔ EVERY FIELD THE SERVER NAMED IS MARKED, NOT JUST THE FIRST (owner's report, 2026-09-21:
         * "sometimes after they change several checkboxes and save, it says Couldn't save").
         *
         * 🔴 MEASURED ON A RUNNING BUILD BEFORE THIS CHANGE. With four bad values the form marked ONE, said one
         * sentence, and refused three more times as each was fixed — while the validator had found all four on
         * the first call. `fields` carries the whole set now; `field` stays as the first, because the order is
         * the page's own and the first is the one worth scrolling to.
         * ⚠️ THE FALLBACK IS THE SINGLE FIELD, NOT AN EMPTY MAP: a refusal that names one field and no map is
         * still a refusal that must mark its box.
         */
        const marks = result.fields && Object.keys(result.fields).length > 0
          ? { ...result.fields }
          : (result.field ? { [result.field]: result.error } : {});
        setErrors(marks);
        const n = Object.keys(marks).length;
        toast({
          title: "Couldn't save",
          /* ⛔ ONE SENTENCE WHEN THERE IS ONE PROBLEM, A COUNT WHEN THERE ARE MORE. A toast that named only the
             first of four taught an officer the save was flaky; a toast that says how many are marked sends
             them to the form instead of back to the button. */
          description: n > 1 ? model.copy.manyProblems.replace("{n}", String(n)) : (n === 1 ? result.error : `${result.error} ${model.copy.noFieldToMark}`),
          variant: "danger",
        });
        /**
         * ⛔ AND THE OFFICER IS TAKEN TO THE FIELD (§K rule 7d) — the limits form has always done this and this
         * one never did. 🔴 Measured: a refusal left focus on `BODY` at `scrollY: 1280`, with the marked box
         * off-screen and a toast that disappears after a few seconds. `focusFirstInvalid` picks in DOCUMENT
         * order, so it lands on the earliest problem rather than on whichever the server happened to name, and
         * its RESULT UNION is handled — a helper that answers `not-rendered` and is ignored is the historical
         * defect its own header names.
         */
        if (n > 0) {
          const landed = focusFirstInvalid(el, Object.keys(marks));
          if (!landed.ok && landed.reason === "not-rendered" && landed.ownedByTab) router.push(landed.ownedByTab as never);
        }
        return;
      }
      setErrors({});
      setWarnings(result.warnings);
      markSaved();
      /* ⛔ A SAVE ENDS ANY OLDER OFFER, SAID OUTRIGHT RATHER THAN INFERRED (owner's report,
         2026-09-22: *"I had pending changes, but clicked the save in bottom, I still had the popup
         that pending changes from before"*). The hook also clears it when the row version moves and
         when the form goes clean — but neither fires for a form that was saved without ever being
         dirty in this mount, and an offer to restore work older than the save is one click from
         undoing the save. The form knows a save happened; it should not make the hook guess. */
      draft.drop();
      router.refresh();
      /* ⛔ A SAVE THAT LANDED WITHOUT ITS COMPLIANCE ROW SAYS SO. The change is real either way, and telling
         the officer it was not saved is the most expensive sentence this console can print. */
      deferToast({
        title: result.recorded ? "Saved" : "Saved · not recorded",
        variant: result.recorded ? "success" : "warning",
      });
    });
  };

  /**
   * ⛔ THE KIT'S HANDLERS ARE CALLED, NOT REPLACED. `formProps` carries the dirty tracker's own `onInput` and
   * `onChange`; spreading it and then declaring either prop again would SILENTLY drop the kit's, the pending
   * bar would stop appearing, and the overwrite would read as a tidy one-line addition — which is the exact
   * defect this whole pass exists to close, reintroduced from above. Composed explicitly, the kit's first.
   */
  const onFormInput = () => { formProps.onInput(); syncEmptiness(); };
  const onFormChange = () => { formProps.onChange(); syncEmptiness(); };

  return (
    <form
      ref={formRef}
      {...formProps}
      onInput={onFormInput}
      onChange={onFormChange}
      onSubmit={onSubmit}
      className="space-y-5"
    >
      <FormColumn measure="form">
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.name} className="space-y-3">
              <p className="text-body-sm font-semibold text-text">{section.name}</p>
              {/* ⛔ THE SECTION WHOSE SWITCHES NOTHING CAN ACT ON SAYS SO, ABOVE THEM (2026-09-21). Neither
                  "Enter now" nor a target can be created from any screen on this build, and BOTH nevertheless
                  satisfy the start check — so an account whose only entry is one of these starts cleanly and
                  then never places a bet, with nothing anywhere saying why. The switches stay (the engine
                  reads them); what stops is the form implying a control exists behind them.
                  ⚠️ The sentence is the SERVER's, keyed off the section the flag's own help belongs to rather
                  than a name typed here — `byHand` is decided by the two flags' membership, not by a literal. */}
              {section.rows.some((f) => /^(enter-now|targeted-stakes)$/.test(f.key)) && (
                <Callout tone="warning" size="sm" surface="panel" role="note">{model.copy.byHandNote}</Callout>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.rows.map((flag) => (
                  /* ⭐ THE EXPLANATION SITS UNDER THE SWITCH, OUTSIDE ITS `<label>` (owner's request, 2026-09-21:
                     "some explanation about what each field does"). ⛔ OUTSIDE, deliberately: the kit's Checkbox
                     label IS the 44px hit area, so folding two lines of prose into it would make the whole
                     paragraph a toggle — a mis-tap on a rule that decides what an account may stake.
                     ⛔ `text-body-sm`, never `text-caption`: §T4 holds reading copy to a 12.5px floor and this is
                     a sentence an officer is meant to READ, not a microlabel. */
                  <div key={flag.key} className="space-y-1">
                    <Checkbox name={flag.key} label={flag.label} defaultChecked={flag.on} />
                    <p className="text-body-sm text-text-tertiary max-w-[52ch] pl-7">{flag.help}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-3">
            <p className="text-body-sm font-semibold text-text">Limits</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {model.caps.map((cap) => (
                <Field
                  key={cap.key}
                  label={cap.label}
                  dataField={cap.key}
                  error={errors[cap.key]}
                  /* ⛔ THE SAVED VALUE OPENS THE HINT, AND THE FIGURE WEARS THE ROW'S OWN FACE (401, 409).
                     🔴 The first draft printed the bare word "TZS" here: loose currency text with no money
                     atom on the surface at all, which the visual gate reported at both widths. An
                     uncontrolled field shows what is being TYPED, so an officer who has typed over a ceiling
                     that stops money still has to be able to read what it WAS.
                     ⛔ A COUNT IS NOT MONEY: it gets the mono/tabular face without `.amount`, which is
                     `white-space: nowrap` and MEANS money everywhere else in this kit.
                     ⛔ AND AN UNSET CAP SAYS WHAT IT COSTS INSTEAD (364) — the server's sentence, chosen by
                     the field's own membership, never a blanket one typed here. */
                  /* ⭐ AND THE EXPLANATION LEADS IT (owner's request, 2026-09-21). ⛔ IT COMES FIRST, BEFORE
                     the saved figure and before the unset consequence: an officer reading a field they have
                     never seen needs to know WHAT IT GOVERNS before either of the other two sentences means
                     anything. The state sentence follows on its own line, so the two are never read as one. */
                  /**
                   * ⛔ THE STATE LINE FOLLOWS THE BOX, NOT THE STORED ROW — and the difference is a
                   * contradiction the page used to print (read off a rendered refusal, 2026-09-21):
                   * "Daily stake cap · 200000" with "Not set — this account cannot place a bet." directly
                   * underneath, because the box shows what was TYPED and this sentence was chosen from what
                   * was STORED. Three states, each true of the box in front of the officer:
                   *   · EMPTY → what leaving it empty will cost, whether or not something is stored (so a
                   *     stored ceiling the officer has just cleared now warns, which it never did before);
                   *   · TYPED, nothing stored → it is not saved yet, said plainly;
                   *   · TYPED or untouched, something stored → what is stored, in the money atom.
                   */
                  hint={
                    <>
                      <span className="block">{cap.help}</span>
                      <span className="block mt-0.5">
                        {boxEmpty[cap.key] ? (
                          <span className="text-warning-fg">{cap.caption}</span>
                        ) : cap.value === "" ? (
                          model.copy.notSavedYet
                        ) : (
                          <>
                            Saved{" "}
                            <span className={cap.unit === "TZS" ? "amount tabular-nums" : "font-mono tabular-nums"}>{cap.saved}</span>.
                          </>
                        )}
                      </span>
                    </>
                  }
                >
                  <Input
                    name={cap.key}
                    size="md"
                    mono
                    /* 🔴 THE BOX ITSELF IS PAINTED INVALID, AND IT WAS NOT (measured 2026-09-21: a refused save
                       set the Field's message and left `aria-invalid` off every input on the page). The limits
                       form next door has always passed this; this one never did, so the one control the officer
                       had to change looked exactly like the thirteen that were fine. */
                    error={!!errors[cap.key]}
                    defaultValue={cap.value}
                    inputMode="numeric"
                    autoComplete="off"
                    prefix={cap.unit === "TZS" ? "TZS" : undefined}
                    aria-label={cap.label}
                  />
                </Field>
              ))}
            </div>
          </div>
        </div>
      </FormColumn>

      {/* ⛔ THE OFFER SITS ABOVE THE FORM'S OWN MESSAGES AND BELOW THE FIELDS' — it is about the whole form,
          and an officer must meet it before they start typing over what it is offering to restore. */}
      {draft.found !== null && (
        <Callout tone="warning" size="md" surface="panel" role="status" title={model.copy.draftTitle}>
          <p className="max-w-[72ch]">{model.copy.draftBody}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* ⛔ `md`, never the `sm` rungs: `test:house-bot-console` 1.412 pins EVERY control under this
                section to one size, so a "small" action here would be a second control scale on a form whose
                other three buttons are md — and the guard is right, because a rung chosen per-component is
                how a section ends up with four button heights. */}
            <Button
              type="button"
              size="md"
              variant="primary"
              onClick={() => {
                draft.restore();
                setErrors({});
                setWarnings([]);
                toast({ title: model.copy.draftTitle, description: model.copy.draftRestored, variant: "success" });
              }}
            >
              {model.copy.draftRestore}
            </Button>
            <Button type="button" size="md" variant="ghost" onClick={draft.drop}>
              {model.copy.draftDrop}
            </Button>
          </div>
        </Callout>
      )}

      {warnings.length > 0 && (
        <Callout tone="warning" size="md" surface="panel" role="status" title="Saved — check these">
          <ul className="space-y-1">
            {warnings.map((w) => (
              <li key={w} className="max-w-[72ch]">{w}</li>
            ))}
          </ul>
        </Callout>
      )}

      {/**
       * ⛔ IT DOES DRAW THE BAR, AND THE FIRST DRAFT WRONGLY DROPPED IT (peer review, verified at source
       * 2026-09-21). `unsaved-changes.tsx` runs a REGISTRY: every instance registers, the lowest id paints,
       * and what it paints is the entry dirtied most recently — the form the officer just touched (`:173-174`,
       * `:208`). So two bars never land in the same pixels; the hazard the singleton work fixed is gone, and
       * `/admin/ai-usage` and `/admin/bonuses` are the two-form pages it was built for.
       * ⚠️ WHAT DROPPING IT COST WAS THE PROACTIVE HALF. `UnsavedChangesGuard` catches an officer LEAVING; the
       * bar is the only thing that stands on screen saying there is unsaved work — on the form that sets what
       * an account may stake, that is not the half to give up.
       */}
      <PendingChangesBar
        dirty={dirty}
        saving={pending}
        detail={model.copy.barDetail}
        onSave={() => formRef.current?.requestSubmit()}
        onDiscard={() => {
          formRef.current?.reset();
          setErrors({});
          markSaved();
        }}
        saveLabel="Save · Hifadhi"
        saveAnchor={saveRef}
      />
      <UnsavedChangesGuard dirty={dirty} body={model.copy.guardBody} />

      {/**
       * ⭐ THE TWO CONTROLS THAT FILL AND EMPTY THE LIMITS (owner's request, 2026-09-21: *"there should also be
       * a button to empty all rules, maybe, and anything else needed to make the flow complete"*).
       *
       * ⛔ NEITHER SAVES, AND BOTH SAY SO. Filling and committing are different decisions on the form that sets
       * the ceilings which stop money — the same line the global limits panel's own "Use recommended values"
       * has always drawn. What they do is make the form DIRTY, which is exactly right: the pending bar then
       * stands there with Save and Discard in reach, so nothing either button does is one-way.
       * ⛔ EMPTYING ASKS FIRST, FILLING DOES NOT. Emptying destroys typing the officer may have done and takes
       * the account to a state where it cannot place a bet at all; filling only writes into boxes that are
       * already empty and can be undone by emptying. Reaching for the strongest ceremony on both is how a
       * confirm stops meaning anything on the one that needs it.
       * ⚠️ `tier="medium"`, never `"hard"`: nothing is saved by this, so it is a reversible loss of typing and
       * not an irreversible act on money — a type-to-confirm here would spend a ceremony this console reserves
       * for the switch.
       * ⛔ THEY WRITE THROUGH THE DOM AND THEN ANNOUNCE THE CHANGE, because the boxes are UNCONTROLLED: setting
       * `input.value` fires nothing at all, so `useFormDirty` would never hear it and the bar would not appear —
       * which is the very defect this whole pass exists to close, and it would have been reintroduced by the fix
       * for it. One `input` event per box, bubbling, is what the form is already listening for.
       */}
      <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 pt-1">
        <Button ref={saveRef} type="submit" size="md" variant="primary" loading={pending}>
          Save · Hifadhi
        </Button>
        <Button type="button" size="md" variant="ghost" disabled={pending} onClick={fillStarting}>
          {model.copy.fillLabel}
        </Button>
        <Button type="button" size="md" variant="ghost" disabled={pending} onClick={() => setClearing(true)}>
          {model.copy.clearLabel}
        </Button>
        <p className="text-body-sm text-text-subtle">{model.copy.barDetail}</p>
      </div>

      <ConfirmModal
        open={clearing}
        onClose={() => setClearing(false)}
        onConfirm={() => { setClearing(false); emptyEveryLimit(); }}
        title={model.copy.clearTitle}
        body={model.copy.clearBody}
        confirmLabel={model.copy.clearConfirm}
        cancelLabel="Keep them"
        tier="medium"
      />
    </form>
  );
}

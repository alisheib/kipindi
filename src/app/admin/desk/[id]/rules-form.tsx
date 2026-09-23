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
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/input";
import { FieldLegend } from "@/components/ui/field-legend";
import { FormColumn } from "@/components/ui/form-column";
import { ConfirmModal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TimeSelect } from "@/components/ui/time-select";
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
  /**
   * ⭐ THE TWO SCOPE PICKERS (2026-09-22). Each is a GROUP of boxes under one neutral `key`, posted as the save's
   * `lists[field]`; `product` is the switch the group follows, and `entries` is the live platform list with the
   * durable value each box carries. ⛔ Every sentence (`help`, `onceOn`, `none`) is the server's.
   */
  lists: readonly {
    key: string; field: "categories" | "chains"; label: string; help: string;
    product: string; productOn: boolean; onceOn: string; none: string;
    entries: readonly { key: string; value: string; label: string; on: boolean }[];
  }[];
  /**
   * ⭐ THE 29 NUMERIC RULE LEAVES (2026-09-23 · register A1). Grouped by `section` in the order the server
   * sends them; `min`/`max` are the LIVE bounds and "" when the platform read behind them failed.
   */
  rules: readonly {
    key: string; section: string; label: string; value: string; saved: string;
    unit: "TZS" | "percent" | "seconds" | "minutes" | "count";
    min: string; max: string; range: string; defaultValue: string; recommended: string;
    /** "Recommended: TZS 5,000." — the server's sentence; this file owns no copy. */
    recommendedNote: string;
    nullable: boolean; help: string; hint: string; usedBy: string; idle: boolean;
    options: readonly { value: string; label: string }[] | null;
  }[];
  /** The counter amount's kind, and which box each choice reveals. */
  amountKind: {
    key: string; label: string; help: string; value: "PCT" | "FIXED";
    options: readonly { value: "PCT" | "FIXED"; label: string; showsKey: string }[];
  };
  /** The schedule: seven days, an all-day switch, and four HH:MM rows in EAT posted exactly as typed. */
  schedule: {
    daysKey: string; allDayKey: string; windowsKey: string; section: string;
    daysLabel: string; daysHelp: string; allDayLabel: string; allDayHelp: string;
    windowsLabel: string; windowsHelp: string; windowsIgnored: string; startLabel: string; endLabel: string;
    allDay: boolean;
    days: readonly { key: string; value: string; label: string; on: boolean }[];
    windows: readonly { startKey: string; endKey: string; start: string; end: string }[];
    saved: readonly string[];
  };
  copy: {
    barDetail: string; guardBody: string; listsSection: string;
    clearLabel: string; clearTitle: string; clearBody: string; clearConfirm: string; clearDone: string;
    fillLabel: string; fillDone: string; fillNothing: string;
    byHandNote: string; manyProblems: string; noFieldToMark: string;
    draftTitle: string; draftBody: string; draftRestore: string; draftDrop: string; draftRestored: string;
    notSavedYet: string;
    boundsUnreadable: string; rulesSection: string; rulesNote: string; idleNote: string;
    startingRulesDone: string;
  };
};

/**
 * ⛔ A KIT CONTROL'S VALUE, MADE POSTABLE AND MADE TO RAISE AN EVENT (2026-09-23).
 *
 * `Select` and `TimeSelect` are React controls: they answer `onChange` and hold their value in state. Two
 * things this form needs are therefore not automatic, and BOTH have bitten this section before.
 *   · ⛔ IT MUST BE IN `form.elements` UNDER ITS OWN KEY, because the submit refuses a control that is not
 *     there rather than reading its absence as a value — the rule the ten switches and the two pickers
 *     already obey. A hidden input is what makes a React control satisfy it.
 *   · 🔴 IT MUST RAISE `input`, or the pending bar never appears. Assigning a hidden input's `value` fires
 *     NOTHING, and the form's dirty tracker listens for `input`/`change` — which is exactly the defect
 *     (`checkbox.tsx`'s `preventDefault`) that this whole flow was rebuilt to fix, one layer down.
 * ⚠️ NOT ON THE FIRST PAINT: the mount would mark a form dirty that nobody has touched, and an officer who
 * opened a tab and left would be warned they were losing work they never did.
 */
function PostedValue({ name, value }: { name: string; value: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    ref.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [value]);
  return <input ref={ref} type="hidden" name={name} value={value} readOnly />;
}

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
    lists: { categories: string[]; chains: string[] };
    numbers: Record<string, string>;
    amountKind: string;
    schedule: { days: string[]; allDay: boolean; windows: { start: string; end: string }[] };
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
  /* ⭐ THE SAME DERIVATION FOR THE NUMBERS (2026-09-23): the server sends them in `FIELD_ORDER` with their
     own section word, and the grouping is a fold over that — never a list of section names typed here, which
     would be a second ordering able to disagree with the one the refusals are sorted by. */
  const ruleSections: Array<{ name: string; rows: RulesFormModel["rules"][number][] }> = [];
  for (const row of model.rules) {
    const last = ruleSections[ruleSections.length - 1];
    if (last && last.name === row.section) last.rows.push(row);
    else ruleSections.push({ name: row.section, rows: [row] });
  }
  /* The section the amount's two boxes live in — the chooser is drawn at its head, beside what it switches. */
  const amountSection = model.rules.find((r) => r.key === model.amountKind.options[0].showsKey)?.section;
  /* ⛔ HIDDEN, NEVER UNMOUNTED (see the render): the unchosen amount box must stay in `form.elements`. */
  const hiddenAmountBox = (key: string): boolean =>
    model.amountKind.options.some((o) => o.showsKey === key && o.value !== amountKind);

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
    Object.fromEntries([...model.caps, ...model.rules].map((c) => [c.key, c.value === ""])));

  /**
   * ⭐ WHICH PRODUCT SWITCHES ARE ON RIGHT NOW — so a picker can say "applies once Polls is on" about the BOX in
   * front of the officer and not about the stored row (the same distinction the cap captions make). Seeded from
   * the server's saved state so the first paint is right before any event fires; followed off the live switch
   * from then on, through the same input/change/reset path every other live fact of this form uses.
   */
  const [productOn, setProductOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(model.lists.map((l) => [l.product, l.productOn])));

  /**
   * ⭐ THE THREE FACTS THE KIT CONTROLS HOLD (2026-09-23). Seeded from the server so the first paint is the
   * saved state, and posted through `PostedValue` so the submit reads them the same way it reads every other
   * control. ⛔ A Discard puts all three back — `form.reset()` cannot restore React state, and a schedule that
   * survived a Discard would be the form lying about what Save would store.
   */
  const [amountKind, setAmountKind] = useState<"PCT" | "FIXED">(model.amountKind.value);
  const [allDay, setAllDay] = useState(model.schedule.allDay);
  const [times, setTimes] = useState<Record<string, string>>(() =>
    Object.fromEntries(model.schedule.windows.flatMap((w) => [[w.startKey, w.start], [w.endKey, w.end]])));
  const setTime = (key: string, v: string) => setTimes((cur) => (cur[key] === v ? cur : { ...cur, [key]: v }));
  /** The one numeric leaf drawn as a chooser (`shaping.roundToTzs`), held the same way. */
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(model.rules.filter((r) => r.options !== null).map((r) => [r.key, r.value])));
  const setChoice = (key: string, v: string) => setChoices((cur) => (cur[key] === v ? cur : { ...cur, [key]: v }));

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
    /* ⭐ THE NUMERIC RULES KEEP THE SAME LIVE-EMPTINESS FACT AS THE CAPS (2026-09-23), so a row can say
       "nothing saved for this yet" about the BOX in front of the officer rather than about the stored row —
       the contradiction 432(n) was raised on, one field wider. */
    for (const rule of model.rules) {
      const node = form.elements.namedItem(rule.key);
      next[rule.key] = !(node instanceof HTMLInputElement) || node.value.trim() === "";
    }
    setBoxEmpty((cur) => ([...model.caps, ...model.rules].some((c) => cur[c.key] !== next[c.key]) ? next : cur));
    const on: Record<string, boolean> = {};
    for (const list of model.lists) {
      const node = form.elements.namedItem(list.product);
      on[list.product] = node instanceof HTMLInputElement && node.checked;
    }
    setProductOn((cur) => (model.lists.some((l) => cur[l.product] !== on[l.product]) ? on : cur));
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
    /* ⛔ THE RULES ARE FILLED TOO (2026-09-23), AND ONLY WHERE THEY ARE EMPTY — a starting value that
       overwrote a number an officer had chosen would be the control destroying the work it exists to save.
       ⚠️ A rule whose recommendation could not be resolved (the live stake bounds did not read) carries ""
       and is skipped, so the control never types a WORD into a money box. */
    for (const row of [...model.caps, ...model.rules]) {
      if (row.recommended === "") continue;
      const node = form.elements.namedItem(row.key);
      if (!(node instanceof HTMLInputElement) || node.value.trim() !== "") continue;
      if (setBox(node, row.recommended)) filled++;
    }
    setErrors({});
    setWarnings([]);
    toast({
      title: model.copy.fillLabel,
      description: filled > 0 ? model.copy.startingRulesDone : model.copy.fillNothing,
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
    /* ⛔ THE TWO LISTS, OFF THE FORM'S OWN CONTROLS, AND A GROUP THAT IS NOT THERE IS A REFUSAL (2026-09-22): a
       picker that failed to render would otherwise post `[]`, which the server saves as "reaches no market" and
       reports as "Saved". The group's MARKER is what is looked for — a hidden control named by the group's key,
       rendered inside the fieldset — not its boxes: a platform with no chain to offer renders the group with no
       box in it, and that is an empty list, honestly. ⛔ Read through `form.elements`, never a DOM query (1.316). */
    const lists = { categories: [] as string[], chains: [] as string[] };
    for (const list of model.lists) {
      const marker = el.elements.namedItem(list.key);
      if (!(marker instanceof HTMLInputElement) || marker.type !== "hidden") { missing.push(list.key); continue; }
      const prefix = `${list.key}.`;
      const chosen: string[] = [];
      for (const node of Array.from(el.elements)) {
        if (node instanceof HTMLInputElement && node.type === "checkbox" && node.name.startsWith(prefix) && node.checked) chosen.push(node.value);
      }
      lists[list.field] = chosen;
    }
    /**
     * ⭐ THE 29 NUMBERS, THE KIND AND THE SCHEDULE — ON THE SAME RULE (2026-09-23 · register A1).
     *
     * ⛔ A CONTROL THAT IS NOT THERE IS A REFUSAL, NEVER A VALUE, and the failure direction is why it matters
     * more here than anywhere else on this form: the numbers being absent is the state the desk has been in
     * since it was built, and reading absence as "" would post an empty band on every save — which the
     * validator reads as UNSET and, for a non-nullable leaf, refuses. The officer would meet 29 refusals for
     * a rendering fault. So a missing box is the stale-form sentence, said once.
     */
    const numbers: Record<string, string> = {};
    for (const rule of model.rules) {
      const node = el.elements.namedItem(rule.key);
      if (!(node instanceof HTMLInputElement)) { missing.push(rule.key); continue; }
      numbers[rule.key] = node.value.trim();
    }
    const kindNode = el.elements.namedItem(model.amountKind.key);
    if (!(kindNode instanceof HTMLInputElement)) missing.push(model.amountKind.key);
    /* ⛔ THE DAYS ARE READ OFF THEIR OWN BOXES AND THE GROUP'S MARKER SAYS THE GROUP RENDERED — the picker
       idiom this form already uses for the two scope lists, for the same reason: a day group that failed to
       render would otherwise post "no days", which is an account that never bets again. */
    const dayMarker = el.elements.namedItem(model.schedule.daysKey);
    if (!(dayMarker instanceof HTMLInputElement) || dayMarker.type !== "hidden") missing.push(model.schedule.daysKey);
    const days: string[] = [];
    for (const node of Array.from(el.elements)) {
      if (node instanceof HTMLInputElement && node.type === "checkbox"
        && node.name.startsWith(`${model.schedule.daysKey}.`) && node.checked) days.push(node.value);
    }
    const allDayNode = el.elements.namedItem(model.schedule.allDayKey);
    if (!(allDayNode instanceof HTMLInputElement)) missing.push(model.schedule.allDayKey);
    /* ⛔ EVERY ROW THE FORM DREW TRAVELS, INCLUDING THE EMPTY ONES. The server drops a row whose two boxes
       are both empty and refuses one with a single side typed — that decision is the clock's, not this
       file's, and posting only the filled rows would take it away from the server silently. */
    const windows: { start: string; end: string }[] = [];
    for (const w of model.schedule.windows) {
      const s = el.elements.namedItem(w.startKey);
      const e = el.elements.namedItem(w.endKey);
      if (!(s instanceof HTMLInputElement) || !(e instanceof HTMLInputElement)) { missing.push(w.startKey); continue; }
      windows.push({ start: s.value.trim(), end: e.value.trim() });
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
        result = await onSave({
          accountId, baseVersion: model.baseVersion, values, flags, lists,
          numbers,
          amountKind: kindNode instanceof HTMLInputElement ? kindNode.value : "",
          schedule: { days, allDay: allDayNode instanceof HTMLInputElement && allDayNode.checked, windows },
        });
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
  /* ⚠️ A RESET FIRES BEFORE THE FORM IS RESET (the event is cancellable), so the live facts are re-read in a
     microtask, once the reset has landed — the kit's Checkbox syncs its own paint the same way. */
  /* ⛔ AND THE THREE REACT-HELD CONTROLS GO BACK TOO: `form.reset()` restores `defaultValue`/`defaultChecked`
     and knows nothing about state, so a Discard that left the schedule as typed would leave the form showing
     one thing and Save storing it — a Discard that discards nothing. */
  const onFormReset = () => {
    setAmountKind(model.amountKind.value);
    setAllDay(model.schedule.allDay);
    setTimes(Object.fromEntries(model.schedule.windows.flatMap((w) => [[w.startKey, w.start], [w.endKey, w.end]])));
    setChoices(Object.fromEntries(model.rules.filter((r) => r.options !== null).map((r) => [r.key, r.value])));
    queueMicrotask(syncEmptiness);
  };

  return (
    <form
      ref={formRef}
      {...formProps}
      onInput={onFormInput}
      onChange={onFormChange}
      onReset={onFormReset}
      onSubmit={onSubmit}
      className="space-y-5"
    >
      <FormColumn measure="form">
        <div className="space-y-5">
          {sections.map((section, i) => (
            <Fragment key={section.name}>
            <div className="space-y-3">
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
                  /* ⛔ `data-field` ON THE SWITCH TOO (2026-09-22): a refusal that names a switch — a mode on for a
                     product that is off — used to be painted as the top-level sentence with no control marked,
                     because only the fourteen limits carried the address `focusFirstInvalid` looks for. */
                  <div key={flag.key} className="space-y-1" data-field={flag.key}>
                    <Checkbox name={flag.key} label={flag.label} defaultChecked={flag.on} invalid={!!errors[flag.key]} />
                    <p className="text-body-sm text-text-tertiary max-w-[52ch] pl-7">{flag.help}</p>
                    {errors[flag.key] && <p className="text-body-sm text-danger-fg pl-7" role="alert">{errors[flag.key]}</p>}
                  </div>
                ))}
              </div>
            </div>
            {/* ⭐ THE TWO SCOPE PICKERS, RIGHT AFTER THE PRODUCT SWITCHES THEY FOLLOW (2026-09-22). Measured on
                production: an ACTIVE account with both products ticked matched nothing, ever, because the two
                lists behind the words were empty and NO screen could set them — this form drew no picker and
                the save spread the stored lists through unchanged. Each group stays on screen while its product
                is off and says so (a control that vanishes is the empty-filter defect); it is marked as a GROUP
                when a refusal names it; and a platform with nothing to choose says that instead of drawing an
                empty box row. ⛔ The section heading, the group labels and every sentence are the server's. */}
            {i === 0 && model.lists.length > 0 && (
              <div className="space-y-3">
                <p className="text-body-sm font-semibold text-text">{model.copy.listsSection}</p>
                <div className="space-y-4">
                  {model.lists.map((list) => (
                    /* ⛔ `data-field` ON THE FIELDSET: `focusFirstInvalid` queries `[data-field]` and focuses the
                       first control inside it, so a refused list lands on its first box. `data-list` names the
                       group for a browser drive; the submit itself reads the group through the hidden marker at
                       the fieldset's end, via `form.elements` (see `onSubmit`). */
                    <fieldset
                      key={list.key}
                      data-field={list.key}
                      data-list={list.key}
                      aria-invalid={errors[list.key] ? true : undefined}
                      className="min-w-0 space-y-2"
                    >
                      <legend className="text-body-sm font-medium text-text">{list.label}</legend>
                      <p className="text-body-sm text-text-tertiary max-w-[52ch]">{list.help}</p>
                      {!productOn[list.product] && (
                        <p className="text-body-sm text-warning-fg max-w-[52ch]">{list.onceOn}</p>
                      )}
                      {list.entries.length === 0 ? (
                        <p className="text-body-sm text-warning-fg max-w-[52ch]">{list.none}</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                          {list.entries.map((entry) => (
                            <Checkbox key={entry.key} name={entry.key} value={entry.value} label={entry.label} defaultChecked={entry.on} invalid={!!errors[list.key]} />
                          ))}
                        </div>
                      )}
                      {errors[list.key] && <p className="text-body-sm text-danger-fg" role="alert">{errors[list.key]}</p>}
                      {/* ⛔ THE GROUP'S MARKER, LAST — after the boxes, so `focusFirstInvalid`'s first control inside
                          this fieldset is a box and not a hidden field nothing can focus. Its presence is what the
                          submit reads as "this group rendered"; its value is nothing. */}
                      <input type="hidden" name={list.key} value="" />
                    </fieldset>
                  ))}
                </div>
              </div>
            )}
            </Fragment>
          ))}

          {/**
            * ⭐ HOW IT DECIDES — THE 33 LEAVES THAT HAD NO CONTROL (2026-09-23 · register A1, the blocker).
            *
            * ⛔ EVERY ROW COMES OFF THE SERVER'S `rules` ARRAY, in its order and grouped by its own section:
            * the form holds no list of fields, no bound, no default and no sentence of its own, so a leaf
            * added to the document appears here without this file being touched.
            * ⛔ THE TWO AMOUNT BOXES ARE BOTH RENDERED AND ONE IS HIDDEN, never unmounted: the submit refuses
            * a control that is not in `form.elements`, and unmounting the unchosen box would turn a legal
            * choice into "this form no longer matches what it posts".
            */}
          <div className="space-y-5" data-rules="numbers">
            <div className="space-y-1">
              <p className="text-body-sm font-semibold text-text">{model.copy.rulesSection}</p>
              <p className="text-body-sm text-text-tertiary max-w-[72ch]">{model.copy.rulesNote}</p>
            </div>
            {/* ⛔ A BOUND THAT COULD NOT BE READ IS SAID, NOT GUESSED (355): the boxes still save, and the
                server still checks them against the live platform — what is missing is the range on screen. */}
            {model.rules.some((r) => r.range === "") && (
              <Callout tone="warning" size="sm" surface="panel" role="note">{model.copy.boundsUnreadable}</Callout>
            )}
            {ruleSections.map((section) => (
              <div key={section.name} className="space-y-3">
                <p className="text-body-sm font-medium text-text">{section.name}</p>
                {section.name === amountSection && (
                  <div className="space-y-1" data-field={model.amountKind.key}>
                    <FieldLegend className="block mb-1.5">{model.amountKind.label}</FieldLegend>
                    <Select
                      size="md"
                      defaultValue={model.amountKind.value}
                      ariaLabel={model.amountKind.label}
                      options={model.amountKind.options.map((o) => ({ value: o.value, label: o.label }))}
                      onChange={(v) => setAmountKind(v === "FIXED" ? "FIXED" : "PCT")}
                    />
                    <PostedValue name={model.amountKind.key} value={amountKind} />
                    <p className="text-body-sm text-text-tertiary max-w-[52ch]">{model.amountKind.help}</p>
                    {errors[model.amountKind.key] && (
                      <p className="text-body-sm text-danger-fg" role="alert">{errors[model.amountKind.key]}</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.rows.map((row) => (
                    <div key={row.key} hidden={hiddenAmountBox(row.key)}>
                      <Field
                        label={row.label}
                        dataField={row.key}
                        error={errors[row.key]}
                        hint={
                          <>
                            <span className="block">{row.help}</span>
                            {row.hint !== "" && <span className="block mt-0.5">{row.hint}</span>}
                            {row.range !== "" && <span className="block mt-0.5">{row.range}</span>}
                            {/* ⭐ WHAT TO SET IT TO (2026-09-23). It sat behind "Use starting values", which
                                fills every empty box at once — so an officer who wanted one field's answer had
                                to accept all of them to see it. The server owns the sentence. */}
                            {row.recommendedNote !== "" && <span className="block mt-0.5">{row.recommendedNote}</span>}
                            {/* ⛔ WHICH SWITCH OWNS THIS NUMBER, and whether anything reads it RIGHT NOW —
                                derived on the server from the engine's own predicate.
                                ⛔ NEUTRAL, NOT A WARNING — read off the rendered tab (2026-09-23). On a fresh
                                account NO mode is on, so EVERY numeric row is idle: a warning tone there made
                                twenty-nine rows amber at once and stopped meaning anything. The FACT is worth
                                saying; the alarm is not. */}
                            {row.usedBy !== "" && (
                              <span className="block mt-0.5 text-text-tertiary">
                                {row.usedBy}{row.idle ? ` ${model.copy.idleNote}` : ""}
                              </span>
                            )}
                            <span className="block mt-0.5">
                              {row.value === "" && boxEmpty[row.key] ? (
                                ""
                              ) : boxEmpty[row.key] ? (
                                <span className="text-warning-fg">{model.copy.notSavedYet}</span>
                              ) : row.value === "" ? (
                                model.copy.notSavedYet
                              ) : (
                                <>
                                  Saved{" "}
                                  <span className={row.unit === "TZS" ? "amount tabular-nums" : "font-mono tabular-nums"}>{row.saved}</span>.
                                </>
                              )}
                            </span>
                          </>
                        }
                      >
                        {row.options !== null ? (
                          <>
                            <Select
                              size="md"
                              defaultValue={row.value}
                              ariaLabel={row.label}
                              options={row.options.map((o) => ({ value: o.value, label: o.label }))}
                              onChange={(v) => setChoice(row.key, v)}
                            />
                            <PostedValue name={row.key} value={choices[row.key] ?? row.value} />
                          </>
                        ) : (
                          <Input
                            name={row.key}
                            size="md"
                            mono
                            error={!!errors[row.key]}
                            defaultValue={row.value}
                            inputMode="numeric"
                            autoComplete="off"
                            prefix={row.unit === "TZS" ? "TZS" : undefined}
                            aria-label={row.label}
                          />
                        )}
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/**
              * ⭐ THE SCHEDULE (2026-09-23). Seven days, an all-day switch and four HH:MM rows in **EAT**.
              *
              * ⛔ THE TIMES GO UP AS TYPED AND ARE READ BY THE SERVER'S CLOCK ALONE. A 00:00 END is midnight
              * at the end of the day and a 00:00 START is the beginning of it; an end before its start is an
              * overnight window. None of that is decided here.
              * ⛔ ALL FOUR ROWS ARE DRAWN AND ALL FOUR TRAVEL, empty ones included: the server drops a row
              * whose two boxes are both empty and refuses one with a single side typed.
              */}
            <div className="space-y-3">
              <p className="text-body-sm font-medium text-text">{model.schedule.section}</p>
              <fieldset
                data-field={model.schedule.daysKey}
                data-list={model.schedule.daysKey}
                aria-invalid={errors[model.schedule.daysKey] ? true : undefined}
                className="min-w-0 space-y-2"
              >
                <legend className="text-body-sm font-medium text-text">{model.schedule.daysLabel}</legend>
                <p className="text-body-sm text-text-tertiary max-w-[52ch]">{model.schedule.daysHelp}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3">
                  {model.schedule.days.map((d) => (
                    <Checkbox
                      key={d.key}
                      name={d.key}
                      value={d.value}
                      label={d.label}
                      defaultChecked={d.on}
                      invalid={!!errors[model.schedule.daysKey]}
                    />
                  ))}
                </div>
                {errors[model.schedule.daysKey] && (
                  <p className="text-body-sm text-danger-fg" role="alert">{errors[model.schedule.daysKey]}</p>
                )}
                {/* ⛔ THE GROUP'S MARKER, LAST — its presence is what the submit reads as "this group rendered". */}
                <input type="hidden" name={model.schedule.daysKey} value="" />
              </fieldset>

              <div className="space-y-1" data-field={model.schedule.allDayKey}>
                <Checkbox
                  name={model.schedule.allDayKey}
                  label={model.schedule.allDayLabel}
                  defaultChecked={model.schedule.allDay}
                  invalid={!!errors[model.schedule.allDayKey]}
                  onChange={setAllDay}
                />
                <p className="text-body-sm text-text-tertiary max-w-[52ch] pl-7">{model.schedule.allDayHelp}</p>
                {errors[model.schedule.allDayKey] && (
                  <p className="text-body-sm text-danger-fg pl-7" role="alert">{errors[model.schedule.allDayKey]}</p>
                )}
              </div>

              <fieldset
                data-field={model.schedule.windowsKey}
                data-list={model.schedule.windowsKey}
                aria-invalid={errors[model.schedule.windowsKey] ? true : undefined}
                className="min-w-0 space-y-2"
              >
                <legend className="text-body-sm font-medium text-text">{model.schedule.windowsLabel}</legend>
                <p className="text-body-sm text-text-tertiary max-w-[52ch]">{model.schedule.windowsHelp}</p>
                {/* ⛔ THE ROWS STAY ON SCREEN WHILE ALL DAY IS ON AND SAY WHY — a control that vanishes is the
                    empty-filter defect, and an officer who typed hours and then ticked All day must be able to
                    see that their hours are still there. */}
                {allDay && (
                  <p className="text-body-sm text-warning-fg max-w-[52ch]">{model.schedule.windowsIgnored}</p>
                )}
                <div className="space-y-2">
                  {model.schedule.windows.map((w) => (
                    <div key={w.startKey} className="flex flex-wrap items-start gap-3">
                      {[
                        { key: w.startKey, label: model.schedule.startLabel, saved: w.start },
                        { key: w.endKey, label: model.schedule.endLabel, saved: w.end },
                      ].map((box) => (
                        <div key={box.key} className="space-y-1" data-field={box.key}>
                          <FieldLegend className="block mb-1.5">{box.label}</FieldLegend>
                          <TimeSelect
                            size="md"
                            defaultValue={box.saved}
                            error={!!errors[box.key]}
                            aria-label={box.label}
                            onChange={(v) => setTime(box.key, v)}
                          />
                          {/* ⛔ AFTER the control, so `focusFirstInvalid` lands on a segment an officer can type
                              into and not on a hidden field nothing can focus. */}
                          <PostedValue name={box.key} value={times[box.key] ?? ""} />
                          {errors[box.key] && (
                            <p className="text-body-sm text-danger-fg" role="alert">{errors[box.key]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {errors[model.schedule.windowsKey] && (
                  <p className="text-body-sm text-danger-fg" role="alert">{errors[model.schedule.windowsKey]}</p>
                )}
                <input type="hidden" name={model.schedule.windowsKey} value="" />
              </fieldset>

              {model.schedule.saved.length > 0 && (
                <ul className="space-y-1">
                  {model.schedule.saved.map((s) => (
                    <li key={s} className="text-body-sm text-text-tertiary">{s}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ⛔ THE SECTION MARKER IS LOAD-BEARING FOR THE BROWSER GATE (2026-09-23): once the numeric rules
              landed, a query for "every typed box on the form" counted 51 where fourteen was the fact under test.
              A population that silently widens is a case measuring something other than its own sentence. */}
          <div className="space-y-3" data-rules="limits">
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

"use client";

/**
 * STEP 3 · THE DECISION — numbers already in the book, the list, and the start (`import-apply`). (S15 · C4–C5,
 * 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 steps 7–8)
 *
 * ⭐ ONLY WHEN THERE ARE ANY: three radio cards — Keep what's in the book (recommended: a wrong overwrite has no undo,
 * OD35) · Use the file's version · Only fill in what's missing — each with its live count from the check's `byChoice`.
 * The contacts that would change are listed a page at a time (`importChangesAction`, asked again from `nextAfterLine`
 * until a page fills or the list ends — the server bounds each page by the work behind it), each with what changes
 * under the choice in force, and each can be SET APART: kept as it is when the choice would change it, or given the
 * file's version when it would not. Changing the choice for every row clears the rows set apart, and says how many.
 * ⭐ THE LABEL IS THE PROMISE. The start button reads "Import — 412 new · 37 updated · 1,203 kept as they are", computed
 * by import-decide's `adjustTally` from the check's own tally and the previews of the rows set apart — never counted any
 * other way — and it is what the start posts as `expected`: the server decides again, and refuses `check_again` when the
 * book moved meanwhile. An import that would REPLACE details already in the book asks once more, naming how many.
 * ⭐ THE LIST: none, an existing list (its members, and whether its basis is recorded on the Lists card), or a new one
 * (U23's own name rule; a name that is an existing list in other capitals IS that list, and the panel says so). S15-1: the
 * import records no consent and asks for no basis — the list's own card carries it, and the panel says when it is owed.
 * ⛔ "A blank cell never erases anything; numbers on the stop list and erased people are never changed" is said here, as
 * the rule — no row is ever marked erased (X22): an erased number reads as the ordinary contact it is disguised as.
 * ⛔ The choices are named by the one list (`IMPORT_CHOICES`, `DEFAULT_IMPORT_CHOICE`) and never spelled (§D10).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/modal";
import { ScrollX } from "@/components/ui/scroll-x";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useActDisabledReason, useMayAct } from "@/components/admin/act-gate";
import { compareListsByName, listNameKey, parseListName } from "@/lib/contacts/bulk-rules";
import {
  DEFAULT_IMPORT_CHOICE,
  IMPORT_CHOICES,
  adjustTally,
  effectiveChoice,
  type ChoicePreview,
  type ImportChoice,
} from "@/lib/contacts/import-decide";
import {
  CHANGES_PAGE_ROWS,
  type ChangesPageRow,
  type ChangesResult,
  type ImportListChoice,
  type ImportListOption,
  type ImportListsResult,
  type ImportRunView,
  type PreflightView,
  type StartImportInput,
} from "@/lib/contacts/import-flow";
import { APPLY, CHECK, CHOICE_COPY, DECIDE, KEEP_REASON, LIST, partsText } from "./import-copy";
import { ActionsRow, ImportAlert, Parts, SectionHeading, type ImportAlertState } from "./import-parts";

/** The two reads this panel makes on its own — handed in by the dialog, which owns every action. */
export type DecisionApi = {
  readonly changes: (runId: string, afterLine: number) => Promise<ChangesResult>;
  readonly lists: () => Promise<ImportListsResult>;
};

/** At most this many requests per "Show more": a page may come back short (bounded by work), so a few are asked. */
const PAGE_REQUESTS_MAX = 8;

type ListPick = { readonly kind: "none" } | { readonly kind: "existing"; readonly id: string } | { readonly kind: "new" };
type ChangesState = { readonly rows: ChangesPageRow[]; readonly next: number | null; readonly loading: boolean; readonly failed: boolean };
type ListsState = { readonly state: "loading" | "ready" | "failed"; readonly options: ImportListOption[] };

/** The choice under which a row in the book changes at all — the first of the one list's order, or none. */
const firstUpdating = (row: ChangesPageRow): ImportChoice | null =>
  IMPORT_CHOICES.find((c) => row.preview.byChoice[c].kind === "update") ?? null;

/** What one choice does to one row, in words: each replaced value (email and notes named, never shown), the tags. */
function changeLines(p: ChoicePreview): string[] {
  if (p.kind === "keep") return [KEEP_REASON[p.reason ?? "chosen_keep"]];
  const out: string[] = [];
  for (const o of p.overwrites) {
    if (o.field === "displayName") out.push(DECIDE.name(o.from, o.to));
    else out.push(o.field === "notes" ? DECIDE.notesReplaced : DECIDE.emailReplaced);
  }
  if (p.tagsAdded.length > 0) out.push(DECIDE.tagsAdded(p.tagsAdded));
  if (p.tagsNotAdded.length > 0) out.push(DECIDE.tagsNotAdded(p.tagsNotAdded));
  if (out.length === 0) out.push(DECIDE.fills);
  return out;
}

export function ImportDecisionPanel({
  view, preflight, alert, starting, api, onApply, onDiscard, onDirty,
}: {
  view: ImportRunView;
  preflight: PreflightView;
  alert: ImportAlertState | null;
  /** The start is in flight. */
  starting: boolean;
  api: DecisionApi;
  onApply: (input: StartImportInput) => void;
  onDiscard: () => void;
  /** Whether the officer has made choices a stray close would throw away (the dialog holds its scrim and Escape). */
  onDirty: (dirty: boolean) => void;
}) {
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const inBook = preflight.counts.inBook;
  const [choice, setChoice] = useState<ImportChoice>(DEFAULT_IMPORT_CHOICE);
  const [exceptions, setExceptions] = useState<Readonly<Record<number, ImportChoice>>>({});
  const [cleared, setCleared] = useState<number | null>(null);
  const [changes, setChanges] = useState<ChangesState>({ rows: [], next: 0, loading: false, failed: false });
  const [lists, setLists] = useState<ListsState>({ state: "loading", options: [] });
  const [pick, setPick] = useState<ListPick>({ kind: "none" });
  const [newName, setNewName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [asking, setAsking] = useState<"overwrite" | "discard" | null>(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  /** One "Show more": pages from `after` until CHANGES_PAGE_ROWS new rows arrive or the list ends (a page may be short). */
  const loadChanges = async (after: number) => {
    setChanges((c) => ({ ...c, loading: true, failed: false }));
    const got: ChangesPageRow[] = [];
    let next: number | null = after;
    try {
      for (let calls = 0; next !== null && got.length < CHANGES_PAGE_ROWS && calls < PAGE_REQUESTS_MAX; calls++) {
        const r: ChangesResult = await api.changes(view.id, next);
        if (!r.ok) throw new Error(r.reason);
        got.push(...r.page.rows);
        next = r.page.nextAfterLine;
      }
    } catch {
      if (live.current) setChanges((c) => ({ ...c, loading: false, failed: true }));
      return;
    }
    if (!live.current) return;
    const reached = next;
    setChanges((c) => {
      const seen = new Set(c.rows.map((r) => r.line));
      return { rows: [...c.rows, ...got.filter((r) => !seen.has(r.line))], next: reached, loading: false, failed: false };
    });
  };

  const loadLists = async () => {
    setLists((l) => ({ ...l, state: "loading" }));
    try {
      const r = await api.lists();
      if (!live.current) return;
      if (!r.ok) {
        setLists({ state: "failed", options: [] });
        return;
      }
      setLists({ state: "ready", options: [...r.lists].sort(compareListsByName) });
    } catch {
      if (live.current) setLists({ state: "failed", options: [] });
    }
  };

  // ⭐ Read once per check: the first page of changes (when the file has numbers in the book) and the lists.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${view.id}:${preflight.checkedAt}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    setChanges({ rows: [], next: 0, loading: false, failed: false });
    setExceptions({});
    if (inBook > 0) void loadChanges(0);
    void loadLists();
    // The loaders read what they need when they run; a new check (a new `checkedAt`) is the only reason to read again.
  }, [view.id, preflight.checkedAt, inBook]);

  const previews = useMemo(() => changes.rows.map((r) => r.preview), [changes.rows]);
  const tally = useMemo(() => adjustTally(preflight.byChoice, previews, choice, exceptions), [preflight.byChoice, previews, choice, exceptions]);
  const apartCount = Object.keys(exceptions).length;
  const listTotal = Math.max(0, ...IMPORT_CHOICES.map((c) => preflight.changing[c]));
  const shownTotal = changes.rows.length <= listTotal && !(changes.next === null && changes.rows.length !== listTotal) ? listTotal : null;

  /** A new choice for every row: the rows set apart follow it, and the panel says how many there were. */
  const choose = (c: ImportChoice) => {
    if (c === choice) return;
    setChoice(c);
    if (apartCount > 0) {
      setExceptions({});
      setCleared(apartCount);
    } else setCleared(null);
  };

  /** Set one row apart: kept as it is when the choice in force changes it, else given the file's version. */
  const setApart = (row: ChangesPageRow, on: boolean) => {
    setExceptions((ex) => {
      const next: Record<number, ImportChoice> = { ...ex };
      if (!on) {
        delete next[row.line];
        return next;
      }
      const target = row.preview.byChoice[choice].kind === "update" ? DEFAULT_IMPORT_CHOICE : firstUpdating(row);
      if (target === null || target === choice) return ex;
      next[row.line] = target;
      return next;
    });
  };

  // ── the list ───────────────────────────────────────────────────────────────────────────────────
  const named = parseListName(newName);
  const sameAs = named.ok ? lists.options.find((l) => listNameKey(l.name) === listNameKey(named.name)) ?? null : null;
  let listChoice: ImportListChoice | null = null;
  let listProblem: string | null = null;
  if (pick.kind === "none") listChoice = { kind: "none" };
  else if (pick.kind === "existing") {
    if (lists.state === "ready" && lists.options.some((l) => l.id === pick.id)) listChoice = { kind: "existing", listId: pick.id };
    else listProblem = APPLY.heldLists;
  } else if (!named.ok) listProblem = named.sentence;
  else listChoice = sameAs !== null ? { kind: "existing", listId: sameAs.id } : { kind: "new", name: named.name };

  const dirty = apartCount > 0 || choice !== DEFAULT_IMPORT_CHOICE || pick.kind !== "none" || newName.trim() !== "" || starting;
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);

  const heldReason = !mayAct ? (actReason ?? null) : listProblem;
  const canStart = mayAct && !starting && listChoice !== null;

  /** The start's request: the choice, the rows set apart (only those that differ from it), the list, the label's
   *  numbers as `expected`, and the check it was pressed from. */
  const fire = () => {
    if (listChoice === null) return;
    const ex: Record<string, ImportChoice> = {};
    for (const [line, c] of Object.entries(exceptions)) if (c !== choice) ex[line] = c;
    onApply({
      runId: view.id,
      choice,
      exceptions: ex,
      list: listChoice,
      expected: { create: tally.create, update: tally.update, keep: tally.keep },
      checkedAt: preflight.checkedAt,
    });
  };

  const label = APPLY.label(tally.create, tally.update, tally.keep);

  return (
    <div className="space-y-5" data-block="import-decision" data-choice-count={IMPORT_CHOICES.length}>
      {inBook > 0 && (
        <section className="space-y-3" data-import-duplicates aria-label={DECIDE.heading}>
          <SectionHeading>{DECIDE.heading}</SectionHeading>
          <p className="text-body-sm text-text-secondary"><Parts parts={DECIDE.lead(inBook)} /></p>
          <fieldset disabled={starting || !mayAct}>
            <legend className="sr-only">{DECIDE.heading}</legend>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {IMPORT_CHOICES.map((c) => {
                const on = c === choice;
                return (
                  <label
                    key={c}
                    data-import-choice={c}
                    className={`flex min-h-[var(--tap-min)] cursor-pointer items-start gap-[10px] rounded-md border px-3 py-2.5 text-body-sm transition-colors ${
                      on ? "border-royal-700 bg-royal-500/10" : "border-border hover:border-border-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="import-choice"
                      value={c}
                      checked={on}
                      onChange={() => choose(c)}
                      className="mt-[3px] shrink-0 accent-[var(--royal-500)]"
                    />
                    <span className="min-w-0 space-y-1">
                      <span className="block font-semibold text-text">{CHOICE_COPY[c].title}</span>
                      {c === DEFAULT_IMPORT_CHOICE && (
                        <Chip size="sm" variant="success"><span className="whitespace-nowrap">{DECIDE.recommended}</span></Chip>
                      )}
                      <span className="block text-text-secondary">{CHOICE_COPY[c].body}</span>
                      <span className="block text-text" data-import-choice-count={preflight.byChoice[c].update}>
                        <Parts parts={DECIDE.changes(preflight.byChoice[c].update)} />
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <p className="text-body-sm text-text-secondary">{DECIDE.reassure}</p>
          {cleared !== null && (
            <p className="text-body-sm text-text" role="status" data-import-cleared>
              <Parts parts={DECIDE.cleared(cleared)} />
            </p>
          )}

          <div className="space-y-1.5" data-import-changes>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <SectionHeading>{DECIDE.listHeading}</SectionHeading>
              {changes.rows.length > 0 && (
                <span className="text-body-sm text-text-subtle"><Parts parts={DECIDE.showing(changes.rows.length, shownTotal)} /></span>
              )}
            </div>
            <p className="text-body-sm text-text-secondary">{DECIDE.listLead}</p>
            {changes.rows.length > 0 && (
              <ScrollX label={DECIDE.tableLabel} className="max-h-[360px] overflow-y-auto">
                <table className="admin-tbl">
                  <thead>
                    <tr>
                      <th className="text-left">{DECIDE.colRow}</th>
                      <th className="text-left">{DECIDE.colContact}</th>
                      <th className="text-left">{DECIDE.colChange}</th>
                      <th className="text-left">{DECIDE.colApart}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.rows.map((row) => {
                      const eff = effectiveChoice(row.line, choice, exceptions);
                      const apart = Object.prototype.hasOwnProperty.call(exceptions, row.line);
                      const bulkUpdates = row.preview.byChoice[choice].kind === "update";
                      const canApart = bulkUpdates || firstUpdating(row) !== null;
                      // Set apart TO "keep as it is" (the choice in force changes it), or TO the file's version.
                      const keepsApart = apart ? exceptions[row.line] === DEFAULT_IMPORT_CHOICE : bulkUpdates;
                      return (
                        <tr key={row.line} data-import-change-row={row.line} data-apart={apart ? "yes" : "no"}>
                          <td className="tabular align-top"><Parts parts={CHECK.row(row.line)} /></td>
                          <td className="align-top">
                            <span className="block whitespace-nowrap font-mono text-text-secondary">{row.masked}</span>
                            <span className="block text-text">{row.preview.displayName ?? DECIDE.noName}</span>
                          </td>
                          <td className="align-top">
                            {changeLines(row.preview.byChoice[eff]).map((line) => (
                              <span key={line} className="block text-text-secondary">{line}</span>
                            ))}
                          </td>
                          <td className="align-top">
                            {canApart && (
                              <Checkbox
                                checked={apart}
                                onChange={(on) => setApart(row, on)}
                                label={<span className="text-body-sm">{keepsApart ? DECIDE.keepAsIs : DECIDE.useFile}</span>}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollX>
            )}
            {changes.loading && <p className="text-body-sm text-text-secondary" role="status">{DECIDE.loading}</p>}
            {changes.failed && (
              <ImportAlert
                alert={{
                  tone: "warning",
                  text: DECIDE.failed,
                  actions: [{ label: CHECK.checkAgain, run: () => void loadChanges(changes.rows.length > 0 ? changes.rows[changes.rows.length - 1].line : 0), act: "changes-retry" }],
                }}
              />
            )}
            {!changes.loading && !changes.failed && changes.next !== null && changes.rows.length > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => void loadChanges(changes.next ?? 0)} data-import-act="changes-more">
                {DECIDE.more}
              </Button>
            )}
          </div>
        </section>
      )}

      <section className="space-y-3" data-import-list-step aria-label={LIST.heading}>
        <SectionHeading>{LIST.heading}</SectionHeading>
        <p className="text-body-sm text-text-secondary">{LIST.lead}</p>
        <fieldset disabled={starting || !mayAct}>
          <legend className="sr-only">{LIST.heading}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ListCard checked={pick.kind === "none"} onPick={() => setPick({ kind: "none" })} title={LIST.none} body={LIST.noneBody} value="none" />
            {lists.options.map((l) => (
              <ListCard
                key={l.id}
                checked={pick.kind === "existing" && pick.id === l.id}
                onPick={() => setPick({ kind: "existing", id: l.id })}
                title={l.name}
                value={l.id}
                body={<Parts parts={LIST.members(l.members)} />}
                chip={l.covered
                  ? <Chip size="sm" variant="success"><span className="whitespace-nowrap">{LIST.covered}</span></Chip>
                  : <Chip size="sm" variant="neutral"><span className="whitespace-nowrap">{LIST.notCovered}</span></Chip>}
              />
            ))}
            <ListCard checked={pick.kind === "new"} onPick={() => setPick({ kind: "new" })} title={LIST.newList} value="new" />
          </div>
        </fieldset>
        {lists.state === "loading" && <p className="text-body-sm text-text-secondary" role="status">{LIST.loading}</p>}
        {lists.state === "failed" && (
          <ImportAlert alert={{ tone: "warning", text: LIST.failed, actions: [{ label: CHECK.checkAgain, run: () => void loadLists(), act: "lists-retry" }] }} />
        )}
        {pick.kind === "new" && (
          <Field
            label={LIST.newListLabel}
            error={nameTouched && !named.ok ? named.sentence : undefined}
            hint={sameAs !== null ? LIST.exists : undefined}
            dataField="listName"
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              autoComplete="off"
              disabled={starting}
              readOnly={!mayAct}
            />
          </Field>
        )}
        {pick.kind !== "none" && <p className="text-body-sm text-text-secondary" data-import-list-owed>{LIST.owed}</p>}
      </section>

      {alert !== null && <ImportAlert alert={alert} disabled={starting} />}

      {heldReason !== null && <p className="text-body-sm text-text-secondary" data-import-held>{heldReason}</p>}
      <ActionsRow>
        <Button
          type="button"
          size="md"
          variant="ghost"
          disabled={starting || !mayAct}
          title={actReason}
          onClick={() => setAsking("discard")}
          data-import-act="discard"
        >
          {CHECK.discard}
        </Button>
        <Button
          type="button"
          size="md"
          variant="primary"
          loading={starting}
          disabled={!canStart}
          title={heldReason ?? partsText(label)}
          onClick={() => {
            if (tally.overwrites > 0) setAsking("overwrite");
            else fire();
          }}
          data-block="import-apply"
          data-create={tally.create}
          data-update={tally.update}
          data-keep={tally.keep}
        >
          <span className="text-left"><Parts parts={label} /></span>
        </Button>
      </ActionsRow>

      <ConfirmModal
        open={asking === "overwrite"}
        onClose={() => setAsking(null)}
        onConfirm={() => {
          setAsking(null);
          fire();
        }}
        title={APPLY.overwriteTitle}
        body={<span data-import-confirm="overwrite"><Parts parts={APPLY.overwriteBody(tally.overwrites)} /></span>}
        confirmLabel={APPLY.overwriteConfirm}
        tone="claret"
      />
      <ConfirmModal
        open={asking === "discard"}
        onClose={() => setAsking(null)}
        onConfirm={() => {
          setAsking(null);
          onDiscard();
        }}
        title={CHECK.discardTitle}
        body={<span data-import-confirm="discard"><Parts parts={CHECK.discardBody(view.totalRows)} /></span>}
        confirmLabel={CHECK.discardConfirm}
        tone="claret"
      />

      <UnsavedChangesGuard dirty={dirty} body={DECIDE.guardBody} />
    </div>
  );
}

/** One list choice as a radio card: its name, an optional line and an optional state chip. */
function ListCard({
  checked, onPick, title, body, chip, value,
}: {
  checked: boolean;
  onPick: () => void;
  title: string;
  value: string;
  body?: ReactNode;
  chip?: ReactNode;
}) {
  return (
    <label
      data-import-list-option={value}
      className={`flex min-h-[var(--tap-min)] cursor-pointer items-start gap-[10px] rounded-md border px-3 py-2.5 text-body-sm transition-colors ${
        checked ? "border-royal-700 bg-royal-500/10" : "border-border hover:border-border-strong"
      }`}
    >
      <input
        type="radio"
        name="import-list"
        value={value}
        checked={checked}
        onChange={onPick}
        className="mt-[3px] shrink-0 accent-[var(--royal-500)]"
      />
      <span className="min-w-0 space-y-1">
        <span className="block break-words font-semibold text-text">{title}</span>
        {body !== undefined && <span className="block text-text-secondary">{body}</span>}
        {chip !== undefined && <span className="block">{chip}</span>}
      </span>
    </label>
  );
}

"use client";

/**
 * STEP 3 · THE DECISION — numbers already in the book, the list, and the start (`import-apply`). (S15 · C4–C5,
 * 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 steps 7–8)
 *
 * ⭐ ONLY WHEN THERE ARE ANY: three radio cards — Keep what's in the book (recommended: a wrong overwrite has no undo,
 * OD35) · Use the file's version · Only fill in what's missing — each with its live count from the check's `byChoice`.
 * The contacts that would change are listed a page at a time (`importChangesAction`, asked again from `nextAfterLine`
 * until a page fills or the list ends — the server bounds each page by the work behind it, so a page can be short or
 * even empty while the list goes on, and "Show more" stays while `nextAfterLine` is not null — R8), each with what
 * changes under the choice in force, and each can be SET APART: kept as it is when the choice would change it, or given
 * the file's version when it would not. Changing the choice for every row clears the rows set apart, and says how many.
 * ⛔ S15-10 (R1) · A VIEWER WHO MAY NOT UPDATE CONTACTS ALREADY IN THE BOOK (`mayUpdateInBook` false — the matrix's
 * identity.contact cell, never a role name) sees NO choice cards and NO changes list: one line, "Numbers already in the
 * book are kept as they are", with the server's own sentence as the why; the promise is KEEP's tally and the start posts
 * KEEP with no rows set apart. Readers see the step as before.
 * ⭐ R7 · THE DECISION LIVES IN THE DIALOG (`DecisionDraft`), not here: a check that grew stale (`check_stale`) or a book
 * that moved (`check_again`) is checked again WITHOUT losing the officer's choice, the rows set apart, the list picked
 * or the new list's name. After the re-check the changes are read through the furthest row set apart, so each is found
 * again; a row that no longer differs from the book is let go, and the panel says how many.
 * ⭐ THE PROMISE, ABOVE THE START: "This import: 412 new · 37 updated · 1,203 kept as they are." — computed by
 * import-decide's `adjustTally` from the check's own tally and the previews of the rows set apart, never counted any other
 * way — and it is what the start posts as `expected` (the button's `data-create/update/keep`): the server decides again,
 * and refuses `check_again` when the book moved meanwhile. ⛔ V1 (2026-10-09): the promise sat INSIDE the button and ran
 * past both its edges at 360, so it is a sentence of its own that wraps, and the button says only "Import 1,652 rows".
 * An import that would REPLACE details already in the book asks once more, naming how many.
 * ⭐ V2 · when no contact in the book differs from the file, one line says so — no heading over an empty list.
 * ⭐ THE LIST: none, an existing list (its members, and whether its basis is recorded on the Lists card), or a new one
 * (U23's own name rule; a name that is an existing list in other capitals IS that list, and the panel says so). After a
 * start refused `list_name_taken` or `list_gone` the lists are read again (R12), so the officer can pick that list. S15-1:
 * the import records no consent and asks for no basis — the list's own card carries it, and the panel says when it is owed.
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
  NO_OVERRIDES,
  adjustTally,
  effectiveChoice,
  type ChoicePreview,
  type ImportChoice,
  type RowOverrides,
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
import { APPLY, CHECK, CHOICE_COPY, DECIDE, IMPORT_TRY_AGAIN, KEEP_REASON, LIST, partsText } from "./import-copy";
import { ActionsRow, ButtonText, ImportAlert, Parts, SectionHeading, type ImportAlertState } from "./import-parts";

/** The two reads this panel makes on its own — handed in by the dialog, which owns every action. */
export type DecisionApi = {
  readonly changes: (runId: string, afterLine: number) => Promise<ChangesResult>;
  readonly lists: () => Promise<ImportListsResult>;
};

/** Where the contacts go, as the officer picked it (a new list's name is the draft's `newName`). */
export type ListPick = { readonly kind: "none" } | { readonly kind: "existing"; readonly id: string } | { readonly kind: "new" };

/**
 * ⭐ R7 · THE OFFICER'S DECISION, held by the DIALOG so a re-check keeps it: the choice for every row, the rows set apart
 * (keyed by FILE ROW), the list picked and the new list's name. One per run — a draft for another run is never applied.
 */
export type DecisionDraft = {
  readonly runId: string;
  readonly choice: ImportChoice;
  readonly exceptions: RowOverrides;
  readonly pick: ListPick;
  readonly newName: string;
  readonly nameTouched: boolean;
};

/** A run's decision before the officer has touched it: keep what's in the book, nothing set apart, no list. */
export function freshDraft(runId: string): DecisionDraft {
  return { runId, choice: DEFAULT_IMPORT_CHOICE, exceptions: NO_OVERRIDES, pick: { kind: "none" }, newName: "", nameTouched: false };
}

/** Whether a stray close would throw away something the officer chose. */
export function draftDirty(d: DecisionDraft): boolean {
  return Object.keys(d.exceptions).length > 0 || d.choice !== DEFAULT_IMPORT_CHOICE || d.pick.kind !== "none" || d.newName.trim() !== "";
}

/** At most this many requests per "Show more": a page may come back short (bounded by work), so a few are asked. */
const PAGE_REQUESTS_MAX = 8;
/** At most this many requests to find the rows set apart again after a re-check (a 200,000-row file is 20 requests of
 *  walking, plus a page per 50 changing rows) — past it, the rows not reached stay set apart and the server judges them. */
const RECONCILE_REQUESTS_MAX = 400;

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
  view, preflight, alert, starting, api, draft, onDraft, listsRound, onApply, onDiscard,
}: {
  view: ImportRunView;
  preflight: PreflightView;
  alert: ImportAlertState | null;
  /** The start is in flight. */
  starting: boolean;
  api: DecisionApi;
  /** ⭐ R7 · the officer's decision for THIS run, held by the dialog. */
  draft: DecisionDraft;
  onDraft: (change: (d: DecisionDraft) => DecisionDraft) => void;
  /** ⭐ R12 · bumped by the dialog when a start was refused over the list: the lists are read again. */
  listsRound: number;
  onApply: (input: StartImportInput) => void;
  onDiscard: () => void;
}) {
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const inBook = preflight.counts.inBook;
  // ⛔ S15-10 (R1) · a viewer who may not update contacts in the book imports with KEEP and nothing set apart, whatever
  // the draft holds — the server would refuse anything else (`update_needs_reader`).
  const mayUpdate = preflight.mayUpdateInBook;
  const choice: ImportChoice = mayUpdate ? draft.choice : DEFAULT_IMPORT_CHOICE;
  const exceptions: RowOverrides = mayUpdate ? draft.exceptions : NO_OVERRIDES;
  const { pick, newName, nameTouched } = draft;
  const [cleared, setCleared] = useState<number | null>(null);
  const [dropped, setDropped] = useState<number | null>(null);
  /** How many in-book rows differ from the file under any choice — the changes list's whole length, as the check counted. */
  const listTotal = Math.max(0, ...IMPORT_CHOICES.map((c) => preflight.changing[c]));
  const [changes, setChanges] = useState<ChangesState>({ rows: [], next: null, loading: inBook > 0 && mayUpdate && listTotal > 0, failed: false });
  const [lists, setLists] = useState<ListsState>({ state: "loading", options: [] });
  const [asking, setAsking] = useState<"overwrite" | "discard" | null>(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  /**
   * One "Show more": pages from `after` until CHANGES_PAGE_ROWS new rows arrive or the list ends (a page may be short,
   * even empty). With `through` (after a re-check): every page through that line as well, so each row set apart is
   * found again. Resolves to the rows read and the line up to which EVERY row was walked (Infinity: the whole list), or
   * null when a page could not be read.
   */
  const loadChanges = async (after: number, through: number | null = null): Promise<{ rows: ChangesPageRow[]; covered: number } | null> => {
    setChanges((c) => ({ ...c, loading: true, failed: false }));
    const got: ChangesPageRow[] = [];
    let next: number | null = after;
    const cap = through === null ? PAGE_REQUESTS_MAX : RECONCILE_REQUESTS_MAX;
    try {
      for (let calls = 0; next !== null && calls < cap; calls++) {
        const short = got.length < CHANGES_PAGE_ROWS;
        const behind = through !== null && next < through;
        if (!short && !behind) break;
        const r: ChangesResult = await api.changes(view.id, next);
        if (!r.ok) throw new Error(r.reason);
        got.push(...r.page.rows);
        next = r.page.nextAfterLine;
      }
    } catch {
      if (live.current) setChanges((c) => ({ ...c, next: c.next ?? after, loading: false, failed: true }));
      return null;
    }
    if (!live.current) return null;
    const reached = next;
    setChanges((c) => {
      const seen = new Set(c.rows.map((r) => r.line));
      return { rows: [...c.rows, ...got.filter((r) => !seen.has(r.line))], next: reached, loading: false, failed: false };
    });
    return { rows: got, covered: reached === null ? Number.POSITIVE_INFINITY : reached };
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

  // ⭐ Read once per check: the lists, and — for a viewer who may update the book — the changes, through the furthest
  // row set apart before this check (R7), letting go of the rows set apart that no longer differ, and saying how many.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${view.id}:${preflight.checkedAt}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    void loadLists();
    if (inBook === 0 || !mayUpdate) {
      setChanges({ rows: [], next: null, loading: false, failed: false });
      return;
    }
    const lines = Object.keys(draft.exceptions).map(Number).filter((l) => Number.isSafeInteger(l) && l > 0);
    if (listTotal === 0) {
      // No row in the book differs from the file any more: nothing to read, and every row set apart is let go.
      setChanges({ rows: [], next: null, loading: false, failed: false });
      if (lines.length > 0) {
        onDraft((d) => ({ ...d, exceptions: NO_OVERRIDES }));
        setDropped(lines.length);
      }
      return;
    }
    setChanges({ rows: [], next: null, loading: true, failed: false });
    const through = lines.length > 0 ? Math.max(...lines) : null;
    void loadChanges(0, through).then((got) => {
      if (got === null || through === null || !live.current) return;
      const still = new Set(got.rows.map((r) => r.line));
      const gone = lines.filter((l) => l <= got.covered && !still.has(l));
      if (gone.length === 0) return;
      onDraft((d) => {
        const kept: Record<number, ImportChoice> = { ...d.exceptions };
        for (const l of gone) delete kept[l];
        return { ...d, exceptions: kept };
      });
      setDropped(gone.length);
    });
    // A new check (a new `checkedAt`) is the only reason to read again; the draft is read as it stood when it arrived.
  }, [view.id, preflight.checkedAt, inBook, mayUpdate, listTotal]);

  // ⭐ R12 · a start refused over the list: the lists are read again, so the list with that name can be picked.
  const listsAsked = useRef(listsRound);
  useEffect(() => {
    if (listsAsked.current === listsRound) return;
    listsAsked.current = listsRound;
    void loadLists();
    // Asked once per bump.
  }, [listsRound]);

  const previews = useMemo(() => changes.rows.map((r) => r.preview), [changes.rows]);
  const tally = useMemo(() => adjustTally(preflight.byChoice, previews, choice, exceptions), [preflight.byChoice, previews, choice, exceptions]);
  const apartCount = Object.keys(exceptions).length;
  const shownTotal = changes.rows.length <= listTotal && !(changes.next === null && changes.rows.length !== listTotal) ? listTotal : null;
  // V2 · nothing in the book differs from the file (the check said so, or every page has been read and none did).
  const noChanges = listTotal === 0 || (!changes.loading && !changes.failed && changes.rows.length === 0 && changes.next === null);

  /** A new choice for every row: the rows set apart follow it, and the panel says how many there were. */
  const choose = (c: ImportChoice) => {
    if (c === choice) return;
    onDraft((d) => ({ ...d, choice: c, exceptions: NO_OVERRIDES }));
    setCleared(apartCount > 0 ? apartCount : null);
    setDropped(null);
  };

  /** Set one row apart: kept as it is when the choice in force changes it, else given the file's version. */
  const setApart = (row: ChangesPageRow, on: boolean) => {
    onDraft((d) => {
      const next: Record<number, ImportChoice> = { ...d.exceptions };
      if (!on) {
        delete next[row.line];
        return { ...d, exceptions: next };
      }
      const target = row.preview.byChoice[d.choice].kind === "update" ? DEFAULT_IMPORT_CHOICE : firstUpdating(row);
      if (target === null || target === d.choice) return d;
      next[row.line] = target;
      return { ...d, exceptions: next };
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
    // A fresh read of the lists without the one picked: it is gone (R12).
    else listProblem = lists.state === "ready" ? APPLY.heldListGone : APPLY.heldLists;
  } else if (!named.ok) listProblem = named.sentence;
  else listChoice = sameAs !== null ? { kind: "existing", listId: sameAs.id } : { kind: "new", name: named.name };

  const dirty = draftDirty(draft) || starting;
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

  // ⭐ V1 · the promise is a line of its own above the start; the button's words are short enough for any width.
  const promise = APPLY.tally(tally.create, tally.update, tally.keep);
  const label = APPLY.label(tally.create + tally.update + tally.keep);

  return (
    <div className="space-y-5" data-block="import-decision" data-may-update={mayUpdate ? "yes" : "no"} data-choice-count={mayUpdate ? IMPORT_CHOICES.length : 0}>
      {inBook > 0 && !mayUpdate && (
        <section className="space-y-2" data-import-duplicates="kept" aria-label={DECIDE.heading}>
          <SectionHeading>{DECIDE.heading}</SectionHeading>
          <p className="text-body-sm font-semibold text-text" data-import-kept-only>{DECIDE.keptOnly}</p>
          <p className="text-body-sm text-text-secondary">{DECIDE.keptOnlyWhy}</p>
        </section>
      )}

      {inBook > 0 && mayUpdate && (
        <section className="space-y-3" data-import-duplicates="choose" aria-label={DECIDE.heading}>
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
                    className={`flex min-h-[var(--tap-min)] cursor-pointer items-start gap-[10px] rounded-md border px-3 py-[10px] text-body-sm transition-colors ${
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
                      {c === DEFAULT_IMPORT_CHOICE && <Chip size="sm" variant="success">{DECIDE.recommended}</Chip>}
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
          {dropped !== null && (
            <p className="text-body-sm text-text" role="status" data-import-dropped={dropped}>
              <Parts parts={DECIDE.dropped(dropped)} />
            </p>
          )}

          {noChanges ? (
            <p className="text-body-sm text-text" data-import-changes="none">{DECIDE.noChanges}</p>
          ) : (
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
                              <span className="block break-words text-text">{row.preview.displayName ?? DECIDE.noName}</span>
                            </td>
                            <td className="align-top">
                              {changeLines(row.preview.byChoice[eff]).map((line) => (
                                <span key={line} className="block break-words text-text-secondary">{line}</span>
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
                    // ⭐ R15 · a retry says "Try again" — "Check again" is the file's re-check alone.
                    actions: [{ label: IMPORT_TRY_AGAIN, run: () => void loadChanges(changes.next ?? 0), act: "changes-retry" }],
                  }}
                />
              )}
              {/* ⭐ R8 · the list goes on while `nextAfterLine` is not null — even when every page read so far was empty. */}
              {!changes.loading && !changes.failed && changes.next !== null && changes.rows.length === 0 && (
                <p className="text-body-sm text-text-secondary" data-import-changes-none-yet>{DECIDE.noneYet}</p>
              )}
              {!changes.loading && !changes.failed && changes.next !== null && (
                <Button type="button" size="sm" variant="ghost" onClick={() => void loadChanges(changes.next ?? 0)} data-import-act="changes-more">
                  {DECIDE.more}
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3" data-import-list-step aria-label={LIST.heading}>
        <SectionHeading>{LIST.heading}</SectionHeading>
        <p className="text-body-sm text-text-secondary">{LIST.lead}</p>
        <fieldset disabled={starting || !mayAct}>
          <legend className="sr-only">{LIST.heading}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ListCard checked={pick.kind === "none"} onPick={() => onDraft((d) => ({ ...d, pick: { kind: "none" } }))} title={LIST.none} body={LIST.noneBody} value="none" />
            {lists.options.map((l) => (
              <ListCard
                key={l.id}
                checked={pick.kind === "existing" && pick.id === l.id}
                onPick={() => onDraft((d) => ({ ...d, pick: { kind: "existing", id: l.id } }))}
                title={l.name}
                value={l.id}
                body={<Parts parts={LIST.members(l.members)} />}
                chip={l.covered
                  ? <Chip size="sm" variant="success">{LIST.covered}</Chip>
                  : <Chip size="sm" variant="neutral">{LIST.notCovered}</Chip>}
              />
            ))}
            <ListCard checked={pick.kind === "new"} onPick={() => onDraft((d) => ({ ...d, pick: { kind: "new" } }))} title={LIST.newList} value="new" />
          </div>
        </fieldset>
        {lists.state === "loading" && <p className="text-body-sm text-text-secondary" role="status">{LIST.loading}</p>}
        {lists.state === "failed" && (
          // ⭐ R15 · a retry says "Try again".
          <ImportAlert alert={{ tone: "warning", text: LIST.failed, actions: [{ label: IMPORT_TRY_AGAIN, run: () => void loadLists(), act: "lists-retry" }] }} />
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
              onChange={(e) => {
                const value = e.target.value;
                onDraft((d) => ({ ...d, newName: value }));
              }}
              onBlur={() => onDraft((d) => (d.nameTouched ? d : { ...d, nameTouched: true }))}
              autoComplete="off"
              disabled={starting}
              readOnly={!mayAct}
            />
          </Field>
        )}
        {pick.kind !== "none" && <p className="text-body-sm text-text-secondary" data-import-list-owed>{LIST.owed}</p>}
      </section>

      {alert !== null && <ImportAlert alert={alert} disabled={starting} />}

      {/* ⭐ THE PROMISE (V1): its own line, a sentence that wraps — the button below carries only its short label. */}
      <p className="text-body-sm font-semibold text-text" data-import-apply-tally>
        <Parts parts={promise} />
      </p>
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
          title={heldReason ?? partsText(promise)}
          onClick={() => {
            if (tally.overwrites > 0) setAsking("overwrite");
            else fire();
          }}
          data-block="import-apply"
          data-create={tally.create}
          data-update={tally.update}
          data-keep={tally.keep}
        >
          <ButtonText><Parts parts={label} /></ButtonText>
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
      className={`flex min-h-[var(--tap-min)] cursor-pointer items-start gap-[10px] rounded-md border px-3 py-[10px] text-body-sm transition-colors ${
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

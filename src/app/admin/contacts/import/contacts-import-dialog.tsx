"use client";

/**
 * CONTACTS → IMPORT CONTACTS — the page head's button (`contacts-import`) and the ONE dialog it opens.
 *                                       (S15 · C3–C5, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2, S15-1…S15-12)
 *
 * ⭐ ONE DIALOG, ONE STEP AT A TIME, NEVER A DEAD END. Opening asks the server for the officer's unfinished import first
 * (`importViewAction(null)`) and opens ON it when there is one (`import-adopt`); otherwise: choose a file or paste
 * (`import-entrance`) → read in the browser, streamed (an Excel file is read by the server) → the columns
 * (`import-mapping`) → uploaded in batches, the bar counting rows STAGED → the check (`import-preflight`), numbers already
 * in the book, the list, and the start (`import-apply`) → importing, the bar counting rows DONE as the server reports
 * them (`import-commit`) → the result (`import-done`). Every refusal is said where it happened with its next step as a
 * control; a fault says "nothing was lost" and offers to try again; a deploy says "The platform was updated — reload this
 * page to resume", and the run is resumable because its progress lives on the server, never in this tab.
 * ⭐ S15-12 (R2b) · AN ADMIN also finds, at the entrance, the imports OTHER officers left unfinished
 * (`importOpenRunsAction`, asked once per opening; refused for anyone else, and then nothing is shown) — each with Resume
 * (adopted through `importViewAction(runId)`, then the loop its status needs) and the existing Discard / Cancel the rest.
 * ⭐ THE TWO LOOPS ARE `import-loop.ts`'s — the one driver, pure, with the actions handed in — and their rules are its
 * header's: the server's cursor is the only progress, Stop pauses then stops, only `busy` is waited out — and never given
 * up on while Stop is not pressed (R6: the run stays COMMITTING and the screen says it carries on by itself) — and a
 * thrown call is followed by the VIEW (never a blind repeat).
 * ⛔ R4 · A LOOP THAT ENDS ON A REFUSAL OR A FAILURE WITHOUT A VIEW OF ITS OWN NEVER SHOWS WHERE IT BEGAN AS CURRENT: the
 * run is read again (`importViewAction(runId)`) before anything is drawn, and when that fails too the dialog says "We
 * couldn't read how far the import got — reopen this window to see" with no figures at all (never "0 of N").
 * ⭐ R7 · THE OFFICER'S DECISION IS HELD HERE (`DecisionDraft`), so a start refused because the check grew stale or the book
 * moved is checked again WITHOUT losing the choice, the rows set apart, the list or the new list's name.
 * ⛔ THE ACTIONS ARE CALLED HERE AND NOWHERE ELSE (`ACTIONS` below): the panels are handed functions, so this file is the
 * one acting control `test:admin-act-gate` reads — and it consults the gate: a role that may view the book but not act
 * sees "Import contacts" disabled WITH its reason, never a control that bounces (`useActDisabledReason`).
 * ⛔ A DIALOG THAT IS WORKING CANNOT BE DISMISSED BY A STRAY CLICK OR KEY: while a request is in flight its ✕ is gone;
 * while rows are uploading or importing its ✕ ASKS ("Stop the import?") and the answer pauses, then closes. A closed
 * window cannot ask — the server keeps the run COMMITTING, and the next opening adopts it.
 * ⭐ 360: the dialog is a full-height sheet that scrolls, its buttons stacked with the primary on top; 1280: a form's width
 * (≤ 960). No sentence leaves its box at any width (`test:popup-fit`): long button words wrap inside their buttons.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { ConfirmModal, Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useToast } from "@/components/ui/toast";
import { useActDisabledReason, useMayAct } from "@/components/admin/act-gate";
import { formatDateTime } from "@/lib/utils";
import type { ColumnMapping } from "@/lib/contacts/contact-fields";
import { stageFigures, stageRowsOf, type StageRowInput } from "@/lib/contacts/import-limits";
import { isParsedContactsFile, type ParsedContactsFile } from "@/lib/contacts/parsed-file";
import {
  bucketsAdd,
  type ImportRefusal,
  type ImportRefusalReason,
  type ImportResultView,
  type ImportRunView,
  type PreflightView,
  type StartImportInput,
} from "@/lib/contacts/import-flow";
import { isDeploySkewError, runCommit, runUpload, type BusyState } from "@/lib/contacts/import-loop";
import type { CsvUnclosedQuote } from "@/lib/contacts/import-parse";
import {
  isListPaste,
  mappingFor,
  parsePastedText,
  pasteExtraNumbers,
  readContactsFile,
  textDigest,
  type ExtraNumbersUnit,
  type ReadOutcome,
} from "@/lib/contacts/import-read";
import {
  cancelImportAction,
  checkImportAction,
  commitImportStepAction,
  discardImportAction,
  importChangesAction,
  importFailuresAction,
  importListsAction,
  importOpenRunsAction,
  importResultAction,
  importViewAction,
  openImportAction,
  pauseImportAction,
  readXlsxImportAction,
  resumeImportAction,
  stageImportRowsAction,
  startImportAction,
} from "./import-actions";
import {
  CHECK,
  COMMIT,
  ENTRANCE,
  IMPORT_BUTTON,
  IMPORT_CLOSE,
  IMPORT_CONNECTION,
  IMPORT_DROPPED,
  IMPORT_EYEBROW,
  IMPORT_FAULT,
  IMPORT_GONE,
  IMPORT_OPENING,
  IMPORT_RELOAD,
  IMPORT_REREADING,
  IMPORT_SKEW,
  IMPORT_SKEW_DETAIL,
  IMPORT_STALLED,
  IMPORT_START_AGAIN,
  IMPORT_TITLES,
  IMPORT_TRY_AGAIN,
  IMPORT_UNREAD,
  OPEN_WAYS,
  OTHERS,
  RESUME_FILE,
  partsText,
  stepLine,
  sumCutOf,
  type SumCut,
} from "./import-copy";
import { ImportAdoptPanel } from "./import-adopt-panel";
import { ImportCheckPanel } from "./import-check-panel";
import { ImportCommitPanel } from "./import-commit-panel";
import { ImportDecisionPanel, draftDirty, freshDraft, type DecisionApi, type DecisionDraft } from "./import-decision-panel";
import { ImportDonePanel } from "./import-done-panel";
import { ImportEntrance, type EntranceMode } from "./import-entrance";
import { ImportMappingPanel, type MappingChoice } from "./import-mapping-panel";
import { ImportOpenRuns, type OthersState } from "./import-open-runs";
import { ActionsRow, ImportAlert, Parts, type AlertAction, type ImportAlertState } from "./import-parts";

/* ═══ THE ACTIONS — named once ═══════════════════════════════════════════════════════════════════ */

/** ⭐ The server's sixteen actions (`import-actions.ts`), as the dialog and its loops call them. */
const ACTIONS = {
  view: importViewAction,
  open: openImportAction,
  stage: stageImportRowsAction,
  discard: discardImportAction,
  readXlsx: readXlsxImportAction,
  check: checkImportAction,
  changes: importChangesAction,
  lists: importListsAction,
  start: startImportAction,
  step: commitImportStepAction,
  pause: pauseImportAction,
  resume: resumeImportAction,
  cancel: cancelImportAction,
  failures: importFailuresAction,
  result: importResultAction,
  openRuns: importOpenRunsAction,
};

/** The two reads the decision panel makes itself. */
const DECISION_API: DecisionApi = {
  changes: (runId, afterLine) => ACTIONS.changes({ runId, afterLine }),
  lists: () => ACTIONS.lists(),
};

/** A call's outcome: the server's answer, or a throw — told apart from a deploy (stale action ids) by `isDeploySkewError`. */
type Called<T> = { readonly kind: "answer"; readonly answer: T } | { readonly kind: "thrown"; readonly skew: boolean };

/** A redirect thrown by an action (a missing session) is navigation, not failure: it is let through. */
const isRedirect = (e: unknown): boolean =>
  typeof e === "object" && e !== null && "digest" in e && String((e as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT");

async function call<T>(fn: () => Promise<T>): Promise<Called<T>> {
  try {
    return { kind: "answer", answer: await fn() };
  } catch (e) {
    if (isRedirect(e)) throw e;
    return { kind: "thrown", skew: isDeploySkewError(e) };
  }
}

/** An instant as the platform prints it, or null when it cannot be read. */
const when = (iso: string | null): string | null => {
  if (iso === null) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : formatDateTime(iso);
};

/** The header row a stored mapping needs: every column it names exists (an unnamed one is blank). */
function headersCovering(headers: readonly string[], mapping: ColumnMapping): string[] {
  let width = headers.length;
  for (const v of Object.values(mapping)) if (typeof v === "number" && v + 1 > width) width = v + 1;
  return Array.from({ length: width }, (_, i) => headers[i] ?? "");
}

/** How a refusal is painted: a wait or a re-check is not an error; everything else is said as one. */
const REFUSAL_TONE: Partial<Record<ImportRefusalReason, ImportAlertState["tone"]>> = {
  busy: "warning",
  // C8c · #14b · the database refused every step for over a minute and the run paused itself: a wait, not a fault.
  db_paused: "warning",
  rate_limited: "warning",
  xlsx_busy: "warning",
  check_again: "warning",
  bad_exceptions: "warning",
  check_stale: "info",
  update_needs_reader: "info",
};

/* ═══ THE PAGE HEAD'S BUTTON ═══════════════════════════════════════════════════════════════════════ */

/**
 * "Import contacts" — beside Export and Add contact. ⛔ DISABLED WITH ITS REASON for a role that may view the book but
 * not act, never hidden. Each opening mounts a fresh dialog, which asks the server where things stand.
 */
export function ImportContactsButton() {
  const mayAct = useMayAct();
  const reason = useActDisabledReason();
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        leading={<I.upload s={16} />}
        disabled={!mayAct}
        title={reason}
        aria-haspopup="dialog"
        data-block="contacts-import"
        onClick={() => {
          setRound((n) => n + 1);
          setOpen(true);
        }}
      >
        {IMPORT_BUTTON}
      </Button>
      {round > 0 && <ImportDialog key={round} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ═══ THE DIALOG ═══════════════════════════════════════════════════════════════════════════════════ */

/** A file read and ready for its columns: the parsed shape, its digest and name, and S15-4's count — the reader's for a
 *  vCard's cards and a list paste's lines, and none for any other file (C3b-fix · D3: such a file leaves no mobile out). */
type Ready = {
  readonly file: ParsedContactsFile;
  readonly digest: string;
  readonly name: string | null;
  readonly list: boolean;
  readonly extraNumbers: number;
  readonly extraUnit: ExtraNumbersUnit;
  /** C3b-fix · D5 · a CSV whose quotation mark never closed: its row and the lines it swallowed — null for any other file. */
  readonly unclosed: CsvUnclosedQuote | null;
  /** C3b-fix · D8 · the server's reader said no visible sheet of the workbook holds a mobile — false for any other file. */
  readonly noMobileSheet: boolean;
};

/** Which loop a stopped run was in — where the officer is told it stopped. */
type Loop = "upload" | "commit";

/** ⛔ R4 · what to say when a loop's run is read again: `found` beside the run's figures, `unread` when it cannot be read. */
type StopNotes = { readonly found: ImportAlertState; readonly unread: ImportAlertState };

type Phase =
  | { readonly at: "opening" }
  | { readonly at: "adopt"; readonly view: ImportRunView; readonly busy: boolean }
  | { readonly at: "entrance"; readonly resume: ImportRunView | null; readonly mode: EntranceMode }
  | { readonly at: "mapping"; readonly ready: Ready; readonly busy: boolean }
  | { readonly at: "uploading"; readonly view: ImportRunView; readonly busyState: BusyState | null; readonly stopping: boolean }
  | { readonly at: "checking"; readonly view: ImportRunView }
  | { readonly at: "review"; readonly view: ImportRunView; readonly preflight: PreflightView; readonly starting: boolean }
  | { readonly at: "importing"; readonly view: ImportRunView; readonly busyState: BusyState | null; readonly stopping: boolean }
  /** A run nothing in this tab drives: PAUSED, or (R6/R4) still COMMITTING after a refusal or a dropped connection. */
  | { readonly at: "paused"; readonly view: ImportRunView; readonly acting: boolean }
  /** ⛔ R4 · a loop ended and the run is being read again (`reading`), or could not be: no figures are shown. */
  | { readonly at: "unread"; readonly runId: string; readonly loop: Loop; readonly notes: StopNotes; readonly reading: boolean }
  | { readonly at: "finishing"; readonly view: ImportRunView }
  /** `notImported` (R5): a cancel's own count of the rows it left unimported, when this tab cancelled the run. */
  | { readonly at: "done"; readonly result: ImportResultView; readonly notImported: number | null }
  | { readonly at: "fault" }
  | { readonly at: "skew" };

const IDLE: EntranceMode = { kind: "idle" };

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const headingId = useId();
  const [phase, setPhase] = useState<Phase>({ at: "opening" });
  const [alert, setAlert] = useState<ImportAlertState | null>(null);
  const [askStop, setAskStop] = useState(false);
  /** ⭐ R7 · the officer's decision for the run under review — kept across a re-check (one run's draft at a time). */
  const [draft, setDraft] = useState<DecisionDraft | null>(null);
  /** ⭐ R12 · bumped when a start was refused over its list: the decision panel reads the lists again. */
  const [listsRound, setListsRound] = useState(0);
  /** ⭐ S15-12 (R2b) · other officers' unfinished imports, for an admin — and the one a request is in flight for. */
  const [others, setOthers] = useState<OthersState>({ kind: "loading" });
  const [othersActing, setOthersActing] = useState<string | null>(null);
  const buttonFocus = useRef<HTMLButtonElement | null>(null);
  const headingFocus = useRef<HTMLHeadingElement | null>(null);
  /** The dialog is mounted (a loop or a reply that outlives it does nothing). */
  const alive = useRef(true);
  /** Stop was asked: the running loop pauses (commit) or stops (upload) at its next boundary. */
  const stopRef = useRef(false);
  /** Stop was asked by ✕: once the loop has stopped, the dialog closes. */
  const closeAfterStop = useRef(false);
  const abortRead = useRef<AbortController | null>(null);
  /** The rows this tab staged from, and the file they came from — so an interrupted upload resumes without a re-read. */
  const staging = useRef<{ digest: string; rows: readonly StageRowInput[] } | null>(null);
  /** S15-4 · the count of people with another number, for the run this tab read the file for. */
  const extra = useRef<{ runId: string | null; count: number; unit: ExtraNumbersUnit }>({ runId: null, count: 0, unit: "line" });
  /** ⭐ C3b-fix · D5d · the quotation mark never closed this tab's read found, for the run it opened — the sum lines' cut. */
  const unclosedRef = useRef<{ runId: string | null; unclosed: CsvUnclosedQuote | null }>({ runId: null, unclosed: null });
  /** ⭐ C3b-fix · D5d · how a run's sum lines end — the copy table's ONE rule (`sumCutOf`) over what this tab read. */
  const cutFor = (view: ImportRunView): SumCut => sumCutOf(view, unclosedRef.current);

  const go = useCallback((next: Phase, nextAlert: ImportAlertState | null = null) => {
    if (!alive.current) return;
    setPhase(next);
    setAlert(nextAlert);
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopRef.current = true;
      abortRead.current?.abort();
    };
  }, []);
  // ⛔ A closed dialog drives nothing: a loop still running is told to stop (it pauses on the server first).
  useEffect(() => {
    if (!open) stopRef.current = true;
  }, [open]);

  /** A fault in a phase: the deploy sentence for a stale page, else "nothing was lost" with a way to try again. */
  const thrown = useCallback((skew: boolean, phaseNow: Phase, retry: () => void) => {
    if (skew) {
      go({ at: "skew" });
      return;
    }
    go(phaseNow, { tone: "danger", text: IMPORT_FAULT, actions: [{ label: IMPORT_TRY_AGAIN, run: retry, primary: true, act: "retry" }] });
  }, [go]);

  /** A refusal said in the phase it happened in: the server's sentence, verbatim, and the ways on. */
  const refused = (refusal: ImportRefusal, actions: readonly AlertAction[] = []): ImportAlertState => ({
    tone: REFUSAL_TONE[refusal.reason] ?? "danger",
    text: refusal.message,
    actions,
  });

  /** Waits `ms`, or less when Stop is asked — a busy wait never holds a Stop back. */
  const waitOrStop = (ms: number): Promise<void> => new Promise((resolve) => {
    const until = Date.now() + ms;
    const tick = () => {
      if (stopRef.current || !alive.current || Date.now() >= until) resolve();
      else window.setTimeout(tick, 200);
    };
    window.setTimeout(tick, Math.min(200, Math.max(0, ms)));
  });

  /** The run is gone (discarded elsewhere, or swept): said so, with the way to start again. */
  const goneNow = (): void => {
    go({ at: "fault" }, { tone: "danger", text: IMPORT_GONE, actions: [{ label: IMPORT_START_AGAIN, run: () => go({ at: "entrance", resume: null, mode: IDLE }), primary: true, act: "start-again" }] });
  };

  /* ── where a run goes, by its status ─────────────────────────────────────────────────────────── */

  const finish = async (view: ImportRunView, notImported: number | null = null): Promise<void> => {
    go({ at: "finishing", view });
    const r = await call(() => ACTIONS.result(view.id));
    if (!alive.current) return;
    if (r.kind === "thrown") return thrown(r.skew, { at: "finishing", view }, () => void finish(view, notImported));
    if (!r.answer.ok) {
      go({ at: "finishing", view }, refused(r.answer, [{ label: IMPORT_TRY_AGAIN, run: () => void finish(view, notImported), primary: true, act: "retry" }]));
      return;
    }
    go({ at: "done", result: r.answer.result, notImported });
    router.refresh();
  };

  /** A run met again (another tab moved it, a refusal carried it): the phase its status belongs to. */
  const route = (view: ImportRunView, note: ImportAlertState | null = null): void => {
    if (view.status === "STAGED") {
      void check(view, note);
      return;
    }
    if (view.status === "DONE" || view.status === "CANCELLED") {
      void finish(view);
      return;
    }
    go({ at: "adopt", view, busy: false }, note);
  };

  /** A loop's run as the server JUST reported it, placed: a stopped upload on its adopt panel, a stopped commit on the
   *  paused panel (titled "stopped" unless the run really is PAUSED), a finished run on its result. */
  const placeStopped = (view: ImportRunView, note: ImportAlertState | null): void => {
    if (view.status === "COMMITTING" || view.status === "PAUSED") {
      go({ at: "paused", view, acting: false }, note);
      return;
    }
    route(view, note);
  };

  /**
   * ⛔ R4 · A LOOP ENDED ON A REFUSAL OR A FAILURE: drawn from the view the server answered with — and when there is none,
   * from the run READ AGAIN by id. Never from the cursor the loop began at. When the run cannot be read either, the
   * dialog says so with no figures (`unread`), and Try again reads it again.
   */
  const settle = async (known: ImportRunView | null, runId: string, notes: StopNotes, loop: Loop): Promise<void> => {
    if (known !== null) {
      placeStopped(known, notes.found);
      return;
    }
    go({ at: "unread", runId, loop, notes, reading: true });
    const r = await call(() => ACTIONS.view(runId));
    if (!alive.current) return;
    if (r.kind === "thrown") {
      if (r.skew) return go({ at: "skew" });
      return go({ at: "unread", runId, loop, notes, reading: false }, notes.unread);
    }
    if (!r.answer.ok) return go({ at: "unread", runId, loop, notes, reading: false }, notes.unread);
    if (r.answer.view === null) return goneNow();
    placeStopped(r.answer.view, notes.found);
  };

  /* ── opening ─────────────────────────────────────────────────────────────────────────────────── */

  /** ⭐ S15-12 (R2b) · an ADMIN's way to other officers' unfinished imports. Refused (anyone but an admin), failed or empty
   *  — nothing is shown, and nothing is said. */
  const loadOthers = async (): Promise<void> => {
    const r = await call(() => ACTIONS.openRuns());
    if (!alive.current) return;
    if (r.kind === "thrown" || !r.answer.ok) {
      setOthers({ kind: "none" });
      return;
    }
    setOthers(r.answer.runs.length === 0 ? { kind: "none" } : { kind: "ready", runs: r.answer.runs });
  };
  const othersAsked = useRef(false);

  const begin = async (): Promise<void> => {
    go({ at: "opening" });
    const r = await call(() => ACTIONS.view(null));
    if (!alive.current) return;
    // Asked once per opening, after the officer's own run is known — the entrance never waits for it.
    if (!othersAsked.current) {
      othersAsked.current = true;
      void loadOthers();
    }
    if (r.kind === "thrown") return thrown(r.skew, { at: "fault" }, () => void begin());
    if (!r.answer.ok) {
      go({ at: "fault" }, refused(r.answer, [{ label: IMPORT_TRY_AGAIN, run: () => void begin(), primary: true, act: "retry" }]));
      return;
    }
    const view = r.answer.view;
    if (view === null || view.status === "DONE" || view.status === "CANCELLED") go({ at: "entrance", resume: null, mode: IDLE });
    else go({ at: "adopt", view, busy: false });
  };
  const began = useRef(false);
  useEffect(() => {
    if (began.current) return;
    began.current = true;
    void begin();
    // Asked once per opening: a new opening is a new dialog (`key`).
  }, []);

  /* ── step 1: a file or a paste ───────────────────────────────────────────────────────────────── */

  const onFile = async (file: File, resume: ImportRunView | null): Promise<void> => {
    const controller = new AbortController();
    abortRead.current = controller;
    const name = file.name !== "" ? file.name : ENTRANCE.fileLabel;
    go({ at: "entrance", resume, mode: { kind: "reading", name, read: 0, total: file.size, rows: 0 } });
    let out: ReadOutcome;
    try {
      out = await readContactsFile(file, {
        signal: controller.signal,
        onProgress: (read, total, rows) => {
          if (!alive.current) return;
          setPhase((p) => (p.at === "entrance" && p.mode.kind === "reading" ? { ...p, mode: { ...p.mode, read, total, rows } } : p));
        },
      });
    } catch {
      // The browser could not read the file (it moved, or permission went): choosing it again is the way on.
      out = { kind: "refused", sentence: IMPORT_FAULT, cause: "format" };
    }
    if (abortRead.current === controller) abortRead.current = null;
    if (!alive.current) return;
    if (out.kind === "aborted") return go({ at: "entrance", resume, mode: IDLE });
    if (out.kind === "refused") {
      // ⭐ The reader's own sentence (it names the row and the fix); a CSV refused for its structure gets the second way on
      // — saving it again from a spreadsheet — for an officer who cannot find that row. The entrance below is the third.
      const text = out.cause === "csv" ? `${out.sentence} ${ENTRANCE.csvFix}` : out.sentence;
      return go({ at: "entrance", resume, mode: IDLE }, { tone: "danger", text, actions: [] });
    }
    if (out.kind === "parsed") {
      prepare({
        file: out.file, digest: out.digest, name: file.name || null, list: false, extraNumbers: out.extraNumbers, extraUnit: "card",
        unclosed: out.unclosed, noMobileSheet: false,
      }, resume);
      return;
    }
    // ⭐ An Excel workbook: read by the server (U27b), checked here before a single row is shown.
    const workbook = { base64: out.base64, fileName: out.fileName, digest: out.digest };
    go({ at: "entrance", resume, mode: { kind: "xlsx", name } });
    const r = await call(() => ACTIONS.readXlsx({ base64: workbook.base64, fileName: workbook.fileName }));
    if (!alive.current) return;
    if (r.kind === "thrown") return thrown(r.skew, { at: "entrance", resume, mode: IDLE }, () => void onFile(file, resume));
    if (!r.answer.ok) {
      const retry: AlertAction[] = r.answer.reason === "xlsx_busy" || r.answer.reason === "rate_limited"
        ? [{ label: IMPORT_TRY_AGAIN, run: () => void onFile(file, resume), primary: true, act: "retry" }]
        : [];
      go({ at: "entrance", resume, mode: IDLE }, refused(r.answer, retry));
      return;
    }
    if (!isParsedContactsFile(r.answer.file)) {
      go({ at: "entrance", resume, mode: IDLE }, { tone: "danger", text: ENTRANCE.xlsxGarbled, actions: [] });
      return;
    }
    // ⭐ C3b-fix · D8 · the reader's own word on the sheets — the only thing the columns step's sheet hint is shown on.
    prepare({
      file: r.answer.file, digest: workbook.digest, name: file.name || null, list: false, extraNumbers: 0, extraUnit: "line",
      unclosed: null, noMobileSheet: r.answer.noMobileSheet === true,
    }, resume);
  };

  const onPaste = async (text: string, resume: ImportRunView | null): Promise<void> => {
    const file = parsePastedText(text);
    const list = isListPaste(text);
    let digest: string;
    try {
      digest = await textDigest(text);
    } catch {
      go({ at: "entrance", resume, mode: IDLE }, { tone: "danger", text: IMPORT_FAULT, actions: [] });
      return;
    }
    if (!alive.current) return;
    prepare({ file, digest, name: null, list, extraNumbers: list ? pasteExtraNumbers(text) : 0, extraUnit: "line", unclosed: null, noMobileSheet: false }, resume);
  };

  /** A file read: an empty one is said so; a resumed upload goes straight on; anything else shows its columns. */
  const prepare = (ready: Ready, resume: ImportRunView | null): void => {
    if (ready.file.rows.length === 0 && ready.file.unreadable.length === 0) {
      go({ at: "entrance", resume, mode: IDLE }, { tone: "danger", text: ENTRANCE.empty, actions: [] });
      return;
    }
    if (resume === null) {
      go({ at: "mapping", ready, busy: false });
      return;
    }
    // ⭐ CARRYING ON AN UPLOAD: the same file (the digest), read the same way (the run's stored mapping, and the header
    // rows that give its figures) — the server adopts the run only then, and the upload goes on from ITS nextFrom.
    const discardWay: AlertAction = { label: RESUME_FILE.discard, run: () => void discardRun(resume), act: "discard" };
    if (ready.digest !== resume.fileDigest) {
      go({ at: "entrance", resume, mode: IDLE }, { tone: "danger", text: RESUME_FILE.wrong, actions: [discardWay] });
      return;
    }
    const auto = mappingFor(ready.file, { list: ready.list });
    const tries: ReadonlyArray<0 | 1> = auto.headerRows === 1 ? [1, 0] : [0, 1];
    for (const headerRows of tries) {
      const reading = headerRows === auto.headerRows
        ? auto
        : mappingFor(ready.file, { list: ready.list, firstRow: headerRows === 1 ? "header" : "contact" });
      // ⭐ C3b · G4 · the rows come from the file AS THE READING STAGES IT — its added phone column included, as before.
      const rows = stageRowsOf(reading.file, resume.mapping, headerRows);
      const figures = stageFigures(rows);
      if (figures.totalRows !== resume.totalRows || figures.unreadable !== resume.unreadable) continue;
      void openRun(ready, { mapping: resume.mapping, headers: headersCovering(reading.headers, resume.mapping), headerRows, file: reading.file }, rows, resume);
      return;
    }
    go({ at: "entrance", resume, mode: IDLE }, { tone: "danger", text: RESUME_FILE.differently, actions: [discardWay] });
  };

  /* ── step 2 → 3: open the run, then upload ───────────────────────────────────────────────────── */

  const openRun = async (ready: Ready, choice: MappingChoice, rows: readonly StageRowInput[], resume: ImportRunView | null): Promise<void> => {
    const figures = stageFigures(rows);
    const back: Phase = resume === null ? { at: "mapping", ready, busy: false } : { at: "entrance", resume, mode: IDLE };
    if (resume === null) go({ at: "mapping", ready, busy: true });
    else go({ at: "entrance", resume, mode: { kind: "opening", name: ready.name ?? ENTRANCE.pasteLabel } });
    const retry = () => void openRun(ready, choice, rows, resume);
    const r = await call(() => ACTIONS.open({
      format: ready.file.format,
      fileName: ready.name,
      fileDigest: ready.digest,
      headers: choice.headers,
      mapping: choice.mapping,
      totalRows: figures.totalRows,
      unreadable: figures.unreadable,
    }));
    if (!alive.current) return;
    if (r.kind === "thrown") return thrown(r.skew, back, retry);
    if (!r.answer.ok) {
      const a = r.answer;
      const open = a.view;
      const ways: AlertAction[] = [];
      if (a.reason === "unfinished_run" && open !== null) {
        ways.push({ label: OPEN_WAYS.goToOpen, run: () => route(open), act: "go-to-open" });
        ways.push({ label: OPEN_WAYS.discardOpen, run: () => void discardRun(open, retry), act: "discard-open", primary: true });
      } else if (a.reason === "read_differently" && open !== null) {
        ways.push({ label: OPEN_WAYS.discardStale, run: () => void discardRun(open, retry), act: "discard-open", primary: true });
      } else if (a.reason === "superseded") {
        ways.push({ label: IMPORT_RELOAD, run: () => window.location.reload(), act: "reload", primary: true });
      } else if (a.reason === "rate_limited" || a.reason === "server_error") {
        ways.push({ label: IMPORT_TRY_AGAIN, run: retry, act: "retry", primary: true });
      } else if (resume === null) {
        ways.push({ label: OPEN_WAYS.chooseAnother, run: () => go({ at: "entrance", resume: null, mode: IDLE }), act: "choose-another" });
      }
      go(back, refused(a, ways));
      return;
    }
    staging.current = { digest: ready.digest, rows };
    // ⭐ S15-4 · a vCard's cards and a list paste's lines are counted by their readers. ⛔ C3b-fix · D3: a file's rows are
    // never counted — a row holding two or more mobiles is refused with its sentence, so no mobile is left out silently.
    extra.current = { runId: r.answer.view.id, count: ready.extraNumbers, unit: ready.extraUnit };
    unclosedRef.current = { runId: r.answer.view.id, unclosed: ready.unclosed };
    await upload(r.answer.view);
  };

  const upload = async (start: ImportRunView): Promise<void> => {
    const held = staging.current;
    if (held === null || held.digest !== start.fileDigest) {
      // This tab no longer holds the file's rows (a reload, another opening): the same file must be read again.
      go({ at: "entrance", resume: start, mode: IDLE });
      return;
    }
    stopRef.current = false;
    closeAfterStop.current = false;
    go({ at: "uploading", view: start, busyState: null, stopping: false });
    const out = await runUpload({
      stage: ACTIONS.stage,
      view: (id) => ACTIONS.view(id),
      isDeploySkew: isDeploySkewError,
      shouldStop: () => stopRef.current || !alive.current,
      onView: (v) => {
        if (alive.current) setPhase((p) => (p.at === "uploading" ? { ...p, view: v } : p));
      },
      onBusy: (b) => {
        if (alive.current) setPhase((p) => (p.at === "uploading" ? { ...p, busyState: b } : p));
      },
      wait: waitOrStop,
    }, held.rows, start);
    if (!alive.current) return;
    const closing = closeAfterStop.current;
    closeAfterStop.current = false;
    if (closing) onClose();
    switch (out.kind) {
      case "staged":
        return check(out.view);
      case "stopped":
        return go({ at: "adopt", view: out.view, busy: false });
      case "elsewhere":
        return route(out.view);
      case "refused": {
        const note = refused(out.refusal);
        return settle(out.refusal.view, start.id, { found: note, unread: note }, "upload");
      }
      case "stalled":
        return go({ at: "adopt", view: out.view, busy: false }, { tone: "warning", text: IMPORT_STALLED, actions: [] });
      case "gone":
        return goneNow();
      case "failed":
        if (out.skew) return go({ at: "skew" });
        return settle(out.view, start.id, {
          found: { tone: "warning", text: IMPORT_CONNECTION, actions: [] },
          unread: { tone: "warning", text: IMPORT_DROPPED, actions: [] },
        }, "upload");
    }
  };

  /* ── step 3: the check, the decision, the start ──────────────────────────────────────────────── */

  const check = async (view: ImportRunView, note: ImportAlertState | null = null): Promise<void> => {
    go({ at: "checking", view });
    const again: AlertAction = { label: CHECK.checkAgain, run: () => void check(view), primary: true, act: "check-again" };
    const r = await call(() => ACTIONS.check(view.id));
    if (!alive.current) return;
    if (r.kind === "thrown") return thrown(r.skew, { at: "checking", view }, () => void check(view));
    if (!r.answer.ok) {
      const a = r.answer;
      if (a.view !== null && a.view.status !== "STAGED") return route(a.view, refused(a));
      go({ at: "checking", view }, refused(a, [again]));
      return;
    }
    if (!bucketsAdd(r.answer.preflight)) {
      // ⛔ Five counts that do not add up to the rows staged are not shown at all — never a zero, never a guess.
      go({ at: "checking", view: r.answer.view }, { tone: "danger", text: CHECK.bucketsOff, actions: [again] });
      return;
    }
    go({ at: "review", view: r.answer.view, preflight: r.answer.preflight, starting: false }, note);
  };

  /** ⭐ R7 · the draft for a run: the one held, when it is that run's — else a fresh one. */
  const draftOf = (runId: string): DecisionDraft => (draft !== null && draft.runId === runId ? draft : freshDraft(runId));
  const changeDraft = useCallback((runId: string, change: (d: DecisionDraft) => DecisionDraft) => {
    setDraft((d) => change(d !== null && d.runId === runId ? d : freshDraft(runId)));
  }, []);

  const start = async (input: StartImportInput): Promise<void> => {
    if (phase.at !== "review") return;
    const { view, preflight } = phase;
    go({ at: "review", view, preflight, starting: true });
    const r = await call(() => ACTIONS.start(input));
    if (!alive.current) return;
    if (r.kind === "thrown") {
      if (r.skew) return go({ at: "skew" });
      // ⛔ Never a blind repeat: a start that threw may have landed — the view says whether the run is importing.
      const v = await call(() => ACTIONS.view(view.id));
      if (!alive.current) return;
      if (v.kind === "answer" && v.answer.ok && v.answer.view !== null && v.answer.view.status !== "STAGED") return route(v.answer.view);
      return thrown(v.kind === "thrown" && v.skew, { at: "review", view, preflight, starting: false }, () => void start(input));
    }
    const a = r.answer;
    if (a.ok) return commit(a.view);
    // ⭐ R7 · the check grew stale, the book moved, the rows set apart no longer match, or this viewer may not update the
    // book: the file is checked again and the officer sees the new numbers first — the decision (the draft) is kept.
    if (a.reason === "check_stale" || a.reason === "check_again" || a.reason === "bad_exceptions" || a.reason === "update_needs_reader") {
      return check(a.view !== null && a.view.status === "STAGED" ? a.view : view, refused(a));
    }
    // ⭐ R12 · refused over its list: the lists are read again, so the list with that name (or another) can be picked.
    if (a.reason === "list_name_taken" || a.reason === "list_gone") setListsRound((n) => n + 1);
    if (a.view !== null && a.view.status !== "STAGED") return route(a.view, refused(a));
    go({ at: "review", view, preflight, starting: false }, refused(a));
  };

  /* ── step 4: the commit, its stop, resume and cancel ─────────────────────────────────────────── */

  const commit = async (start: ImportRunView): Promise<void> => {
    stopRef.current = false;
    closeAfterStop.current = false;
    go({ at: "importing", view: start, busyState: null, stopping: false });
    const out = await runCommit({
      step: ACTIONS.step,
      view: (id) => ACTIONS.view(id),
      pause: ACTIONS.pause,
      isDeploySkew: isDeploySkewError,
      shouldStop: () => stopRef.current || !alive.current,
      onView: (v) => {
        if (alive.current) setPhase((p) => (p.at === "importing" ? { ...p, view: v } : p));
      },
      onBusy: (b) => {
        if (alive.current) setPhase((p) => (p.at === "importing" ? { ...p, busyState: b } : p));
      },
      wait: waitOrStop,
    }, start);
    if (!alive.current) return;
    const closing = closeAfterStop.current;
    closeAfterStop.current = false;
    if (closing) onClose();
    switch (out.kind) {
      case "done":
        return finish(out.view);
      case "stopped":
        return go({ at: "paused", view: out.view, acting: false });
      case "halted":
        return out.view.status === "PAUSED" ? go({ at: "paused", view: out.view, acting: false }) : route(out.view);
      case "refused": {
        const note = refused(out.refusal);
        return settle(out.refusal.view, start.id, { found: note, unread: note }, "commit");
      }
      case "stalled":
        return go({ at: "paused", view: out.view, acting: false }, { tone: "warning", text: IMPORT_STALLED, actions: [] });
      case "gone":
        return goneNow();
      case "failed":
        if (out.skew) return go({ at: "skew" });
        return settle(out.view, start.id, {
          found: { tone: "warning", text: IMPORT_CONNECTION, actions: [] },
          unread: { tone: "warning", text: IMPORT_DROPPED, actions: [] },
        }, "commit");
    }
  };

  /** Resume: a paused run is resumed by its action first; a run left COMMITTING (a closed window) simply goes on. */
  const resumeRun = async (view: ImportRunView): Promise<void> => {
    if (view.status === "COMMITTING") return commit(view);
    if (view.status === "STAGING") return upload(view);
    if (view.status !== "PAUSED") return route(view);
    go(phase.at === "adopt" ? { at: "adopt", view, busy: true } : { at: "paused", view, acting: true });
    const r = await call(() => ACTIONS.resume({ runId: view.id }));
    if (!alive.current) return;
    if (r.kind === "thrown") return thrown(r.skew, { at: "paused", view, acting: false }, () => void resumeRun(view));
    if (r.answer.ok) return commit(r.answer.view);
    const a = r.answer;
    if (a.view !== null && a.view.status === "COMMITTING") return commit(a.view);
    if (a.view !== null && a.view.status !== "PAUSED") return route(a.view, refused(a));
    go({ at: "paused", view: a.view ?? view, acting: false }, refused(a));
  };

  /** Cancel the rest: what is written stays, the rest is left unimported — the result says how many of each (R5). */
  const cancelRest = async (view: ImportRunView): Promise<void> => {
    // ⭐ R5 · the rows not reached yet as this tab knew them just before the cancel — the fallback for the cancel's own count.
    const before = Math.max(0, view.stagedThrough - view.committedThrough);
    go(phase.at === "adopt" ? { at: "adopt", view, busy: true } : { at: "paused", view, acting: true });
    const r = await call(() => ACTIONS.cancel({ runId: view.id }));
    if (!alive.current) return;
    if (r.kind === "thrown") return thrown(r.skew, { at: "paused", view, acting: false }, () => void cancelRest(view));
    if (r.answer.ok) return finish(r.answer.view, r.answer.notImported ?? before);
    const a = r.answer;
    if (a.view !== null && (a.view.status === "CANCELLED" || a.view.status === "DONE")) return finish(a.view);
    go({ at: "paused", view: a.view ?? view, acting: false }, refused(a));
  };

  /** Discard a run that has written nothing — then carry on (`then`) or start afresh. */
  const discardRun = async (view: ImportRunView, then?: () => void): Promise<void> => {
    const here = phase;
    if (here.at === "adopt") go({ at: "adopt", view: here.view, busy: true });
    const r = await call(() => ACTIONS.discard(view.id));
    if (!alive.current) return;
    if (r.kind === "thrown") return thrown(r.skew, here.at === "adopt" ? { ...here, busy: false } : here, () => void discardRun(view, then));
    if (!r.answer.ok) {
      const a = r.answer;
      if (a.view !== null && a.view.status !== "STAGING" && a.view.status !== "STAGED") return route(a.view, refused(a));
      go(here.at === "adopt" ? { ...here, busy: false } : here, refused(a));
      return;
    }
    staging.current = null;
    toast({ title: CHECK.discarded, description: CHECK.discardedBody, variant: "success" });
    if (then !== undefined) then();
    else go({ at: "entrance", resume: null, mode: IDLE });
  };

  /** Leaving an upload this tab cannot carry on (the file is not to hand — an admin carrying on another's upload). */
  const discardWayFor = (run: ImportRunView) => (): void => {
    void discardRun(run, () => {
      go({ at: "entrance", resume: null, mode: IDLE });
      void loadOthers();
    });
  };

  /* ── S15-12 (R2b): another officer's unfinished import, from the entrance ────────────────────── */

  /** Resume another officer's run: adopted through its view by id, then the loop its status needs (`resumeRun`). */
  const resumeOther = async (run: ImportRunView): Promise<void> => {
    const here: Phase = { at: "entrance", resume: null, mode: IDLE };
    setOthersActing(run.id);
    const r = await call(() => ACTIONS.view(run.id));
    if (!alive.current) return;
    setOthersActing(null);
    if (r.kind === "thrown") return thrown(r.skew, here, () => void resumeOther(run));
    if (!r.answer.ok) {
      go(here, refused(r.answer));
      void loadOthers();
      return;
    }
    const view = r.answer.view;
    if (view === null) {
      go(here, { tone: "warning", text: OTHERS.gone, actions: [] });
      void loadOthers();
      return;
    }
    // Adopted: it leaves the list (another opening reads the list afresh).
    setOthers((o) => (o.kind === "ready" ? { kind: "ready", runs: o.runs.filter((x) => x.id !== view.id) } : o));
    await resumeRun(view);
  };

  /** Leave another officer's run: discarded before its start (nothing written), its rest cancelled after it. */
  const leaveOther = (run: ImportRunView): void => {
    if (run.status === "COMMITTING" || run.status === "PAUSED") {
      void cancelRest(run);
      return;
    }
    void discardRun(run, () => {
      go({ at: "entrance", resume: null, mode: IDLE });
      void loadOthers();
    });
  };

  /* ── closing ─────────────────────────────────────────────────────────────────────────────────── */

  const running = phase.at === "uploading" || phase.at === "importing";
  const reading = phase.at === "entrance" && phase.mode.kind === "reading";
  const inFlight = phase.at === "opening"
    || (phase.at === "entrance" && (phase.mode.kind === "xlsx" || phase.mode.kind === "opening" || othersActing !== null))
    || (phase.at === "mapping" && phase.busy)
    || phase.at === "checking" && alert === null
    || (phase.at === "review" && phase.starting)
    || (phase.at === "adopt" && phase.busy)
    || (phase.at === "paused" && phase.acting)
    || (phase.at === "unread" && phase.reading)
    || (phase.at === "finishing" && alert === null);
  // ⭐ R7 · choices the officer made for the run under review (or being checked again) hold the scrim and Escape.
  const decisionDirty = (phase.at === "review" || phase.at === "checking") && draft !== null && draft.runId === phase.view.id && draftDirty(draft);
  const closable = !running && !reading && !inFlight && !decisionDirty;

  /** ✕ (and Escape / the scrim when allowed): a running loop is ASKED first; a read is stopped; else the dialog closes. */
  const requestClose = () => {
    if (inFlight) return;
    if (running) {
      setAskStop(true);
      return;
    }
    if (reading) abortRead.current?.abort();
    onClose();
  };

  const stopNow = () => {
    stopRef.current = true;
    setPhase((p) => (p.at === "uploading" || p.at === "importing" ? { ...p, stopping: true } : p));
  };

  const openLists = () => {
    onClose();
    window.setTimeout(() => document.getElementById("contacts-lists")?.scrollIntoView({ block: "start" }), 0);
  };

  /* ── the heading ─────────────────────────────────────────────────────────────────────────────── */

  let title: string = IMPORT_TITLES.start;
  let step: number | null = null;
  if (phase.at === "entrance") step = 0;
  else if (phase.at === "adopt") title = IMPORT_TITLES.adopt;
  else if (phase.at === "mapping") {
    title = IMPORT_TITLES.mapping;
    step = 1;
  } else if (phase.at === "uploading" || phase.at === "checking" || phase.at === "review") {
    title = IMPORT_TITLES.check;
    step = 2;
  } else if (phase.at === "importing" || phase.at === "finishing") {
    title = IMPORT_TITLES.importing;
    step = 3;
  } else if (phase.at === "paused") {
    // ⛔ R6 · "paused" only for a run that IS paused; one nothing drives after a refusal or a drop is "stopped".
    title = phase.view.status === "PAUSED" ? IMPORT_TITLES.paused : IMPORT_TITLES.stopped;
    step = 3;
  } else if (phase.at === "unread") {
    title = IMPORT_TITLES.stopped;
    step = phase.loop === "upload" ? 2 : 3;
  } else if (phase.at === "done") title = phase.result.view.status === "CANCELLED" ? IMPORT_TITLES.cancelled : IMPORT_TITLES.done;

  const focusTarget = phase.at === "review" || phase.at === "checking" ? headingFocus : buttonFocus;

  return (
    <Modal
      open={open}
      onClose={requestClose}
      labelledBy={headingId}
      maxWidth={760}
      closeOnScrim={closable}
      closeOnEsc={closable}
      showClose={!inFlight}
      ariaBusy={inFlight || running}
      initialFocus={focusTarget}
      refocusKey={phase.at}
      sheet
      panelClassName="min-h-[100dvh] sm:min-h-0"
    >
      <div data-block="import-dialog" data-phase={phase.at}>
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{IMPORT_EYEBROW}</p>
        <h2 id={headingId} className="mt-0.5 pr-8 font-display text-title-sm font-bold text-text leading-tight">{title}</h2>
        {step !== null && <p className="mt-1 text-body-sm text-text-subtle" data-import-step={step + 1}>{stepLine(step)}</p>}

        <div className="mt-4 space-y-4">
          {phase.at === "opening" && (
            <p className="text-body-sm text-text-secondary" role="status" data-import-opening>{IMPORT_OPENING}</p>
          )}

          {phase.at === "fault" && (
            <div className="space-y-4" data-import-fault>
              {alert !== null && <ImportAlert alert={alert} />}
              <ActionsRow>
                <Button ref={buttonFocus} type="button" size="md" variant="ghost" onClick={onClose} data-import-act="close">
                  {IMPORT_CLOSE}
                </Button>
              </ActionsRow>
            </div>
          )}

          {phase.at === "skew" && (
            <div className="space-y-4" data-import-skew>
              <Callout tone="warning" role="alert" title={IMPORT_SKEW}>{IMPORT_SKEW_DETAIL}</Callout>
              <ActionsRow>
                <Button type="button" size="md" variant="ghost" onClick={onClose}>{IMPORT_CLOSE}</Button>
                <Button ref={buttonFocus} type="button" size="md" variant="primary" onClick={() => window.location.reload()} data-import-act="reload">
                  {IMPORT_RELOAD}
                </Button>
              </ActionsRow>
            </div>
          )}

          {phase.at === "unread" && (
            // ⛔ R4 · no bar and no figure here: the run's progress could not be read, so none is shown.
            <div className="space-y-4" data-import-unread={phase.reading ? "reading" : "unread"}>
              {phase.reading ? (
                <p className="text-body-sm text-text-secondary" role="status">{IMPORT_REREADING}</p>
              ) : (
                <>
                  {alert !== null && <ImportAlert alert={alert} />}
                  <Callout tone="warning" role="status">{IMPORT_UNREAD}</Callout>
                  <ActionsRow>
                    <Button
                      type="button"
                      size="md"
                      variant="ghost"
                      onClick={() => void settle(null, phase.runId, phase.notes, phase.loop)}
                      data-import-act="reread"
                    >
                      {IMPORT_TRY_AGAIN}
                    </Button>
                    <Button ref={buttonFocus} type="button" size="md" variant="primary" onClick={onClose} data-import-act="close">
                      {IMPORT_CLOSE}
                    </Button>
                  </ActionsRow>
                </>
              )}
            </div>
          )}

          {phase.at === "adopt" && (
            <ImportAdoptPanel
              view={phase.view}
              alert={alert}
              busy={phase.busy}
              when={when}
              onResume={() => void resumeRun(phase.view)}
              onDiscard={() => void discardRun(phase.view)}
              onCancelRest={() => void cancelRest(phase.view)}
              focusRef={buttonFocus}
            />
          )}

          {phase.at === "entrance" && (
            <ImportEntrance
              mode={phase.mode}
              resume={phase.resume}
              alert={alert}
              onFile={(file) => void onFile(file, phase.resume)}
              onPaste={(text) => void onPaste(text, phase.resume)}
              onStopReading={() => abortRead.current?.abort()}
              focusRef={buttonFocus}
              onDiscardResume={phase.resume === null ? undefined : discardWayFor(phase.resume)}
              others={phase.resume === null && phase.mode.kind === "idle" ? (
                <ImportOpenRuns
                  state={others}
                  acting={othersActing}
                  when={when}
                  onResume={(run) => void resumeOther(run)}
                  onLeave={leaveOther}
                />
              ) : null}
            />
          )}

          {phase.at === "mapping" && (
            <ImportMappingPanel
              source={phase.ready}
              alert={alert}
              busy={phase.busy}
              onNext={(choice) => void openRun(phase.ready, choice, stageRowsOf(choice.file, choice.mapping, choice.headerRows), null)}
              onBack={() => go({ at: "entrance", resume: null, mode: IDLE })}
              focusRef={buttonFocus}
            />
          )}

          {(phase.at === "uploading" || phase.at === "checking") && (
            <ImportCheckPanel
              mode={phase.at === "uploading"
                ? { kind: "uploading", view: phase.view, busy: phase.busyState, stopping: phase.stopping }
                : { kind: "checking", view: phase.view }}
              cut={cutFor(phase.view)}
              alert={alert}
              onStopUpload={stopNow}
              focusRef={headingFocus}
            />
          )}

          {phase.at === "review" && (
            <>
              <ImportCheckPanel
                mode={{ kind: "checked", view: phase.view, preflight: phase.preflight }}
                cut={cutFor(phase.view)}
                alert={null}
                onStopUpload={stopNow}
                focusRef={headingFocus}
              />
              <ImportDecisionPanel
                key={phase.view.id}
                view={phase.view}
                preflight={phase.preflight}
                alert={alert}
                starting={phase.starting}
                api={DECISION_API}
                draft={draftOf(phase.view.id)}
                onDraft={(change) => changeDraft(phase.view.id, change)}
                listsRound={listsRound}
                onApply={(input) => void start(input)}
                onDiscard={() => void discardRun(phase.view)}
              />
            </>
          )}

          {(phase.at === "importing" || phase.at === "paused") && (
            <ImportCommitPanel
              mode={phase.at === "importing"
                ? { kind: "importing", view: phase.view, busy: phase.busyState, stopping: phase.stopping }
                : { kind: "paused", view: phase.view, acting: phase.acting }}
              alert={alert}
              when={when}
              onStop={stopNow}
              onResume={() => void resumeRun(phase.view)}
              onCancelRest={() => void cancelRest(phase.view)}
              focusRef={buttonFocus}
            />
          )}

          {phase.at === "finishing" && (
            <div className="space-y-3" data-block="import-commit" data-state="finishing">
              <ProgressBar
                value={phase.view.committedThrough}
                max={phase.view.stagedThrough}
                label={COMMIT.label}
                caption={<Parts parts={COMMIT.caption(phase.view.committedThrough, phase.view.stagedThrough)} />}
                captionText={partsText(COMMIT.caption(phase.view.committedThrough, phase.view.stagedThrough))}
              />
              {alert === null
                ? <p className="text-body-sm text-text-secondary" role="status">{COMMIT.finishing}</p>
                : <ImportAlert alert={alert} />}
            </div>
          )}

          {phase.at === "done" && (
            <ImportDonePanel
              result={phase.result}
              notImported={phase.notImported}
              extraNumbers={extra.current.runId === phase.result.view.id ? extra.current.count : 0}
              extraUnit={extra.current.unit}
              cut={cutFor(phase.result.view)}
              loadFailures={(runId, afterLine, list) => ACTIONS.failures({ runId, afterLine, list })}
              onClose={onClose}
              onOpenLists={openLists}
              focusRef={buttonFocus}
            />
          )}
        </div>
      </div>

      <ConfirmModal
        open={askStop}
        onClose={() => setAskStop(false)}
        onConfirm={() => {
          setAskStop(false);
          closeAfterStop.current = true;
          stopNow();
        }}
        title={phase.at === "uploading" ? COMMIT.askUploadTitle : COMMIT.askTitle}
        body={<span data-import-confirm="stop">{phase.at === "uploading" ? COMMIT.askUploadBody : COMMIT.askBody}</span>}
        confirmLabel={phase.at === "uploading" ? COMMIT.askUploadConfirm : COMMIT.askConfirm}
        cancelLabel={phase.at === "uploading" ? COMMIT.askUploadCancel : COMMIT.askCancel}
        tone="claret"
      />
    </Modal>
  );
}

"use client";

/**
 * CONTACTS → IMPORT CONTACTS — the page head's button (`contacts-import`) and the ONE dialog it opens.
 *                                                (S15 · C3–C5, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2, S15-1…S15-9)
 *
 * ⭐ ONE DIALOG, ONE STEP AT A TIME, NEVER A DEAD END. Opening asks the server for the officer's unfinished import first
 * (`importViewAction(null)`) and opens ON it when there is one (`import-adopt`); otherwise: choose a file or paste
 * (`import-entrance`) → read in the browser, streamed (an Excel file is read by the server) → the columns
 * (`import-mapping`) → uploaded in batches, the bar counting rows STAGED → the check (`import-preflight`), numbers already
 * in the book, the list, and the start (`import-apply`) → importing, the bar counting rows DONE as the server reports
 * them (`import-commit`) → the result (`import-done`). Every refusal is said where it happened with its next step as a
 * control; a fault says "nothing was lost" and offers to try again; a deploy says "The platform was updated — reload this
 * page to resume", and the run is resumable because its progress lives on the server, never in this tab.
 * ⭐ THE TWO LOOPS ARE `import-loop.ts`'s — the one driver, pure, with the actions handed in — and their rules are its
 * header's: the server's cursor is the only progress, Stop pauses then stops, only `busy` is waited out, a thrown call
 * is followed by the VIEW (never a blind repeat).
 * ⛔ THE ACTIONS ARE CALLED HERE AND NOWHERE ELSE (`ACTIONS` below): the panels are handed functions, so this file is the
 * one acting control `test:admin-act-gate` reads — and it consults the gate: a role that may view the book but not act
 * sees "Import contacts" disabled WITH its reason, never a control that bounces (`useActDisabledReason`).
 * ⛔ A DIALOG THAT IS WORKING CANNOT BE DISMISSED BY A STRAY CLICK OR KEY: while a request is in flight its ✕ is gone;
 * while rows are uploading or importing its ✕ ASKS ("Stop the import?") and the answer pauses, then closes. A closed
 * window cannot ask — the server keeps the run COMMITTING, and the next opening adopts it.
 * ⭐ 360: the dialog is a full-height sheet, its buttons stacked with the primary on top; 1280: a form's width (≤ 960).
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
  type ImportResultView,
  type ImportRunView,
  type PreflightView,
  type StartImportInput,
} from "@/lib/contacts/import-flow";
import { isDeploySkewError, runCommit, runUpload, type BusyState } from "@/lib/contacts/import-loop";
import {
  isListPaste,
  mappingFor,
  parsePastedText,
  pasteExtraNumbers,
  readContactsFile,
  textDigest,
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
  IMPORT_EYEBROW,
  IMPORT_FAULT,
  IMPORT_GONE,
  IMPORT_OPENING,
  IMPORT_RELOAD,
  IMPORT_SKEW,
  IMPORT_SKEW_DETAIL,
  IMPORT_STALLED,
  IMPORT_START_AGAIN,
  IMPORT_TITLES,
  IMPORT_TRY_AGAIN,
  OPEN_WAYS,
  RESUME_FILE,
  partsText,
  stepLine,
} from "./import-copy";
import { ImportAdoptPanel } from "./import-adopt-panel";
import { ImportCheckPanel } from "./import-check-panel";
import { ImportCommitPanel } from "./import-commit-panel";
import { ImportDecisionPanel, type DecisionApi } from "./import-decision-panel";
import { ImportDonePanel } from "./import-done-panel";
import { ImportEntrance, type EntranceMode } from "./import-entrance";
import { ImportMappingPanel, type MappingChoice } from "./import-mapping-panel";
import { ActionsRow, ImportAlert, Parts, type AlertAction, type ImportAlertState } from "./import-parts";

/* ═══ THE ACTIONS — named once ═══════════════════════════════════════════════════════════════════ */

/** ⭐ The server's fifteen actions (`import-actions.ts`), as the dialog and its loops call them. */
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

/** A file read and ready for its columns: the parsed shape, its digest and name, and S15-4's count. */
type Ready = {
  readonly file: ParsedContactsFile;
  readonly digest: string;
  readonly name: string | null;
  readonly list: boolean;
  readonly extraNumbers: number;
  readonly extraUnit: "card" | "line";
};

type Phase =
  | { readonly at: "opening" }
  | { readonly at: "adopt"; readonly view: ImportRunView; readonly busy: boolean }
  | { readonly at: "entrance"; readonly resume: ImportRunView | null; readonly mode: EntranceMode }
  | { readonly at: "mapping"; readonly ready: Ready; readonly busy: boolean }
  | { readonly at: "uploading"; readonly view: ImportRunView; readonly busyState: BusyState | null; readonly stopping: boolean }
  | { readonly at: "checking"; readonly view: ImportRunView }
  | { readonly at: "review"; readonly view: ImportRunView; readonly preflight: PreflightView; readonly starting: boolean }
  | { readonly at: "importing"; readonly view: ImportRunView; readonly busyState: BusyState | null; readonly stopping: boolean }
  | { readonly at: "paused"; readonly view: ImportRunView; readonly acting: boolean }
  | { readonly at: "finishing"; readonly view: ImportRunView }
  | { readonly at: "done"; readonly result: ImportResultView }
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
  const [decisionDirty, setDecisionDirty] = useState(false);
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
  const extra = useRef<{ runId: string | null; count: number; unit: "card" | "line" }>({ runId: null, count: 0, unit: "line" });

  const go = useCallback((next: Phase, nextAlert: ImportAlertState | null = null) => {
    if (!alive.current) return;
    setPhase(next);
    setAlert(nextAlert);
    if (next.at !== "review") setDecisionDirty(false);
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
    tone: refusal.reason === "busy" || refusal.reason === "rate_limited" || refusal.reason === "xlsx_busy" ? "warning" : "danger",
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

  /* ── where a run goes, by its status ─────────────────────────────────────────────────────────── */

  const finish = async (view: ImportRunView): Promise<void> => {
    go({ at: "finishing", view });
    const r = await call(() => ACTIONS.result(view.id));
    if (!alive.current) return;
    if (r.kind === "thrown") return thrown(r.skew, { at: "finishing", view }, () => void finish(view));
    if (!r.answer.ok) {
      go({ at: "finishing", view }, refused(r.answer, [{ label: IMPORT_TRY_AGAIN, run: () => void finish(view), primary: true, act: "retry" }]));
      return;
    }
    go({ at: "done", result: r.answer.result });
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

  /* ── opening ─────────────────────────────────────────────────────────────────────────────────── */

  const begin = async (): Promise<void> => {
    go({ at: "opening" });
    const r = await call(() => ACTIONS.view(null));
    if (!alive.current) return;
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
      prepare({ file: out.file, digest: out.digest, name: file.name || null, list: false, extraNumbers: out.extraNumbers, extraUnit: "card" }, resume);
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
    prepare({ file: r.answer.file, digest: workbook.digest, name: file.name || null, list: false, extraNumbers: 0, extraUnit: "line" }, resume);
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
    prepare({ file, digest, name: null, list, extraNumbers: list ? pasteExtraNumbers(text) : 0, extraUnit: "line" }, resume);
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
      const rows = stageRowsOf(ready.file, resume.mapping, headerRows);
      const figures = stageFigures(rows);
      if (figures.totalRows !== resume.totalRows || figures.unreadable !== resume.unreadable) continue;
      const reading = headerRows === auto.headerRows
        ? auto
        : mappingFor(ready.file, { list: ready.list, firstRow: headerRows === 1 ? "header" : "contact" });
      void openRun(ready, { mapping: resume.mapping, headers: headersCovering(reading.headers, resume.mapping), headerRows }, rows, resume);
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
    extra.current = { runId: r.answer.view.id, count: ready.extraNumbers, unit: ready.extraUnit };
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
    const resumeWay = (v: ImportRunView): AlertAction => ({ label: COMMIT.resume, run: () => void upload(v), primary: true, act: "resume" });
    switch (out.kind) {
      case "staged":
        return check(out.view);
      case "stopped":
        return go({ at: "adopt", view: out.view, busy: false });
      case "elsewhere":
        return route(out.view);
      case "refused": {
        const v = out.refusal.view ?? start;
        return go({ at: "adopt", view: v, busy: false }, refused(out.refusal, v.status === "STAGING" ? [resumeWay(v)] : []));
      }
      case "stalled":
        return go({ at: "adopt", view: out.view, busy: false }, { tone: "warning", text: IMPORT_STALLED, actions: [resumeWay(out.view)] });
      case "gone":
        return go({ at: "fault" }, { tone: "danger", text: IMPORT_GONE, actions: [{ label: IMPORT_START_AGAIN, run: () => go({ at: "entrance", resume: null, mode: IDLE }), primary: true, act: "start-again" }] });
      case "failed": {
        if (out.skew) return go({ at: "skew" });
        const v = out.view ?? start;
        return go({ at: "adopt", view: v, busy: false }, { tone: "warning", text: IMPORT_CONNECTION, actions: [resumeWay(v)] });
      }
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
    if (a.reason === "check_again" || a.reason === "bad_exceptions") {
      // The book moved since the check (or the rows set apart no longer match): the officer sees the new numbers first.
      return check(a.view ?? view, refused(a));
    }
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
        const v = out.refusal.view;
        if (v !== null && (v.status === "CANCELLED" || v.status === "DONE")) return finish(v);
        return go({ at: "paused", view: v ?? start, acting: false }, refused(out.refusal));
      }
      case "stalled":
        return go({ at: "paused", view: out.view, acting: false }, { tone: "warning", text: IMPORT_STALLED, actions: [] });
      case "gone":
        return go({ at: "fault" }, { tone: "danger", text: IMPORT_GONE, actions: [{ label: IMPORT_START_AGAIN, run: () => go({ at: "entrance", resume: null, mode: IDLE }), primary: true, act: "start-again" }] });
      case "failed":
        if (out.skew) return go({ at: "skew" });
        return go({ at: "paused", view: out.view ?? start, acting: false }, { tone: "warning", text: IMPORT_CONNECTION, actions: [] });
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

  /** Cancel the rest: what is written stays, the rest is left unimported — the result says how many of each. */
  const cancelRest = async (view: ImportRunView): Promise<void> => {
    go(phase.at === "adopt" ? { at: "adopt", view, busy: true } : { at: "paused", view, acting: true });
    const r = await call(() => ACTIONS.cancel({ runId: view.id }));
    if (!alive.current) return;
    if (r.kind === "thrown") return thrown(r.skew, { at: "paused", view, acting: false }, () => void cancelRest(view));
    if (r.answer.ok) return finish(r.answer.view);
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

  /* ── closing ─────────────────────────────────────────────────────────────────────────────────── */

  const running = phase.at === "uploading" || phase.at === "importing";
  const reading = phase.at === "entrance" && phase.mode.kind === "reading";
  const inFlight = phase.at === "opening"
    || (phase.at === "entrance" && (phase.mode.kind === "xlsx" || phase.mode.kind === "opening"))
    || (phase.at === "mapping" && phase.busy)
    || phase.at === "checking" && alert === null
    || (phase.at === "review" && phase.starting)
    || (phase.at === "adopt" && phase.busy)
    || (phase.at === "paused" && phase.acting)
    || (phase.at === "finishing" && alert === null);
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
    title = IMPORT_TITLES.paused;
    step = 3;
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
            />
          )}

          {phase.at === "mapping" && (
            <ImportMappingPanel
              source={phase.ready}
              alert={alert}
              busy={phase.busy}
              onNext={(choice) => void openRun(phase.ready, choice, stageRowsOf(phase.ready.file, choice.mapping, choice.headerRows), null)}
              onBack={() => go({ at: "entrance", resume: null, mode: IDLE })}
              focusRef={buttonFocus}
            />
          )}

          {(phase.at === "uploading" || phase.at === "checking") && (
            <ImportCheckPanel
              mode={phase.at === "uploading"
                ? { kind: "uploading", view: phase.view, busy: phase.busyState, stopping: phase.stopping }
                : { kind: "checking", view: phase.view }}
              alert={alert}
              onStopUpload={stopNow}
              focusRef={headingFocus}
            />
          )}

          {phase.at === "review" && (
            <>
              <ImportCheckPanel mode={{ kind: "checked", view: phase.view, preflight: phase.preflight }} alert={null} onStopUpload={stopNow} focusRef={headingFocus} />
              <ImportDecisionPanel
                key={phase.view.id}
                view={phase.view}
                preflight={phase.preflight}
                alert={alert}
                starting={phase.starting}
                api={DECISION_API}
                onApply={(input) => void start(input)}
                onDiscard={() => void discardRun(phase.view)}
                onDirty={setDecisionDirty}
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
              extraNumbers={extra.current.runId === phase.result.view.id ? extra.current.count : 0}
              extraUnit={extra.current.unit}
              loadFailures={(runId, afterLine) => ACTIONS.failures({ runId, afterLine })}
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

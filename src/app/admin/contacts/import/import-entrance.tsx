"use client";

/**
 * STEP 1 · CHOOSE A FILE — the import's entrance (`import-entrance`), and the reading of the file. (S15 · C3, 2026-10-09 ·
 * docs/CONTACTS-SCREEN-PLAN.md §4.2 steps 2–3)
 *
 * ⭐ THREE WAYS IN, ONE PATH ON: a file picked, a file dropped, or text pasted — each becomes C15's one shape
 * (`import-read.ts`), and the dialog moves to the columns. What the importer reads and what it cannot (old .xls, .ods,
 * Numbers, PDF, a picture) is said BEFORE anything is chosen, with the way to save such a file; the sample sheet is one
 * tap away, beside the file control (§F21: the file control and `SampleSheetButton` live in this ONE file).
 * ⭐ READING IS A BAR ON BYTES ACTUALLY READ, with the rows read so far beside it, and a way to stop. An Excel file is
 * read by the server, said in words — no spinner for a call that takes a moment.
 * ⭐ RESUMING AN UPLOAD: when the dialog carries on an unfinished upload, the same file (or the same paste) must be read
 * again — the lead says which, and from which row the upload carries on.
 * ⛔ A refusal is the reader's own sentence, with the fix in it, and the entrance stays open below it: choosing another
 * file IS the next step (§F4).
 */
import { useRef, useState, type DragEvent, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { Field } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Textarea } from "@/components/ui/textarea";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useActDisabledReason, useMayAct } from "@/components/admin/act-gate";
import type { ImportRunView } from "@/lib/contacts/import-flow";
import { SampleSheetButton } from "../sample-sheet-button";
import { ENTRANCE, MAPPING, RESUME_FILE, partsText } from "./import-copy";
import { ImportAlert, Parts, type ImportAlertState } from "./import-parts";

/** What the entrance is doing: waiting for a file, reading one in the browser, or waiting for the server to read one. */
export type EntranceMode =
  | { readonly kind: "idle" }
  | { readonly kind: "reading"; readonly name: string; readonly read: number; readonly total: number | null; readonly rows: number }
  | { readonly kind: "xlsx"; readonly name: string }
  /** A resumed upload's file was read again and the run is being re-opened on the server. */
  | { readonly kind: "opening"; readonly name: string };

/** The extensions the picker offers — the readable ones and the ones refused WITH a reason (so they can be chosen and told). */
const PICKER_ACCEPT = ".csv,.tsv,.txt,.vcf,.vcard,.xlsx,.xlsm,.xls,.ods,.numbers,text/csv,text/vcard,text/x-vcard";

export function ImportEntrance({
  mode, resume, alert, onFile, onPaste, onStopReading, focusRef,
}: {
  mode: EntranceMode;
  /** The unfinished upload being carried on — its file must be read again — or null for a new import. */
  resume: ImportRunView | null;
  alert: ImportAlertState | null;
  onFile: (file: File) => void;
  onPaste: (text: string) => void;
  onStopReading: () => void;
  focusRef: RefObject<HTMLButtonElement | null>;
}) {
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [pasting, setPasting] = useState(resume !== null && resume.format === "paste");
  const [text, setText] = useState("");
  const busy = mode.kind !== "idle";
  const pasteReady = text.trim() !== "";

  const takeDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (busy || !mayAct) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="space-y-4" data-block="import-entrance" data-state={mode.kind}>
      {resume !== null ? (
        <Callout tone="info" role="status">
          <Parts parts={RESUME_FILE.lead(resume.format === "paste", resume.fileName, resume.nextFrom ?? resume.stagedThrough + 1)} />
        </Callout>
      ) : (
        <p className="text-body-sm text-text-secondary">{ENTRANCE.lead}</p>
      )}

      {alert !== null && <ImportAlert alert={alert} disabled={busy} />}

      {mode.kind === "reading" && (
        <div className="space-y-2" data-import-reading>
          <p className="text-body-sm text-text break-words">{mode.name}</p>
          <ProgressBar
            value={mode.read}
            max={mode.total ?? 0}
            label={ENTRANCE.readingLabel}
            caption={<Parts parts={ENTRANCE.reading(mode.rows)} />}
            captionText={partsText(ENTRANCE.reading(mode.rows))}
          />
          <div>
            <Button type="button" size="sm" variant="ghost" onClick={onStopReading} data-import-act="stop-reading">
              {ENTRANCE.readingStop}
            </Button>
          </div>
        </div>
      )}

      {(mode.kind === "xlsx" || mode.kind === "opening") && (
        <div className="space-y-1" data-import-waiting={mode.kind}>
          <p className="text-body-sm text-text break-words">{mode.name}</p>
          <p className="text-body-sm text-text-secondary" role="status" aria-live="polite">
            {mode.kind === "xlsx" ? ENTRANCE.xlsx : MAPPING.opening}
          </p>
        </div>
      )}

      {mode.kind === "idle" && !pasting && (
        <div
          data-import-drop
          onDragOver={(e) => {
            e.preventDefault();
            if (!over) setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={takeDrop}
          className={`flex flex-col items-center gap-2 rounded-md border border-dashed px-3 py-5 text-center transition-colors ${
            over ? "border-royal-700 bg-royal-500/10" : "border-border"
          }`}
        >
          <I.upload s={22} className="text-text-subtle" />
          <p className="text-body-sm text-text-secondary">{ENTRANCE.drop}</p>
          <Button
            ref={focusRef}
            type="button"
            size="md"
            variant="primary"
            disabled={!mayAct}
            title={actReason}
            onClick={() => inputRef.current?.click()}
            data-import-act="choose-file"
          >
            {ENTRANCE.choose}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={PICKER_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label={ENTRANCE.fileLabel}
            data-block="import-file"
            disabled={!mayAct}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0] ?? null;
              // Cleared at once, so choosing the SAME file again (after a refusal or a stop) is a change too.
              e.currentTarget.value = "";
              if (file !== null) onFile(file);
            }}
          />
        </div>
      )}

      {mode.kind === "idle" && pasting && (
        <div className="space-y-2" data-import-paste>
          <Field label={ENTRANCE.pasteLabel} hint={ENTRANCE.pasteHint} dataField="paste">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              spellCheck={false}
              autoComplete="off"
              readOnly={!mayAct}
              data-import-paste-box
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={!mayAct || !pasteReady}
              title={!mayAct ? actReason : pasteReady ? undefined : ENTRANCE.pasteEmpty}
              onClick={() => onPaste(text)}
              data-import-act="read-paste"
            >
              {ENTRANCE.pasteRead}
            </Button>
            {!pasteReady && <span className="text-body-sm text-text-subtle">{ENTRANCE.pasteEmpty}</span>}
          </div>
        </div>
      )}

      {mode.kind === "idle" && (
        <div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            leading={pasting ? <I.upload s={16} /> : <I.fileText s={16} />}
            onClick={() => setPasting((v) => !v)}
            aria-expanded={pasting}
            data-import-act="toggle-paste"
          >
            {pasting ? ENTRANCE.pasteClose : ENTRANCE.pasteOpen}
          </Button>
        </div>
      )}

      <div className="space-y-1 rounded-md border border-border-subtle p-3 text-body-sm text-text-secondary" data-import-formats>
        <p className="text-text">{ENTRANCE.reads}</p>
        <p>{ENTRANCE.limits}</p>
        <p>{ENTRANCE.cannot}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-text-secondary" data-import-sample>
        <span>{ENTRANCE.sampleLead}</span>
        <SampleSheetButton />
      </div>

      <UnsavedChangesGuard dirty={busy || text.trim() !== ""} body={ENTRANCE.guardBody} />
    </div>
  );
}

"use client";

/**
 * STEP 2 · THE COLUMNS (`import-mapping`) — S15 · C3, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2 step 4.
 *
 * ⭐ EVERY COLUMN, ITS FIRST VALUES AND WHAT IT WILL BE READ AS — matched automatically by U28's one field list in English
 * and Swahili (`mappingFor` over `autoMapFile`), and the officer can change any of them. One column's choices open at a
 * time, as radio cards INSIDE the dialog (⛔ never the kit Select, whose list sits outside a dialog); the choices are
 * `CONTACT_FIELDS` themselves, so this panel can never offer a field the book does not have, and never Consent (OD10).
 * ⭐ S15-5 · A FILE WITH NO HEADER ROW is said in words ("column B will be read as the phone number") and imported from
 * its first row; the officer can turn that reading over either way with one box, and the columns are read again.
 * ⛔ NO NUMBER IS SHOWN WHOLE: every value passes `previewCell` (`+255••••NN`, other long digit runs bulleted), whichever
 * column it sits in and however the columns are mapped.
 * ⛔ NEXT IS HELD, WITH ITS REASON ON SCREEN, until U28's own `validateMapping` passes (Phone chosen, one column per field,
 * no column that cannot be read) — the same check the server runs on the open; a masked export is refused outright.
 */
import { useMemo, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useActDisabledReason, useMayAct } from "@/components/admin/act-gate";
import { CONTACT_FIELDS, fileColumns, validateMapping, type ColumnMapping, type ImportFieldKey } from "@/lib/contacts/contact-fields";
import { columnLetter, columnSamples, mappingFor, type FileMapping } from "@/lib/contacts/import-read";
import type { ParsedContactsFile } from "@/lib/contacts/parsed-file";
import { ENTRANCE, MAPPING } from "./import-copy";
import { ActionsRow, ImportAlert, Parts, SectionHeading, type ImportAlertState } from "./import-parts";

/** What the officer settled on: the mapping, the header row it was made against, and how many rows are column names. */
export type MappingChoice = { readonly mapping: ColumnMapping; readonly headers: string[]; readonly headerRows: 0 | 1 };

/** The file the panel reads: its parsed shape, its name (null for a paste), and whether it is a list paste. */
export type MappingSource = { readonly file: ParsedContactsFile; readonly name: string | null; readonly list: boolean };

/** The fields read only when no Name column is (U28): the name parts, derived from the list — never spelled. */
const NAME_PARTS: ReadonlySet<ImportFieldKey> = new Set(
  CONTACT_FIELDS.filter((f) => !fileColumns(CONTACT_FIELDS).includes(f)).map((f) => f.key),
);
const labelOf = (key: ImportFieldKey): string => CONTACT_FIELDS.find((f) => f.key === key)?.label ?? key;
const fieldAt = (mapping: ColumnMapping, index: number): ImportFieldKey | null =>
  (Object.keys(mapping) as ImportFieldKey[]).find((k) => mapping[k] === index) ?? null;
const sameMapping = (a: ColumnMapping, b: ColumnMapping): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as ImportFieldKey[]);
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
};

export function ImportMappingPanel({
  source, alert, busy, onNext, onBack, focusRef,
}: {
  source: MappingSource;
  alert: ImportAlertState | null;
  /** The open request is in flight: the panel waits, and says so on Next. */
  busy: boolean;
  onNext: (choice: MappingChoice) => void;
  onBack: () => void;
  focusRef: RefObject<HTMLButtonElement | null>;
}) {
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const initial = useMemo(() => mappingFor(source.file, { list: source.list }), [source]);
  const [reading, setReading] = useState<FileMapping>(initial);
  const [mapping, setMapping] = useState<ColumnMapping>(initial.mapping);
  const [open, setOpen] = useState<number | null>(null);

  const file = source.file;
  const headerRows = reading.headerRows;
  const dataRows = Math.max(0, file.rows.length - headerRows);
  const total = dataRows + file.unreadable.length;
  const verdict = validateMapping(reading.headers, mapping);
  const canTurnFirstRow = !source.list && file.format !== "vcard" && reading.refusal === null && file.rows.length > 0;
  const changed = !sameMapping(mapping, initial.mapping) || reading.headerless !== initial.headerless;
  // ⭐ No phone column found: U28's own sentence (it names the columns found — a cover sheet read in place of the contacts
  // is recognised by them), and the panel's way on beside it.
  const noPhone = mapping.phone === undefined;
  const phoneHeld = noPhone && reading.phoneProblem !== null ? `${reading.phoneProblem} ${MAPPING.pickPhone}` : null;
  const held = reading.refusal ?? (total === 0 ? ENTRANCE.empty : phoneHeld ?? (verdict.ok ? null : verdict.sentence));
  const nextReason = !mayAct ? (actReason ?? null) : held;

  /** The officer's word on the first row: the columns are read again from it, and the mapping starts over. */
  const turnFirstRow = (asContact: boolean) => {
    const next = mappingFor(file, { list: source.list, firstRow: asContact ? "contact" : "header" });
    setReading(next);
    setMapping(next.mapping);
    setOpen(null);
  };

  /** Column `index` is read as `key` (null: not used). A field takes one column, so its previous column is let go. */
  const assign = (index: number, key: ImportFieldKey | null) => {
    const next: ColumnMapping = {};
    for (const k of Object.keys(mapping) as ImportFieldKey[]) {
      const at = mapping[k];
      if (at === undefined || at === index || k === key) continue;
      next[k] = at;
    }
    if (key !== null) next[key] = index;
    setMapping(next);
  };

  const phoneAt = mapping.phone;

  return (
    <div className="space-y-4" data-block="import-mapping" data-headerless={reading.headerless ? "yes" : "no"}>
      <p className="text-body-sm text-text-secondary">{MAPPING.lead}</p>

      <div className="space-y-1 text-body-sm text-text-secondary" data-import-summary>
        <p className="text-text break-words"><Parts parts={MAPPING.summary(total, source.name)} /></p>
        {file.blankRows > 0 && <p><Parts parts={MAPPING.blank(file.blankRows)} /></p>}
        {file.unreadable.length > 0 && <p><Parts parts={MAPPING.unreadable(file.unreadable.length)} /></p>}
      </div>

      {reading.refusal !== null && (
        <ImportAlert alert={{ tone: "danger", text: reading.refusal, actions: [{ label: MAPPING.back, run: onBack, primary: true, act: "back" }] }} />
      )}

      {reading.headerless && (
        <Callout tone="info" role="status">
          {phoneAt !== undefined ? MAPPING.headerless(columnLetter(phoneAt)) : MAPPING.headerlessNoPhone}
        </Callout>
      )}
      {file.format === "vcard" && <p className="text-body-sm text-text-secondary">{MAPPING.vcard}</p>}
      {/* ⭐ A workbook whose first visible sheet holds no phone column (a cover sheet): the reader read that sheet, and
          the officer is told which one is read and how to put the contacts first. */}
      {file.format === "xlsx" && noPhone && !reading.headerless && reading.refusal === null && (
        <Callout tone="warning" role="status">{MAPPING.sheetHint}</Callout>
      )}

      {canTurnFirstRow && (
        <Checkbox
          checked={reading.headerless}
          onChange={(on) => turnFirstRow(on)}
          label={MAPPING.firstRowContact}
        />
      )}

      {file.notes.length > 0 && (
        <div className="space-y-1" data-import-notes>
          <SectionHeading>{MAPPING.notesHeading}</SectionHeading>
          <ul className="list-disc space-y-1 pl-5 text-body-sm text-text-secondary">
            {file.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      )}

      <ScrollX label={MAPPING.tableLabel}>
        <table className="admin-tbl" data-import-columns>
          <thead>
            <tr>
              <th className="text-left">{MAPPING.colColumn}</th>
              <th className="text-left">{MAPPING.colValues}</th>
              <th className="text-left">{MAPPING.colReadAs}</th>
            </tr>
          </thead>
          <tbody>
            {reading.headers.map((header, index) => {
              const letter = columnLetter(index);
              const field = fieldAt(mapping, index);
              const auto = reading.columns[index] ?? null;
              const blocked = auto !== null && auto.status === "notImported";
              const samples = columnSamples(file, headerRows, index);
              const ignoredPart = field !== null && NAME_PARTS.has(field) && mapping.name !== undefined;
              const note = blocked
                ? auto.note
                : ignoredPart
                  ? MAPPING.nameWins
                  : field === null && auto !== null && auto.status !== "mapped"
                    ? auto.note
                    : null;
              const isOpen = open === index;
              return [
                <tr key={`c${index}`} data-import-column={letter} data-read-as={field ?? "none"}>
                  <td className="whitespace-nowrap align-top">
                    <span className="font-mono text-micro text-text-subtle">{letter}</span>
                    <span className="ml-2 text-text">
                      {reading.synthetic ? header : header.trim() === "" ? MAPPING.unnamed : header}
                    </span>
                  </td>
                  <td className="align-top">
                    {samples.length === 0
                      ? <span className="text-text-tertiary">{MAPPING.noValues}</span>
                      : <span className="break-words text-text-secondary">{samples.join(" · ")}</span>}
                  </td>
                  <td className="align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip size="sm" variant={field !== null ? "info" : "neutral"}>
                        <span className="whitespace-nowrap">{field !== null ? labelOf(field) : MAPPING.notUsed}</span>
                      </Chip>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy || !mayAct || blocked}
                        title={blocked ? (auto?.note ?? MAPPING.cannotRead) : actReason}
                        aria-expanded={isOpen}
                        aria-label={MAPPING.changeAria(letter)}
                        onClick={() => setOpen(isOpen ? null : index)}
                        data-import-act={`change-${letter}`}
                      >
                        {isOpen ? MAPPING.changeDone : MAPPING.change}
                      </Button>
                    </div>
                    {note !== null && <p className="mt-1 text-body-sm text-text-subtle">{note}</p>}
                  </td>
                </tr>,
                isOpen ? (
                  <tr key={`p${index}`} data-import-picker={letter}>
                    <td colSpan={3}>
                      <fieldset disabled={busy || !mayAct}>
                        <legend className="mb-2 text-body-sm font-semibold text-text">{MAPPING.changeLabel(letter)}</legend>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {[...CONTACT_FIELDS.map((f) => ({ key: f.key as ImportFieldKey | null, label: f.label, hint: f.hint })), { key: null, label: MAPPING.notUsed, hint: "" }].map((o) => {
                            const chosen = field === o.key;
                            return (
                              <label
                                key={o.key ?? "none"}
                                className={`flex min-h-[var(--tap-min)] cursor-pointer items-start gap-[10px] rounded-md border px-3 py-2 text-body-sm transition-colors ${
                                  chosen ? "border-royal-700 bg-royal-500/10" : "border-border hover:border-border-strong"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`import-column-${index}`}
                                  value={o.key ?? ""}
                                  checked={chosen}
                                  onChange={() => assign(index, o.key)}
                                  className="mt-[3px] shrink-0 accent-[var(--royal-500)]"
                                />
                                <span className="min-w-0">
                                  <span className="block text-text">{o.label}</span>
                                  {o.hint !== "" && <span className="block text-text-subtle">{o.hint}</span>}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </ScrollX>

      {alert !== null && <ImportAlert alert={alert} disabled={busy} />}

      {nextReason !== null && (
        <p className="text-body-sm text-text-secondary" data-import-held>{nextReason}</p>
      )}
      <ActionsRow>
        <Button type="button" size="md" variant="ghost" disabled={busy} onClick={onBack} data-import-act="back">
          {MAPPING.back}
        </Button>
        <Button
          ref={focusRef}
          type="button"
          size="md"
          variant="primary"
          loading={busy}
          disabled={!mayAct || held !== null}
          title={nextReason ?? undefined}
          onClick={() => onNext({ mapping, headers: [...reading.headers], headerRows })}
          data-block="import-mapping-next"
        >
          {total > 0 ? <Parts parts={MAPPING.next(total)} /> : MAPPING.nextPlain}
        </Button>
      </ActionsRow>

      <UnsavedChangesGuard dirty={changed || busy} body={MAPPING.guardBody} />
    </div>
  );
}

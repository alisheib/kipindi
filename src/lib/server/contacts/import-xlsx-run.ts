/**
 * ONE SPREADSHEET AT A TIME, AND ONE AUDIT ROW FOR EVERY ASK — the officer's door to U27b's reader (2026-10-02).
 *
 * ⭐ WHY A SECOND MODULE. The reader (`import-xlsx.ts`) is a function of the bytes, and `test:contacts-boundary` §5.1
 * holds it to that: it may reach no store, Prisma, audit or session module. The two things an officer's read needs
 * beyond the bytes live here instead — the slot, and the audit row.
 *
 * ⛔ ONE READ IN FLIGHT. exceljs's in-memory load holds the whole workbook in the heap of the ONE instance that also
 * takes bets, and parses it in long synchronous stretches; the 700 KiB cap, the real capped inflate and the row and
 * cell caps bound one read, and this slot bounds how many run at once. It is pinned on `globalThis` (a hot reload that
 * re-imports this module still shares one flag) and is taken SYNCHRONOUSLY, before the first `await`, so of two
 * concurrent calls exactly one reads and the other is refused `busy` without its file being decoded at all. It is
 * released in a `finally`: after a read, after a refusal, and after a reader that throws.
 *
 * ⛔ ONE AUDIT ROW PER ASK, COUNTS ONLY. Every call — read, refused or busy — writes exactly one `ADMIN` row,
 * `contacts.import.xlsx_read` or `contacts.import.xlsx_refused`, on target `ContactImport`/`xlsx`, whose payload is
 * `XlsxReadStats` plus the refusal's fixed words. ⛔ Never the file name, never a sheet name, never a cell (§5.14): the
 * file is personal data, and `/admin/audit` prints a payload.
 *
 * ⚠️ NO ACTION HERE. U30's `import-actions.ts` (C24) is `softRequireStaff` + `readXlsxForOfficer`, and ships with the
 * dialog that calls it: an action with no caller reds `test:orphan-actions`.
 */
import { audit } from "@/lib/server/audit";
import { readXlsxContacts, xlsxRefusalResult } from "./import-xlsx";
import type { XlsxReadInput, XlsxReadResult } from "./import-xlsx";
import type { WrongFormatKind, XlsxRefusal } from "@/lib/contacts/xlsx-limits";

export const XLSX_READ_ACTION = "contacts.import.xlsx_read";
export const XLSX_REFUSED_ACTION = "contacts.import.xlsx_refused";
export const XLSX_AUDIT_TARGET_TYPE = "ContactImport";
export const XLSX_AUDIT_TARGET_ID = "xlsx";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_CONTACTS_XLSX_SLOT: { busy: boolean } | undefined;
}

export type XlsxSlot = { readonly take: () => boolean; readonly release: () => void };

const slotState = (): { busy: boolean } =>
  globalThis.__50PICK_CONTACTS_XLSX_SLOT ?? (globalThis.__50PICK_CONTACTS_XLSX_SLOT = { busy: false });

/** ⭐ THE slot: `take` is true for exactly one caller until `release`. */
export const XLSX_SLOT: XlsxSlot = {
  take: () => {
    const state = slotState();
    if (state.busy) return false;
    state.busy = true;
    return true;
  },
  release: () => {
    slotState().busy = false;
  },
};

/** ⛔ The audit payload: counts, and the refusal's fixed words — nothing the file said. */
export type XlsxAuditPayload = {
  readonly bytes: number;
  readonly inflatedBytes: number;
  readonly entries: number;
  readonly rows: number;
  readonly blankRows: number;
  readonly width: number;
  readonly sheets: number;
  readonly ms: number;
  readonly refusal: XlsxRefusal | null;
  readonly kind: WrongFormatKind | null;
  readonly detail: string | null;
};

export function xlsxAuditPayload(result: XlsxReadResult): XlsxAuditPayload {
  const s = result.stats;
  return {
    bytes: s.bytes,
    inflatedBytes: s.inflatedBytes,
    entries: s.entries,
    rows: s.rows,
    blankRows: s.blankRows,
    width: s.width,
    sheets: s.sheets,
    ms: s.ms,
    refusal: result.ok ? null : result.refusal,
    kind: result.ok ? null : result.kind,
    detail: result.ok ? null : result.detail,
  };
}

export type XlsxAuditEntry = {
  readonly category: "ADMIN";
  readonly action: string;
  readonly actorId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly payload: XlsxAuditPayload;
};

export type OfficerXlsxDeps = {
  readonly read: (input: XlsxReadInput) => Promise<XlsxReadResult>;
  readonly slot: XlsxSlot;
  readonly record: (entry: XlsxAuditEntry) => Promise<unknown>;
};

/** An officer's reader over `deps` — the shipped one is `readXlsxForOfficer`; the suite plants defects through it. */
export function createOfficerXlsxReader(deps: OfficerXlsxDeps): (actorId: string, input: XlsxReadInput) => Promise<XlsxReadResult> {
  return async (actorId, input) => {
    let result: XlsxReadResult;
    if (!deps.slot.take()) {
      result = xlsxRefusalResult("busy", {}, "busy");
    } else {
      try {
        result = await deps.read(input);
      } catch {
        result = xlsxRefusalResult("unreadable", {}, "reader_threw");
      } finally {
        deps.slot.release();
      }
    }
    await deps.record({
      category: "ADMIN",
      action: result.ok ? XLSX_READ_ACTION : XLSX_REFUSED_ACTION,
      actorId,
      targetType: XLSX_AUDIT_TARGET_TYPE,
      targetId: XLSX_AUDIT_TARGET_ID,
      payload: xlsxAuditPayload(result),
    });
    return result;
  };
}

/** The shipped wiring: the reader on its shipped rules, the global slot, the audit trail. */
export const OFFICER_XLSX_DEPS: OfficerXlsxDeps = {
  read: readXlsxContacts,
  slot: XLSX_SLOT,
  record: (entry) => audit({ ...entry, payload: { ...entry.payload } }),
};

/** ⭐ THE door U30's action calls, after `softRequireStaff("growth", …)`. */
export const readXlsxForOfficer: (actorId: string, input: XlsxReadInput) => Promise<XlsxReadResult> =
  createOfficerXlsxReader(OFFICER_XLSX_DEPS);

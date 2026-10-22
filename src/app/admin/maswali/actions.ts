"use server";

/**
 * /admin/maswali — the TRADING officer's acts on a Millionea week (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 items 1 and 3),
 * and the Owner's two beside them (S7-F2): the rules of the next week and the public-holiday list.
 *
 * Every act names its control and takes its domain from `CONTROL_DOMAIN` (E-27), so the page can ask the question the
 * action will ask and render a locked control instead of one that bounces. `requireStaff` checks the stored role, writes
 * a SECURITY row for a blocked attempt, then the 2FA step-up.
 * ⛔ The services decide; these only parse the form, call one service and report its words. A refusal is the service's
 *    own sentence, never a generic failure.
 */
import { revalidatePath, revalidateTag } from "next/cache";
import { safeError } from "@/lib/server/safe-error";
import { requireStaff } from "@/lib/server/rbac-guard";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import {
  attestParity, confirmSeal, correctSeal, createWeek, discardDraftWeek, editDraftQuestions, moveClose, openWeek, sealQuestion,
  type DraftQuestionInput,
} from "@/lib/server/maswali-service";
import { guaranteeReader } from "@/lib/server/maswali-money-service";
import { noteSealDevice } from "@/lib/server/maswali-integrity";
import { saveMaswaliConfig } from "@/lib/server/maswali-config";
import { saveMaswaliHolidays } from "@/lib/server/maswali-holidays";
import { applySealBatch, CONFIRM_AUDIT_WARNING, parseSealRows, SEAL_AUDIT_WARNING, type SealBatchResult } from "@/lib/maswali-seal-batch";
import { clientMeta } from "@/lib/server/auth-service";
import { eatWeekStartMs } from "@/lib/eat-day";
import { MASWALI_PUBLIC_WEEK_QUESTIONS_TAG } from "@/lib/server/maswali-player";
import type { MaswaliOutcome } from "@/lib/maswali-score";
import { parseHolidayList, parseRulesForm } from "./rules-form";

type ActionResult = { ok: true; weekId?: string; recorded?: boolean; auditWarning?: string | null } | { ok: false; error: string; field?: string };

const refresh = (weekId?: string) => {
  // A newly opened set or a seal must be visible on the next read, including across different readers' requests.
  revalidateTag(MASWALI_PUBLIC_WEEK_QUESTIONS_TAG, { expire: 0 });
  revalidatePath("/admin/maswali");
  if (weekId) revalidatePath(`/admin/maswali/${weekId}`);
  // MASWALI-BUILD S5 · an open, a moved close or a seal changes what the hub, a ticket and the register state (MB-97).
  revalidatePath("/millionea", "layout");
};
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
/** A landed attestation whose audit row was not written (the attestation itself stands on the week). */
const ATTEST_AUDIT_WARNING = "The attestation landed, but its audit record could not be written. Tell an administrator; do not attest it again.";
/** S5-FIX-SRV · a landed open, or a landed move of the close, whose audit rows were not all written (the act stands). */
const OPEN_AUDIT_WARNING = "The open landed, but its audit record could not be fully written. Tell an administrator; do not repeat the open.";
const MOVE_AUDIT_WARNING = "The move landed, but its audit record could not be fully written. Tell an administrator; do not repeat the move.";
/** MB-94 · where a seal came from, noted after it landed (never blocking it). */
const noteDevice = async (officerId: string, weekId: string, slots: number[]): Promise<boolean> => {
  try {
    const meta = await clientMeta();
    return await noteSealDevice({ officerId, weekId, slots, ip: meta.ip, userAgent: meta.ua });
  } catch { return false; }
};

/** The builder posts its fifteen rows as one JSON field; anything that is not that shape is refused, never coerced. */
function parseQuestions(raw: string): DraftQuestionInput[] | string {
  let rows: unknown;
  try { rows = JSON.parse(raw); } catch { return "The week's questions could not be read. Reload the builder and try again."; }
  if (!Array.isArray(rows)) return "The week's questions could not be read.";
  return rows as DraftQuestionInput[];
}

export async function createMaswaliWeekAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.createMaswaliWeek, "createMaswaliWeek");
  try {
    const day = str(formData, "weekStart"); // YYYY-MM-DD, the Monday, read in EAT
    const ms = Date.parse(`${day}T00:00:00+03:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(ms) || eatWeekStartMs(ms) !== ms) {
      return { ok: false, error: "Pick the Monday the week starts on." };
    }
    const questions = parseQuestions(str(formData, "questions"));
    if (typeof questions === "string") return { ok: false, error: questions };
    const visibility = str(formData, "visibility") === "DRIVE" ? "DRIVE" : "PUBLIC";
    const r = await createWeek({ weekStartMs: ms, visibility, questions, officerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    try { refresh(r.week.id); } catch { /* The draft is already stored; the client refreshes too. */ }
    return { ok: true, weekId: r.week.id, recorded: r.recorded };
  } catch (err) {
    return { ok: false, error: safeError(err, "The week could not be drafted") };
  }
}

/** S6-ADMIN · G5 · a landed discard whose audit row was not written (the draft is gone), in the console's one wording. */
const DISCARD_AUDIT_WARNING = "The discard landed, but its audit record could not be fully written. Tell an administrator; do not repeat the discard.";

/**
 * ⭐ S6-ADMIN · G5 · discard a draft that never opened — behind the draft's own control (`createMaswaliWeek`): whoever may
 * draft a week may take back a draft. The service refuses a week that opened, and the announced final week.
 */
export async function discardMaswaliDraftAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.createMaswaliWeek, "discardMaswaliDraft");
  const weekId = str(formData, "weekId");
  try {
    const r = await discardDraftWeek({ weekId, officerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    try { refresh(); } catch { /* The draft is already gone; the client navigates away. */ }
    return { ok: true, recorded: r.recorded, auditWarning: r.recorded ? null : DISCARD_AUDIT_WARNING };
  } catch (err) {
    return { ok: false, error: safeError(err, "The draft could not be discarded") };
  }
}

/** One builder submission, one service decision and one transaction for all changed slots. */
export async function editMaswaliQuestionsAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.editMaswaliQuestion, "editMaswaliQuestions");
  const weekId = str(formData, "weekId");
  try {
    let edits: unknown;
    try { edits = JSON.parse(str(formData, "edits")); } catch { return { ok: false, error: "The changes could not be read." }; }
    if (!Array.isArray(edits) || edits.length < 1 || edits.length > 15 || edits.some((edit) => !edit || typeof edit !== "object" || Array.isArray(edit)
      || !Number.isInteger(edit.slot) || !edit.changes || typeof edit.changes !== "object" || Array.isArray(edit.changes))) {
      return { ok: false, error: "Choose one to fifteen changed questions to save." };
    }
    const r = await editDraftQuestions({ weekId, edits, officerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    try { refresh(weekId); } catch { /* The questions are already saved; the client refreshes too. */ }
    return { ok: true, weekId, recorded: r.recorded };
  } catch (err) {
    return { ok: false, error: safeError(err, "The questions could not be saved") };
  }
}

export async function attestMaswaliParityAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.attestMaswaliParity, "attestMaswaliParity");
  const weekId = str(formData, "weekId");
  try {
    // A4 · the draft's version the reader's page was drawn from: an edit landed since refuses the attestation.
    const r = await attestParity({ weekId, officerId: session.userId, readVersion: str(formData, "readVersion") });
    if (!r.ok) return { ok: false, error: r.error };
    try { refresh(weekId); } catch { /* The attestation already landed; the client refreshes too. */ }
    return { ok: true, weekId, auditWarning: r.recorded ? null : ATTEST_AUDIT_WARNING };
  } catch (err) {
    return { ok: false, error: safeError(err, "The attestation could not be recorded") };
  }
}

export async function openMaswaliWeekAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.openMaswaliWeek, "openMaswaliWeek");
  const weekId = str(formData, "weekId");
  try {
    const r = await openWeek({ weekId, officerId: session.userId, guarantee: guaranteeReader });
    if (!r.ok) return { ok: false, error: r.error };
    try { refresh(weekId); } catch { /* The week is already open; the client refreshes too. */ }
    return { ok: true, weekId, auditWarning: r.recorded ? null : OPEN_AUDIT_WARNING };
  } catch (err) {
    return { ok: false, error: safeError(err, "The week could not be opened") };
  }
}

export async function moveMaswaliCloseAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.moveMaswaliClose, "moveMaswaliClose");
  const weekId = str(formData, "weekId");
  try {
    const at = str(formData, "closeAt"); // YYYY-MM-DDTHH:MM in EAT
    const ms = Date.parse(`${at}:00+03:00`);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at) || !Number.isFinite(ms)) return { ok: false, error: "Give the new close as a date and a time (EAT)." };
    // A3 · the close the officer reviewed; the service refuses when another move landed since the page was drawn.
    const r = await moveClose({ weekId, toCloseAt: new Date(ms).toISOString(), expectedClosesAt: str(formData, "expectedClosesAt"), officerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    try { refresh(weekId); } catch { /* The close already moved; the client refreshes too. */ }
    return { ok: true, weekId, auditWarning: r.recorded ? null : MOVE_AUDIT_WARNING };
  } catch (err) {
    return { ok: false, error: safeError(err, "The close could not be moved") };
  }
}

/**
 * Seal one or more questions by ONE officer (MR-14: no AI seals; the AI's suggestion only sits beside the row). A VOID is
 * its own control (`voidMaswaliQuestion`): the same service, but a seal that sends money back is never mixed into a
 * bulk YES/NO by accident.
 */
export async function sealMaswaliQuestionsAction(formData: FormData): Promise<SealBatchResult> {
  const session = await requireStaff(CONTROL_DOMAIN.sealMaswaliQuestion, "sealMaswaliQuestion");
  const weekId = str(formData, "weekId");
  const rows = parseSealRows(str(formData, "seals"));
  if (typeof rows === "string") return { ok: false, error: rows, sealed: [], auditWarning: null };
  if (rows.some((r) => r.outcome !== "YES" && r.outcome !== "NO")) return { ok: false, error: "A void is sealed on its own, with its ground.", sealed: [], auditWarning: null };
  const result = await applySealBatch(rows,
    (row) => sealQuestion({ weekId, slot: row.slot, outcome: row.outcome, evidence: row.evidence, officerId: session.userId }),
    (sealed) => noteDevice(session.userId, weekId, sealed),
    (error) => safeError(error, "The seal could not be recorded"));
  try { refresh(weekId); } catch { /* The returned landed slots remain authoritative; the client also refreshes. */ }
  return result;
}

export async function voidMaswaliQuestionAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.voidMaswaliQuestion, "voidMaswaliQuestion");
  const weekId = str(formData, "weekId");
  try {
    const slot = Number(str(formData, "slot"));
    const r = await sealQuestion({
      weekId, slot, outcome: "VOID", voidReason: str(formData, "voidReason"),
      evidence: str(formData, "evidence"), officerId: session.userId,
    });
    if (!r.ok) return { ok: false, error: r.error };
    const audited = await noteDevice(session.userId, weekId, [slot]);
    try { refresh(weekId); } catch { /* The seal already landed; the client refreshes too. */ }
    return { ok: true, weekId, auditWarning: audited && r.recorded ? null : SEAL_AUDIT_WARNING };
  } catch (err) {
    return { ok: false, error: safeError(err, "The void could not be recorded") };
  }
}

export async function confirmMaswaliSealAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.confirmMaswaliSeal, "confirmMaswaliSeal");
  const weekId = str(formData, "weekId");
  try {
    const expectedOutcome = str(formData, "expectedOutcome");
    const expectedSealedAt = str(formData, "expectedSealedAt");
    if ((expectedOutcome !== "YES" && expectedOutcome !== "NO" && expectedOutcome !== "VOID") || !expectedSealedAt) {
      return { ok: false, error: "Reload the week and review the sealed result before confirming it." };
    }
    const r = await confirmSeal({ weekId, slot: Number(str(formData, "slot")), officerId: session.userId, expectedOutcome, expectedSealedAt });
    if (!r.ok) return { ok: false, error: r.error };
    try { refresh(weekId); } catch { /* The confirmation already landed; the client refreshes too. */ }
    return { ok: true, weekId, auditWarning: r.recorded ? null : CONFIRM_AUDIT_WARNING };
  } catch (err) {
    return { ok: false, error: safeError(err, "The confirmation could not be recorded") };
  }
}

/**
 * ⭐ S7-F2 · THE RULES OF THE NEXT WEEK (`maswali.config`): every field, read back by the form's own list, validated by
 * the config's own validator and saved through its own verified setter, which audits `{ before, after, changes }`. A
 * running week is untouched — it reads the rules it froze at its open (MB-75). The Owner's (`ops`, CONTROL_DOMAIN).
 */
export async function saveMaswaliConfigAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.saveMaswaliConfig, "saveMaswaliConfig");
  try {
    const parsed = parseRulesForm((k) => { const v = formData.get(k); return typeof v === "string" ? v : null; });
    if (!parsed.ok) return { ok: false, error: parsed.error, field: parsed.field };
    const r = await saveMaswaliConfig(parsed.updates, session.userId);
    if (!r.ok) return { ok: false, error: r.error };
    // S5-FIX-SRV A7 (the S7 × S5 merge) · the rules are saved: a failed refresh never reports the save as failed.
    try { refresh(); } catch { /* The rules already saved; the client refreshes too. */ }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "The Millionea rules could not be saved") };
  }
}

/** ⭐ S7-F2 · the Owner's list of public holidays (MB-85, OD-27), validated by its own store and read back before "saved". */
export async function saveMaswaliHolidaysAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.saveMaswaliHolidays, "saveMaswaliHolidays");
  try {
    const dates = parseHolidayList(str(formData, "dates"));
    if (!dates) return { ok: false, error: "The holiday list could not be read. Reload the page and try again." };
    const r = await saveMaswaliHolidays(dates, session.userId);
    if (!r.ok) return { ok: false, error: r.error };
    // S5-FIX-SRV A7 (the S7 × S5 merge) · the list is saved: a failed refresh never reports the save as failed.
    try { refresh(); } catch { /* The list already saved; the client refreshes too. */ }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "The holiday list could not be saved") };
  }
}

export async function correctMaswaliSealAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.correctMaswaliSeal, "correctMaswaliSeal");
  const weekId = str(formData, "weekId");
  try {
    const outcome = str(formData, "outcome") as MaswaliOutcome;
    const slot = Number(str(formData, "slot"));
    const r = await correctSeal({
      weekId, slot, outcome, evidence: str(formData, "evidence"),
      voidReason: outcome === "VOID" ? str(formData, "voidReason") : null,
      expectedOutcome: str(formData, "expectedOutcome") as MaswaliOutcome,
      expectedSealedAt: str(formData, "expectedSealedAt"), officerId: session.userId,
    });
    if (!r.ok) return { ok: false, error: r.error };
    const audited = await noteDevice(session.userId, weekId, [slot]);
    try { refresh(weekId); } catch { /* The correction already landed; the client refreshes too. */ }
    return { ok: true, weekId, auditWarning: audited && r.recorded ? null : SEAL_AUDIT_WARNING };
  } catch (err) {
    return { ok: false, error: safeError(err, "The correction could not be recorded") };
  }
}

"use server";

/**
 * /admin/maswali — the TRADING officer's acts on a Millionea week (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 items 1 and 3).
 *
 * Every act names its control and takes its domain from `CONTROL_DOMAIN` (E-27), so the page can ask the question the
 * action will ask and render a locked control instead of one that bounces. `requireStaff` checks the stored role, writes
 * a SECURITY row for a blocked attempt, then the 2FA step-up.
 * ⛔ The services decide; these only parse the form, call one service and report its words. A refusal is the service's
 *    own sentence, never a generic failure.
 */
import { revalidatePath } from "next/cache";
import { safeError } from "@/lib/server/safe-error";
import { requireStaff } from "@/lib/server/rbac-guard";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import {
  attestParity, confirmSeal, correctSeal, createWeek, editDraftQuestion, moveClose, openWeek, sealQuestion,
  type DraftQuestionInput,
} from "@/lib/server/maswali-service";
import { guaranteeReader } from "@/lib/server/maswali-money-service";
import { noteSealDevice } from "@/lib/server/maswali-integrity";
import { clientMeta } from "@/lib/server/auth-service";
import { eatWeekStartMs } from "@/lib/eat-day";
import type { MaswaliOutcome } from "@/lib/maswali-score";

type ActionResult = { ok: true; weekId?: string } | { ok: false; error: string };

const refresh = (weekId?: string) => {
  revalidatePath("/admin/maswali");
  if (weekId) revalidatePath(`/admin/maswali/${weekId}`);
  // MASWALI-BUILD S5 · an open, a moved close or a seal changes what the hub, a ticket and the register state (MB-97).
  revalidatePath("/millionea", "layout");
};
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
/** MB-94 · where a seal came from, noted after it landed (never blocking it). */
const noteDevice = async (officerId: string, weekId: string, slots: number[]) => {
  const meta = await clientMeta();
  await noteSealDevice({ officerId, weekId, slots, ip: meta.ip, userAgent: meta.ua });
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
    refresh(r.week.id);
    return { ok: true, weekId: r.week.id };
  } catch (err) {
    return { ok: false, error: safeError(err, "The week could not be drafted") };
  }
}

export async function editMaswaliQuestionAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.editMaswaliQuestion, "editMaswaliQuestion");
  const weekId = str(formData, "weekId");
  try {
    const slot = Number(str(formData, "slot"));
    let changes: Partial<DraftQuestionInput>;
    try { changes = JSON.parse(str(formData, "changes")) as Partial<DraftQuestionInput>; } catch { return { ok: false, error: "The change could not be read." }; }
    const r = await editDraftQuestion({ weekId, slot, changes, officerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    refresh(weekId);
    return { ok: true, weekId };
  } catch (err) {
    return { ok: false, error: safeError(err, "The question could not be saved") };
  }
}

export async function attestMaswaliParityAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.attestMaswaliParity, "attestMaswaliParity");
  const weekId = str(formData, "weekId");
  try {
    const r = await attestParity({ weekId, officerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    refresh(weekId);
    return { ok: true, weekId };
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
    refresh(weekId);
    return { ok: true, weekId };
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
    const r = await moveClose({ weekId, toCloseAt: new Date(ms).toISOString(), officerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    refresh(weekId);
    return { ok: true, weekId };
  } catch (err) {
    return { ok: false, error: safeError(err, "The close could not be moved") };
  }
}

/** One row of a seal: a YES/NO with its evidence, or a VOID with its ground (MR-15). */
type SealRow = { slot: number; outcome: MaswaliOutcome; evidence: string; voidReason?: string | null };

function parseSeals(raw: string): SealRow[] | string {
  let rows: unknown;
  try { rows = JSON.parse(raw); } catch { return "The seals could not be read."; }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 15) return "Seal between one and fifteen questions at once.";
  return rows as SealRow[];
}

/**
 * Seal one or more questions by ONE officer (MR-14: no AI seals; the AI's suggestion only sits beside the row). A VOID is
 * its own control (`voidMaswaliQuestion`): the same service, but a seal that sends money back is never mixed into a
 * bulk YES/NO by accident.
 */
export async function sealMaswaliQuestionsAction(formData: FormData): Promise<{ ok: true; sealed: number[] } | { ok: false; error: string; sealed: number[] }> {
  const session = await requireStaff(CONTROL_DOMAIN.sealMaswaliQuestion, "sealMaswaliQuestion");
  const weekId = str(formData, "weekId");
  const rows = parseSeals(str(formData, "seals"));
  if (typeof rows === "string") return { ok: false, error: rows, sealed: [] };
  if (rows.some((r) => r.outcome !== "YES" && r.outcome !== "NO")) return { ok: false, error: "A void is sealed on its own, with its ground.", sealed: [] };
  const sealed: number[] = [];
  try {
    for (const row of rows) {
      const r = await sealQuestion({ weekId, slot: Number(row.slot), outcome: row.outcome, evidence: String(row.evidence ?? ""), officerId: session.userId });
      if (!r.ok) { refresh(weekId); return { ok: false, error: `Slot ${row.slot}: ${r.error}`, sealed }; }
      sealed.push(Number(row.slot));
    }
    await noteDevice(session.userId, weekId, sealed);
    refresh(weekId);
    return { ok: true, sealed };
  } catch (err) {
    refresh(weekId);
    return { ok: false, error: safeError(err, "The seal could not be recorded"), sealed };
  }
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
    await noteDevice(session.userId, weekId, [slot]);
    refresh(weekId);
    return { ok: true, weekId };
  } catch (err) {
    return { ok: false, error: safeError(err, "The void could not be recorded") };
  }
}

export async function confirmMaswaliSealAction(formData: FormData): Promise<ActionResult> {
  const session = await requireStaff(CONTROL_DOMAIN.confirmMaswaliSeal, "confirmMaswaliSeal");
  const weekId = str(formData, "weekId");
  try {
    const r = await confirmSeal({ weekId, slot: Number(str(formData, "slot")), officerId: session.userId });
    if (!r.ok) return { ok: false, error: r.error };
    refresh(weekId);
    return { ok: true, weekId };
  } catch (err) {
    return { ok: false, error: safeError(err, "The confirmation could not be recorded") };
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
      voidReason: outcome === "VOID" ? str(formData, "voidReason") : null, officerId: session.userId,
    });
    if (!r.ok) return { ok: false, error: r.error };
    await noteDevice(session.userId, weekId, [slot]);
    refresh(weekId);
    return { ok: true, weekId };
  } catch (err) {
    return { ok: false, error: safeError(err, "The correction could not be recorded") };
  }
}

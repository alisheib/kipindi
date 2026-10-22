/**
 * ⭐ THE MILLIONEA OBJECTION DOOR (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23, OD-05; FAILURE-INVENTORY §9 OB.0).
 *
 * A Yes/No market's objection disputes the market's one verdict (`objections-service.ts`). A Millionea week has fifteen
 * results, so its objections are per QUESTION — through the same service's reasons, bounds, role gate and rows, and the
 * same settlement freeze — on the rules MR-16 sets:
 *   · STANDING — any holder of a live (non-cancelled) ticket in the week may object to one question
 *     (`Objection.questionOrdinal`, the canonical slot 1..15), once per (week, question, player), open or decided: the
 *     partial unique index `Objection_maswali_question_player_key`, which the memory store holds too.
 *   · THE WINDOW — the week's own, frozen in its rules: 24 hours from the moment the graded set became final, never
 *     closing before 12:00 EAT (`objectionWindowEnd` → `week.objectionsCloseAt`), never the platform's live setting.
 *   · THE RULING — REJECT, or uphold with REVERSE (the other side won), VOID (on a ground from the closed list, MR-15) or
 *     REINSTATE (a voided question comes back with its result), by an officer other than the one who sealed the question
 *     or confirmed its seal, and other than the one whose upheld ruling set its present result; ADMIN — the Owner — is the fallback (the platform's ruling gate: ADMIN or COMPLIANCE). An
 *     upheld change that changes the graded set re-runs MR-17 and restarts the window ONCE (`week.objectionRestarted`).
 *   · THE MONEY — an OPEN objection freezes the week: its settlement and its week void both refuse (`countOpenObjections`,
 *     OB.1–OB.5). A filing takes the chain lock every settlement section and every seal takes, so a filing and a release
 *     serialize: the release that runs first leaves a SETTLED week the filing refuses; the filing that runs first leaves
 *     an OPEN objection the release refuses. A SETTLED or VOIDED week is final.
 * Every act is ONE transaction under `maswali:chain` (DATA-LAYER rules 1, 2): the filing's row; the ruling's conditional
 * decision (its first write — a lost race writes nothing), the question's new result, the restarted window and the
 * recompute, all or none. Their audit rows are owed and written once the lock has committed (`recordOwed`).
 * Its rows are never a market ruling: `listUpheldRulings` reads only rows without a question (both stores), so a filing or
 * a ruling here moves no rulings memo (`reversals.ts`) and calls no `noteObjectionWrite`.
 * ⏳ Notices (the officer's "a week is frozen", the player's "your objection was decided") are S6-N's registry's; the
 *    platform's own two notices name a market and link to the Yes/No queue, so this door sends neither yet.
 */
import { audit } from "./audit";
import { randomId } from "./crypto";
import { afterCommit, withLock } from "./locks";
import { db, type ObjectionReason, type StoredObjection } from "./store";
import { DETAIL_MAX, DETAIL_MIN, OBJECTION_REASONS, requireRulingOfficer } from "./objections-service";
import { MASWALI_CHAIN_LOCK, frozenRules, gradable, recomputeGateLocked, recordOwed, type OwedAudit } from "./maswali-service";
import { questionStore, ticketStore, weekStore, type StoredQuestion, type StoredWeek } from "./maswali-dal";
import { invalidateMillioneaRegisterWeek } from "./maswali-register-cache";
import { gradedSet, slotLabel, slotOf, SLOT_COUNT, type GradableQuestion, type MaswaliOutcome } from "@/lib/maswali-score";
import { isMaswaliVoidReason, voidGroundAvailable, type MaswaliVoidReason } from "@/lib/maswali-void-reason";
import { displayLabel } from "@/lib/display-label";

type Refused = { ok: false; error: string };
const refuse = (error: string): Refused => ({ ok: false, error });

/** The remedies an upheld Millionea objection may take (MR-16). */
export const MILLIONEA_OBJECTION_REMEDIES = ["REVERSE", "VOID", "REINSTATE"] as const;
export type MillioneaRemedy = (typeof MILLIONEA_OBJECTION_REMEDIES)[number];
/** What an officer may rule on one: reject it, or uphold it with a remedy. */
export type MillioneaRuling = "REJECT" | MillioneaRemedy;
/** A void ruled on an objection names its ground; this one when the officer names none (the closed list's own words). */
export const OBJECTION_VOID_GROUND: MaswaliVoidReason = "criterion_objection";

// ── THE WINDOW ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Where a week's check window stands (MR-16): NOT_YET until the graded set is final (or while a restarted one waits for
 * its next seal), OPEN until `objectionsCloseAt`, then CLOSED; a SETTLED or VOIDED week is FINAL.
 */
export type MillioneaObjectionWindow =
  | { state: "NOT_YET" }
  | { state: "OPEN"; closesAt: string }
  | { state: "CLOSED"; closesAt: string }
  | { state: "FINAL" };

export function millioneaObjectionWindow(
  week: Pick<StoredWeek, "state" | "gradedSetFinalAt" | "objectionsCloseAt">,
  nowMs: number,
): MillioneaObjectionWindow {
  if (week.state === "SETTLED" || week.state === "VOIDED") return { state: "FINAL" };
  if (week.state !== "RESOLVING" || !week.gradedSetFinalAt || !week.objectionsCloseAt) return { state: "NOT_YET" };
  return nowMs < Date.parse(week.objectionsCloseAt)
    ? { state: "OPEN", closesAt: week.objectionsCloseAt }
    : { state: "CLOSED", closesAt: week.objectionsCloseAt };
}

// ── STANDING ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Why a player cannot object to a question now — a code the player door words in the reader's language. */
export type MillioneaObjectionRefusal =
  | "NO_WEEK" | "NO_QUESTION" | "WINDOW_NOT_OPEN" | "WINDOW_CLOSED" | "WEEK_FINAL" | "NOT_SEALED" | "NO_TICKET"
  | "ALREADY_OBJECTED" | "ALREADY_DECIDED";
export type MillioneaObjectionEligibility = { eligible: true; closesAt: string } | { eligible: false; why: MillioneaObjectionRefusal };

/** The result a question counts with — sealed and, when its seal needed a second officer, confirmed (`gradable`). */
const countedOutcome = (q: StoredQuestion): MaswaliOutcome | null => gradable([q])[0].outcome;

/** One player's standing on one question of a read week (its questions read with it). */
async function standing(week: StoredWeek, questions: readonly StoredQuestion[], userId: string, slot: number, nowMs: number): Promise<MillioneaObjectionEligibility> {
  const window = millioneaObjectionWindow(week, nowMs);
  if (window.state === "FINAL") return { eligible: false, why: "WEEK_FINAL" };
  if (window.state === "NOT_YET") return { eligible: false, why: "WINDOW_NOT_OPEN" };
  if (window.state === "CLOSED") return { eligible: false, why: "WINDOW_CLOSED" };
  const q = questions.find((x) => x.slot === slot);
  if (!q) return { eligible: false, why: "NO_QUESTION" };
  if (countedOutcome(q) === null) return { eligible: false, why: "NOT_SEALED" };
  if ((await ticketStore.countLiveForUser(week.id, userId)) === 0) return { eligible: false, why: "NO_TICKET" };
  const mine = (await db.objection.listForUser(userId)).find((o) => o.marketId === week.marketId && o.questionOrdinal === slot);
  if (mine) return { eligible: false, why: mine.status === "OPEN" ? "ALREADY_OBJECTED" : "ALREADY_DECIDED" };
  return { eligible: true, closesAt: window.closesAt };
}

/** May this player object to this question of this week now? Read without the lock: the filing asks again under it. */
export async function millioneaObjectionEligibility(input: { userId: string; weekId: string; slot: number; now?: Date }): Promise<MillioneaObjectionEligibility> {
  if (!Number.isInteger(input.slot) || input.slot < 1 || input.slot > SLOT_COUNT) return { eligible: false, why: "NO_QUESTION" };
  const week = await weekStore.get(input.weekId);
  if (!week || !week.marketId) return { eligible: false, why: "NO_WEEK" };
  return standing(week, await questionStore.listForWeek(week.id), input.userId, input.slot, (input.now ?? new Date()).getTime());
}

/** The English sentence for a refusal (logs, the console, a test's detail); the player door words the code itself. */
const REFUSAL_EN: Record<MillioneaObjectionRefusal, string> = {
  NO_WEEK: "No such week.",
  NO_QUESTION: "No such question in this week.",
  WINDOW_NOT_OPEN: "The check window has not opened: it opens once every result the week needs is sealed.",
  WINDOW_CLOSED: "The check window has closed.",
  WEEK_FINAL: "This week's results are final.",
  NOT_SEALED: "This question has no result to check yet.",
  NO_TICKET: "Only a player holding a live ticket in this week can object to its results.",
  ALREADY_OBJECTED: "You already have an objection open on this question.",
  ALREADY_DECIDED: "Your objection on this question has already been decided.",
};

// ── THE FILING ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type MillioneaFiled = { ok: true; objectionId: string; recorded: boolean };
export type MillioneaFilingRefused = { ok: false; error: string; why: MillioneaObjectionRefusal | "INVALID" };

/** Prisma's unique-constraint code, which the memory store's twin throws too (`db.objection.create`). */
const isUniqueViolation = (e: unknown) => (e as { code?: unknown } | null)?.code === "P2002";

/**
 * File an objection to one question of a week (MR-16). The reasons and bounds are the platform's (`OBJECTION_REASONS`,
 * DETAIL_MIN..DETAIL_MAX). Under the chain lock: the standing asked again, then the row, on the lock's transaction.
 * `recorded`: its audit row landed.
 */
export async function fileMillioneaObjection(input: {
  userId: string; weekId: string; slot: number; reason: string; detail: string; now?: Date;
}): Promise<MillioneaFiled | MillioneaFilingRefused> {
  const nowMs = (input.now ?? new Date()).getTime();
  const detail = (input.detail ?? "").trim().slice(0, DETAIL_MAX);
  if (detail.length < DETAIL_MIN) return { ok: false, why: "INVALID", error: `Say what is wrong — at least ${DETAIL_MIN} characters.` };
  if (!OBJECTION_REASONS.includes(input.reason as ObjectionReason)) return { ok: false, why: "INVALID", error: "Pick a reason for the objection." };
  if (!Number.isInteger(input.slot) || input.slot < 1 || input.slot > SLOT_COUNT) return { ok: false, why: "NO_QUESTION", error: REFUSAL_EN.NO_QUESTION };
  type Out = { ok: true; objectionId: string; owed: OwedAudit[] } | MillioneaFilingRefused;
  let res: Out;
  try {
    res = await withLock(MASWALI_CHAIN_LOCK, async (tx): Promise<Out> => {
      const week = await weekStore.get(input.weekId, tx ?? undefined);
      if (!week || !week.marketId) return { ok: false, why: "NO_WEEK", error: REFUSAL_EN.NO_WEEK };
      const questions = await questionStore.listForWeek(week.id, tx ?? undefined);
      const s = await standing(week, questions, input.userId, input.slot, nowMs);
      if (!s.eligible) return { ok: false, why: s.why, error: REFUSAL_EN[s.why] };
      const q = questions.find((x) => x.slot === input.slot)!;
      const objection: StoredObjection = {
        id: `obj_${randomId(12)}`, marketId: week.marketId, userId: input.userId, reason: input.reason as ObjectionReason, detail,
        status: "OPEN", createdAt: new Date(nowMs).toISOString(), reviewedBy: null, reviewedAt: null, reviewNote: null, remedy: null,
        outcomeAtFiling: q.outcome, questionOrdinal: input.slot,
      };
      await db.objection.create(objection, tx ?? undefined);
      return { ok: true, objectionId: objection.id, owed: [{
        category: "COMPLIANCE", action: "maswali.objection.filed", actorId: input.userId, targetType: "MaswaliQuestion", targetId: q.id,
        payload: { objectionId: objection.id, week: week.code, slot: slotLabel(q.slot), reason: input.reason, outcomeAtFiling: q.outcome,
          objectionsCloseAt: week.objectionsCloseAt, effect: "the week's settlement and its week void wait until an officer rules" },
      }] };
    });
  } catch (e) {
    // The one key a race between two of the same player's filings could still meet on a database: the partial index.
    if (isUniqueViolation(e)) return { ok: false, why: "ALREADY_OBJECTED", error: REFUSAL_EN.ALREADY_OBJECTED };
    throw e;
  }
  if (!res.ok) return res;
  return { ok: true, objectionId: res.objectionId, recorded: await recordOwed(res.owed) };
}

// ── THE RULING ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The graded set as the money reads it — which ten slots score and each one's result — or PENDING / WEEK_VOID. */
export function gradedSetSignature(questions: readonly GradableQuestion[]): string {
  const set = gradedSet(questions);
  if (set.kind !== "SET") return set.kind;
  const outcomeAt = new Map(questions.map((q) => [slotOf(q.role, q.ordinal), q.outcome]));
  return set.slots.map((slot) => `${slot}:${outcomeAt.get(slot)}`).join(",");
}

export type MillioneaRuled = { ok: true; changed: boolean; restarted: boolean; recorded: boolean };

/** The officer whose upheld ruling last changed this question's result — the present result's author — or null. */
function lastUpheld(rows: readonly StoredObjection[], slot: number): StoredObjection | null {
  return rows.filter((x) => x.questionOrdinal === slot && x.status === "UPHELD" && x.reviewedAt)
    .sort((a, b) => (b.reviewedAt as string).localeCompare(a.reviewedAt as string))[0] ?? null;
}
const lastUpheldRuler = (rows: readonly StoredObjection[], slot: number): string | null => lastUpheld(rows, slot)?.reviewedBy ?? null;
const lastUpheldAt = (rows: readonly StoredObjection[], slot: number): string | null => lastUpheld(rows, slot)?.reviewedAt ?? null;

/**
 * Rule on one OPEN Millionea objection (MR-16). `expectedOutcome` / `expectedSealedAt` are the seal the officer reviewed,
 * as a correction names it: a ruling on a result that changed since is refused, so two rulings on one question can never
 * stack (two REVERSEs flipping it back). Separation of duties: never the objector, never the question's sealer or the
 * officer who confirmed its seal, never the officer whose upheld ruling set its present result, never an officer holding
 * a live ticket in the week (MR-14); ADMIN or COMPLIANCE, ADMIN —
 * the Owner — being the fallback when every other officer sealed. A REJECT changes nothing but the case; an upheld remedy
 * re-seals the question (`sealedAt` moves, so every reviewed form refreshes) and, when the graded set changed, re-runs
 * MR-17 and restarts the window once. `changed`: the graded set changed; `restarted`: the window restarts (now, or at the
 * seal the re-graded set still needs).
 */
export async function decideMillioneaObjection(input: {
  objectionId: string; officerId: string; ruling: MillioneaRuling; note: string;
  /** REINSTATE: the result the voided question comes back with. */
  outcome?: "YES" | "NO" | null;
  /** VOID: the ground, from the closed list (MR-15); `criterion_objection` when not named. */
  voidReason?: string | null;
  expectedOutcome: MaswaliOutcome; expectedSealedAt: string;
  now?: Date;
}): Promise<MillioneaRuled | Refused> {
  const nowMs = (input.now ?? new Date()).getTime();
  const note = (input.note ?? "").trim().slice(0, DETAIL_MAX);
  if (note.length < DETAIL_MIN) return refuse(`A ruling records its reasons — at least ${DETAIL_MIN} characters.`);
  if (input.ruling !== "REJECT" && !(MILLIONEA_OBJECTION_REMEDIES as readonly string[]).includes(input.ruling)) {
    return refuse("A ruling rejects the objection, or upholds it with REVERSE, VOID or REINSTATE.");
  }
  if (input.ruling === "REINSTATE" && input.outcome !== "YES" && input.outcome !== "NO") {
    return refuse("A reinstated question comes back with its result: YES or NO.");
  }
  const voidReason = input.ruling === "VOID" ? (input.voidReason ?? OBJECTION_VOID_GROUND) : null;
  if (input.ruling === "VOID" && !isMaswaliVoidReason(voidReason)) return refuse("A void names its ground from the closed list (MR-15).");
  if (!input.expectedSealedAt) return refuse("Reload the week and review the question's result before ruling.");
  if (!(await requireRulingOfficer(input.officerId, "maswali.objection.rule"))) {
    return refuse("Forbidden: an ADMIN or COMPLIANCE officer rules on an objection.");
  }

  type Out = { ok: true; changed: boolean; restarted: boolean; code: string; owed: OwedAudit[] } | Refused;
  const res = await withLock(MASWALI_CHAIN_LOCK, async (tx): Promise<Out> => {
    const o = await db.objection.findById(input.objectionId);
    if (!o) return refuse("Objection not found.");
    if (o.questionOrdinal == null) return refuse("This objection disputes a Yes/No market; it is ruled in /admin/objections.");
    if (o.status !== "OPEN") return refuse("This objection has already been decided.");
    const week = await weekStore.getByMarketId(o.marketId);
    if (!week) return refuse("The objection's week is missing.");
    if (week.state === "SETTLED" || week.state === "VOIDED") return refuse(`Week ${week.code} is ${week.state}; its results are final.`);
    const questions = await questionStore.listForWeek(week.id, tx ?? undefined);
    const q = questions.find((x) => x.slot === o.questionOrdinal);
    if (!q || q.outcome === null) return refuse("The question objected to has no result.");
    // ⛔ Separation of duties (MR-16, MR-14).
    if (o.userId === input.officerId) {
      audit({ category: "COMPLIANCE", action: "objection.self_review_blocked", actorId: input.officerId, targetType: "Objection", targetId: o.id, payload: { week: week.code, slot: slotLabel(q.slot) } });
      return refuse("You cannot rule on your own objection.");
    }
    if (q.sealedBy === input.officerId || q.stage2By === input.officerId) {
      audit({ category: "COMPLIANCE", action: "maswali.objection.sealer_blocked", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id,
        payload: { week: week.code, slot: slotLabel(q.slot), objectionId: o.id } });
      return refuse(`You sealed ${slotLabel(q.slot)} or confirmed its seal: another officer rules on its objections — the Owner (ADMIN) is the fallback.`);
    }
    // ⭐ MR-16, HELD ABSOLUTE: the officer whose upheld ruling set the question's present result is its author now, so the
    //    objections to it go to another officer, as the sealer's do (rulings serialize on this lock: the last one is read
    //    committed).
    if (lastUpheldRuler(await db.objection.listForMarket(o.marketId), q.slot) === input.officerId) {
      audit({ category: "COMPLIANCE", action: "maswali.objection.author_blocked", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id,
        payload: { week: week.code, slot: slotLabel(q.slot), objectionId: o.id } });
      return refuse(`You set ${slotLabel(q.slot)}'s present result on an earlier objection: another officer rules on its objections — the Owner (ADMIN) is the fallback.`);
    }
    if ((await ticketStore.countLiveForUser(week.id, input.officerId, tx ?? undefined)) > 0) {
      return refuse("An officer who holds a ticket in this week cannot rule on its objections.");
    }
    if (q.outcome !== input.expectedOutcome || q.sealedAt !== input.expectedSealedAt) {
      return refuse(`${slotLabel(q.slot)}'s result changed since you reviewed it. Reload the week and review it again.`);
    }
    let next: MaswaliOutcome | null = null;
    if (input.ruling === "REVERSE") {
      if (q.outcome === "VOID") return refuse(`${slotLabel(q.slot)} is void: a void is reversed by REINSTATE, with its result.`);
      next = q.outcome === "YES" ? "NO" : "YES";
    } else if (input.ruling === "VOID") {
      if (q.outcome === "VOID") return refuse(`${slotLabel(q.slot)} is already void.`);
      if (!voidGroundAvailable(voidReason as MaswaliVoidReason, Date.parse(q.voidDeadlineAt), nowMs)) {
        return refuse(`${slotLabel(q.slot)} cannot void on that ground before its void deadline (${q.voidDeadlineAt}).`);
      }
      next = "VOID";
    } else if (input.ruling === "REINSTATE") {
      if (q.outcome !== "VOID") return refuse(`${slotLabel(q.slot)} is not void: REVERSE or VOID it instead.`);
      next = input.outcome as "YES" | "NO";
    }
    // The re-graded set may restart the window from the frozen rules: asked before the first write, as a correction asks.
    if (next !== null && !frozenRules(week)) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);

    // ⭐ THE FIRST WRITE IS THE CONDITIONAL DECISION: a second officer's ruling on the same case finds it decided and writes
    //    nothing at all (on the database, a lost race leaves this transaction untouched).
    const at = new Date(nowMs).toISOString();
    const won = await db.objection.decideOpen(o.id, {
      status: input.ruling === "REJECT" ? "REJECTED" : "UPHELD", reviewedBy: input.officerId, reviewedAt: at, reviewNote: note,
      remedy: input.ruling === "REJECT" ? null : input.ruling,
    }, tx ?? undefined);
    if (!won) return refuse("This objection was decided a moment ago by another officer.");
    if (next === null) {
      return { ok: true, changed: false, restarted: false, code: week.code, owed: [{
        category: "COMPLIANCE", action: "maswali.objection.rejected", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id,
        payload: { objectionId: o.id, objectorId: o.userId, week: week.code, slot: slotLabel(q.slot), reason: o.reason, note, effect: "the result stands" },
      }] };
    }
    const before = gradedSetSignature(gradable(questions));
    // A new seal version (as a correction makes one), unique even when two writes share one clock millisecond.
    const revisedAt = new Date(Math.max(nowMs, Date.parse(q.sealedAt!) + 1)).toISOString();
    await questionStore.patch(q.id, {
      outcome: next, voidReason: next === "VOID" ? (voidReason as MaswaliVoidReason) : null,
      evidence: `Objection upheld (${input.ruling}): ${note}`, sealedAt: revisedAt,
    }, tx ?? undefined);
    const after = gradedSetSignature(gradable(await questionStore.listForWeek(week.id, tx ?? undefined)));
    const changed = before !== after;
    // ⭐ MR-16 · A CHANGED GRADED SET RESTARTS THE WINDOW ONCE: the graded set is final again — now, or at the seal it still
    //    needs — and the window opens from that moment (`recomputeGateLocked`). A second change keeps the window it has.
    const restarted = changed && !week.objectionRestarted;
    if (restarted) await weekStore.patch(week.id, { gradedSetFinalAt: null, objectionsCloseAt: null, objectionRestarted: true }, tx ?? undefined);
    const g = await recomputeGateLocked(week.id, nowMs, tx ?? undefined);
    if (!g.ok) throw new Error(g.error);
    if (changed) afterCommit(tx, () => invalidateMillioneaRegisterWeek(week.code));
    return { ok: true, changed, restarted, code: week.code, owed: [
      { category: "COMPLIANCE", action: "maswali.objection.upheld", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id,
        payload: { objectionId: o.id, objectorId: o.userId, week: week.code, slot: slotLabel(q.slot), reason: o.reason, remedy: input.ruling,
          from: q.outcome, to: next, voidReason: next === "VOID" ? voidReason : null, note, gradedSetChanged: changed, windowRestarted: restarted } },
      ...g.owed,
    ] };
  });
  if (!res.ok) return res;
  return { ok: true, changed: res.changed, restarted: res.restarted, recorded: await recordOwed(res.owed) };
}

// ── THE READS ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** One objection as the officer console and the player door read it. */
export type MillioneaObjectionRow = {
  id: string; slot: number; status: StoredObjection["status"]; reason: ObjectionReason; detail: string;
  remedy: StoredObjection["remedy"]; outcomeAtFiling: string | null; createdAt: string;
  reviewedBy: string | null; reviewedAt: string | null; reviewNote: string | null;
};
const rowOf = (o: StoredObjection): MillioneaObjectionRow => ({
  id: o.id, slot: o.questionOrdinal as number, status: o.status, reason: o.reason, detail: o.detail, remedy: o.remedy,
  outcomeAtFiling: o.outcomeAtFiling, createdAt: o.createdAt, reviewedBy: o.reviewedBy, reviewedAt: o.reviewedAt, reviewNote: o.reviewNote,
});

/** A week's Millionea objections, oldest first within each question, for the officer queue — the filer as the officer
 *  sees a player (`displayLabel`, never a phone number). */
export async function millioneaObjectionsForWeek(weekId: string): Promise<Array<MillioneaObjectionRow & { filer: string }> | null> {
  const week = await weekStore.get(weekId);
  if (!week || !week.marketId) return null;
  const rows = (await db.objection.listForMarket(week.marketId)).filter((o) => o.questionOrdinal != null);
  const users = new Map((await db.user.findByIds([...new Set(rows.map((o) => o.userId))])).map((u) => [u.id, u]));
  return rows
    .sort((a, b) => (a.questionOrdinal as number) - (b.questionOrdinal as number) || a.createdAt.localeCompare(b.createdAt))
    .map((o) => ({ ...rowOf(o), filer: displayLabel(users.get(o.userId) ?? { id: o.userId, displayName: null }) }));
}

/** One player's objections in one week, by question — the player door's state. */
export async function millioneaObjectionsOf(userId: string, weekId: string): Promise<Map<number, MillioneaObjectionRow>> {
  const week = await weekStore.get(weekId);
  const out = new Map<number, MillioneaObjectionRow>();
  if (!week || !week.marketId) return out;
  for (const o of await db.objection.listForUser(userId)) {
    if (o.marketId === week.marketId && o.questionOrdinal != null) out.set(o.questionOrdinal, rowOf(o));
  }
  return out;
}

/** One question of the officer queue: the seal under dispute and every objection on it, oldest first. */
export type MillioneaQueueQuestion = {
  slot: number; label: string; textEn: string; outcome: MaswaliOutcome | null; voidReason: string | null; evidence: string | null;
  sealedBy: string | null; stage2By: string | null; sealedAt: string | null;
  /** The seal's officers as the console names staff (`displayLabel`). */
  sealer: string; confirmer: string | null;
  /** The officer whose upheld ruling set the present result (the service bars them from its next objections), and when. */
  authorId: string | null; author: string | null; authoredAt: string | null;
  objections: Array<MillioneaObjectionRow & { userId: string; filer: string; reviewer: string | null }>;
};
/** One week of the officer queue. `viewerHoldsTicket`: the officer reading it holds a live ticket in the week, so the
 *  service would refuse them its rulings (MR-14's bar, held on an objection). */
export type MillioneaQueueWeek = {
  weekId: string; code: string; window: MillioneaObjectionWindow; restartSpent: boolean; open: number; viewerHoldsTicket: boolean;
  questions: MillioneaQueueQuestion[];
};

/**
 * The officer queue (/admin/maswali/integrity): every week whose results are being decided that has a Millionea
 * objection, oldest week first, and in it each question with an objection, by slot. Read-only; the rulings re-read
 * everything under the chain lock.
 */
export async function millioneaObjectionQueue(viewerId: string | null, nowMs = Date.now()): Promise<MillioneaQueueWeek[]> {
  const weeks = (await weekStore.list({ states: ["RESOLVING"], limit: 52 })).filter((w) => !!w.marketId);
  const out: MillioneaQueueWeek[] = [];
  for (const week of weeks.sort((a, b) => a.opensAt.localeCompare(b.opensAt))) {
    const rows = (await db.objection.listForMarket(week.marketId!)).filter((o) => o.questionOrdinal != null);
    if (rows.length === 0) continue;
    const questions = await questionStore.listForWeek(week.id);
    const people = new Set<string>(rows.flatMap((o) => [o.userId, ...(o.reviewedBy ? [o.reviewedBy] : [])]));
    for (const q of questions) for (const id of [q.sealedBy, q.stage2By]) if (id) people.add(id);
    const users = new Map((await db.user.findByIds([...people])).map((u) => [u.id, u]));
    const label = (id: string) => displayLabel(users.get(id) ?? { id, displayName: null });
    const bySlot = new Map<number, StoredObjection[]>();
    for (const o of rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      bySlot.set(o.questionOrdinal as number, [...(bySlot.get(o.questionOrdinal as number) ?? []), o]);
    }
    out.push({
      weekId: week.id, code: week.code, window: millioneaObjectionWindow(week, nowMs), restartSpent: week.objectionRestarted === true,
      open: rows.filter((o) => o.status === "OPEN").length,
      viewerHoldsTicket: viewerId ? (await ticketStore.countLiveForUser(week.id, viewerId)) > 0 : false,
      questions: [...bySlot.keys()].sort((a, b) => a - b).map((slot) => {
        const q = questions.find((x) => x.slot === slot);
        const authorId = lastUpheldRuler(rows, slot);
        return {
          slot, label: slotLabel(slot), textEn: q?.textEn ?? "", outcome: q?.outcome ?? null, voidReason: q?.voidReason ?? null, evidence: q?.evidence ?? null,
          sealedBy: q?.sealedBy ?? null, stage2By: q?.stage2By ?? null, sealedAt: q?.sealedAt ?? null,
          sealer: q?.sealedBy ? label(q.sealedBy) : "—", confirmer: q?.stage2By ? label(q.stage2By) : null,
          authorId, author: authorId ? label(authorId) : null, authoredAt: authorId ? lastUpheldAt(rows, slot) : null,
          objections: bySlot.get(slot)!.map((o) => ({ ...rowOf(o), userId: o.userId, filer: label(o.userId), reviewer: o.reviewedBy ? label(o.reviewedBy) : null })),
        };
      }),
    });
  }
  return out;
}

// ── THE PLAYER'S DOOR ──────────────────────────────────────────────────────────────────────────────────────────────

/** The ticket page's door (`components/maswali/maswali-objection-door.tsx`): where the week's objection window stands,
 *  whether the reader holds a live ticket in the week (standing), and the reader's own objections in it, by slot. */
export type MillioneaDoorView = { window: MillioneaObjectionWindow; holds: boolean; mine: MillioneaObjectionRow[] };

export async function millioneaObjectionDoor(userId: string, weekId: string, nowMs = Date.now()): Promise<MillioneaDoorView | null> {
  const week = await weekStore.get(weekId);
  if (!week || !week.marketId) return null;
  const [mine, live] = await Promise.all([millioneaObjectionsOf(userId, weekId), ticketStore.countLiveForUser(week.id, userId)]);
  return { window: millioneaObjectionWindow(week, nowMs), holds: live > 0, mine: [...mine.values()].sort((a, b) => a.slot - b.slot) };
}

/** The player's filing as the door posts it (`fileMillioneaObjectionAction`): the refusal's code only — the door says it in
 *  the player's language, never the server's sentence. */
export async function fileMillioneaObjectionFromForm(userId: string, form: FormData, now = new Date()): Promise<{ ok: true } | { ok: false; why: MillioneaFilingRefused["why"] }> {
  const r = await fileMillioneaObjection({
    userId, weekId: String(form.get("weekId") ?? ""), slot: Number(form.get("slot") ?? ""),
    reason: String(form.get("reason") ?? ""), detail: String(form.get("detail") ?? ""), now,
  });
  return r.ok ? { ok: true } : { ok: false, why: r.why };
}

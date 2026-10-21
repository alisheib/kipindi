/**
 * MASWALI MILLIONEA — THE WEEK'S LIFECYCLE (MASWALI-BUILD S2; MASWALI-PLAN §3 MR-3…MR-19, §7b S2 item 7).
 *
 *   DRAFT ──open──▶ OPEN ──close──▶ CLOSED ──first seal──▶ RESOLVING ──(S3) settle──▶ SETTLED
 *                     └──────────── a certain week void (MR-18) ─────────────────────▶ VOIDED
 *
 * ⛔ NO MONEY MOVES IN THIS FILE. The week void stamps the week VOIDED here and hands it to `maswali-void.ts`, whose one
 *    bulk transaction refunds every live ticket (R1). Buying, the free cancel and the winning settlement are S3's
 *    `maswali-money-service.ts` and `maswali-settlement.ts`.
 * ⛔ EVERY STATE CHANGE IS A CONDITIONAL WRITE UNDER THE CHAIN LOCK (`maswali:chain`), so two officers, the scheduler and
 *    a retry can never open, close or claim twice. The DAL's claims (`stampOpen`, `stampClose`, `moveClose`, `claimCarry`)
 *    answer whether they won the row; a lost claim is "someone else did it", never an error that leaves half a change.
 * ⛔ THE OPEN READS THE RULES FRESH AND FAILS CLOSED: the config, the licence basis, the guarantee — a read that could not
 *    ask refuses the open rather than open on what this container booted with.
 * ⛔ NO AI SEALS (MR-14). An AI suggestion is stored beside a question; only an officer's act seals it.
 *
 * Every refusal is a `{ ok: false, error }` in words an officer can act on; nothing here throws at a caller for a rule.
 */
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { audit, getAuditForTargetDurable } from "./audit";
import { randomId } from "./crypto";
import { afterCommit, withLock } from "./locks";
import { buyPosition, createMarket } from "./market-service";
import { refundVoidedWeek } from "./maswali-void";
import { invalidateMillioneaRegisterWeek } from "./maswali-register-cache";
import { millioneaStateNow } from "./millionea-switch";
import type { RolloutState } from "@/lib/millionea-rollout";
import { marketStore } from "./market-dal";
import { isSourceTrusted, seedDefaultSources } from "./source-registry";
import { readRequireTwoOfficerResolution } from "./resolution-policy";
import { getMaswaliConfig, readMaswaliConfigFresh, readMaswaliRulesSnapshot, snapshotMaswaliRules, type MaswaliRulesSnapshot } from "./maswali-config";
import { licenceBasisAllowsOpen, readLicenceBasisFresh } from "./maswali-licence";
import { isEventKind, questionStore, ticketStore, weekStore, type DraftQuestionFields, type EventKind, type StoredQuestion, type StoredWeek, type WeekVisibility } from "./maswali-dal";
import { MARKET_CATEGORIES, type MarketCategory } from "@/lib/markets/categories";
import { EAT_OFFSET_MS, eatWeekAt, eatWeekCode, eatWeekStartMs } from "@/lib/eat-day";
import { zonedToUtcMs } from "@/lib/maswali-time";
import { bannedTopicHits } from "@/lib/maswali-topics";
import { MAIN_COUNT, RESERVE_COUNT, settlementGate, slotLabel, slotOf, weekVoidCertain, type GradableQuestion, type MaswaliOutcome, type MaswaliPick } from "@/lib/maswali-score";
import { guaranteeRequirement } from "@/lib/maswali-money";
import { DEFAULT_FREE_EXIT_GRACE_MINUTES } from "@/lib/payout";
import { merkleRoot, questionSetHash, type FrozenQuestion } from "@/lib/maswali-commitment";
import { isMaswaliVoidReason, voidGroundAvailable, type MaswaliVoidReason } from "@/lib/maswali-void-reason";
import { noteMaswaliPoolChanged } from "./maswali-pool-feed";
import { formatTzs } from "@/lib/utils";
import { MASWALI_REASON_MIN, MASWALI_REASON_MAX } from "@/lib/maswali-ceremony-bounds";

type Ok<T> = { ok: true } & T;
type Refused = { ok: false; error: string };
type Result<T = object> = Ok<T> | Refused;
const refuse = (error: string): Refused => ({ ok: false, error });

/** The one lock every week-state change takes — the chain's order (MR-3) is a single line of weeks. */
export const MASWALI_CHAIN_LOCK = "maswali:chain";
const DAY_MS = 86_400_000;
const SYSTEM = "system_maswali";

// ── DRAFTING ────────────────────────────────────────────────────────────────────────────────────────

/** One question as the officer drafts it: the event's start in ITS OWN zone, as the source prints it. */
export type DraftQuestionInput = {
  role: "MAIN" | "RESERVE";
  ordinal: number;
  category: string;
  textEn: string; textSw: string; textZh: string;
  criterionEn: string; criterionSw: string; criterionZh: string;
  sourceUrl: string;
  fallbackSourceUrl?: string | null;
  readingTolerance?: string | null;
  eventKind: EventKind;
  /** "YYYY-MM-DDTHH:MM" in `eventZone`. */
  eventLocalStart: string;
  eventZone: string;
  probabilityEstimate?: number | null;
  probabilitySource?: string | null;
  linkedMarketId?: string | null;
};

const hostOf = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
};

/** The drafted fields that must be text, and the optional ones that may be absent, each named as a refusal names it. */
const DRAFT_TEXT_FIELDS = {
  category: "the category", textEn: "the English question", textSw: "the Swahili question", textZh: "the Chinese question",
  criterionEn: "the English criterion", criterionSw: "the Swahili criterion", criterionZh: "the Chinese criterion",
  sourceUrl: "the source", eventLocalStart: "the event start", eventZone: "the event's time zone",
} as const satisfies Partial<Record<keyof DraftQuestionInput, string>>;
const DRAFT_OPTIONAL_TEXT_FIELDS = {
  fallbackSourceUrl: "the fallback source", readingTolerance: "the reading tolerance", probabilitySource: "the probability's source",
  linkedMarketId: "the linked market",
} as const satisfies Partial<Record<keyof DraftQuestionInput, string>>;

/** A drafted question's stored fields, or the reason it cannot be stored. */
function draftFields(q: DraftQuestionInput, finalDeadlineMs: number, voidDeadlineHours: number): DraftQuestionFields | string {
  let slot: number;
  try { slot = slotOf(q.role, q.ordinal); } catch (e) { return (e as Error).message; }
  // ⛔ S5 review 6 · every field's type and range is checked HERE, in the console's own words — never a TypeError, never a
  //    raw database error, and never a value one store keeps and the other refuses (the stores diverged on eventKind).
  for (const [k, name] of Object.entries(DRAFT_TEXT_FIELDS)) {
    if (typeof q[k as keyof DraftQuestionInput] !== "string") return `${slotLabel(slot)}: ${name} must be text.`;
  }
  for (const [k, name] of Object.entries(DRAFT_OPTIONAL_TEXT_FIELDS)) {
    const v = q[k as keyof DraftQuestionInput];
    if (v != null && typeof v !== "string") return `${slotLabel(slot)}: ${name} must be text.`;
  }
  if (!isEventKind(q.eventKind)) return `${slotLabel(slot)}: the event kind must be SPORT, PRICE, WEATHER or ANNOUNCEMENT.`;
  const chance = q.probabilityEstimate;
  if (chance != null && (typeof chance !== "number" || !Number.isFinite(chance) || chance < 0 || chance > 1)) {
    return `${slotLabel(slot)}: the estimated probability must be a number from 0 to 1.`;
  }
  const start = zonedToUtcMs(q.eventLocalStart, q.eventZone);
  if (!start.ok) {
    const why = { malformed: "is not a date and time (YYYY-MM-DDTHH:MM)", unknown_zone: "names a zone the platform does not know",
      nonexistent: "falls in a clock change's skipped hour — that time never happens", ambiguous: "falls in a clock change's repeated hour — it happens twice; give the start in the source's other offset" }[start.reason];
    return `${slotLabel(slot)}: the event start ${q.eventLocalStart} (${q.eventZone}) ${why}.`;
  }
  const sourceDomain = hostOf(q.sourceUrl);
  if (!sourceDomain) return `${slotLabel(slot)}: the source is not a web address.`;
  const fallbackDomain = q.fallbackSourceUrl ? hostOf(q.fallbackSourceUrl) : null;
  if (q.fallbackSourceUrl && !fallbackDomain) return `${slotLabel(slot)}: the fallback source is not a web address.`;
  // OD-09b: start + the void-deadline hours, capped at the week's final deadline, and frozen per question.
  const voidDeadlineMs = Math.min(start.utcMs + voidDeadlineHours * 3_600_000, finalDeadlineMs);
  return {
    role: q.role, ordinal: q.ordinal, slot, category: q.category,
    textEn: q.textEn.trim(), textSw: q.textSw.trim(), textZh: q.textZh.trim(),
    criterionEn: q.criterionEn.trim(), criterionSw: q.criterionSw.trim(), criterionZh: q.criterionZh.trim(),
    sourceUrl: q.sourceUrl.trim(), sourceDomain, fallbackSourceUrl: q.fallbackSourceUrl?.trim() || null, fallbackSourceDomain: fallbackDomain,
    readingTolerance: q.readingTolerance?.trim() || null, eventKind: q.eventKind,
    eventStartsAt: new Date(start.utcMs).toISOString(), eventZone: q.eventZone, voidDeadlineAt: new Date(voidDeadlineMs).toISOString(),
    // Held to the column's four decimals (Decimal(5,4)) on both stores: memory keeps exactly what PostgreSQL keeps.
    probabilityEstimate: chance == null ? null : Math.round(chance * 10_000) / 10_000,
    probabilitySource: q.probabilitySource?.trim() || null, linkedMarketId: q.linkedMarketId ?? null,
  };
}

/**
 * Draft a week for the ISO week that starts at `weekStartMs` (Monday 00:00 EAT), from the CURRENT config's template.
 * The draft carries no market and no frozen rules — both arrive at the open. Exactly 10 mains and 5 reserves.
 */
export async function createWeek(input: {
  weekStartMs: number;
  visibility?: WeekVisibility;
  questions: DraftQuestionInput[];
  officerId: string;
  now?: Date;
}): Promise<Result<{ week: StoredWeek; recorded: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  if (eatWeekStartMs(input.weekStartMs) !== input.weekStartMs) return refuse("A week starts on a Monday at 00:00 East Africa Time.");
  const visibility = input.visibility ?? "PUBLIC";
  if (visibility !== "PUBLIC" && visibility !== "DRIVE") return refuse("A week is PUBLIC or a private DRIVE week.");
  const cfg = getMaswaliConfig();
  const opensAt = eatWeekAt(input.weekStartMs, cfg.openWeekday, cfg.openAt);
  const closesAt = eatWeekAt(input.weekStartMs, cfg.closeWeekday, cfg.closeAt);
  const finalDeadlineAt = eatWeekAt(input.weekStartMs + 7 * DAY_MS, cfg.finalDeadlineWeekday, cfg.finalDeadlineAt);
  if (closesAt <= nowMs) return refuse("That week's sales close has already passed.");
  if (input.questions.length !== MAIN_COUNT + RESERVE_COUNT) return refuse(`A week is ${MAIN_COUNT} main questions and ${RESERVE_COUNT} reserves.`);
  const rows: Array<DraftQuestionFields & { id: string }> = [];
  for (const q of input.questions) {
    const f = draftFields(q, finalDeadlineAt, cfg.voidDeadlineHours);
    if (typeof f === "string") return refuse(f);
    if (rows.some((r) => r.slot === f.slot)) return refuse(`${slotLabel(f.slot)} is drafted twice.`);
    rows.push({ ...f, id: `mlq_${randomId(10)}` });
  }
  // A DRIVE week has its own code prefix, so it can share an ISO week with the public one.
  const code = eatWeekCode(visibility === "DRIVE" ? "MLD" : "MLN", input.weekStartMs);
  const res = await withLock(MASWALI_CHAIN_LOCK, async (lockTx): Promise<Result<{ week: StoredWeek; owed: OwedAudit[] }>> => {
    if (await weekStore.getByCode(code)) return refuse(`Week ${code} already exists.`);
    const nowIso = new Date(nowMs).toISOString();
    const week: StoredWeek = {
      id: `mlw_${randomId(10)}`, marketId: null, code, seq: (await weekStore.maxSeq()) + 1, visibility, state: "DRAFT",
      opensAt: new Date(opensAt).toISOString(), closesAt: new Date(closesAt).toISOString(), finalDeadlineAt: new Date(finalDeadlineAt).toISOString(),
      closedAt: null, rulesSnapshot: null, questionSetHash: null, ticketMerkleRoot: null, ticketCount: 0, salesAtClose: null,
      gradedSetFinalAt: null, objectionsCloseAt: null, objectionRestarted: false, rolloverIn: null, jackpot: null, fee: null, traLevy: null,
      gbtLevy: null, topUp: null, winningTickets: null, sharePerTicket: null, paidTotal: null, carryOut: null, dustCarried: null,
      settlementGroupId: null, settledAt: null, releasedBy: null, isFinal: false, parityAttestedBy: null, parityAttestedAt: null,
      createdBy: input.officerId, createdAt: nowIso, updatedAt: nowIso,
    };
    // S5-FIX-SRV · the week and its fifteen questions are the chain lock's ONE transaction: a draft lands whole or not at all.
    await weekStore.create(week, lockTx ?? undefined);
    await questionStore.createMany(week.id, rows, lockTx ?? undefined);
    // MB-79 · the first text's version as STORED (a store may round a field): the second reader's check finds its author here.
    const version = draftSetVersion(await questionStore.listForWeek(week.id, lockTx ?? undefined));
    return { ok: true, week, owed: [{ category: "ADMIN", action: "maswali.week.drafted", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code, seq: week.seq, visibility, opensAt: week.opensAt, closesAt: week.closesAt, version } }] };
  });
  if (!res.ok) return res;
  // Written before this returns, so a second reader who attests the moment the draft exists finds who wrote it.
  return { ok: true, week: res.week, recorded: await recordOwed(res.owed) };
}

/** Validate one draft edit without writing; the batch must finish every check before its first write. */
function preparedDraftEdit(q: StoredQuestion, changes: Partial<DraftQuestionInput>, week: StoredWeek): DraftQuestionFields | string {
  const cfg = getMaswaliConfig();
  // ⛔ An edit never moves a question: role, ordinal and slot are the stored draft's, whatever was sent.
  const { role: _role, ordinal: _ordinal, ...content } = changes;
  void _role; void _ordinal;
  const merged: DraftQuestionInput = {
    category: q.category, textEn: q.textEn, textSw: q.textSw, textZh: q.textZh,
    criterionEn: q.criterionEn, criterionSw: q.criterionSw, criterionZh: q.criterionZh, sourceUrl: q.sourceUrl,
    fallbackSourceUrl: q.fallbackSourceUrl, readingTolerance: q.readingTolerance, eventKind: q.eventKind,
    eventLocalStart: utcToLocalInput(q.eventStartsAt, q.eventZone), eventZone: q.eventZone,
    probabilityEstimate: q.probabilityEstimate, probabilitySource: q.probabilitySource, linkedMarketId: q.linkedMarketId,
    ...content, role: q.role, ordinal: q.ordinal,
  };
  return draftFields(merged, Date.parse(week.finalDeadlineAt), cfg.voidDeadlineHours);
}

/** The fields a draft question's version covers — every one an edit can change — in a fixed order. */
const DRAFT_VERSION_FIELDS = [
  "category", "textEn", "textSw", "textZh", "criterionEn", "criterionSw", "criterionZh", "sourceUrl", "fallbackSourceUrl",
  "readingTolerance", "eventKind", "eventStartsAt", "eventZone", "voidDeadlineAt", "probabilityEstimate", "probabilitySource", "linkedMarketId",
] as const satisfies ReadonlyArray<keyof DraftQuestionFields>;
type DraftVersioned = Pick<StoredQuestion, "slot" | (typeof DRAFT_VERSION_FIELDS)[number]>;

/**
 * ⭐ S5-FIX-SRV A5 · ONE DRAFT QUESTION'S VERSION: a digest of its slot and every field an edit can change, as stored. The
 * editor draws each row with it and sends it back with that row's change; a save whose row has moved on since — another
 * officer's save landed in between — is refused whole, never silently overwritten.
 */
export function draftRowVersion(q: DraftVersioned): string {
  return createHash("sha256").update(JSON.stringify([q.slot, ...DRAFT_VERSION_FIELDS.map((k) => q[k] ?? null)])).digest("hex");
}

/**
 * S5-FIX-SRV A4 · THE WHOLE DRAFT'S VERSION: its fifteen row versions in slot order. The week page draws the attestation
 * with it, the second reader's attestation names it, and every audit row that writes the text (the draft, each edit) carries
 * the version it left — so the attestation is tied to the text read, and the text to its author.
 */
export function draftSetVersion(questions: readonly DraftVersioned[]): string {
  return createHash("sha256").update([...questions].sort((a, b) => a.slot - b.slot).map(draftRowVersion).join("|")).digest("hex");
}

/** The stored draft's version now — what a reader who loaded the week this instant would attest. */
export async function readDraftVersion(weekId: string): Promise<string> {
  return draftSetVersion(await questionStore.listForWeek(weekId));
}

/** Edit ONE draft question — the builder's batch save with one slot (`version`: the row as it was read). */
export async function editDraftQuestion(input: { weekId: string; slot: number; changes: Partial<DraftQuestionInput>; version: string; officerId: string }): Promise<Result<{ recorded: boolean }>> {
  return editDraftQuestions({ weekId: input.weekId, edits: [{ slot: input.slot, changes: input.changes, version: input.version }], officerId: input.officerId });
}

/**
 * Save the builder's changed slots together. A later refusal cannot leave an earlier slot saved. ⛔ Refused past DRAFT (the
 * DAL also refuses any non-draft column); clears the parity attestation. Each edit names the `version` of the row it was
 * read from (`draftRowVersion`); one that has changed since refuses the whole save (S5 review A5).
 */
export async function editDraftQuestions(input: {
  weekId: string; edits: Array<{ slot: number; changes: Partial<DraftQuestionInput>; version: string }>; officerId: string;
}): Promise<Result<{ recorded: boolean }>> {
  const result = await withLock(MASWALI_CHAIN_LOCK, async (tx): Promise<Result<{ version: string }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "DRAFT") return refuse(`Week ${week.code} is ${week.state}: its questions are frozen (MR-13).`);
    if (!Array.isArray(input.edits) || input.edits.length < 1 || input.edits.length > MAIN_COUNT + RESERVE_COUNT) {
      return refuse("Choose one to fifteen changed questions to save.");
    }
    const questions = new Map((await questionStore.listForWeek(week.id)).map((q) => [q.slot, q]));
    const seen = new Set<number>();
    const patches: Array<{ id: string; fields: Partial<DraftQuestionFields> }> = [];
    for (const edit of input.edits) {
      if (!Number.isInteger(edit.slot) || edit.slot < 1 || edit.slot > MAIN_COUNT + RESERVE_COUNT || seen.has(edit.slot)) {
        return refuse("Each changed question must name one distinct slot from M1 through A5.");
      }
      seen.add(edit.slot);
      const q = questions.get(edit.slot);
      if (!q) return refuse(`No ${slotLabel(edit.slot)} in week ${week.code}.`);
      if (!edit.changes || typeof edit.changes !== "object" || Array.isArray(edit.changes)) return refuse(`${slotLabel(edit.slot)}: the change could not be read.`);
      if (typeof edit.version !== "string" || !edit.version) return refuse(`${slotLabel(edit.slot)}: the save does not say which version of the question it changes. Reload the editor.`);
      if (draftRowVersion(q) !== edit.version) {
        return refuse(`${slotLabel(edit.slot)} changed after you opened the editor: another officer saved it. Reload the editor and make your change again — nothing was saved.`);
      }
      const fields = preparedDraftEdit(q, edit.changes, week);
      if (typeof fields === "string") return refuse(fields);
      const { role: _role, ordinal: _ordinal, slot: _slot, ...editable } = fields;
      void _role; void _ordinal; void _slot;
      patches.push({ id: q.id, fields: editable });
    }
    // The chain lock carries a Postgres transaction through both writes and the attestation clear.
    // The memory store validates its entire batch before it swaps any question row.
    await questionStore.editDraftQuestions(patches, tx ?? undefined);
    if (week.parityAttestedBy) await weekStore.patch(week.id, { parityAttestedBy: null, parityAttestedAt: null }, tx ?? undefined);
    // MB-79 · the version this edit leaves, read through the lock's transaction: the audit row names its author.
    return { ok: true, version: draftSetVersion(await questionStore.listForWeek(week.id, tx ?? undefined)) };
  });
  if (!result.ok) return result;
  // The questions and attestation have committed. An audit failure cannot roll them back, so report both facts.
  const recorded = await recordOwed([{ category: "ADMIN", action: "maswali.week.draft_edited", actorId: input.officerId, targetType: "MaswaliCycle", targetId: input.weekId,
    payload: { slots: input.edits.map((edit) => edit.slot), fields: input.edits.map((edit) => Object.keys(edit.changes)), version: result.version } }]);
  return { ok: true, recorded };
}

/** The officer's view of a stored start: the local "YYYY-MM-DDTHH:MM" in its own zone. */
function utcToLocalInput(iso: string, zone: string): string {
  const t = Date.parse(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** How many of a draft week's own audit rows the second-reader check reads (newest first) before it must refuse. */
const DRAFT_HISTORY_LIMIT = 500;

/**
 * ⭐ MB-79 · WHO WROTE THIS DRAFT, READ FROM THE WEEK'S OWN DURABLE TRAIL (S5-FIX-SRV, review findings 3 and A4) — no new
 * column. Walking the week's audit rows newest first: every officer who edited it since its last attestation (an edit clears
 * the attestation), and whether the text stored now — `current` — has a recorded author: the draft's row and each edit's
 * carry the version they left, so an edit whose row was never written leaves a text nobody is recorded as writing. ⛔ Fails
 * closed: a history that could not be read, or not far enough, is a refusal sentence — never an empty set of editors.
 */
async function draftAuthorship(week: StoredWeek, current: string, injected?: typeof getAuditForTargetDurable): Promise<{ editors: Set<string> } | string> {
  // A direct call of the audit row reader (the house-bot reports census, 0.260.1, counts calls, not references).
  const history = await (injected ? injected("MaswaliCycle", week.id, { limit: DRAFT_HISTORY_LIMIT })
    : getAuditForTargetDurable("MaswaliCycle", week.id, { limit: DRAFT_HISTORY_LIMIT })).catch(() => null);
  if (!history) return "The draft's history could not be read, so who wrote it cannot be checked. Nothing was attested; try again in a moment.";
  const editors = new Set<string>();
  let attestedBefore = false, authorKnown = false;
  for (const e of history.entries) {
    if (e.action === "maswali.week.parity_attested") attestedBefore = true;
    else if (e.action === "maswali.week.draft_edited" && !attestedBefore && e.actorId) editors.add(e.actorId);
    if ((e.action === "maswali.week.draft_edited" || e.action === "maswali.week.drafted") && (e.payload as { version?: unknown } | undefined)?.version === current) authorKnown = true;
    if (attestedBefore && authorKnown) break;
  }
  if (history.truncated && !(attestedBefore && authorKnown)) {
    return "The draft's history is longer than one read can check, so who wrote it cannot be established. Nothing was attested; an administrator must review it.";
  }
  if (!authorKnown) {
    return "The draft's current text has no audit record of who wrote it (an edit's record was not written), so no second reader can be established (MB-79). Nothing was attested; an administrator must review the draft's history — a recorded edit restores it.";
  }
  return { editors };
}

/**
 * MB-79: a second reader confirms the three languages say the same thing. ⛔ Never the officer who drafted the week, and
 * never one who edited it since its last attestation (`draftAuthorship`): the reader is never the text's author. ⭐ The
 * attestation is TIED TO THE TEXT READ (S5 review A4): `readVersion` is the draft's version the reader's page was drawn from
 * (`draftSetVersion`), so an edit landed since refuses it, and an attestation that stands is never overwritten. `recorded`:
 * its audit row — which carries the version attested — was written after the commit.
 */
export async function attestParity(input: {
  weekId: string; officerId: string; readVersion: string; now?: Date;
  /** Tests only: the history read (`getAuditForTargetDurable`). */
  readHistory?: typeof getAuditForTargetDurable;
}): Promise<Result<{ recorded: boolean }>> {
  if (typeof input.readVersion !== "string" || !input.readVersion) return refuse("Reload the week and read its questions before attesting them.");
  const res = await withLock(MASWALI_CHAIN_LOCK, async (tx): Promise<Result<{ owed: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "DRAFT") return refuse(`Week ${week.code} is no longer a draft.`);
    if (week.createdBy === input.officerId) return refuse("The officer who drafted the week cannot attest its translations — a second reader must.");
    if (week.parityAttestedBy) return refuse(`Week ${week.code}'s three languages are already attested; an edit clears the attestation.`);
    const current = draftSetVersion(await questionStore.listForWeek(week.id));
    if (current !== input.readVersion) {
      return refuse("The questions changed after your page loaded: another officer saved an edit. Reload the week and read all fifteen again before attesting.");
    }
    const authorship = await draftAuthorship(week, current, input.readHistory);
    if (typeof authorship === "string") return refuse(authorship);
    if (authorship.editors.has(input.officerId)) {
      return refuse("You edited this draft since its last attestation, so you cannot attest it — a second reader who did not write it must (MB-79).");
    }
    const at = (input.now ?? new Date()).toISOString();
    await weekStore.patch(week.id, { parityAttestedBy: input.officerId, parityAttestedAt: at }, tx ?? undefined);
    return { ok: true, owed: [{ category: "COMPLIANCE", action: "maswali.week.parity_attested", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, version: current } }] };
  });
  if (!res.ok) return res;
  return { ok: true, recorded: await recordOwed(res.owed) };
}

// ── OPENING ─────────────────────────────────────────────────────────────────────────────────────────

/** What the open needs from the money side (S3 implements it; S2's suites inject it). */
export type GuaranteeReader = { balance(): Promise<number | null> };

/**
 * The two conditions the open checks beside the week itself (OD-01, OD-02), each in the words it refuses with. The
 * builder's checklist (`consoleWeekDetail`) lists them too, so the page never says every check passes while the open
 * would refuse.
 */
export const NO_LICENCE_BASIS = "No licence basis is recorded. The Owner records it before any week opens (OD-01).";

/**
 * OD-02: the guarantee must cover every unsettled week, this one included, before it opens — each at its OWN frozen floor
 * (this one at the floor it would freeze), across both lines of weeks: there is one guarantee. `null` when it does.
 */
export async function guaranteeProblem(week: StoredWeek, rules: MaswaliRulesSnapshot, guarantee: GuaranteeReader): Promise<string | null> {
  const unsettled = await weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING"] });
  const need = guaranteeRequirement([
    ...unsettled.map((w) => ({ floor: frozenRules(w)?.floorTzs ?? rules.floorTzs, confirmedCarryIn: w.rolloverIn })),
    { floor: rules.floorTzs, confirmedCarryIn: week.rolloverIn },
  ]);
  const held = await guarantee.balance().catch(() => null);
  if (held === null) return "The guarantee balance could not be read; no week opens until it can be (OD-02).";
  return held < need ? `The guarantee holds ${formatTzs(held)}; ${formatTzs(need)} is needed to open (OD-02).` : null;
}

/** Every reason a draft cannot open, in words — empty when it can. Pure over what the open read. */
export async function openProblems(week: StoredWeek, questions: StoredQuestion[], rules: MaswaliRulesSnapshot, nowMs: number): Promise<string[]> {
  const p: string[] = [];
  if (questions.length !== MAIN_COUNT + RESERVE_COUNT) p.push(`A week is ${MAIN_COUNT} mains and ${RESERVE_COUNT} reserves; this one has ${questions.length}.`);
  if (!week.parityAttestedBy) p.push("A second reader has not attested that English, Swahili and Chinese agree (MB-79).");
  const closeMs = Date.parse(week.closesAt);
  if (!(closeMs > nowMs)) p.push("The sales close has already passed.");
  const earliest = Math.min(...questions.map((q) => Date.parse(q.eventStartsAt)));
  if (closeMs > earliest - rules.minLockBufferMinutes * 60_000) {
    p.push(`Sales must close at least ${rules.minLockBufferMinutes} minutes before the first event (${new Date(earliest).toISOString()}).`);
  }
  const finalMs = Date.parse(week.finalDeadlineAt);
  const perCompetition = new Map<string, number>();
  const reserveSources = new Set<string>();
  for (const q of questions) {
    const label = slotLabel(q.slot);
    if (!(MARKET_CATEGORIES as readonly string[]).includes(q.category)) p.push(`${label}: "${q.category}" is not a market category.`);
    for (const [loc, text] of [["English", `${q.textEn} ${q.criterionEn}`], ["Swahili", `${q.textSw} ${q.criterionSw}`]] as const) {
      const hits = bannedTopicHits(text);
      if (hits.length) p.push(`${label}: the ${loc} text is about politics ("${hits[0]}") — the licence excludes it.`);
    }
    if (![q.textEn, q.textSw, q.textZh, q.criterionEn, q.criterionSw, q.criterionZh].every((s) => s.trim().length > 0)) p.push(`${label}: every language needs its question and its criterion.`);
    if (Date.parse(q.voidDeadlineAt) > finalMs) p.push(`${label}: its void deadline is after the week's final deadline.`);
    if (Date.parse(q.voidDeadlineAt) > Date.parse(week.opensAt) + 7 * DAY_MS + rules.voidDeadlineHours * 3_600_000) p.push(`${label}: its void deadline is too far after the open.`);
    const pr = q.probabilityEstimate;
    if (pr == null || !q.probabilitySource) p.push(`${label}: it needs an estimated probability and its source (OD-14).`);
    else if (pr < rules.questionCaps.probabilityMin || pr > rules.questionCaps.probabilityMax) {
      p.push(`${label}: its estimated probability ${Math.round(pr * 100)}% is outside ${Math.round(rules.questionCaps.probabilityMin * 100)}–${Math.round(rules.questionCaps.probabilityMax * 100)}%.`);
    }
    if (q.linkedMarketId) perCompetition.set(q.linkedMarketId, (perCompetition.get(q.linkedMarketId) ?? 0) + 1);
    if (q.role === "RESERVE") reserveSources.add(q.sourceDomain);
    for (const url of [q.sourceUrl, q.fallbackSourceUrl]) {
      if (!url) continue;
      const trust = await isSourceTrusted(url, q.category as MarketCategory).catch(() => ({ ok: false, reason: "the source registry could not be read" }));
      if (!trust.ok) p.push(`${label}: ${url} is not a trusted source (${trust.reason ?? "refused"}).`);
    }
  }
  for (const [competition, n] of perCompetition) {
    if (n > rules.questionCaps.maxPerCompetition) p.push(`${n} questions share ${competition}; at most ${rules.questionCaps.maxPerCompetition} may (OD-14).`);
  }
  if (reserveSources.size < rules.questionCaps.minReserveSources) p.push(`The reserves come from ${reserveSources.size} source(s); at least ${rules.questionCaps.minReserveSources} are needed (OD-14).`);
  const events = new Map<string, string>();
  for (const q of questions) {
    const key = `${q.sourceDomain}|${q.eventStartsAt}|${q.criterionEn.toLowerCase().replace(/\W+/g, " ").trim()}`;
    const prev = events.get(key);
    if (prev) p.push(`${slotLabel(q.slot)} and ${prev} are the same event (OD-14: no shared events).`);
    else events.set(key, slotLabel(q.slot));
  }
  return p;
}

/**
 * ⭐ OPEN A WEEK. Fresh reads, every check, then ONE claim: the market is created and the rules, the question-set hash and
 * the market are stamped WHERE the week is still DRAFT, and the state becomes OPEN. All of it runs inside the chain lock,
 * so no second open can race it. A ticket can only be bought against an OPEN week's own market (S3), so even a lost claim
 * could leave nothing on sale.
 */
export async function openWeek(input: { weekId: string; officerId: string; guarantee: GuaranteeReader; now?: Date }): Promise<Result<{ week: StoredWeek; recorded: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const [fresh, licence] = await Promise.all([readMaswaliConfigFresh(), readLicenceBasisFresh()]);
  if (!fresh.ok) return refuse(`The Millionea rules could not be read, so nothing was opened: ${fresh.error}`);
  if (!licence.ok) return refuse("The licence record could not be read, so nothing was opened.");
  if (!licenceBasisAllowsOpen(licence.basis)) return refuse(NO_LICENCE_BASIS);
  // The trusted-source registry seeds its defaults on first use, as every publish path does before it asks. S5-FIX-SRV ·
  // before the lock, as its own write: nothing inside the chain lock writes off its transaction, and the checks below
  // read the registry outside it, so they must find the defaults already committed.
  await seedDefaultSources();
  const res = await withLock(MASWALI_CHAIN_LOCK, async (lockTx): Promise<Result<{ week: StoredWeek; owed: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "DRAFT") return refuse(`Week ${week.code} is already ${week.state}.`);
    if (await weekStore.openFor(week.visibility)) return refuse(`Another ${week.visibility === "DRIVE" ? "drive" : "public"} week is open (MR-3).`);
    // ⛔ R3 · THE CHAIN IS THE CALENDAR (MR-3; `seq` only numbers the drafts): a week whose calendar week comes BEFORE one of
    //    its line that has already opened never opens — it would settle after it, claiming a carry the later week may
    //    already have drawn. In the template this never bites (one week of a line sells at a time, above, and no week
    //    opens after its own close, `openProblems`); it holds when a later week was opened early and closed early.
    const later = (await weekStore.list({ visibility: week.visibility })).find((w) => w.state !== "DRAFT" && calendarStartMs(w) > calendarStartMs(week));
    if (later) return refuse(`Week ${later.code} comes after week ${week.code} and has already opened; weeks open, claim and settle strictly in calendar order (MR-3), so this week can no longer open.`);
    // MR-30 · the sunset: nothing opens after a final week that ran, and a final week that voided or sold nothing hands
    // the role to the next PUBLIC week to open (OD-03). While a final week is ENDING, only a week whose calendar comes
    // AFTER it is refused: an earlier week drafted beside it still runs.
    const life = week.visibility === "PUBLIC" ? await sunsetState() : { kind: "LIVE" as const };
    if (life.kind === "RETIRED") return refuse(`Millionea has ended: week ${life.week.code} was the final week.`);
    if (life.kind === "ENDING" && life.week.id !== week.id && calendarStartMs(week) > calendarStartMs(life.week)) {
      return refuse(`Week ${life.week.code} is the final week; nothing opens after it.`);
    }
    const rules = snapshotMaswaliRules(fresh.config, new Date(nowMs));
    const questions = await questionStore.listForWeek(week.id);
    const problems = await openProblems(week, questions, rules, nowMs);
    const short = await guaranteeProblem(week, rules, input.guarantee);
    if (short) problems.push(short);
    if (problems.length) return refuse(problems.join(" "));

    const qHash = questionSetHash(questions.map((q): FrozenQuestion => ({
      role: q.role, ordinal: q.ordinal, slot: q.slot, category: q.category, textEn: q.textEn, textSw: q.textSw, textZh: q.textZh,
      criterionEn: q.criterionEn, criterionSw: q.criterionSw, criterionZh: q.criterionZh, sourceUrl: q.sourceUrl,
      fallbackSourceUrl: q.fallbackSourceUrl, eventStartsAt: q.eventStartsAt, eventZone: q.eventZone, voidDeadlineAt: q.voidDeadlineAt,
    })));
    const owed: OwedAudit[] = [];
    const market = await createMarket({
      titleEn: `Maswali Millionea · ${week.code}`, titleSw: `Maswali Millionea · ${week.code}`, titleZh: `Maswali Millionea · ${week.code}`,
      category: (questions[0]?.category as MarketCategory) ?? "other",
      sourceUrl: questions[0]?.sourceUrl ?? "https://50pick.tz/millionea",
      resolutionCriterion: `Maswali Millionea week ${week.code}: fifteen questions graded by the published rules; question set ${qHash}.`,
      resolutionAt: week.finalDeadlineAt,
      selectionClosedAt: week.closesAt,
      proposedBy: input.officerId,
      productLine: "MASWALI",
      // The week freezes the jackpot model and its rate beside the global levies, and NO paid exit (MB-50).
      rateOverrides: { feeModel: "jackpot-payout", jackpotFeeRate: fresh.config.jackpotFeeRate, paidExitWindowMinutes: 0 },
    }, lockTx ?? undefined, (row) => owed.push(row));
    const won = await weekStore.stampOpen(week.id, { marketId: market.id, rulesSnapshot: rules, questionSetHash: qHash, opensAt: new Date(nowMs).toISOString() }, lockTx ?? undefined);
    // S5-FIX-SRV · the market, the claim and the final mark are the chain lock's ONE transaction: a lost claim throws, so the
    // market made above rolls back with it. Its audit rows (the market's among them) are owed, written once it committed.
    if (!won) throw new LostClaim(`Week ${week.code} changed while it was being opened; nothing was opened. Refresh and try again.`);
    if (life.kind === "PASSES_ON" && !week.isFinal) {
      await weekStore.patch(week.id, { isFinal: true }, lockTx ?? undefined);
      owed.push({ category: "COMPLIANCE", action: "maswali.sunset.passed_on", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
        payload: { code: week.code, from: life.week.code, fromState: life.week.state } });
    }
    const opened = (await weekStore.get(week.id, lockTx ?? undefined))!;
    owed.push({ category: "ADMIN", action: "maswali.week.opened", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, marketId: market.id, questionSetHash: qHash, closesAt: week.closesAt, rules, isFinal: opened.isFinal } });
    // S5 · a week on sale has a pool figure now — noted once the open has committed.
    afterCommit(lockTx, () => noteMaswaliPoolChanged(week.id));
    return { ok: true, week: opened, owed };
  }).catch((e: unknown) => {
    if (e instanceof LostClaim) return refuse(e.message);
    throw e;
  });
  if (!res.ok) return res;
  // Written once the open has committed (finding 2): `recorded` is true only when every row it owes landed.
  return { ok: true, week: res.week, recorded: await recordOwed(res.owed) };
}

/**
 * A claim lost AFTER a write inside the chain lock (S5-FIX-SRV): thrown, so it escapes the lock and the lock's transaction
 * rolls that write back (DATA-LAYER rule 1: a refusal returned inside a lock commits what came before it), then caught
 * outside the lock and answered as the refusal it is.
 */
class LostClaim extends Error {}

// ── BUYING (MASWALI-BUILD S3) ───────────────────────────────────────────────────────────────────────

type PurchaseResult = Awaited<ReturnType<typeof buyPosition>>;

/**
 * May this week sell at this rollout? A PUBLIC week sells only when Millionea is ACTIVE. A DRIVE week (OD-21, the private
 * S8 drive) sells from STAFF_PREVIEW up; who may hold its tickets is S8's (OD-12). ⛔ WITHDRAWN sells nothing anywhere.
 */
export function rolloutSells(state: RolloutState, visibility: WeekVisibility): boolean {
  if (state === "ACTIVE") return true;
  if (state === "STAFF_PREVIEW") return visibility === "DRIVE";
  return false;
}

/**
 * ⭐ THE PLAYER'S PURCHASE (MR-8…MR-12) — one or more tickets of fifteen answers for one week, through the platform's ONE
 * bet path. Here: the rollout, the week by its id, the price from its frozen rules (one ticket = one price, never a stake
 * the player types). Then `buyPosition` — every shared gate runs there unchanged (the rate limit, maintenance, a break or
 * cooling-off, the session limit, the account), and its ticket arm does the rest under the wallet and market locks.
 * ⛔ The rollout is read fresh and fails closed: an unreadable switch is WITHDRAWN, and sells nothing.
 */
export async function purchaseMaswaliTickets(input: {
  userId: string;
  weekId: string;
  slips: ReadonlyArray<ReadonlyArray<MaswaliPick>>;
  idempotencyKey?: string;
  playStartedAt?: number;
  /** Tests only: the rollout read. */
  stateNow?: () => Promise<RolloutState>;
}): Promise<PurchaseResult> {
  const notOpen = { ok: false as const, error: "This Millionea week is not open for tickets.", code: "INVALID" as const, reason: "millionea_week_not_open" as const };
  let state: RolloutState = "WITHDRAWN";
  try { state = await (input.stateNow ?? millioneaStateNow)(); } catch { state = "WITHDRAWN"; }
  const week = await weekStore.get(input.weekId);
  if (!week || !week.marketId) return notOpen;
  if (!rolloutSells(state, week.visibility)) {
    return { ok: false, error: "Millionea is not available yet.", code: "INVALID", reason: "millionea_not_available" };
  }
  const rules = frozenRules(week);
  if (!rules) return notOpen;
  const r = await buyPosition(input.userId, {
    marketId: week.marketId,
    side: "YES",
    stake: rules.ticketPriceTzs * input.slips.length,
    idempotencyKey: input.idempotencyKey,
    playStartedAt: input.playStartedAt,
    maswali: { weekId: week.id, slips: input.slips },
  });
  // S5 · a sale moved the week's pool: the live hub hears it, coalesced, after the purchase committed (MB-31). A replay
  // moved nothing.
  if (r.ok && !r.data?.replayed) noteMaswaliPoolChanged(week.id);
  return r;
}

// ── THE CLOSE ───────────────────────────────────────────────────────────────────────────────────────

/**
 * MB-28 · move the sales close. Earlier: never inside the next `minLead`; later: never past the first event − buffer.
 * `expectedClosesAt` is the close the officer reviewed (S5 review A3): a page drawn before another officer's move must not
 * move a close it never saw — 12:00 → 16:00 believed to be 18:00 → 16:00 would re-open sales that move had cut. The two
 * writes (the week's close, its market's cutoff) take the chain lock's transaction and land together (DATA-LAYER rule 2).
 */
export async function moveClose(input: { weekId: string; toCloseAt: string; expectedClosesAt: string; officerId: string; now?: Date }): Promise<Result<{ week: StoredWeek; recorded: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const toMs = Date.parse(input.toCloseAt);
  if (!Number.isFinite(toMs)) return refuse("The new close is not a time.");
  const reviewedMs = typeof input.expectedClosesAt === "string" ? Date.parse(input.expectedClosesAt) : NaN;
  if (!Number.isFinite(reviewedMs)) return refuse("Reload the week and review its close before moving it.");
  const res = await withLock(MASWALI_CHAIN_LOCK, async (tx): Promise<Result<{ week: StoredWeek; owed: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "OPEN") return refuse(`Week ${week.code} is ${week.state}; only an open week's close can move.`);
    const fromMs = Date.parse(week.closesAt);
    if (fromMs !== reviewedMs) return refuse(`The close changed since you reviewed it: it is now ${week.closesAt}. Reload the week and review it again before moving it.`);
    if (fromMs <= nowMs) return refuse("The close has already passed; it can never move back (MR-13).");
    const rules = frozenRules(week);
    if (!rules) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    // Every sold ticket keeps its free-cancel window (RULES §2.6, frozen in the week's feeSnapshot): an earlier close must
    // still leave that window and one more minute of grace.
    const market = week.marketId ? await marketStore.get(week.marketId) : null;
    const graceMin = (market?.feeSnapshot as { freeExitGraceMinutes?: number } | undefined)?.freeExitGraceMinutes ?? DEFAULT_FREE_EXIT_GRACE_MINUTES;
    const minLeadMs = (graceMin + 1) * 60_000;
    if (toMs < nowMs + minLeadMs) return refuse(`An earlier close must still be at least ${graceMin + 1} minutes away, so every ticket keeps its free-cancel window.`);
    const questions = await questionStore.listForWeek(week.id);
    const earliest = Math.min(...questions.map((q) => Date.parse(q.eventStartsAt)));
    if (toMs > earliest - rules.minLockBufferMinutes * 60_000) return refuse(`The close must stay at least ${rules.minLockBufferMinutes} minutes before the first event.`);
    if (toMs === fromMs) return refuse("That is already the close.");
    const won = await weekStore.moveClose(week.id, week.closesAt, new Date(toMs).toISOString(), tx ?? undefined);
    if (!won) return refuse("The close changed while it was being moved; refresh and try again.");
    if (week.marketId) await marketStore.stamp(week.marketId, { selectionClosedAt: new Date(toMs).toISOString(), updatedAt: new Date(nowMs).toISOString() } as never, tx ?? undefined);
    return { ok: true, week: (await weekStore.get(week.id, tx ?? undefined))!, owed: [{ category: "ADMIN", action: "maswali.week.close_moved", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, from: week.closesAt, to: new Date(toMs).toISOString() } }] };
  });
  if (!res.ok) return res;
  // S5-FIX-SRV · the move's audit row is owed, written once the move has committed (finding 2): `recorded` says it landed.
  return { ok: true, week: res.week, recorded: await recordOwed(res.owed) };
}

/** A week's frozen rules, or null when they cannot be read (a week past DRAFT always has them). */
export function frozenRules(week: StoredWeek): MaswaliRulesSnapshot | null {
  const r = readMaswaliRulesSnapshot(week.rulesSnapshot);
  return r.ok ? r.rules : null;
}

/**
 * ⭐ CLOSE THE SALES, EXACTLY ONCE: the commitment over every live ticket (MR-13), its count and its sales, stamped in
 * one claim WHERE the week is still OPEN. `early` closes now (a certain week void stops sales at once, MR-18).
 */
export async function closeWeek(input: { weekId: string; actorId?: string; early?: boolean; now?: Date }): Promise<Result<{ week: StoredWeek; already?: boolean; recorded: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const res = await withLock(MASWALI_CHAIN_LOCK, async (lockTx): Promise<Result<{ week: StoredWeek; already?: boolean; owed?: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "OPEN") return week.closedAt ? { ok: true, week, already: true } : refuse(`Week ${week.code} is ${week.state}.`);
    if (!input.early && Date.parse(week.closesAt) > nowMs) return refuse("The close has not arrived.");
    const rules = frozenRules(week);
    if (!rules) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    // ⭐ R2 (adversarial review, 2026-10-17) · THE CLOSE WAITS FOR EVERY PURCHASE AND CANCEL IN FLIGHT. Both commit inside
    // `market:<id>` (taken after `wallet:`); the close takes that lock too, inside the chain lock — the settlement's own
    // order — so it lists the live tickets only once an in-flight purchase or cancel has committed, and a purchase or
    // cancel that waited behind it re-reads the week inside that lock and finds it closed. Without it, a purchase passing
    // its clock check an instant before the close committed after the list: a LIVE ticket outside the root, and counts
    // the settlement refuses for good.
    const seal = async (): Promise<Result<{ week: StoredWeek; already?: boolean; owed?: OwedAudit[] }>> => {
      const live = await ticketStore.listForWeek(week.id, { status: "LIVE" });
      const root = merkleRoot(live.map((t) => ({ ticketId: t.id, leaf: t.selectionsHash })));
      // S5-FIX-SRV · the commitment and the market's cutoff take the chain lock's ONE transaction (the market lock joins it):
      // they commit together or not at all; the audit row is owed, and the hub's notice follows the commit.
      const won = await weekStore.stampClose(week.id, { closedAt: new Date(nowMs).toISOString(), ticketCount: live.length, salesAtClose: live.length * rules.ticketPriceTzs, ticketMerkleRoot: root }, lockTx ?? undefined);
      if (!won) return { ok: true, week: (await weekStore.get(week.id, lockTx ?? undefined))!, already: true };
      if (week.marketId && input.early) await marketStore.stamp(week.marketId, { selectionClosedAt: new Date(nowMs).toISOString(), updatedAt: new Date(nowMs).toISOString() } as never, lockTx ?? undefined);
      // S5 · the sales are final: the hub's figure stops moving with sales from here (noted once the close has committed).
      afterCommit(lockTx, () => noteMaswaliPoolChanged(week.id));
      return { ok: true, week: (await weekStore.get(week.id, lockTx ?? undefined))!, owed: [{ category: "ADMIN", action: "maswali.week.closed", actorId: input.actorId ?? SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
        payload: { code: week.code, ticketCount: live.length, ticketMerkleRoot: root, early: input.early === true } }] };
    };
    return week.marketId ? withLock(`market:${week.marketId}`, seal) : seal();
  });
  if (!res.ok) return res;
  // Written once the close has committed (finding 2); a close that was already made owes nothing.
  return { ok: true, week: res.week, already: res.already, recorded: await recordOwed(res.owed ?? []) };
}

// ── SEALING ─────────────────────────────────────────────────────────────────────────────────────────

/** The outcome a question counts with: sealed, and — when the two-officer flag was on at stage 1 — confirmed. */
function finalOutcome(q: StoredQuestion): MaswaliOutcome | null {
  if (q.outcome === null) return null;
  if (q.twoOfficerAtStage1 === true && !q.stage2By) return null;
  return q.outcome;
}
export const gradable = (qs: StoredQuestion[]): GradableQuestion[] => qs.map((q) => ({ role: q.role, ordinal: q.ordinal, outcome: finalOutcome(q) }));

/** The objection window's end (OD-05): `hours` after it opens, never before `notBefore` EAT on its closing day. */
export function objectionWindowEnd(openedMs: number, hours: number, notBefore: string): number {
  const end = openedMs + hours * 3_600_000;
  const [h, m] = notBefore.split(":").map(Number);
  const eat = new Date(end + EAT_OFFSET_MS);
  const floorMs = Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate(), h, m) - EAT_OFFSET_MS;
  return Math.max(end, floorMs);
}

/**
 * ⭐ S5-FIX-SRV 2 · A SEAL, A CONFIRMATION AND A CORRECTION ARE EACH ONE TRANSACTION (DATA-LAYER rules 1 and 2). Every
 * write takes the chain lock's transaction — the question, the week, and the recompute's objection window — and the
 * recompute reads through it, so it sees the write it follows. The act's audit rows are OWED, not written, under the lock:
 * `recordOwed` writes them once the lock has committed, so no row ever describes a write that rolled back, and the act
 * reports whether every one was recorded. A refusal the recompute could still give after a write (unreadable frozen rules)
 * is asked BEFORE the first write; should one come anyway, it is thrown, so it escapes the lock and the act rolls back
 * whole — never a landed seal reported as failed (S5 review 2).
 */
type OwedAudit = Parameters<typeof audit>[0];
type GateNow = { gate: ReturnType<typeof settlementGate>; weekVoidCertain: boolean };
type OwedAuditWriter = (row: OwedAudit) => Promise<{ recorded: boolean }>;
/** The writer a test set, if any. On globalThis (S5-FIX-SRV): Next bundles a dev route and a server action apart, and the
 *  dev-only fault route (`/api/dev-test/maswali-audit-fault`) must reach the writer the console's actions use. */
const auditSeam = globalThis as typeof globalThis & { __50PICK_MLN_AUDIT_WRITER?: OwedAuditWriter | null };
/** ⚠️ TEST SEAM ONLY: the writer `recordOwed` uses (null restores `audit`). Refuses to set one in production. */
export function __setMaswaliAuditWriterForTests(writer: OwedAuditWriter | null): void {
  if (writer && process.env.NODE_ENV === "production") throw new Error("__setMaswaliAuditWriterForTests is a test seam and refuses to run in production.");
  auditSeam.__50PICK_MLN_AUDIT_WRITER = writer;
}

/** Write the rows an act owes, in order, after its lock committed. True only when every one was recorded; never throws. */
async function recordOwed(rows: readonly OwedAudit[]): Promise<boolean> {
  let all = true;
  for (const row of rows) {
    const r = await (auditSeam.__50PICK_MLN_AUDIT_WRITER ?? audit)(row).catch(() => ({ recorded: false }));
    if (!r.recorded) all = false;
  }
  return all;
}

/**
 * Seal one question. One officer, with evidence (MR-14). A VOID names its ground from the closed list and only when that
 * ground is available (MR-15). ⛔ An officer holding a ticket in the week may not seal it. YES/NO only after the close; a
 * VOID may come before it (a pre-close void that dooms the week stops sales at once). `recorded`: its audit rows landed.
 */
export async function sealQuestion(input: {
  weekId: string; slot: number; outcome: MaswaliOutcome; evidence: string; voidReason?: string | null; officerId: string; now?: Date;
  /** Tests only: the two-officer setting's read. */
  twoOfficerNow?: () => Promise<boolean | null>;
}): Promise<Result<GateNow & { recorded: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const evidence = input.evidence.trim();
  if (evidence.length < 10) return refuse("A seal records its evidence (at least 10 characters).");
  if (input.outcome !== "YES" && input.outcome !== "NO" && input.outcome !== "VOID") return refuse("A result is YES, NO or VOID.");
  if (input.outcome === "VOID" && !isMaswaliVoidReason(input.voidReason)) return refuse("A void names its ground from the closed list (MR-15).");
  if (input.outcome !== "VOID" && input.voidReason) return refuse("Only a VOID carries a void ground.");
  // ⛔ S7-F2 · THE TWO-OFFICER SETTING IS READ, OR THE SEAL REFUSES (MR-14; MB-82: its value at stage 1 is the seal's own).
  //    A read that could not ask answered the code default, one officer, so a seal made while it failed was single-officer
  //    with the setting ON — fail open. Asked before the lock and before any write, so a refusal leaves nothing behind.
  //    `confirmSeal` and `correctSeal` read no setting: each reads the seal's own stage-1 marker.
  const twoOfficer = await (input.twoOfficerNow ?? readRequireTwoOfficerResolution)().catch(() => null);
  if (twoOfficer === null) return refuse("The two-officer setting could not be read, so nothing was sealed. Try again in a moment.");
  const res = await withLock(MASWALI_CHAIN_LOCK, async (tx): Promise<Result<GateNow & { owed: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state === "SETTLED" || week.state === "VOIDED" || week.state === "DRAFT") return refuse(`Week ${week.code} is ${week.state}; nothing can be sealed.`);
    if (input.outcome !== "VOID" && week.state === "OPEN") return refuse("A YES or NO is sealed only after the sales close.");
    const questions = await questionStore.listForWeek(week.id);
    const q = questions.find((x) => x.slot === input.slot);
    if (!q) return refuse(`No ${slotLabel(input.slot)} in week ${week.code}.`);
    if (q.outcome !== null) return refuse(`${slotLabel(q.slot)} is already sealed; correct it through its own correction (OD-09).`);
    if (input.outcome === "VOID" && !voidGroundAvailable(input.voidReason as MaswaliVoidReason, Date.parse(q.voidDeadlineAt), nowMs)) {
      return refuse(`${slotLabel(q.slot)} cannot void on that ground before its void deadline (${q.voidDeadlineAt}).`);
    }
    const holds = (await ticketStore.listForUser(input.officerId, { cycleId: week.id })).some((t) => t.status !== "CANCELLED");
    if (holds) return refuse("An officer who holds a ticket in this week cannot seal its questions.");
    // The recompute after the write reads the frozen rules when this seal makes the graded set final: asked first.
    if (!frozenRules(week)) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    const at = new Date(nowMs).toISOString();
    await questionStore.patch(q.id, {
      outcome: input.outcome, voidReason: input.outcome === "VOID" ? (input.voidReason as MaswaliVoidReason) : null,
      evidence, sealedBy: input.officerId, sealedAt: at, twoOfficerAtStage1: twoOfficer,
    }, tx ?? undefined);
    if (week.state === "CLOSED") await weekStore.patch(week.id, { state: "RESOLVING" }, tx ?? undefined);
    const g = await recomputeGateLocked(week.id, nowMs, tx ?? undefined);
    if (!g.ok) throw new Error(g.error);
    return { ok: true, gate: g.gate, weekVoidCertain: g.weekVoidCertain, owed: [
      { category: "ADMIN", action: "maswali.question.sealed", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id,
        payload: { week: week.code, slot: slotLabel(q.slot), outcome: input.outcome, voidReason: input.voidReason ?? null, twoOfficer } },
      ...g.owed,
    ] };
  });
  if (!res.ok) return res;
  let recorded = await recordOwed(res.owed);
  if (res.weekVoidCertain) {
    // A certain week void while selling stops the sales at once (MR-18); the void itself waits for its objection window.
    const w = await weekStore.get(input.weekId);
    if (w?.state === "OPEN") {
      const closed = await closeWeek({ weekId: w.id, actorId: SYSTEM, early: true, now: new Date(nowMs) });
      if (closed.ok && !closed.recorded) recorded = false; // S5-FIX-SRV · the close this seal made is part of its record
    }
  }
  return { ok: true, gate: res.gate, weekVoidCertain: res.weekVoidCertain, recorded };
}

/** The second officer's confirmation of a seal made while the two-officer flag was on (MR-14). ⛔ Never the sealer. */
export async function confirmSeal(input: { weekId: string; slot: number; officerId: string; expectedOutcome: MaswaliOutcome; expectedSealedAt: string; now?: Date }): Promise<Result<{ recorded: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const res = await withLock(MASWALI_CHAIN_LOCK, async (tx): Promise<Result<{ weekVoidCertain: boolean; owed: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    // ⛔ S5 review 4 · the second half of a seal is refused once the week's results are final, as a seal and a correction
    //    are: on a SETTLED or VOIDED week it would rewrite the outcome the public register published.
    if (week.state !== "OPEN" && week.state !== "CLOSED" && week.state !== "RESOLVING") return refuse(`Week ${week.code} is ${week.state}; its seals are final.`);
    const q = (await questionStore.listForWeek(week.id)).find((x) => x.slot === input.slot);
    if (!q || q.outcome === null) return refuse("Nothing to confirm.");
    if (q.outcome !== input.expectedOutcome || q.sealedAt !== input.expectedSealedAt) {
      return refuse("This seal changed since you reviewed it. Refresh the week and read the result again.");
    }
    if (q.twoOfficerAtStage1 !== true) return refuse("This seal needs no second officer.");
    if (q.stage2By) return refuse("Already confirmed.");
    if (q.sealedBy === input.officerId) return refuse("The officer who sealed it cannot confirm it — a second officer must.");
    // The graded-set recompute runs after the stamp. Refuse an unreadable frozen snapshot before
    // changing the question, so a known recompute refusal cannot report a landed signoff as failed.
    if (!frozenRules(week)) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    await questionStore.patch(q.id, { stage2By: input.officerId, stage2At: new Date(nowMs).toISOString() }, tx ?? undefined);
    const g = await recomputeGateLocked(week.id, nowMs, tx ?? undefined);
    if (!g.ok) throw new Error(g.error);
    return { ok: true, weekVoidCertain: g.weekVoidCertain, owed: [
      { category: "ADMIN", action: "maswali.question.confirmed", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id, payload: { week: week.code, slot: slotLabel(q.slot) } },
      ...g.owed,
    ] };
  });
  if (!res.ok) return res;
  let recorded = await recordOwed(res.owed);
  if (res.weekVoidCertain) {
    // ⛔ S5 review 5 · with the two-officer rule on, a VOID counts only once confirmed — so the confirmation, not the seal,
    //    can make the week void certain while it sells. It stops the sales at once, as a seal does (MR-18).
    const w = await weekStore.get(input.weekId);
    if (w?.state === "OPEN") {
      const closed = await closeWeek({ weekId: w.id, actorId: SYSTEM, early: true, now: new Date(nowMs) });
      if (closed.ok && !closed.recorded) recorded = false; // S5-FIX-SRV · the close this confirmation made is part of its record
    }
  }
  return { ok: true, recorded };
}

/**
 * OD-09 · the sealer corrects their OWN seal, before payout, inside the objection window — which restarts once the graded
 * set is final again. ⛔ Never after SETTLED: a paid week is never clawed back. The corrected result, the restarted window
 * and the recompute commit together or not at all (S5-FIX-SRV 2): never a corrected result whose window did not restart.
 */
export async function correctSeal(input: {
  weekId: string; slot: number; outcome: MaswaliOutcome; evidence: string; voidReason?: string | null;
  expectedOutcome: MaswaliOutcome; expectedSealedAt: string; officerId: string; now?: Date;
}): Promise<Result<{ recorded: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const evidence = input.evidence.trim();
  if (evidence.length < 10) return refuse("A seal records its evidence (at least 10 characters).");
  if (input.outcome !== "YES" && input.outcome !== "NO" && input.outcome !== "VOID") return refuse("A result is YES, NO or VOID.");
  if (input.outcome === "VOID" && !isMaswaliVoidReason(input.voidReason)) return refuse("A void names its ground from the closed list (MR-15).");
  if (input.outcome !== "VOID" && input.voidReason) return refuse("Only a VOID carries a void ground.");
  if ((input.expectedOutcome !== "YES" && input.expectedOutcome !== "NO" && input.expectedOutcome !== "VOID") || !input.expectedSealedAt) {
    return refuse("Reload the week and review the sealed result before correcting it.");
  }
  const res = await withLock(MASWALI_CHAIN_LOCK, async (tx): Promise<Result<{ code: string; owed: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "RESOLVING" && week.state !== "CLOSED") return refuse(`Week ${week.code} is ${week.state}; its seals are final.`);
    if (week.objectionsCloseAt && Date.parse(week.objectionsCloseAt) <= nowMs) return refuse("The objection window has closed; the seal stands.");
    const q = (await questionStore.listForWeek(week.id)).find((x) => x.slot === input.slot);
    if (!q || q.outcome === null) return refuse("Nothing sealed to correct.");
    if (q.sealedBy !== input.officerId) return refuse("Only the officer who sealed a question may correct it; anyone else files an objection.");
    if (q.outcome !== input.expectedOutcome || q.sealedAt !== input.expectedSealedAt) {
      return refuse("The seal changed; reload the week and review it again before correcting it.");
    }
    if (input.outcome === "VOID" && !voidGroundAvailable(input.voidReason as MaswaliVoidReason, Date.parse(q.voidDeadlineAt), nowMs)) {
      return refuse(`${slotLabel(q.slot)} cannot void on that ground before its void deadline (${q.voidDeadlineAt}).`);
    }
    // The restarted window is read from the frozen rules after the write: asked first, as `confirmSeal` does.
    if (!frozenRules(week)) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    // Keep the reviewed seal version unique even if two writes share one clock millisecond.
    const revisedAt = new Date(Math.max(nowMs, Date.parse(q.sealedAt!) + 1)).toISOString();
    await questionStore.patch(q.id, {
      outcome: input.outcome, voidReason: input.outcome === "VOID" ? (input.voidReason as MaswaliVoidReason) : null,
      evidence, sealedAt: revisedAt, stage2By: null, stage2At: null,
    }, tx ?? undefined);
    // The graded set may have changed: the window restarts from the corrected record (OD-09).
    await weekStore.patch(week.id, { gradedSetFinalAt: null, objectionsCloseAt: null }, tx ?? undefined);
    const g = await recomputeGateLocked(week.id, nowMs, tx ?? undefined);
    if (!g.ok) throw new Error(g.error);
    return { ok: true, code: week.code, owed: [
      { category: "ADMIN", action: "maswali.question.corrected", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id,
        payload: { week: week.code, slot: slotLabel(q.slot), from: q.outcome, to: input.outcome } },
      ...g.owed,
    ] };
  });
  if (!res.ok) return res;
  // Committed: the register forgets the week only now, so no reader can re-cache the record as it was before.
  invalidateMillioneaRegisterWeek(res.code);
  return { ok: true, recorded: await recordOwed(res.owed) };
}

/**
 * Re-read the record and stamp the graded set final (and open the objection window) once the gate is ready. Under the lock,
 * on its transaction (`tx`): the reads see the write this follows, and the stamp commits with it. Its audit row is owed.
 */
async function recomputeGateLocked(weekId: string, nowMs: number, tx?: Prisma.TransactionClient): Promise<Result<GateNow & { owed: OwedAudit[] }>> {
  const week = await weekStore.get(weekId, tx);
  if (!week) return refuse("No such week.");
  const qs = gradable(await questionStore.listForWeek(week.id, tx));
  const gate = settlementGate(qs);
  const certain = weekVoidCertain(qs);
  const owed: OwedAudit[] = [];
  if (gate.ready && !week.gradedSetFinalAt && week.state !== "OPEN") {
    const rules = frozenRules(week);
    if (!rules) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    const end = objectionWindowEnd(nowMs, rules.objectionWindowHours, rules.objectionNotBeforeAt);
    await weekStore.patch(week.id, { gradedSetFinalAt: new Date(nowMs).toISOString(), objectionsCloseAt: new Date(end).toISOString() }, tx);
    owed.push({ category: "ADMIN", action: "maswali.week.graded_set_final", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, weekVoid: gate.weekVoid, objectionsCloseAt: new Date(end).toISOString() } });
  }
  return { ok: true, gate, weekVoidCertain: certain, owed };
}

/** The gate, re-read, for a caller outside a seal (the scheduler, the console). */
export async function recomputeGate(weekId: string, now?: Date): Promise<Result<GateNow>> {
  const res = await withLock(MASWALI_CHAIN_LOCK, (tx) => recomputeGateLocked(weekId, (now ?? new Date()).getTime(), tx ?? undefined));
  if (!res.ok) return res;
  await recordOwed(res.owed);
  return { ok: true, gate: res.gate, weekVoidCertain: res.weekVoidCertain };
}

/** The questions whose void deadline has passed unsealed — the system PROPOSES a void; an officer seals it (MR-15). */
export async function proposeVoidsAtDeadline(weekId: string, now?: Date): Promise<number[]> {
  const nowMs = (now ?? new Date()).getTime();
  const qs = await questionStore.listForWeek(weekId);
  return qs.filter((q) => q.outcome === null && Date.parse(q.voidDeadlineAt) <= nowMs).map((q) => q.slot);
}

// ── THE WEEK VOID ───────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ MR-18 · VOID THE WHOLE WEEK — every live ticket refunded in full, no fee, no top-up, R untouched. Two steps, each
 * exactly once, and retried until both have happened (R1):
 *   1 · THE DECISION: only once the void is certain on the FINAL record, its objection window has closed and no objection
 *       stands (an upheld one could reinstate a question), the week is stamped VOIDED in one claim (`stampVoid`), which
 *       stops every other act on it. It is never undone.
 *   2 · THE REFUNDS (`refundVoidedWeek`): one bulk transaction that refunds every live ticket and stamps the market settled
 *       — the one truth that they landed. A refusal or a rollback leaves the week VOIDED and owed: calling this again on
 *       a VOIDED week resumes them, the tick and the heal retry it, and the console raises it until it lands.
 * On a week already refunded it changes nothing and answers `already`.
 */
export async function voidWeek(input: { weekId: string; actorId?: string; now?: Date }): Promise<Result<{ week: StoredWeek; already?: boolean; refunded?: number; recorded: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const stamped = await withLock(MASWALI_CHAIN_LOCK, async (lockTx): Promise<Result<{ week: StoredWeek; owed?: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state === "VOIDED") return { ok: true, week };
    if (week.state !== "RESOLVING" && week.state !== "CLOSED") return refuse(`Week ${week.code} is ${week.state}.`);
    const gate = settlementGate(gradable(await questionStore.listForWeek(week.id)));
    if (!gate.ready || !gate.weekVoid) return refuse("The week void is not final: voided mains do not outnumber the usable reserves on the sealed record.");
    if (!week.objectionsCloseAt || Date.parse(week.objectionsCloseAt) > nowMs) return refuse("The objection window is still open; an upheld objection could reinstate a question.");
    if (!week.marketId) return refuse("The week has no market.");
    // The poll's settlement gate refused a standing objection after this stamp, and stranded the week (R1): it is asked
    // HERE now, before the decision is made. Read fail-closed, as the settlement reads it.
    const { countOpenObjections } = await import("./objections-service");
    if ((await countOpenObjections(week.marketId)) > 0) return refuse(`An objection is standing against week ${week.code}; it voids once every objection is decided.`);
    // S5-FIX-SRV · the decision takes the chain lock's transaction; its audit row is owed, and the register forgets the
    // week once it has committed.
    const won = await weekStore.stampVoid(week.id, lockTx ?? undefined);
    const after = (await weekStore.get(week.id, lockTx ?? undefined))!;
    if (!won) return after.state === "VOIDED" ? { ok: true, week: after } : refuse(`Week ${week.code} changed while it was being voided; refresh and try again.`);
    afterCommit(lockTx, () => invalidateMillioneaRegisterWeek(week.code));
    return { ok: true, week: after, owed: [{ category: "ADMIN", action: "maswali.week.voided", actorId: input.actorId ?? SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, marketId: week.marketId, ticketCount: week.ticketCount } }] };
  });
  if (!stamped.ok) return stamped;
  // Written once the decision has committed, before the refunds (finding 2): `recorded` says whether it landed.
  const recorded = await recordOwed(stamped.owed ?? []);
  const r = await refundVoidedWeek(stamped.week.id);
  if (!r.ok) {
    return refuse(`Week ${stamped.week.code} is VOIDED, and its refunds have not landed: ${r.error} The tick retries them; the heal runs them now.${recorded ? "" : " The void's audit record could not be written either: tell an administrator."}`);
  }
  if (!r.already) invalidateMillioneaRegisterWeek(stamped.week.code);
  // S5 · a voided week is final, so the next week of its line can count its carry (MR-3): every open figure moves.
  if (!r.already) noteMaswaliPoolChanged();
  return { ok: true, week: (await weekStore.get(input.weekId))!, already: r.already, refunded: r.tickets, recorded };
}

// ── THE CARRY ───────────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ R3 · A WEEK'S PLACE IN THE CHAIN IS ITS CALENDAR WEEK (MR-3), never the order it was drafted in (`seq`): the Monday
 * 00:00 EAT its ISO week starts. Read from `finalDeadlineAt`, which the draft stamps inside the following week and nothing
 * ever moves — `opensAt` becomes the real open instant at the open, and the close may move. One line never holds two
 * weeks of one ISO week (the code is unique), so this orders a line strictly.
 */
export function calendarStartMs(week: Pick<StoredWeek, "finalDeadlineAt">): number {
  return eatWeekStartMs(Date.parse(week.finalDeadlineAt)) - 7 * DAY_MS;
}

/**
 * MR-3 · the week of this line that comes before `week` in the chain — an earlier calendar week that has opened — and is
 * not terminal yet; or null when `week` may claim its carry and settle. A DRAFT is never in the chain: it has sold
 * nothing, and once a later week of its line has opened it can never open (`openWeek`, R3).
 */
export async function carryBlocker(week: StoredWeek): Promise<StoredWeek | null> {
  const at = calendarStartMs(week);
  const earlier = (await weekStore.list({ visibility: week.visibility })).filter((w) => w.id !== week.id && w.state !== "DRAFT" && calendarStartMs(w) < at);
  return earlier.find((w) => w.state !== "SETTLED" && w.state !== "VOIDED") ?? null;
}

/**
 * MR-21 · CLAIM THE CARRY, ONCE, IN CHAIN ORDER. A week claims R only after every earlier week of its visibility is
 * terminal (MR-3), and the claim is a conditional write (`rolloverIn` IS NULL). `readJackpot` is S3's ledger read.
 * ⚠️ Standalone, the claim commits at once. The release (`settleMaswaliWeek`) never calls this: it claims inside its own
 * money transaction (R3), so a claim there persists only with its payout.
 */
export async function claimCarry(input: { weekId: string; readJackpot: () => Promise<number | null> }): Promise<Result<{ rolloverIn: number; already?: boolean; recorded: boolean }>> {
  const res = await withLock(MASWALI_CHAIN_LOCK, async (lockTx): Promise<Result<{ rolloverIn: number; already?: boolean; owed?: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.rolloverIn != null) return { ok: true, rolloverIn: week.rolloverIn, already: true };
    const blocking = await carryBlocker(week);
    if (blocking) return refuse(`Week ${blocking.code} is not settled yet; the carry is claimed strictly in order (MR-3).`);
    const r = await input.readJackpot().catch(() => null);
    if (r === null || !Number.isSafeInteger(r) || r < 0) return refuse("The jackpot balance could not be read, so no carry was claimed.");
    // S5-FIX-SRV · the claim takes the chain lock's transaction; its audit row is owed, written once that has committed.
    const won = await weekStore.claimCarry(week.id, r, lockTx ?? undefined);
    if (!won) return { ok: true, rolloverIn: (await weekStore.get(week.id, lockTx ?? undefined))?.rolloverIn ?? r, already: true };
    return { ok: true, rolloverIn: r, owed: [{ category: "ADMIN", action: "maswali.week.carry_claimed", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id, payload: { code: week.code, rolloverIn: r } }] };
  });
  if (!res.ok) return res;
  return { ok: true, rolloverIn: res.rolloverIn, already: res.already, recorded: await recordOwed(res.owed ?? []) };
}

// ── THE SUNSET (MR-30, OD-03) ───────────────────────────────────────────────────────────────────────

export const SUNSET_WORD = "SUNSET MILLIONEA";
/** OD-03: a final week is announced at least one full week before its sales open. */
const SUNSET_NOTICE_MS = 7 * DAY_MS;

/**
 * Where the product's life stands, read from the PUBLIC line of weeks (a DRIVE week is never final):
 *   · LIVE      — no final week;
 *   · ENDING    — a final week is drafted, selling or being graded: nothing after it may open;
 *   · RETIRED   — a final week settled with sales: Millionea has ended, nothing opens again;
 *   · PASSES_ON — the final week voided or sold nothing (OD-03): the next week to open becomes final.
 */
export async function sunsetState(): Promise<{ kind: "LIVE" } | { kind: "ENDING" | "RETIRED" | "PASSES_ON"; week: StoredWeek }> {
  // The latest final week in the CALENDAR (R3): a week the role passed on to may have been drafted before the one it replaced.
  const finals = (await weekStore.list({ visibility: "PUBLIC" })).filter((w) => w.isFinal).sort((a, b) => calendarStartMs(b) - calendarStartMs(a));
  const last = finals[0];
  if (!last) return { kind: "LIVE" };
  if (last.state === "VOIDED" || (last.state === "SETTLED" && (last.salesAtClose ?? 0) === 0)) return { kind: "PASSES_ON", week: last };
  if (last.state === "SETTLED") return { kind: "RETIRED", week: last };
  return { kind: "ENDING", week: last };
}

/**
 * ⭐ THE OWNER STOPS THE PRODUCT (MR-30, OD-03) — by making one week the FINAL week. It runs normally; if no ticket gets
 * 10 of 10, the highest score shares the whole jackpot (`maswali-settlement.ts`). ⛔ The caller is the Owner's ceremony
 * (S4, `requireOwner`); this checks the typed words and the rules:
 *   · the current week (open, closed or being graded) may be made final at once — an Owner-ordered stop mid-week;
 *   · a drafted week may be made final only if its sales open at least a full week from now (the announcement);
 *   · no week after it may already have opened, and no other final week may still be running.
 * A regulator-ordered stop (refund the current week; the pool to the last fully graded week's top tickets) is NOT this
 * act — it is S4's own ceremony.
 */
export async function sunsetMaswali(input: { weekId: string; ownerId: string; typed: string; reason: string; now?: Date }): Promise<Result<{ week: StoredWeek; recorded: boolean }>> {
  if (input.typed.trim() !== SUNSET_WORD) return refuse(`Type ${SUNSET_WORD} to make this the final week.`);
  const reason = input.reason.trim();
  if (reason.length < MASWALI_REASON_MIN || reason.length > MASWALI_REASON_MAX) return refuse(`Write why Millionea is being stopped (${MASWALI_REASON_MIN}–${MASWALI_REASON_MAX} characters).`);
  const nowMs = (input.now ?? new Date()).getTime();
  const res = await withLock(MASWALI_CHAIN_LOCK, async (lockTx): Promise<Result<{ week: StoredWeek; owed?: OwedAudit[] }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.visibility !== "PUBLIC") return refuse("A drive week is never the final week.");
    if (week.isFinal) return { ok: true, week };
    if (week.state === "SETTLED" || week.state === "VOIDED") return refuse(`Week ${week.code} is already ${week.state}.`);
    if (week.state === "DRAFT" && Date.parse(week.opensAt) - nowMs < SUNSET_NOTICE_MS) {
      return refuse(`Week ${week.code} opens in less than a week; a final week is announced a full week ahead (OD-03). To stop now, make the current week final.`);
    }
    const life = await sunsetState();
    if (life.kind === "ENDING" || life.kind === "RETIRED") return refuse(`Week ${life.week.code} is already the final week.`);
    const later = (await weekStore.list({ visibility: "PUBLIC" })).find((w) => w.state !== "DRAFT" && calendarStartMs(w) > calendarStartMs(week));
    if (later) return refuse(`Week ${later.code} has already opened after week ${week.code}; the final week is the last one to open.`);
    // S5-FIX-SRV · the mark takes the chain lock's transaction; the Owner's order is owed, audited once it has committed.
    await weekStore.patch(week.id, { isFinal: true }, lockTx ?? undefined);
    return { ok: true, week: (await weekStore.get(week.id, lockTx ?? undefined))!, owed: [{ category: "COMPLIANCE", action: "maswali.sunset.ordered", actorId: input.ownerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, state: week.state, reason } }] };
  });
  if (!res.ok) return res;
  return { ok: true, week: res.week, recorded: await recordOwed(res.owed ?? []) };
}

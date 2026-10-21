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
import { audit } from "./audit";
import { randomId } from "./crypto";
import { afterCommit, withLock } from "./locks";
import { buyPosition, createMarket, isFencedMaswali } from "./market-service";
import { dbNowMs, landedMaswaliAnswer } from "./maswali-money-service";
import { refundVoidedWeek } from "./maswali-void";
import { millioneaStateNow } from "./millionea-switch";
import type { RolloutState } from "@/lib/millionea-rollout";
import { marketStore } from "./market-dal";
import { isSourceTrusted, seedDefaultSources } from "./source-registry";
import { readRequireTwoOfficerResolution } from "./resolution-policy";
import { getMaswaliConfig, readMaswaliConfigFresh, readMaswaliRulesSnapshot, snapshotMaswaliRules, unsettledFloors, type MaswaliRulesSnapshot } from "./maswali-config";
import { licenceBasisAllowsOpen, readLicenceBasisFresh } from "./maswali-licence";
import { questionStore, ticketStore, weekStore, type DraftQuestionFields, type EventKind, type StoredQuestion, type StoredWeek, type WeekVisibility } from "./maswali-dal";
import { MARKET_CATEGORIES, type MarketCategory } from "@/lib/markets/categories";
import { EAT_OFFSET_MS, eatWeekAt, eatWeekCode, eatWeekStartMs } from "@/lib/eat-day";
import { zonedToUtcMs } from "@/lib/maswali-time";
import { bannedTopicHits } from "@/lib/maswali-topics";
import { MAIN_COUNT, RESERVE_COUNT, settlementGate, slotLabel, slotOf, weekVoidCertain, type GradableQuestion, type MaswaliOutcome, type MaswaliPick } from "@/lib/maswali-score";
import { guaranteeRequirement } from "@/lib/maswali-money";
import { DEFAULT_FREE_EXIT_GRACE_MINUTES } from "@/lib/payout";
import { merkleRoot, questionSetHash, type FrozenQuestion } from "@/lib/maswali-commitment";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_LABEL, voidGroundAvailable, type MaswaliVoidReason } from "@/lib/maswali-void-reason";
import { noteMaswaliPoolChanged } from "./maswali-pool-feed";
import { formatTzs } from "@/lib/utils";

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

/** A drafted question's stored fields, or the reason it cannot be stored. */
function draftFields(q: DraftQuestionInput, finalDeadlineMs: number, voidDeadlineHours: number): DraftQuestionFields | string {
  let slot: number;
  try { slot = slotOf(q.role, q.ordinal); } catch (e) { return (e as Error).message; }
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
    probabilityEstimate: q.probabilityEstimate ?? null, probabilitySource: q.probabilitySource?.trim() || null, linkedMarketId: q.linkedMarketId ?? null,
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
}): Promise<Result<{ week: StoredWeek }>> {
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
  return withLock(MASWALI_CHAIN_LOCK, async () => {
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
    await weekStore.create(week);
    await questionStore.createMany(week.id, rows);
    audit({ category: "ADMIN", action: "maswali.week.drafted", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code, seq: week.seq, visibility, opensAt: week.opensAt, closesAt: week.closesAt } });
    return { ok: true, week };
  });
}

/** Edit a DRAFT question. ⛔ Refused past DRAFT (the DAL also refuses any non-draft column); clears the parity attestation. */
export async function editDraftQuestion(input: { weekId: string; slot: number; changes: Partial<DraftQuestionInput>; officerId: string }): Promise<Result> {
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "DRAFT") return refuse(`Week ${week.code} is ${week.state}: its questions are frozen (MR-13).`);
    const q = (await questionStore.listForWeek(week.id)).find((x) => x.slot === input.slot);
    if (!q) return refuse(`No ${slotLabel(input.slot)} in week ${week.code}.`);
    const cfg = getMaswaliConfig();
    // ⛔ An edit never moves a question: its role and ordinal (and so its slot) are the draft's, whatever was sent.
    const { role: _role, ordinal: _ordinal, ...changes } = input.changes;
    void _role; void _ordinal;
    const merged: DraftQuestionInput = {
      category: q.category, textEn: q.textEn, textSw: q.textSw, textZh: q.textZh,
      criterionEn: q.criterionEn, criterionSw: q.criterionSw, criterionZh: q.criterionZh, sourceUrl: q.sourceUrl,
      fallbackSourceUrl: q.fallbackSourceUrl, readingTolerance: q.readingTolerance, eventKind: q.eventKind,
      eventLocalStart: utcToLocalInput(q.eventStartsAt, q.eventZone), eventZone: q.eventZone,
      probabilityEstimate: q.probabilityEstimate, probabilitySource: q.probabilitySource, linkedMarketId: q.linkedMarketId,
      ...changes, role: q.role, ordinal: q.ordinal,
    };
    const f = draftFields(merged, Date.parse(week.finalDeadlineAt), cfg.voidDeadlineHours);
    if (typeof f === "string") return refuse(f);
    const { role: _r, ordinal: _o, slot: _s, ...editable } = f;
    void _r; void _o; void _s;
    await questionStore.editDraftQuestion(q.id, editable);
    if (week.parityAttestedBy) await weekStore.patch(week.id, { parityAttestedBy: null, parityAttestedAt: null });
    audit({ category: "ADMIN", action: "maswali.week.draft_edited", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { slot: input.slot, fields: Object.keys(input.changes) } });
    return { ok: true };
  });
}

/** The officer's view of a stored start: the local "YYYY-MM-DDTHH:MM" in its own zone. */
function utcToLocalInput(iso: string, zone: string): string {
  const t = Date.parse(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** MB-79: a second reader confirms the three languages say the same thing. ⛔ Never the officer who drafted the week. */
export async function attestParity(input: { weekId: string; officerId: string; now?: Date }): Promise<Result> {
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "DRAFT") return refuse(`Week ${week.code} is no longer a draft.`);
    if (week.createdBy === input.officerId) return refuse("The officer who drafted the week cannot attest its translations — a second reader must.");
    const at = (input.now ?? new Date()).toISOString();
    await weekStore.patch(week.id, { parityAttestedBy: input.officerId, parityAttestedAt: at });
    audit({ category: "COMPLIANCE", action: "maswali.week.parity_attested", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id, payload: { code: week.code } });
    return { ok: true };
  });
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
 * ⛔ S7-F2 · an unsettled week whose frozen rules cannot be read has an unknown floor, so the requirement is unknown and
 *    no week opens — it was counted at this week's floor, a stand-in that understates a week frozen with a higher one.
 */
export async function guaranteeProblem(week: StoredWeek, rules: MaswaliRulesSnapshot, guarantee: GuaranteeReader): Promise<string | null> {
  const unsettled = await weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING"] });
  const floors = unsettledFloors(unsettled);
  if (!floors.ok) {
    return `Week ${floors.unreadable.map((w) => w.code).join(", ")}: its frozen rules cannot be read, so what the guarantee must cover is unknown; no week opens until they can be (OD-02).`;
  }
  const need = guaranteeRequirement([...floors.weeks, { floor: rules.floorTzs, confirmedCarryIn: week.rolloverIn }]);
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
 * ⭐ S7 · A WEEK'S DEADLINES UNDER THE RULES IT FREEZES (lane L's review, finding 8). The draft stamps its final deadline
 * and each question's void deadline from the config of the day it was drafted or edited, but the rules freeze at the
 * open: a config edit in between left a week running on deadlines its own snapshot does not state. So the open
 * recomputes both from the snapshot — the final deadline at the snapshot's weekday and time of the results week, each
 * void deadline the snapshot's hours after its event, capped at that final deadline (OD-09b) — and the builder's
 * checklist reads the same recompute, so it never judges a deadline the open would not keep. Pure.
 */
export function deadlinesUnderRules(week: StoredWeek, questions: StoredQuestion[], rules: MaswaliRulesSnapshot): { week: StoredWeek; questions: StoredQuestion[] } {
  const finalMs = eatWeekAt(calendarStartMs(week) + 7 * DAY_MS, rules.finalDeadlineWeekday, rules.finalDeadlineAt);
  return {
    week: { ...week, finalDeadlineAt: new Date(finalMs).toISOString() },
    questions: questions.map((q) => ({ ...q, voidDeadlineAt: new Date(Math.min(Date.parse(q.eventStartsAt) + rules.voidDeadlineHours * 3_600_000, finalMs)).toISOString() })),
  };
}

/**
 * ⭐ OPEN A WEEK. Fresh reads, every check, then ONE claim: the market is created and the rules, the question-set hash and
 * the market are stamped WHERE the week is still DRAFT, and the state becomes OPEN. All of it runs inside the chain lock,
 * so no second open can race it. A ticket can only be bought against an OPEN week's own market (S3), so even a lost claim
 * could leave nothing on sale. The week's deadlines are re-frozen from its rules first (`deadlinesUnderRules`).
 */
export async function openWeek(input: { weekId: string; officerId: string; guarantee: GuaranteeReader; now?: Date }): Promise<Result<{ week: StoredWeek }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const [fresh, licence] = await Promise.all([readMaswaliConfigFresh(), readLicenceBasisFresh()]);
  if (!fresh.ok) return refuse(`The Millionea rules could not be read, so nothing was opened: ${fresh.error}`);
  if (!licence.ok) return refuse("The licence record could not be read, so nothing was opened.");
  if (!licenceBasisAllowsOpen(licence.basis)) return refuse(NO_LICENCE_BASIS);
  return withLock(MASWALI_CHAIN_LOCK, async (lockTx) => {
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
    // ⛔ MR-30 · OD-03 · A FINAL WEEK OPENS NO EARLIER THAN ANNOUNCED. The hub and the home card name it, with its drafted
    //    open, from the moment it is made final: that is the time its buyers were told, and an early press would cut the
    //    notice the rules promise (the S6 legal review, round 2). An ordinary week may still open early.
    if (week.isFinal && nowMs < Date.parse(week.opensAt)) {
      return refuse(`Week ${week.code} is the final week, announced to open at ${week.opensAt}; it cannot open before then.`);
    }
    const rules = snapshotMaswaliRules(fresh.config, new Date(nowMs));
    // The trusted-source registry seeds its defaults on first use, as every publish path does before it asks.
    await seedDefaultSources();
    // ⭐ S7 · the week runs on its frozen rules' deadlines: every check, the commitment and the market below read them.
    const drafted = await questionStore.listForWeek(week.id);
    const { week: due, questions } = deadlinesUnderRules(week, drafted, rules);
    const problems = await openProblems(due, questions, rules, nowMs);
    const short = await guaranteeProblem(due, rules, input.guarantee);
    if (short) problems.push(short);
    if (problems.length) return refuse(problems.join(" "));

    const qHash = questionSetHash(questions.map((q): FrozenQuestion => ({
      role: q.role, ordinal: q.ordinal, slot: q.slot, category: q.category, textEn: q.textEn, textSw: q.textSw, textZh: q.textZh,
      criterionEn: q.criterionEn, criterionSw: q.criterionSw, criterionZh: q.criterionZh, sourceUrl: q.sourceUrl,
      fallbackSourceUrl: q.fallbackSourceUrl, eventStartsAt: q.eventStartsAt, eventZone: q.eventZone, voidDeadlineAt: q.voidDeadlineAt,
    })));
    // The draft's rows take the deadlines the commitment covers before the market exists — each moved void deadline here
    // (the week is still DRAFT, under the chain lock), the final deadline in the open's one claim — audited when one moved.
    // S7-F8 · the moved deadlines take the chain lock's transaction (they land with the open or not at all), and the row
    // that records them is owed, written once that transaction has committed (finding 2's writer).
    const movedVoids = questions.filter((q, i) => q.voidDeadlineAt !== drafted[i].voidDeadlineAt);
    if (movedVoids.length > 0) {
      await questionStore.editDraftQuestions(movedVoids.map((q) => ({ id: q.id, fields: { voidDeadlineAt: q.voidDeadlineAt } })), lockTx ?? undefined);
    }
    const finalMoved = due.finalDeadlineAt !== week.finalDeadlineAt;
    if (finalMoved || movedVoids.length > 0) {
      afterCommit(lockTx, () => void recordOwed([{ category: "ADMIN", action: "maswali.week.deadlines_refrozen", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
        payload: {
          code: week.code, finalDeadlineAt: finalMoved ? { from: week.finalDeadlineAt, to: due.finalDeadlineAt } : null,
          voidDeadlines: movedVoids.map((q) => ({ slot: q.slot, from: drafted.find((d) => d.id === q.id)?.voidDeadlineAt ?? null, to: q.voidDeadlineAt })),
        } }]));
    }
    const market = await createMarket({
      titleEn: `Maswali Millionea · ${week.code}`, titleSw: `Maswali Millionea · ${week.code}`, titleZh: `Maswali Millionea · ${week.code}`,
      category: (questions[0]?.category as MarketCategory) ?? "other",
      sourceUrl: questions[0]?.sourceUrl ?? "https://50pick.tz/millionea",
      resolutionCriterion: `Maswali Millionea week ${week.code}: fifteen questions graded by the published rules; question set ${qHash}.`,
      resolutionAt: due.finalDeadlineAt,
      selectionClosedAt: week.closesAt,
      proposedBy: input.officerId,
      productLine: "MASWALI",
      // The week freezes the jackpot model and its rate beside the global levies, and NO paid exit (MB-50).
      rateOverrides: { feeModel: "jackpot-payout", jackpotFeeRate: fresh.config.jackpotFeeRate, paidExitWindowMinutes: 0 },
    });
    const won = await weekStore.stampOpen(week.id, { marketId: market.id, rulesSnapshot: rules, questionSetHash: qHash, opensAt: new Date(nowMs).toISOString(), finalDeadlineAt: due.finalDeadlineAt });
    if (!won) return refuse(`Week ${week.code} changed while it was being opened; nothing was opened. Refresh and try again.`);
    if (life.kind === "PASSES_ON" && !week.isFinal) {
      await weekStore.patch(week.id, { isFinal: true });
      audit({ category: "COMPLIANCE", action: "maswali.sunset.passed_on", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
        payload: { code: week.code, from: life.week.code, fromState: life.week.state } });
    }
    const opened = (await weekStore.get(week.id))!;
    audit({ category: "ADMIN", action: "maswali.week.opened", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, marketId: market.id, questionSetHash: qHash, closesAt: week.closesAt, finalDeadlineAt: due.finalDeadlineAt, rules, isFinal: opened.isFinal } });
    // S5 · a week on sale has a pool figure now (the frame is derived after the open commits).
    noteMaswaliPoolChanged(week.id);
    return { ok: true, week: opened };
  });
}

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
  /**
   * MR-30 · whether the buyer's slip stated the final week's rule when it was opened. The player's form always says
   * (`buyMillioneaFromForm`: a form that is silent did not state it); a server caller with no slip leaves it out.
   */
  shownFinal?: boolean;
  /** Tests only: the rollout read. */
  stateNow?: () => Promise<RolloutState>;
}): Promise<PurchaseResult> {
  const notOpen = { ok: false as const, error: "This Millionea week is not open for tickets.", code: "INVALID" as const, reason: "millionea_week_not_open" as const };
  // ⛔ S7 (L6) · A READ THAT FAILS REFUSES, NEVER THROWS. Nothing has moved before `buyPosition`, so the buyer is told
  //    exactly that and may retry with the same key: the platform's busy answer (`system_busy`, the stake never moved),
  //    the one the ticket arm gives when its own desk read fails (R10b). Calling a week on sale shut, or Millionea
  //    unavailable, would send its buyer away.
  const busy = (what: string, err: unknown) => {
    console.error(`[maswali] ${what} could not be read, so the purchase is refused:`, (err as Error)?.message ?? err);
    return { ok: false as const, error: "We're busy right now — your stake hasn't moved. Try again in a moment.", code: "BUSY" as const, reason: "system_busy" as const, retryAfterSec: 1 };
  };
  let state: RolloutState = "WITHDRAWN";
  try { state = await (input.stateNow ?? millioneaStateNow)(); } catch { state = "WITHDRAWN"; }
  let week: StoredWeek | null;
  try { week = await weekStore.get(input.weekId); } catch (err) { return busy(`week ${input.weekId}`, err); }
  if (!week || !week.marketId) return notOpen;
  if (!rolloutSells(state, week.visibility)) {
    return { ok: false, error: "Millionea is not available yet.", code: "INVALID", reason: "millionea_not_available" };
  }
  const rules = frozenRules(week);
  if (!rules) return notOpen;
  // ⛔ S7 · THE WEEK'S MARKET MUST STILL BE A MILLIONEA MARKET (the fence, MB-01). The bet path routes a stake by its market's
  //    product line, so a week whose row was reclassified would be sold as a one-sided Yes/No stake on the week's own pool:
  //    a position with no ticket, and sales that never again agree three ways. Nothing is sold, and the server log says why.
  let market: Awaited<ReturnType<typeof marketStore.get>>;
  try { market = await marketStore.get(week.marketId); } catch (err) { return busy(`week ${week.code}'s market`, err); }
  if (!isFencedMaswali(market)) {
    console.error(`[maswali] ALARM · week ${week.code}'s market ${week.marketId} is not a Millionea market; nothing was sold`);
    return notOpen;
  }
  // ⛔ S7 · A SLIP OPENED BEFORE THE STOP NEVER SELLS A FINAL-WEEK TICKET (MR-30; the lead's decision from the S6 legal
  //    review). The Owner may make the week on sale its final week, and a slip reads the week's finality once, when it
  //    opens: a slip opened before the stop never stated the final week's rule. Its purchase is refused before anything
  //    moves, and the buyer is sent back to the slip, which now states the rule. ⭐ A key that already bought answers with
  //    its own receipt (L2: a gate guards a new purchase; a replay places nothing), as `buyPosition`'s refusals do.
  //    ⛔ S7-F4 · An OPEN week's refusal only: a final week that has CLOSED or been VOIDED sells to no slip, so its own
  //    answer stands (sales closed, not open), the one a slip that stated the rule gets, and a landed key still replays.
  if (week.isFinal && input.shownFinal === false && week.state === "OPEN") {
    const stale = {
      ok: false as const, code: "INVALID" as const, reason: "millionea_week_final" as const,
      error: "This week became the final week of Millionea after the slip was opened. Nothing was charged: open the slip again to read the final week's rules.",
    };
    if (!input.idempotencyKey) return stale;
    const landed = await landedMaswaliAnswer(input.userId, {
      marketId: week.marketId, stake: rules.ticketPriceTzs * input.slips.length, idempotencyKey: input.idempotencyKey,
      buy: { weekId: week.id, slips: input.slips },
    }, stale, false);
    return (landed as PurchaseResult | null) ?? stale;
  }
  const r = await buyPosition(input.userId, {
    marketId: week.marketId,
    side: "YES",
    stake: rules.ticketPriceTzs * input.slips.length,
    idempotencyKey: input.idempotencyKey,
    playStartedAt: input.playStartedAt,
    maswali: { weekId: week.id, slips: input.slips, shownFinal: input.shownFinal },
  });
  // S5 · a sale moved the week's pool: the live hub hears it, coalesced, after the purchase committed (MB-31). A replay
  // moved nothing.
  if (r.ok && !r.data?.replayed) noteMaswaliPoolChanged(week.id);
  return r;
}

// ── THE CLOSE ───────────────────────────────────────────────────────────────────────────────────────

/** MB-28 · move the sales close. Earlier: never inside the next `minLead`; later: never past the first event − buffer. */
export async function moveClose(input: { weekId: string; toCloseAt: string; officerId: string; now?: Date }): Promise<Result<{ week: StoredWeek }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const toMs = Date.parse(input.toCloseAt);
  if (!Number.isFinite(toMs)) return refuse("The new close is not a time.");
  return withLock(MASWALI_CHAIN_LOCK, async (lockTx) => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "OPEN") return refuse(`Week ${week.code} is ${week.state}; only an open week's close can move.`);
    const fromMs = Date.parse(week.closesAt);
    // ⛔ S7 · THE CLOSE HAS PASSED ONCE EITHER CLOCK SAYS SO (MB-84: the close is the database's instant). A purchase and a
    //    cancel stop on the database clock, so a container whose own clock runs slow still read the week as before its
    //    close, moved it later and reopened sales the database had already closed. The later of the two clocks decides,
    //    and it measures the earlier close's lead too.
    const atMs = Math.max(nowMs, await dbNowMs(lockTx));
    if (fromMs <= atMs) return refuse("The close has already passed; it can never move back (MR-13).");
    const rules = frozenRules(week);
    if (!rules) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    // Every sold ticket keeps its free-cancel window (RULES §2.6, frozen in the week's feeSnapshot): an earlier close must
    // still leave that window and one more minute of grace.
    const market = week.marketId ? await marketStore.get(week.marketId) : null;
    const graceMin = (market?.feeSnapshot as { freeExitGraceMinutes?: number } | undefined)?.freeExitGraceMinutes ?? DEFAULT_FREE_EXIT_GRACE_MINUTES;
    const minLeadMs = (graceMin + 1) * 60_000;
    if (toMs < atMs + minLeadMs) return refuse(`An earlier close must still be at least ${graceMin + 1} minutes away, so every ticket keeps its free-cancel window.`);
    const questions = await questionStore.listForWeek(week.id);
    if (questions.length === 0) return refuse(`Week ${week.code}'s questions could not be read.`);
    // MR-4 · the refusal names the question whose event the close would run into.
    const first = questions.reduce((a, q) => (Date.parse(q.eventStartsAt) < Date.parse(a.eventStartsAt) ? q : a));
    const earliest = Date.parse(first.eventStartsAt);
    if (toMs > earliest - rules.minLockBufferMinutes * 60_000) {
      return refuse(`The close must stay at least ${rules.minLockBufferMinutes} minutes before the first event. ${slotLabel(first.slot)} starts at ${first.eventStartsAt}.`);
    }
    if (toMs === fromMs) return refuse("That is already the close.");
    const won = await weekStore.moveClose(week.id, week.closesAt, new Date(toMs).toISOString());
    if (!won) return refuse("The close changed while it was being moved; refresh and try again.");
    if (week.marketId) await marketStore.stamp(week.marketId, { selectionClosedAt: new Date(toMs).toISOString(), updatedAt: new Date(nowMs).toISOString() } as never);
    audit({ category: "ADMIN", action: "maswali.week.close_moved", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, from: week.closesAt, to: new Date(toMs).toISOString() } });
    return { ok: true, week: (await weekStore.get(week.id))! };
  });
}

/** A week's frozen rules, or null when they cannot be read (a week past DRAFT always has them). */
export function frozenRules(week: StoredWeek): MaswaliRulesSnapshot | null {
  const r = readMaswaliRulesSnapshot(week.rulesSnapshot);
  return r.ok ? r.rules : null;
}

/**
 * ⚠️ TEST SEAM ONLY (MB-84) · the database clock a sales close is checked on. Every suite runs its weeks on an injected week
 * clock, weeks ahead of the real one, while a purchase and a cancel read the real database clock (before every close), so
 * a close checked on that clock could never be stamped there: the suites' worlds hand the close its week clock as the
 * database's (`loadMaswaliWorld`), and the dev seed does the same around its own weeks. Null — production, and
 * `test:maswali-adversarial` §1, which puts a container's clock against the real database's — reads the database.
 */
let closeClockForTests: ((weekClockMs: number) => number) | null = null;
export function __setMaswaliCloseClockForTests(clock: ((weekClockMs: number) => number) | null): void {
  if (process.env.NODE_ENV === "production") throw new Error("__setMaswaliCloseClockForTests is a test seam and refuses to run in production.");
  closeClockForTests = clock;
}

/** A close refused because the database's clock is short of it, and by how much (S7-F2, L1: the scheduler waits that long). */
export type CloseNotYet = Refused & { dbShortMs: number };

/**
 * ⭐ CLOSE THE SALES, EXACTLY ONCE: the commitment over every live ticket (MR-13), its count and its sales, stamped in
 * one claim WHERE the week is still OPEN. `early` closes now (a certain week void stops sales at once, MR-18).
 */
export async function closeWeek(input: { weekId: string; actorId?: string; early?: boolean; now?: Date }): Promise<Result<{ week: StoredWeek; already?: boolean }> | CloseNotYet> {
  const nowMs = (input.now ?? new Date()).getTime();
  return withLock(MASWALI_CHAIN_LOCK, async (lockTx) => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "OPEN") return week.closedAt ? { ok: true, week, already: true } : refuse(`Week ${week.code} is ${week.state}.`);
    // ⛔ S7 · A CLOSE THAT IS NOT EARLY WAITS FOR THE DATABASE'S CLOCK (MB-84: the close is the database's instant, the one a
    //    purchase and a cancel stop on). A container whose clock ran fast read its own clock as past the close and stamped
    //    the commitment while the database still sold: the sales ended before their advertised close. It is refused until
    //    the database's clock reaches the close, and stamped at the database's instant. ⭐ S7-F2 (L1) · the refusal says how
    //    far that clock is short, so the scheduler asks again the moment it arrives, never at the 5-minute reconcile.
    const atMs = input.early ? nowMs : closeClockForTests ? closeClockForTests(nowMs) : await dbNowMs(lockTx);
    if (!input.early && Date.parse(week.closesAt) > atMs) return { ...refuse("The close has not arrived on the database's clock (MB-84)."), dbShortMs: Date.parse(week.closesAt) - atMs };
    const rules = frozenRules(week);
    if (!rules) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    // ⭐ R2 (adversarial review, 2026-10-17) · THE CLOSE WAITS FOR EVERY PURCHASE AND CANCEL IN FLIGHT. Both commit inside
    // `market:<id>` (taken after `wallet:`); the close takes that lock too, inside the chain lock — the settlement's own
    // order — so it lists the live tickets only once an in-flight purchase or cancel has committed, and a purchase or
    // cancel that waited behind it re-reads the week inside that lock and finds it closed. Without it, a purchase passing
    // its clock check an instant before the close committed after the list: a LIVE ticket outside the root, and counts
    // the settlement refuses for good.
    const seal = async (): Promise<Result<{ week: StoredWeek; already?: boolean }>> => {
      const live = await ticketStore.listForWeek(week.id, { status: "LIVE" });
      const root = merkleRoot(live.map((t) => ({ ticketId: t.id, leaf: t.selectionsHash })));
      const won = await weekStore.stampClose(week.id, { closedAt: new Date(atMs).toISOString(), ticketCount: live.length, salesAtClose: live.length * rules.ticketPriceTzs, ticketMerkleRoot: root });
      if (!won) return { ok: true, week: (await weekStore.get(week.id))!, already: true };
      if (week.marketId && input.early) await marketStore.stamp(week.marketId, { selectionClosedAt: new Date(nowMs).toISOString(), updatedAt: new Date(nowMs).toISOString() } as never);
      audit({ category: "ADMIN", action: "maswali.week.closed", actorId: input.actorId ?? SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
        payload: { code: week.code, ticketCount: live.length, ticketMerkleRoot: root, early: input.early === true } });
      // S5 · the sales are final: the hub's figure stops moving with sales from here (the frame is derived after commit).
      noteMaswaliPoolChanged(week.id);
      return { ok: true, week: (await weekStore.get(week.id))! };
    };
    return week.marketId ? withLock(`market:${week.marketId}`, seal) : seal();
  });
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
 * S7-F8 · FINDING 2's WRITER (S5-FIX-SRV's, byte for byte, so the S5 merge keeps one copy): an act's audit rows are OWED,
 * not written, under the chain lock — `recordOwed` writes them once the lock has committed (`afterCommit`), so no row
 * ever describes a write that rolled back.
 */
type OwedAudit = Parameters<typeof audit>[0];
let owedAuditWriter: (row: OwedAudit) => Promise<{ recorded: boolean }> = audit;
/** ⚠️ TEST SEAM ONLY: the writer `recordOwed` uses (null restores `audit`). */
export function __setMaswaliAuditWriterForTests(writer: ((row: OwedAudit) => Promise<{ recorded: boolean }>) | null): void {
  owedAuditWriter = writer ?? audit;
}

/** Write the rows an act owes, in order, after its lock committed. True only when every one was recorded; never throws. */
async function recordOwed(rows: readonly OwedAudit[]): Promise<boolean> {
  let all = true;
  for (const row of rows) {
    const r = await owedAuditWriter(row).catch(() => ({ recorded: false }));
    if (!r.recorded) all = false;
  }
  return all;
}

/**
 * Seal one question. One officer, with evidence (MR-14). A VOID names its ground from the closed list and only when that
 * ground is available (MR-15). ⛔ An officer holding a ticket in the week may not seal it. YES/NO only after the close; a
 * VOID may come before it (a pre-close void that dooms the week stops sales at once).
 */
export async function sealQuestion(input: {
  weekId: string; slot: number; outcome: MaswaliOutcome; evidence: string; voidReason?: string | null; officerId: string; now?: Date;
  /** Tests only: the two-officer setting's read. */
  twoOfficerNow?: () => Promise<boolean | null>;
}): Promise<Result<{ gate: ReturnType<typeof settlementGate>; weekVoidCertain: boolean }>> {
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
  const res = await withLock(MASWALI_CHAIN_LOCK, async (): Promise<Result<{ gate: ReturnType<typeof settlementGate>; weekVoidCertain: boolean }>> => {
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
    // ⛔ MR-15 · MR-16 · an objection is upheld only after the sales close, so its ground cannot be sealed on a week still on
    //    sale: there, a criterion found wrong voids on `criterion_wrong` (the closed list's own definitions).
    if (input.outcome === "VOID" && input.voidReason === "criterion_objection" && week.state === "OPEN") {
      return refuse(`"${MASWALI_VOID_REASON_LABEL.criterion_objection}" is a ground only after the sales close; while week ${week.code} is on sale, void ${slotLabel(q.slot)} on "${MASWALI_VOID_REASON_LABEL.criterion_wrong}".`);
    }
    const holds = (await ticketStore.listForUser(input.officerId, { cycleId: week.id })).some((t) => t.status !== "CANCELLED");
    if (holds) return refuse("An officer who holds a ticket in this week cannot seal its questions.");
    const at = new Date(nowMs).toISOString();
    await questionStore.patch(q.id, {
      outcome: input.outcome, voidReason: input.outcome === "VOID" ? (input.voidReason as MaswaliVoidReason) : null,
      evidence, sealedBy: input.officerId, sealedAt: at, twoOfficerAtStage1: twoOfficer,
    });
    if (week.state === "CLOSED") await weekStore.patch(week.id, { state: "RESOLVING" });
    audit({ category: "ADMIN", action: "maswali.question.sealed", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id,
      payload: { week: week.code, slot: slotLabel(q.slot), outcome: input.outcome, voidReason: input.voidReason ?? null, twoOfficer } });
    return recomputeGateLocked(week.id, nowMs);
  });
  if (res.ok && res.weekVoidCertain) {
    // A certain week void while selling stops the sales at once (MR-18); the void itself waits for its objection window.
    const w = await weekStore.get(input.weekId);
    if (w?.state === "OPEN") await closeWeek({ weekId: w.id, actorId: SYSTEM, early: true, now: new Date(nowMs) });
  }
  return res;
}

/** The second officer's confirmation of a seal made while the two-officer flag was on (MR-14). ⛔ Never the sealer. */
export async function confirmSeal(input: { weekId: string; slot: number; officerId: string; now?: Date }): Promise<Result> {
  const nowMs = (input.now ?? new Date()).getTime();
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    const q = (await questionStore.listForWeek(week.id)).find((x) => x.slot === input.slot);
    if (!q || q.outcome === null) return refuse("Nothing to confirm.");
    if (q.twoOfficerAtStage1 !== true) return refuse("This seal needs no second officer.");
    if (q.stage2By) return refuse("Already confirmed.");
    if (q.sealedBy === input.officerId) return refuse("The officer who sealed it cannot confirm it — a second officer must.");
    // ⛔ S7 · the seal's own bar (MR-14): the second signature on a result is a seal too, so no officer holding a ticket in
    //    the week gives it — an account made staff mid-week while its ticket runs included.
    const holds = (await ticketStore.listForUser(input.officerId, { cycleId: week.id })).some((t) => t.status !== "CANCELLED");
    if (holds) return refuse("An officer who holds a ticket in this week cannot confirm its seals.");
    await questionStore.patch(q.id, { stage2By: input.officerId, stage2At: new Date(nowMs).toISOString() });
    audit({ category: "ADMIN", action: "maswali.question.confirmed", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id, payload: { week: week.code, slot: slotLabel(q.slot) } });
    const r = await recomputeGateLocked(week.id, nowMs);
    return r.ok ? { ok: true } : r;
  });
}

/**
 * OD-09 · the sealer corrects their OWN seal, before payout, inside the objection window — which restarts once the graded
 * set is final again. ⛔ Never after SETTLED: a paid week is never clawed back.
 */
export async function correctSeal(input: {
  weekId: string; slot: number; outcome: MaswaliOutcome; evidence: string; voidReason?: string | null; officerId: string; now?: Date;
}): Promise<Result> {
  const nowMs = (input.now ?? new Date()).getTime();
  if (input.outcome !== "YES" && input.outcome !== "NO" && input.outcome !== "VOID") return refuse("A result is YES, NO or VOID.");
  if (input.outcome === "VOID" && !isMaswaliVoidReason(input.voidReason)) return refuse("A void names its ground from the closed list (MR-15).");
  // ⛔ S7 · A CORRECTION IS A SEAL, AND MEETS A SEAL'S RULES (MR-14, MR-15): it records its evidence, and it voids only on a
  //    ground available now. Without them an officer could seal YES and correct it to "not played" inside the very deadline
  //    a seal refuses, or replace a result with no evidence at all.
  const evidence = input.evidence.trim();
  if (evidence.length < 10) return refuse("A correction records its evidence (at least 10 characters).");
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "RESOLVING" && week.state !== "CLOSED") return refuse(`Week ${week.code} is ${week.state}; its seals are final.`);
    if (week.objectionsCloseAt && Date.parse(week.objectionsCloseAt) <= nowMs) return refuse("The objection window has closed; the seal stands.");
    const q = (await questionStore.listForWeek(week.id)).find((x) => x.slot === input.slot);
    if (!q || q.outcome === null) return refuse("Nothing sealed to correct.");
    if (q.sealedBy !== input.officerId) return refuse("Only the officer who sealed a question may correct it; anyone else files an objection.");
    if (input.outcome === "VOID" && !voidGroundAvailable(input.voidReason as MaswaliVoidReason, Date.parse(q.voidDeadlineAt), nowMs)) {
      return refuse(`${slotLabel(q.slot)} cannot void on that ground before its void deadline (${q.voidDeadlineAt}).`);
    }
    await questionStore.patch(q.id, {
      outcome: input.outcome, voidReason: input.outcome === "VOID" ? (input.voidReason as MaswaliVoidReason) : null,
      evidence, sealedAt: new Date(nowMs).toISOString(), stage2By: null, stage2At: null,
    });
    // The graded set may have changed: the window restarts from the corrected record (OD-09).
    await weekStore.patch(week.id, { gradedSetFinalAt: null, objectionsCloseAt: null });
    audit({ category: "ADMIN", action: "maswali.question.corrected", actorId: input.officerId, targetType: "MaswaliQuestion", targetId: q.id,
      payload: { week: week.code, slot: slotLabel(q.slot), from: q.outcome, to: input.outcome } });
    const r = await recomputeGateLocked(week.id, nowMs);
    return r.ok ? { ok: true } : r;
  });
}

/** Re-read the record and stamp the graded set final (and open the objection window) once the gate is ready. Under the lock. */
async function recomputeGateLocked(weekId: string, nowMs: number): Promise<Result<{ gate: ReturnType<typeof settlementGate>; weekVoidCertain: boolean }>> {
  const week = await weekStore.get(weekId);
  if (!week) return refuse("No such week.");
  const qs = gradable(await questionStore.listForWeek(week.id));
  const gate = settlementGate(qs);
  const certain = weekVoidCertain(qs);
  if (gate.ready && !week.gradedSetFinalAt && week.state !== "OPEN") {
    const rules = frozenRules(week);
    if (!rules) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    const end = objectionWindowEnd(nowMs, rules.objectionWindowHours, rules.objectionNotBeforeAt);
    await weekStore.patch(week.id, { gradedSetFinalAt: new Date(nowMs).toISOString(), objectionsCloseAt: new Date(end).toISOString() });
    audit({ category: "ADMIN", action: "maswali.week.graded_set_final", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, weekVoid: gate.weekVoid, objectionsCloseAt: new Date(end).toISOString() } });
  }
  return { ok: true, gate, weekVoidCertain: certain };
}

/** The gate, re-read, for a caller outside a seal (the scheduler, the console). */
export async function recomputeGate(weekId: string, now?: Date): Promise<Result<{ gate: ReturnType<typeof settlementGate>; weekVoidCertain: boolean }>> {
  return withLock(MASWALI_CHAIN_LOCK, () => recomputeGateLocked(weekId, (now ?? new Date()).getTime()));
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
export async function voidWeek(input: { weekId: string; actorId?: string; now?: Date }): Promise<Result<{ week: StoredWeek; already?: boolean; refunded?: number }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const stamped = await withLock(MASWALI_CHAIN_LOCK, async (): Promise<Result<{ week: StoredWeek }>> => {
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
    const won = await weekStore.stampVoid(week.id);
    const after = (await weekStore.get(week.id))!;
    if (!won) return after.state === "VOIDED" ? { ok: true, week: after } : refuse(`Week ${week.code} changed while it was being voided; refresh and try again.`);
    audit({ category: "ADMIN", action: "maswali.week.voided", actorId: input.actorId ?? SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, marketId: week.marketId, ticketCount: week.ticketCount } });
    return { ok: true, week: after };
  });
  if (!stamped.ok) return stamped;
  const r = await refundVoidedWeek(stamped.week.id);
  if (!r.ok) return refuse(`Week ${stamped.week.code} is VOIDED, and its refunds have not landed: ${r.error} The tick retries them; the heal runs them now.`);
  // S5 · a voided week is final, so the next week of its line can count its carry (MR-3): every open figure moves.
  if (!r.already) noteMaswaliPoolChanged();
  return { ok: true, week: (await weekStore.get(input.weekId))!, already: r.already, refunded: r.tickets };
}

// ── THE CARRY ───────────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ R3 · A WEEK'S PLACE IN THE CHAIN IS ITS CALENDAR WEEK (MR-3), never the order it was drafted in (`seq`): the Monday
 * 00:00 EAT its ISO week starts. Read from `finalDeadlineAt`, which the draft stamps inside the following week and which
 * stays inside it — the open re-stamps it from the frozen rules at a weekday of that same week (`deadlinesUnderRules`),
 * and nothing else moves it; `opensAt` becomes the real open instant at the open, and the close may move. One line never
 * holds two weeks of one ISO week (the code is unique), so this orders a line strictly.
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
export async function claimCarry(input: { weekId: string; readJackpot: () => Promise<number | null> }): Promise<Result<{ rolloverIn: number; already?: boolean }>> {
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.rolloverIn != null) return { ok: true, rolloverIn: week.rolloverIn, already: true };
    const blocking = await carryBlocker(week);
    if (blocking) return refuse(`Week ${blocking.code} is not settled yet; the carry is claimed strictly in order (MR-3).`);
    const r = await input.readJackpot().catch(() => null);
    if (r === null || !Number.isSafeInteger(r) || r < 0) return refuse("The jackpot balance could not be read, so no carry was claimed.");
    const won = await weekStore.claimCarry(week.id, r);
    if (!won) return { ok: true, rolloverIn: (await weekStore.get(week.id))?.rolloverIn ?? r, already: true };
    audit({ category: "ADMIN", action: "maswali.week.carry_claimed", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id, payload: { code: week.code, rolloverIn: r } });
    return { ok: true, rolloverIn: r };
  });
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

/** A week's sales have closed, on the clock a stop is read at: stamped CLOSED or RESOLVING, or still OPEN past its close. */
const salesClosed = (w: StoredWeek, atMs: number): boolean =>
  w.state === "CLOSED" || w.state === "RESOLVING" || (w.state === "OPEN" && Date.parse(w.closesAt) <= atMs);

/**
 * The PUBLIC line as a stop reads it: the week on sale, the newest week whose results are being decided, and the next
 * draft to open — the first in the calendar after the newest week that has opened (R3: an earlier draft never opens).
 */
function stopStanding(line: StoredWeek[], atMs: number): { onSale: StoredWeek | null; deciding: StoredWeek | null; next: StoredWeek | null } {
  const newestFirst = (ws: StoredWeek[]) => [...ws].sort((a, b) => calendarStartMs(b) - calendarStartMs(a));
  const opened = newestFirst(line.filter((w) => w.state !== "DRAFT"))[0] ?? null;
  return {
    onSale: line.find((w) => w.state === "OPEN" && !salesClosed(w, atMs)) ?? null,
    deciding: newestFirst(line.filter((w) => salesClosed(w, atMs)))[0] ?? null,
    next: line.filter((w) => w.state === "DRAFT" && (!opened || calendarStartMs(w) > calendarStartMs(opened)))
      .sort((a, b) => calendarStartMs(a) - calendarStartMs(b))[0] ?? null,
  };
}

/**
 * ⭐ S7-F2 · THE OWNER'S NEXT ACT (the S7 review, round 2): every refusal of a stop ends with what the Owner can do
 * instead, read from the line as the stop reads it. The week on sale may be made final at once; while a week's results
 * are decided, the next week to open may be made final at shorter notice; otherwise a draft is made final a full week
 * before it opens, or the next week once it is on sale. A refusal that ended on an empty sentence left the Owner, once
 * the week deciding the stop had settled, with no act named at all. `asked` is never offered back as the week on sale;
 * null when no week was asked (the console's stop control, `stopNextActNow`).
 */
function stopNextAct(s: ReturnType<typeof stopStanding>, asked: StoredWeek | null, clockMs: number): string {
  const { onSale, deciding, next } = s;
  if (onSale && onSale.id !== asked?.id) return `To stop Millionea, make the week on sale, ${onSale.code}, the final week: it may be made final at once.`;
  if (deciding) {
    return next
      ? `To stop Millionea, make the next week to open, ${next.code}, the final week: while week ${deciding.code}'s results are decided, it may be made final although it opens in less than a full week (OD-03).`
      : `To stop Millionea, draft the next week and make it the final week: while week ${deciding.code}'s results are decided, it may be made final although it opens in less than a full week (OD-03).`;
  }
  if (!next) return "To stop Millionea, draft the next week and make it the final week, a full week before it opens or once it is on sale (OD-03).";
  if (Date.parse(next.opensAt) - clockMs >= SUNSET_NOTICE_MS) {
    return `To stop Millionea, make the next week to open, ${next.code}, the final week: it opens a full week or more from now (OD-03).`;
  }
  return `To stop Millionea, make week ${next.code} the final week once it opens (a week on sale may be made final at once), or make a week that opens a full week or more from now the final week (OD-03).`;
}

/**
 * A final week standing, in the Owner's words — answered before any rule a later act could meet — or null when none stands.
 * ⭐ S7-F5 · PASSES_ON is a stop still standing: the final week voided or sold nothing, so the next week to open becomes the
 * final week by itself at its open (`openWeek`). The Owner is never told to draft a week and make it final then.
 */
function finalStandingWords(life: Awaited<ReturnType<typeof sunsetState>>): string | null {
  if (life.kind === "ENDING") return `Week ${life.week.code} is already the final week: Millionea stops after it, and nothing more is needed.`;
  if (life.kind === "RETIRED") return `Millionea has ended: week ${life.week.code} was the final week, and no week opens again.`;
  if (life.kind === "PASSES_ON") {
    return `Week ${life.week.code} was the final week and ${life.week.state === "VOIDED" ? "was voided" : "sold no ticket"}, so the stop passes on: the next week to open becomes the final week by itself, and nothing more is needed.`;
  }
  return null;
}

/**
 * ⭐ S7-F4 · THE OWNER'S NEXT ACT WITH NO WEEK ASKED (the S6 legal review): what the console's stop control names when it
 * offers no week — none on sale, a week's results being decided, no draft — read as the stop reads it: a final week
 * standing first, then the PUBLIC line on the later of the two clocks (MB-84). A control that said only that no week can
 * be made final now left the Owner with no act named. ⛔ A read that fails throws: the console shows the act as unknown.
 */
export async function stopNextActNow(now?: Date): Promise<string> {
  const standingFinal = finalStandingWords(await sunsetState());
  if (standingFinal) return standingFinal;
  const clockMs = Math.max((now ?? new Date()).getTime(), await dbNowMs(null));
  return stopNextAct(stopStanding(await weekStore.list({ visibility: "PUBLIC" }), clockMs), null, clockMs);
}

/**
 * ⭐ THE OWNER STOPS THE PRODUCT (MR-30, OD-03) — by making one week the FINAL week. It runs normally; if no ticket gets
 * 10 of 10, the highest score shares the whole jackpot (`maswali-settlement.ts`). ⛔ The caller is the Owner's ceremony
 * (S4, `requireOwner`); this checks the typed words and the rules:
 *   · the week ON SALE (no result known) may be made final at once — an Owner-ordered stop mid-week;
 *   · ⛔ a week whose sales have closed — CLOSED, RESOLVING, or OPEN past its close on either clock — is REFUSED (the
 *     lead's decision of 2026-10-18): the 13% fee is taken from a sunset payout and never from a rollover, so a stop
 *     ordered while a week's results are being decided could choose who is paid with those results in view. That week
 *     settles under its own rules (with no 10 of 10 its jackpot rolls over as always), and the refusal says what to do;
 *   · a drafted week may be made final only if its sales open at least a full week from now (OD-03's announcement) —
 *     except the ONE next week to open while no week is on sale and a week's results are being decided: the Owner's stop,
 *     ordered after a close, takes effect from that next week, and its buyers are told at purchase (the slip names the
 *     final week). Any other draft keeps the full week of notice;
 *   · no week after it may already have opened, and no other final week may still be running.
 * A final week already standing is answered first, before any rule a later act could meet; every other refusal ends
 * with the Owner's next act (`stopNextAct`).
 * A regulator-ordered stop (refund the current week; the pool to the last fully graded week's top tickets) is NOT this
 * act — it is S4's own ceremony.
 */
export async function sunsetMaswali(input: { weekId: string; ownerId: string; typed: string; reason: string; now?: Date }): Promise<Result<{ week: StoredWeek }>> {
  if (input.typed.trim() !== SUNSET_WORD) return refuse(`Type ${SUNSET_WORD} to make this the final week.`);
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 300) return refuse("Write why Millionea is being stopped (5–300 characters).");
  const nowMs = (input.now ?? new Date()).getTime();
  return withLock(MASWALI_CHAIN_LOCK, async (lockTx) => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week: reload the page and choose the final week again.");
    if (week.visibility !== "PUBLIC") return refuse("A drive week is never the final week: make a public week the final week.");
    if (week.isFinal) return { ok: true, week };
    const standingFinal = finalStandingWords(await sunsetState());
    if (standingFinal) return refuse(standingFinal);
    // The later of the two clocks decides (MB-84), as a move of the close reads it: a container whose clock runs slow
    // never reads a closed week as on sale, nor a draft as further off than it is.
    const clockMs = Math.max(nowMs, await dbNowMs(lockTx));
    const line = await weekStore.list({ visibility: "PUBLIC" });
    const standing = stopStanding(line, clockMs);
    const { onSale, deciding, next } = standing;
    if (week.state === "SETTLED" || week.state === "VOIDED") return refuse(`Week ${week.code} is already ${week.state}. ${stopNextAct(standing, week, clockMs)}`);
    if (salesClosed(week, clockMs)) {
      return refuse(`Week ${week.code}'s sales have closed, so its results are being decided: a stop now could choose who is paid with those results in view. It settles under its own rules (with no 10 of 10, its jackpot rolls over as always). ${stopNextAct(standing, week, clockMs)}`);
    }
    const later = line.find((w) => w.state !== "DRAFT" && calendarStartMs(w) > calendarStartMs(week));
    if (later) return refuse(`Week ${later.code} has already opened after week ${week.code}; the final week is the last one to open. ${stopNextAct(standing, week, clockMs)}`);
    let basis: "ON_SALE" | "FULL_NOTICE" | "NEXT_AFTER_CLOSE" = "ON_SALE";
    if (week.state === "DRAFT") {
      basis = "FULL_NOTICE";
      if (Date.parse(week.opensAt) - clockMs < SUNSET_NOTICE_MS) {
        if (onSale || !deciding || next?.id !== week.id) {
          return refuse(`Week ${week.code} opens in less than a week; a final week is announced a full week ahead (OD-03). ${stopNextAct(standing, week, clockMs)}`);
        }
        basis = "NEXT_AFTER_CLOSE";
      }
    }
    // ⛔ S7-F4 · AN OPEN WEEK IS MADE FINAL UNDER ITS MARKET'S LOCK (MR-30): a purchase asks the week's finality again
    //    inside `market:` (`buyMaswaliTickets`), so the stop waits for a purchase in flight on this week's market, and a
    //    purchase that waits for the stop reads it. `maswali:chain` → `market:` is a permitted order (`locks.ts`).
    //    S7-F5 · the mark joins the lock's transaction: it commits with the lock's release, never before it. The week is
    //    answered as marked (a read outside the transaction would not see the mark yet).
    const markFinal = async (tx?: Parameters<typeof weekStore.patch>[2] | null) => { await weekStore.patch(week.id, { isFinal: true }, tx ?? undefined); };
    if (week.state === "OPEN" && week.marketId) await withLock(`market:${week.marketId}`, markFinal);
    else await markFinal(lockTx);
    // S7-F8 · the Owner's order is owed: written once the mark has committed (finding 2's writer), never for a rolled-back one.
    afterCommit(lockTx, () => void recordOwed([{ category: "COMPLIANCE", action: "maswali.sunset.ordered", actorId: input.ownerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, state: week.state, reason, basis } }]));
    return { ok: true, week: { ...week, isFinal: true } };
  });
}

// ── OD-12 · NO INSIDER HOLDS A TICKET ───────────────────────────────────────────────────────────────

/**
 * ⭐ OD-12 · MAY THIS ACCOUNT BE MADE STAFF NOW? Not while it holds a ticket in a week that has not settled: an insider never
 * holds a live ticket (MR-10, R-INSIDERS), and a promotion mid-week would hand one to a person who may then read the week's
 * console. The Owner makes the change once the week settles. The refusal in the Owner's words, or null when nothing stands.
 * ⛔ No override is built: OD-12's "the Owner refunds the tickets first" would refund single tickets out of a committed
 *    week, which nothing may do (MR-13). ⛔ A read that fails throws, so the promotion fails closed (the action reports it).
 */
export async function millioneaPromotionBlock(userId: string): Promise<string | null> {
  const live = (await ticketStore.listForUser(userId)).filter((t) => t.status === "LIVE");
  if (live.length === 0) return null;
  const codes: string[] = [];
  for (const cycleId of new Set(live.map((t) => t.cycleId))) codes.push((await weekStore.get(cycleId))?.code ?? cycleId);
  return `This account holds ${live.length} Millionea ticket(s) in a week that has not settled (${codes.join(", ")}). An insider never holds a ticket (OD-12): make the change once that week has settled.`;
}

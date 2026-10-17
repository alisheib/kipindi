/**
 * MASWALI MILLIONEA — THE WEEK'S LIFECYCLE (MASWALI-BUILD S2; MASWALI-PLAN §3 MR-3…MR-19, §7b S2 item 7).
 *
 *   DRAFT ──open──▶ OPEN ──close──▶ CLOSED ──first seal──▶ RESOLVING ──(S3) settle──▶ SETTLED
 *                     └──────────── a certain week void (MR-18) ─────────────────────▶ VOIDED
 *
 * ⛔ NO MONEY MOVES IN THIS FILE except the week void, and that through the platform's own path: the market is stamped
 *    VOID and `settleMarket`'s VOID arm refunds every live ticket, real and bonus parts (the Up & Down precedent). Buying,
 *    the free cancel and the winning settlement are S3's `maswali-money-service.ts`.
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
import { withLock } from "./locks";
import { createMarket, settleMarket } from "./market-service";
import { marketStore } from "./market-dal";
import { isSourceTrusted, seedDefaultSources } from "./source-registry";
import { getRequireTwoOfficerResolution } from "./resolution-policy";
import { getMaswaliConfig, readMaswaliConfigFresh, readMaswaliRulesSnapshot, snapshotMaswaliRules, type MaswaliRulesSnapshot } from "./maswali-config";
import { licenceBasisAllowsOpen, readLicenceBasisFresh } from "./maswali-licence";
import { questionStore, ticketStore, weekStore, type DraftQuestionFields, type EventKind, type StoredQuestion, type StoredWeek, type WeekVisibility } from "./maswali-dal";
import { MARKET_CATEGORIES, type MarketCategory } from "@/lib/markets/categories";
import { EAT_OFFSET_MS, eatWeekAt, eatWeekCode, eatWeekStartMs } from "@/lib/eat-day";
import { zonedToUtcMs } from "@/lib/maswali-time";
import { bannedTopicHits } from "@/lib/maswali-topics";
import { MAIN_COUNT, RESERVE_COUNT, settlementGate, slotLabel, slotOf, weekVoidCertain, type GradableQuestion, type MaswaliOutcome } from "@/lib/maswali-score";
import { guaranteeRequirement } from "@/lib/maswali-money";
import { DEFAULT_FREE_EXIT_GRACE_MINUTES } from "@/lib/payout";
import { merkleRoot, questionSetHash, type FrozenQuestion } from "@/lib/maswali-commitment";
import { isMaswaliVoidReason, voidGroundAvailable, type MaswaliVoidReason } from "@/lib/maswali-void-reason";

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
export async function openWeek(input: { weekId: string; officerId: string; guarantee: GuaranteeReader; now?: Date }): Promise<Result<{ week: StoredWeek }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const [fresh, licence] = await Promise.all([readMaswaliConfigFresh(), readLicenceBasisFresh()]);
  if (!fresh.ok) return refuse(`The Millionea rules could not be read, so nothing was opened: ${fresh.error}`);
  if (!licence.ok) return refuse("The licence record could not be read, so nothing was opened.");
  if (!licenceBasisAllowsOpen(licence.basis)) return refuse("No licence basis is recorded. The Owner records it before any week opens (OD-01).");
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "DRAFT") return refuse(`Week ${week.code} is already ${week.state}.`);
    if (await weekStore.openFor(week.visibility)) return refuse(`Another ${week.visibility === "DRIVE" ? "drive" : "public"} week is open (MR-3).`);
    const rules = snapshotMaswaliRules(fresh.config, new Date(nowMs));
    // The trusted-source registry seeds its defaults on first use, as every publish path does before it asks.
    await seedDefaultSources();
    const questions = await questionStore.listForWeek(week.id);
    const problems = await openProblems(week, questions, rules, nowMs);
    // OD-02: the guarantee must cover every unsettled week, this one included, before it opens.
    const unsettled = await weekStore.list({ states: ["OPEN", "CLOSED", "RESOLVING"], visibility: week.visibility });
    const need = guaranteeRequirement([...unsettled, week].map((w) => ({ floor: rules.floorTzs, confirmedCarryIn: w.rolloverIn })));
    const held = await input.guarantee.balance().catch(() => null);
    if (held === null) problems.push("The guarantee balance could not be read, so nothing was opened.");
    else if (held < need) problems.push(`The guarantee holds TZS ${held.toLocaleString("en")}; TZS ${need.toLocaleString("en")} is needed to open (OD-02).`);
    if (problems.length) return refuse(problems.join(" "));

    const qHash = questionSetHash(questions.map((q): FrozenQuestion => ({
      role: q.role, ordinal: q.ordinal, slot: q.slot, category: q.category, textEn: q.textEn, textSw: q.textSw, textZh: q.textZh,
      criterionEn: q.criterionEn, criterionSw: q.criterionSw, criterionZh: q.criterionZh, sourceUrl: q.sourceUrl,
      fallbackSourceUrl: q.fallbackSourceUrl, eventStartsAt: q.eventStartsAt, eventZone: q.eventZone, voidDeadlineAt: q.voidDeadlineAt,
    })));
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
    });
    const won = await weekStore.stampOpen(week.id, { marketId: market.id, rulesSnapshot: rules, questionSetHash: qHash, opensAt: new Date(nowMs).toISOString() });
    if (!won) return refuse(`Week ${week.code} changed while it was being opened; nothing was opened. Refresh and try again.`);
    const opened = (await weekStore.get(week.id))!;
    audit({ category: "ADMIN", action: "maswali.week.opened", actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, marketId: market.id, questionSetHash: qHash, closesAt: week.closesAt, rules } });
    return { ok: true, week: opened };
  });
}

// ── THE CLOSE ───────────────────────────────────────────────────────────────────────────────────────

/** MB-28 · move the sales close. Earlier: never inside the next `minLead`; later: never past the first event − buffer. */
export async function moveClose(input: { weekId: string; toCloseAt: string; officerId: string; now?: Date }): Promise<Result<{ week: StoredWeek }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const toMs = Date.parse(input.toCloseAt);
  if (!Number.isFinite(toMs)) return refuse("The new close is not a time.");
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "OPEN") return refuse(`Week ${week.code} is ${week.state}; only an open week's close can move.`);
    const fromMs = Date.parse(week.closesAt);
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
 * ⭐ CLOSE THE SALES, EXACTLY ONCE: the commitment over every live ticket (MR-13), its count and its sales, stamped in
 * one claim WHERE the week is still OPEN. `early` closes now (a certain week void stops sales at once, MR-18).
 */
export async function closeWeek(input: { weekId: string; actorId?: string; early?: boolean; now?: Date }): Promise<Result<{ week: StoredWeek; already?: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "OPEN") return week.closedAt ? { ok: true, week, already: true } : refuse(`Week ${week.code} is ${week.state}.`);
    if (!input.early && Date.parse(week.closesAt) > nowMs) return refuse("The close has not arrived.");
    const rules = frozenRules(week);
    if (!rules) return refuse(`Week ${week.code}'s frozen rules cannot be read.`);
    const live = await ticketStore.listForWeek(week.id, { status: "LIVE" });
    const root = merkleRoot(live.map((t) => ({ ticketId: t.id, leaf: t.selectionsHash })));
    const won = await weekStore.stampClose(week.id, { closedAt: new Date(nowMs).toISOString(), ticketCount: live.length, salesAtClose: live.length * rules.ticketPriceTzs, ticketMerkleRoot: root });
    if (!won) return { ok: true, week: (await weekStore.get(week.id))!, already: true };
    if (week.marketId && input.early) await marketStore.stamp(week.marketId, { selectionClosedAt: new Date(nowMs).toISOString(), updatedAt: new Date(nowMs).toISOString() } as never);
    audit({ category: "ADMIN", action: "maswali.week.closed", actorId: input.actorId ?? SYSTEM, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, ticketCount: live.length, ticketMerkleRoot: root, early: input.early === true } });
    return { ok: true, week: (await weekStore.get(week.id))! };
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
 * Seal one question. One officer, with evidence (MR-14). A VOID names its ground from the closed list and only when that
 * ground is available (MR-15). ⛔ An officer holding a ticket in the week may not seal it. YES/NO only after the close; a
 * VOID may come before it (a pre-close void that dooms the week stops sales at once).
 */
export async function sealQuestion(input: {
  weekId: string; slot: number; outcome: MaswaliOutcome; evidence: string; voidReason?: string | null; officerId: string; now?: Date;
}): Promise<Result<{ gate: ReturnType<typeof settlementGate>; weekVoidCertain: boolean }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const evidence = input.evidence.trim();
  if (evidence.length < 10) return refuse("A seal records its evidence (at least 10 characters).");
  if (input.outcome !== "YES" && input.outcome !== "NO" && input.outcome !== "VOID") return refuse("A result is YES, NO or VOID.");
  if (input.outcome === "VOID" && !isMaswaliVoidReason(input.voidReason)) return refuse("A void names its ground from the closed list (MR-15).");
  if (input.outcome !== "VOID" && input.voidReason) return refuse("Only a VOID carries a void ground.");
  const twoOfficer = await getRequireTwoOfficerResolution().catch(() => false);
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
  if (input.outcome === "VOID" && !isMaswaliVoidReason(input.voidReason)) return refuse("A void names its ground from the closed list (MR-15).");
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state !== "RESOLVING" && week.state !== "CLOSED") return refuse(`Week ${week.code} is ${week.state}; its seals are final.`);
    if (week.objectionsCloseAt && Date.parse(week.objectionsCloseAt) <= nowMs) return refuse("The objection window has closed; the seal stands.");
    const q = (await questionStore.listForWeek(week.id)).find((x) => x.slot === input.slot);
    if (!q || q.outcome === null) return refuse("Nothing sealed to correct.");
    if (q.sealedBy !== input.officerId) return refuse("Only the officer who sealed a question may correct it; anyone else files an objection.");
    await questionStore.patch(q.id, {
      outcome: input.outcome, voidReason: input.outcome === "VOID" ? (input.voidReason as MaswaliVoidReason) : null,
      evidence: input.evidence.trim(), sealedAt: new Date(nowMs).toISOString(), stage2By: null, stage2At: null,
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
 * ⭐ MR-18 · VOID THE WHOLE WEEK — every live ticket refunded in full, no fee, no top-up, R untouched. Only once the
 * void is certain on the FINAL record and its objection window has closed (an upheld objection could reinstate a
 * question). The market is stamped VOID with `objectionsClosedAt = now`, then `settleMarket`'s VOID arm refunds.
 */
export async function voidWeek(input: { weekId: string; actorId?: string; now?: Date }): Promise<Result<{ week: StoredWeek }>> {
  const nowMs = (input.now ?? new Date()).getTime();
  const stamped = await withLock(MASWALI_CHAIN_LOCK, async (): Promise<Result<{ week: StoredWeek; marketId: string }>> => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.state === "VOIDED") return { ok: true, week, marketId: week.marketId ?? "" };
    if (week.state !== "RESOLVING" && week.state !== "CLOSED") return refuse(`Week ${week.code} is ${week.state}.`);
    const gate = settlementGate(gradable(await questionStore.listForWeek(week.id)));
    if (!gate.ready || !gate.weekVoid) return refuse("The week void is not final: voided mains do not outnumber the usable reserves on the sealed record.");
    if (!week.objectionsCloseAt || Date.parse(week.objectionsCloseAt) > nowMs) return refuse("The objection window is still open; an upheld objection could reinstate a question.");
    if (!week.marketId) return refuse("The week has no market.");
    await weekStore.patch(week.id, { state: "VOIDED" });
    return { ok: true, week, marketId: week.marketId };
  });
  if (!stamped.ok) return stamped;
  if (stamped.week.state !== "VOIDED") {
    // ⚠️ The MARKET's stamps read the platform clock, never an injected one: `settleMarket` compares its objection stamp
    // with the real now, and the market's own window means nothing for a week (the week's window has already closed).
    const marketNowIso = new Date().toISOString();
    await withLock(`market:${stamped.marketId}`, async () => {
      await marketStore.stamp(stamped.marketId, {
        status: "VOIDED", resolvedOutcome: "VOID",
        resolutionStage1By: SYSTEM, resolutionStage1At: marketNowIso, resolutionStage2By: SYSTEM, resolutionStage2At: marketNowIso,
        resolutionEvidence: `Maswali Millionea week ${stamped.week.code} voided whole (MR-18): voided main questions outnumbered the usable reserves. Every ticket is refunded in full.`,
        objectionsClosedAt: marketNowIso, resolutionNotifiedAt: marketNowIso, settledAt: null, updatedAt: marketNowIso,
      } as never);
    });
    const settled = await settleMarket(stamped.marketId, { actorId: SYSTEM });
    if (!settled.ok) return refuse(`The week is VOIDED but its refunds did not run: ${settled.error}. The heal retries.`);
    audit({ category: "ADMIN", action: "maswali.week.voided", actorId: input.actorId ?? SYSTEM, targetType: "MaswaliCycle", targetId: stamped.week.id,
      payload: { code: stamped.week.code, marketId: stamped.marketId } });
  }
  return { ok: true, week: (await weekStore.get(input.weekId))! };
}

// ── THE CARRY ───────────────────────────────────────────────────────────────────────────────────────

/**
 * MR-21 · CLAIM THE CARRY, ONCE, IN CHAIN ORDER. A week claims R only after every earlier week of its visibility is
 * terminal (MR-3), and the claim is a conditional write (`rolloverIn` IS NULL). `readJackpot` is S3's ledger read.
 */
export async function claimCarry(input: { weekId: string; readJackpot: () => Promise<number | null> }): Promise<Result<{ rolloverIn: number; already?: boolean }>> {
  return withLock(MASWALI_CHAIN_LOCK, async () => {
    const week = await weekStore.get(input.weekId);
    if (!week) return refuse("No such week.");
    if (week.rolloverIn != null) return { ok: true, rolloverIn: week.rolloverIn, already: true };
    const earlier = (await weekStore.list({ visibility: week.visibility })).filter((w) => w.seq < week.seq && w.state !== "DRAFT");
    const blocking = earlier.find((w) => w.state !== "SETTLED" && w.state !== "VOIDED");
    if (blocking) return refuse(`Week ${blocking.code} is not settled yet; the carry is claimed strictly in order (MR-3).`);
    const r = await input.readJackpot().catch(() => null);
    if (r === null || !Number.isSafeInteger(r) || r < 0) return refuse("The jackpot balance could not be read, so no carry was claimed.");
    const won = await weekStore.claimCarry(week.id, r);
    if (!won) return { ok: true, rolloverIn: (await weekStore.get(week.id))?.rolloverIn ?? r, already: true };
    audit({ category: "ADMIN", action: "maswali.week.carry_claimed", actorId: SYSTEM, targetType: "MaswaliCycle", targetId: week.id, payload: { code: week.code, rolloverIn: r } });
    return { ok: true, rolloverIn: r };
  });
}

/**
 * MASWALI MILLIONEA DAL — weeks, their fifteen questions, and the ticket records (MASWALI-BUILD S2).
 *
 * Mirrors `updown-dal.ts`: one interface per entity, a Prisma implementation and an in-memory one, selected by whether a
 * DATABASE_URL is configured. Tests drive the memory pair; production always uses Prisma.
 *
 * ⚠️ NOTHING HERE MOVES MONEY. A week is also a `PredictionMarket` row (`productLine: "MASWALI"`) and a ticket is a
 * `Position`; every stake, refund, payout and ledger line lives on THAT side. The settlement columns on a week MIRROR the
 * ledger and are written in the same transaction as it (S3). If you find yourself adding a balance here, stop.
 *
 * ⭐ THE FREEZE IS ENFORCED HERE, IN BOTH STORES, THE SAME WAY (`updown-dal.ts`'s lesson: a fake more permissive than
 *    the real thing makes a green suite prove nothing). `patch` takes only the columns on its allowlist and throws
 *    `'<k>' is not a patchable column` on anything else. What a player bought — the questions' texts, criteria, sources,
 *    times, roles and order, the week's rules and question-set hash, its commitment — is never on an allowlist:
 *      · a question's text fields change only while its week is DRAFT (`editDraftQuestion`, refused past DRAFT);
 *      · `rulesSnapshot` + `questionSetHash` + `marketId` are stamped once, by `stampOpen`, WHERE the week is DRAFT;
 *      · `closesAt` moves only through `moveClose` (MB-28), WHERE the week is OPEN;
 *      · the close's commitment is stamped once, by `stampClose`, WHERE the week is OPEN;
 *      · `rolloverIn` is claimed once, by `claimCarry`, WHERE it IS NULL.
 *    Every one of those is a conditional write that answers whether it won the row, never a blind update.
 */
import { Prisma } from "@prisma/client";
import { prisma, hasDatabase } from "./prisma";
import type { WeekState, TicketState } from "@/lib/maswali-week-label";
import type { MaswaliOutcome, MaswaliRole } from "@/lib/maswali-score";
import type { MaswaliVoidReason } from "@/lib/maswali-void-reason";

export type WeekVisibility = "PUBLIC" | "DRIVE";
export type EventKind = "SPORT" | "PRICE" | "WEATHER" | "ANNOUNCEMENT";

export type StoredWeek = {
  id: string;
  marketId: string | null;
  code: string;
  seq: number;
  visibility: WeekVisibility;
  state: WeekState;
  opensAt: string;
  closesAt: string;
  finalDeadlineAt: string;
  closedAt: string | null;
  rulesSnapshot: unknown | null;
  questionSetHash: string | null;
  ticketMerkleRoot: string | null;
  ticketCount: number;
  salesAtClose: number | null;
  gradedSetFinalAt: string | null;
  objectionsCloseAt: string | null;
  objectionRestarted: boolean;
  rolloverIn: number | null;
  jackpot: number | null;
  fee: number | null;
  traLevy: number | null;
  gbtLevy: number | null;
  topUp: number | null;
  winningTickets: number | null;
  sharePerTicket: number | null;
  paidTotal: number | null;
  carryOut: number | null;
  dustCarried: number | null;
  settlementGroupId: string | null;
  settledAt: string | null;
  releasedBy: string | null;
  isFinal: boolean;
  parityAttestedBy: string | null;
  parityAttestedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredQuestion = {
  id: string;
  cycleId: string;
  role: MaswaliRole;
  ordinal: number;
  slot: number;
  category: string;
  textEn: string; textSw: string; textZh: string;
  criterionEn: string; criterionSw: string; criterionZh: string;
  sourceUrl: string; sourceDomain: string;
  fallbackSourceUrl: string | null; fallbackSourceDomain: string | null;
  readingTolerance: string | null;
  eventKind: EventKind;
  eventStartsAt: string;
  eventZone: string;
  observedStartsAt: string | null;
  voidDeadlineAt: string;
  probabilityEstimate: number | null;
  probabilitySource: string | null;
  linkedMarketId: string | null;
  outcome: MaswaliOutcome | null;
  voidReason: MaswaliVoidReason | null;
  evidence: string | null;
  evidenceCaptureRef: string | null;
  sealedBy: string | null;
  sealedAt: string | null;
  twoOfficerAtStage1: boolean | null;
  stage2By: string | null;
  stage2At: string | null;
  aiSuggestion: unknown | null;
};

export type StoredTicket = {
  id: string;
  positionId: string;
  cycleId: string;
  userId: string;
  serial: string;
  selections: readonly string[];
  salt: string;
  selectionsHash: string;
  picksKey: string;
  status: TicketState;
  cancelledAt: string | null;
  closeAtPurchase: string;
  rulesVersion: string;
  score: number | null;
  won: boolean | null;
  payout: number | null;
  frozenReason: string | null;
  lastViewedAt: string | null;
  createdAt: string;
};

/** The fields a draft question carries; everything else starts empty. */
export type DraftQuestionFields = Omit<StoredQuestion,
  "id" | "cycleId" | "outcome" | "voidReason" | "evidence" | "evidenceCaptureRef" | "sealedBy" | "sealedAt" | "twoOfficerAtStage1"
  | "stage2By" | "stage2At" | "aiSuggestion" | "observedStartsAt">;

// ── THE ALLOWLISTS — the one statement of what may change after creation ─────────────────────────────

/** Week columns a plain `patch` may write. ⛔ Not: marketId, code, seq, visibility, opensAt, closesAt, rulesSnapshot,
 *  questionSetHash, ticketMerkleRoot, ticketCount, salesAtClose, closedAt, rolloverIn — each has its own claim. */
const WEEK_PATCHABLE: Record<string, (v: unknown) => unknown> = {
  state: (v) => v,
  gradedSetFinalAt: (v) => dt(v as string | null),
  objectionsCloseAt: (v) => dt(v as string | null),
  objectionRestarted: (v) => v,
  jackpot: (v) => v,
  fee: (v) => v,
  traLevy: (v) => v,
  gbtLevy: (v) => v,
  topUp: (v) => v,
  winningTickets: (v) => v,
  sharePerTicket: (v) => v,
  paidTotal: (v) => v,
  carryOut: (v) => v,
  dustCarried: (v) => v,
  settlementGroupId: (v) => v,
  settledAt: (v) => dt(v as string | null),
  releasedBy: (v) => v,
  isFinal: (v) => v,
  // MB-79's attestation is set by attestParity and cleared by any draft edit; the open reads it.
  parityAttestedBy: (v) => v,
  parityAttestedAt: (v) => dt(v as string | null),
};

/** Question columns a plain `patch` may write — the seal and its record. ⛔ Never a text, criterion, source, time,
 *  role, ordinal or slot: those change only through `editDraftQuestion`, and only while the week is DRAFT. */
const QUESTION_PATCHABLE: Record<string, (v: unknown) => unknown> = {
  outcome: (v) => v,
  voidReason: (v) => v,
  evidence: (v) => v,
  evidenceCaptureRef: (v) => v,
  sealedBy: (v) => v,
  sealedAt: (v) => dt(v as string | null),
  twoOfficerAtStage1: (v) => v,
  stage2By: (v) => v,
  stage2At: (v) => dt(v as string | null),
  aiSuggestion: (v) => v,
  observedStartsAt: (v) => dt(v as string | null),
};

/** The text a draft question may still change. */
const DRAFT_EDITABLE = new Set<keyof DraftQuestionFields>([
  "category", "textEn", "textSw", "textZh", "criterionEn", "criterionSw", "criterionZh", "sourceUrl", "sourceDomain",
  "fallbackSourceUrl", "fallbackSourceDomain", "readingTolerance", "eventKind", "eventStartsAt", "eventZone", "voidDeadlineAt",
  "probabilityEstimate", "probabilitySource", "linkedMarketId",
]);

/** Ticket columns a plain `patch` may write — settlement's stamps and the owner's view mark. ⛔ Never the picks, the
 *  salt, the hashes, the serial or the purchase facts; `status` moves only through `cancelTicket` / `settleTicket`. */
const TICKET_PATCHABLE: Record<string, (v: unknown) => unknown> = {
  frozenReason: (v) => v,
  lastViewedAt: (v) => dt(v as string | null),
};

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
const dt = (s: string | null | undefined): Date | null => (s ? new Date(s) : null);
const num = (d: unknown): number | null => (d == null ? null : Number(d));
const now = () => new Date().toISOString();

function refuseUnpatchable(store: string, fields: object, allow: Record<string, unknown>): void {
  for (const k of Object.keys(fields)) if (!allow[k]) throw new Error(`${store}.patch: '${k}' is not a patchable column`);
}

// ── THE INTERFACES ──────────────────────────────────────────────────────────────────────────────────

export interface WeekStore {
  get(id: string): Promise<StoredWeek | null>;
  getByMarketId(marketId: string): Promise<StoredWeek | null>;
  getByCode(code: string): Promise<StoredWeek | null>;
  /** Newest first. */
  list(opts?: { states?: WeekState[]; visibility?: WeekVisibility; limit?: number }): Promise<StoredWeek[]>;
  /** The open week of one visibility (the partial unique index allows at most one). */
  openFor(visibility: WeekVisibility): Promise<StoredWeek | null>;
  /** The highest `seq` so far, 0 when there is none. */
  maxSeq(): Promise<number>;
  create(w: StoredWeek): Promise<void>;
  patch(id: string, fields: Partial<StoredWeek>, tx?: Prisma.TransactionClient): Promise<void>;
  /** ⭐ The open's one write: market, rules, question-set hash and state, WHERE the week is still DRAFT. */
  stampOpen(id: string, f: { marketId: string; rulesSnapshot: unknown; questionSetHash: string; opensAt: string }, tx?: Prisma.TransactionClient): Promise<boolean>;
  /** MB-28: the close moves only while OPEN, and only from the value the caller read. */
  moveClose(id: string, fromCloseAt: string, toCloseAt: string, tx?: Prisma.TransactionClient): Promise<boolean>;
  /** ⭐ The close's one write, exactly once: OPEN → CLOSED with the commitment. */
  stampClose(id: string, f: { closedAt: string; ticketCount: number; salesAtClose: number; ticketMerkleRoot: string }, tx?: Prisma.TransactionClient): Promise<boolean>;
  /** MR-21: the carry is claimed once, WHERE `rolloverIn` IS NULL. */
  claimCarry(id: string, rolloverIn: number, tx?: Prisma.TransactionClient): Promise<boolean>;
  /** S3 · the live ticket count: +n on a purchase, −1 on a free cancel, in the money transaction. Never below 0. */
  bumpTicketCount(id: string, delta: number, tx?: Prisma.TransactionClient): Promise<void>;
  /**
   * ⭐ S3 · THE SETTLEMENT'S ONE WRITE ON THE WEEK: the mirror of the ledger group, the state and `settledAt`, WHERE the
   * week is RESOLVING and has no settlement yet. False when another settlement already won the row.
   */
  stampSettlement(id: string, f: WeekSettlementStamp, tx?: Prisma.TransactionClient): Promise<boolean>;
}

/** One ticket's grade as the settlement writes it; `frozenReason` is a winning share held for Compliance (MB-43). */
export type SettledTicketRow = { id: string; score: number | null; won: boolean; payout: number; frozenReason?: string | null };

/** The settlement columns a week mirrors from its ledger group (MR-26), written once. */
export type WeekSettlementStamp = {
  state: "SETTLED";
  jackpot: number | null; fee: number; traLevy: number; gbtLevy: number; topUp: number;
  winningTickets: number; sharePerTicket: number | null; paidTotal: number; carryOut: number; dustCarried: number;
  settlementGroupId: string; settledAt: string; releasedBy: string;
};

export interface QuestionStore {
  listForWeek(cycleId: string, tx?: Prisma.TransactionClient): Promise<StoredQuestion[]>;
  get(id: string): Promise<StoredQuestion | null>;
  createMany(cycleId: string, rows: Array<DraftQuestionFields & { id: string }>): Promise<void>;
  /** A draft's text, only while its week is DRAFT (the caller checks the week; this refuses non-draft columns). */
  editDraftQuestion(id: string, fields: Partial<DraftQuestionFields>): Promise<void>;
  patch(id: string, fields: Partial<StoredQuestion>, tx?: Prisma.TransactionClient): Promise<void>;
}

export interface TicketStore {
  get(id: string): Promise<StoredTicket | null>;
  getBySerial(serial: string): Promise<StoredTicket | null>;
  getByPositionId(positionId: string): Promise<StoredTicket | null>;
  listForWeek(cycleId: string, opts?: { status?: TicketState; tx?: Prisma.TransactionClient }): Promise<StoredTicket[]>;
  listForUser(userId: string, opts?: { cycleId?: string; limit?: number }): Promise<StoredTicket[]>;
  /** MR-11: this account's non-cancelled tickets in the week — read inside the wallet lock by the buy. */
  countLiveForUser(cycleId: string, userId: string, tx?: Prisma.TransactionClient): Promise<number>;
  /**
   * ⭐ OD-17 · the money a player got back from Millionea since `sinceIso` that must NOT offset their 24-hour loss limit:
   * every winning share settled in the window (Millionea winnings never offset it), and the stake of every ticket bought
   * BEFORE the window but refunded inside it — a free cancel or a week void (a refund offsets only a stake inside the same
   * window). One aggregate; the loss-limit gate subtracts it from the platform's gambling net.
   */
  lossLimitExclusionsSince(userId: string, sinceIso: string, tx?: Prisma.TransactionClient): Promise<number>;
  create(t: StoredTicket, tx?: Prisma.TransactionClient): Promise<void>;
  /** LIVE → CANCELLED, once. */
  cancelTicket(id: string, cancelledAt: string, tx?: Prisma.TransactionClient): Promise<boolean>;
  /** LIVE → SETTLED with its grade, once. */
  settleTicket(id: string, f: { score: number | null; won: boolean; payout: number }, tx?: Prisma.TransactionClient): Promise<boolean>;
  patch(id: string, fields: Partial<StoredTicket>): Promise<void>;
  /** S3 · every ticket a week has ever sold, cancelled ones included — the serial counter, read under the market lock. */
  countAllForWeek(cycleId: string, tx?: Prisma.TransactionClient): Promise<number>;
  /**
   * S3 · settle a week's LIVE tickets in bulk, each with its own grade, in the settlement transaction. Returns how many
   * moved LIVE → SETTLED; the caller requires it to equal the rows it passed (a mismatch rolls the settlement back).
   */
  settleWeekTickets(cycleId: string, rows: ReadonlyArray<SettledTicketRow>, tx?: Prisma.TransactionClient): Promise<number>;
}

// ── IN MEMORY ───────────────────────────────────────────────────────────────────────────────────────

declare global {
  /* eslint-disable no-var */
  var __50PICK_MLN_WEEKS: Map<string, StoredWeek> | undefined;
  var __50PICK_MLN_QUESTIONS: Map<string, StoredQuestion> | undefined;
  var __50PICK_MLN_TICKETS: Map<string, StoredTicket> | undefined;
  /* eslint-enable no-var */
}
const memWeeks = globalThis.__50PICK_MLN_WEEKS ?? (globalThis.__50PICK_MLN_WEEKS = new Map());
const memQuestions = globalThis.__50PICK_MLN_QUESTIONS ?? (globalThis.__50PICK_MLN_QUESTIONS = new Map());
const memTickets = globalThis.__50PICK_MLN_TICKETS ?? (globalThis.__50PICK_MLN_TICKETS = new Map());
const copyWeek = (w: StoredWeek): StoredWeek => ({ ...w });
const copyQuestion = (q: StoredQuestion): StoredQuestion => ({ ...q });
const copyTicket = (t: StoredTicket): StoredTicket => ({ ...t, selections: [...t.selections] });

/** The memory twins of the database's unique keys and CHECKs, so a test meets the same refusals. */
function memWeekInvariants(w: StoredWeek, excludeId?: string): void {
  for (const o of memWeeks.values()) {
    if (o.id === excludeId) continue;
    if (o.code === w.code) throw new Error(`MaswaliCycle_code_key: ${w.code}`);
    if (o.seq === w.seq) throw new Error(`MaswaliCycle_seq_key: ${w.seq}`);
    if (w.marketId && o.marketId === w.marketId) throw new Error(`MaswaliCycle_marketId_key: ${w.marketId}`);
    if (w.state === "OPEN" && o.state === "OPEN" && o.visibility === w.visibility) throw new Error(`MaswaliCycle_one_open_per_visibility_key: ${w.visibility}`);
  }
  if (w.state !== "DRAFT" && (w.rulesSnapshot == null || w.questionSetHash == null)) throw new Error("MaswaliCycle_frozen_after_draft_check");
  if (w.state !== "DRAFT" && !w.marketId) throw new Error("MaswaliCycle_market_after_draft_check");
  if (!(w.closesAt > w.opensAt)) throw new Error("MaswaliCycle_close_after_open_check");
}

const memoryWeeks: WeekStore = {
  async get(id) { const w = memWeeks.get(id); return w ? copyWeek(w) : null; },
  async getByMarketId(marketId) { const w = [...memWeeks.values()].find((x) => x.marketId === marketId); return w ? copyWeek(w) : null; },
  async getByCode(code) { const w = [...memWeeks.values()].find((x) => x.code === code); return w ? copyWeek(w) : null; },
  async list(opts) {
    const rows = [...memWeeks.values()]
      .filter((w) => (!opts?.states || opts.states.includes(w.state)) && (!opts?.visibility || w.visibility === opts.visibility))
      .sort((a, b) => b.seq - a.seq);
    return (opts?.limit != null ? rows.slice(0, opts.limit) : rows).map(copyWeek);
  },
  async openFor(visibility) { const w = [...memWeeks.values()].find((x) => x.state === "OPEN" && x.visibility === visibility); return w ? copyWeek(w) : null; },
  async maxSeq() { return Math.max(0, ...[...memWeeks.values()].map((w) => w.seq)); },
  async create(w) { memWeekInvariants(w); memWeeks.set(w.id, copyWeek(w)); },
  async patch(id, fields) {
    refuseUnpatchable("weekStore", fields, WEEK_PATCHABLE);
    const cur = memWeeks.get(id);
    if (!cur) return;
    const next = { ...cur, ...fields, updatedAt: now() };
    memWeekInvariants(next, id);
    memWeeks.set(id, next);
  },
  async stampOpen(id, f) {
    const cur = memWeeks.get(id);
    if (!cur || cur.state !== "DRAFT" || cur.rulesSnapshot != null) return false;
    const next: StoredWeek = { ...cur, marketId: f.marketId, rulesSnapshot: JSON.parse(JSON.stringify(f.rulesSnapshot)), questionSetHash: f.questionSetHash, opensAt: f.opensAt, state: "OPEN", updatedAt: now() };
    memWeekInvariants(next, id);
    memWeeks.set(id, next);
    return true;
  },
  async moveClose(id, from, to) {
    const cur = memWeeks.get(id);
    if (!cur || cur.state !== "OPEN" || cur.closesAt !== from) return false;
    const next = { ...cur, closesAt: to, updatedAt: now() };
    memWeekInvariants(next, id);
    memWeeks.set(id, next);
    return true;
  },
  async stampClose(id, f) {
    const cur = memWeeks.get(id);
    if (!cur || cur.state !== "OPEN" || cur.closedAt != null) return false;
    memWeeks.set(id, { ...cur, ...f, state: "CLOSED", updatedAt: now() });
    return true;
  },
  async claimCarry(id, rolloverIn) {
    const cur = memWeeks.get(id);
    if (!cur || cur.rolloverIn != null) return false;
    memWeeks.set(id, { ...cur, rolloverIn, updatedAt: now() });
    return true;
  },
  async bumpTicketCount(id, delta) {
    const cur = memWeeks.get(id);
    if (!cur) return;
    const next = cur.ticketCount + delta;
    if (next < 0) throw new Error("MaswaliCycle_ticketCount_check");
    memWeeks.set(id, { ...cur, ticketCount: next, updatedAt: now() });
  },
  async stampSettlement(id, f) {
    const cur = memWeeks.get(id);
    if (!cur || cur.state !== "RESOLVING" || cur.settledAt != null || cur.settlementGroupId != null) return false;
    if ([...memWeeks.values()].some((w) => w.id !== id && w.settlementGroupId === f.settlementGroupId)) throw new Error("MaswaliCycle_settlementGroupId_key");
    memWeeks.set(id, { ...cur, ...f, updatedAt: now() });
    return true;
  },
};

const memoryQuestions: QuestionStore = {
  async listForWeek(cycleId) {
    return [...memQuestions.values()].filter((q) => q.cycleId === cycleId).sort((a, b) => a.slot - b.slot).map(copyQuestion);
  },
  async get(id) { const q = memQuestions.get(id); return q ? copyQuestion(q) : null; },
  async createMany(cycleId, rows) {
    const existing = [...memQuestions.values()].filter((q) => q.cycleId === cycleId);
    for (const r of rows) {
      if (existing.some((q) => q.slot === r.slot) || rows.filter((x) => x.slot === r.slot).length > 1) throw new Error(`MaswaliQuestion_cycleId_slot_key: ${r.slot}`);
      if (r.slot !== (r.role === "MAIN" ? r.ordinal : r.ordinal + 10)) throw new Error("MaswaliQuestion_ordinal_check");
    }
    for (const r of rows) {
      memQuestions.set(r.id, { ...r, cycleId, outcome: null, voidReason: null, evidence: null, evidenceCaptureRef: null, sealedBy: null, sealedAt: null,
        twoOfficerAtStage1: null, stage2By: null, stage2At: null, aiSuggestion: null, observedStartsAt: null });
    }
  },
  async editDraftQuestion(id, fields) {
    for (const k of Object.keys(fields)) if (!DRAFT_EDITABLE.has(k as keyof DraftQuestionFields)) throw new Error(`questionStore.editDraftQuestion: '${k}' is not a draft field`);
    const cur = memQuestions.get(id);
    if (cur) memQuestions.set(id, { ...cur, ...fields });
  },
  async patch(id, fields) {
    refuseUnpatchable("questionStore", fields, QUESTION_PATCHABLE);
    const cur = memQuestions.get(id);
    if (!cur) return;
    const next = { ...cur, ...fields };
    if ((next.outcome === "VOID") !== (next.voidReason != null)) throw new Error("MaswaliQuestion_void_reason_check");
    memQuestions.set(id, next);
  },
};

const memoryTickets: TicketStore = {
  async get(id) { const t = memTickets.get(id); return t ? copyTicket(t) : null; },
  async getBySerial(serial) { const t = [...memTickets.values()].find((x) => x.serial === serial); return t ? copyTicket(t) : null; },
  async getByPositionId(positionId) { const t = [...memTickets.values()].find((x) => x.positionId === positionId); return t ? copyTicket(t) : null; },
  async listForWeek(cycleId, opts) {
    return [...memTickets.values()].filter((t) => t.cycleId === cycleId && (!opts?.status || t.status === opts.status))
      .sort((a, b) => (a.id < b.id ? -1 : 1)).map(copyTicket);
  },
  async listForUser(userId, opts) {
    const rows = [...memTickets.values()].filter((t) => t.userId === userId && (!opts?.cycleId || t.cycleId === opts.cycleId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return (opts?.limit != null ? rows.slice(0, opts.limit) : rows).map(copyTicket);
  },
  async countLiveForUser(cycleId, userId) {
    return [...memTickets.values()].filter((t) => t.cycleId === cycleId && t.userId === userId && t.status !== "CANCELLED").length;
  },
  async lossLimitExclusionsSince(userId, sinceIso) {
    const since = Date.parse(sinceIso);
    const { positionStore } = await import("./market-dal");
    let sum = 0;
    for (const t of memTickets.values()) {
      if (t.userId !== userId) continue;
      const week = memWeeks.get(t.cycleId);
      if (t.status === "SETTLED" && t.won && (t.payout ?? 0) > 0 && week?.settledAt && Date.parse(week.settledAt) >= since) sum += t.payout ?? 0;
      if (Date.parse(t.createdAt) >= since) continue;
      const p = await positionStore.get(t.positionId);
      const cancelledIn = t.status === "CANCELLED" && t.cancelledAt != null && Date.parse(t.cancelledAt) >= since;
      const voidedIn = p?.status === "VOID" && p.settledAt != null && Date.parse(p.settledAt) >= since;
      if ((cancelledIn || voidedIn) && p) sum += p.stake;
    }
    return sum;
  },
  async create(t) {
    for (const o of memTickets.values()) {
      if (o.positionId === t.positionId) throw new Error(`MaswaliTicket_positionId_key: ${t.positionId}`);
      if (o.serial === t.serial) throw new Error(`MaswaliTicket_serial_key: ${t.serial}`);
    }
    memTickets.set(t.id, copyTicket(t));
  },
  async cancelTicket(id, cancelledAt) {
    const cur = memTickets.get(id);
    if (!cur || cur.status !== "LIVE") return false;
    memTickets.set(id, { ...cur, status: "CANCELLED", cancelledAt });
    return true;
  },
  async settleTicket(id, f) {
    const cur = memTickets.get(id);
    if (!cur || cur.status !== "LIVE") return false;
    memTickets.set(id, { ...cur, status: "SETTLED", score: f.score, won: f.won, payout: f.payout });
    return true;
  },
  async patch(id, fields) {
    refuseUnpatchable("ticketStore", fields, TICKET_PATCHABLE);
    const cur = memTickets.get(id);
    if (cur) memTickets.set(id, { ...cur, ...fields });
  },
  async countAllForWeek(cycleId) {
    return [...memTickets.values()].filter((t) => t.cycleId === cycleId).length;
  },
  async settleWeekTickets(cycleId, rows) {
    let n = 0;
    for (const r of rows) {
      const cur = memTickets.get(r.id);
      if (!cur || cur.cycleId !== cycleId || cur.status !== "LIVE") continue;
      memTickets.set(r.id, { ...cur, status: "SETTLED", score: r.score, won: r.won, payout: r.payout, frozenReason: r.frozenReason ?? null });
      n++;
    }
    return n;
  },
};

// ── POSTGRES ────────────────────────────────────────────────────────────────────────────────────────

function pc() {
  const c = prisma();
  if (!c) throw new Error("maswali-dal: DATABASE_URL required");
  return c;
}
const db_ = (tx?: Prisma.TransactionClient) => tx ?? pc();

/* eslint-disable @typescript-eslint/no-explicit-any */
function toWeek(r: any): StoredWeek {
  return {
    id: r.id, marketId: r.marketId ?? null, code: r.code, seq: r.seq, visibility: r.visibility as WeekVisibility, state: r.state as WeekState,
    opensAt: iso(r.opensAt)!, closesAt: iso(r.closesAt)!, finalDeadlineAt: iso(r.finalDeadlineAt)!, closedAt: iso(r.closedAt),
    rulesSnapshot: r.rulesSnapshot ?? null, questionSetHash: r.questionSetHash ?? null, ticketMerkleRoot: r.ticketMerkleRoot ?? null,
    ticketCount: r.ticketCount ?? 0, salesAtClose: num(r.salesAtClose), gradedSetFinalAt: iso(r.gradedSetFinalAt),
    objectionsCloseAt: iso(r.objectionsCloseAt), objectionRestarted: r.objectionRestarted === true,
    rolloverIn: num(r.rolloverIn), jackpot: num(r.jackpot), fee: num(r.fee), traLevy: num(r.traLevy), gbtLevy: num(r.gbtLevy),
    topUp: num(r.topUp), winningTickets: r.winningTickets ?? null, sharePerTicket: num(r.sharePerTicket), paidTotal: num(r.paidTotal),
    carryOut: num(r.carryOut), dustCarried: num(r.dustCarried), settlementGroupId: r.settlementGroupId ?? null, settledAt: iso(r.settledAt),
    releasedBy: r.releasedBy ?? null, isFinal: r.isFinal === true,
    parityAttestedBy: r.parityAttestedBy ?? null, parityAttestedAt: iso(r.parityAttestedAt), createdBy: r.createdBy, createdAt: iso(r.createdAt)!, updatedAt: iso(r.updatedAt)!,
  };
}
function toQuestion(r: any): StoredQuestion {
  return {
    id: r.id, cycleId: r.cycleId, role: r.role as MaswaliRole, ordinal: r.ordinal, slot: r.slot, category: r.category,
    textEn: r.textEn, textSw: r.textSw, textZh: r.textZh, criterionEn: r.criterionEn, criterionSw: r.criterionSw, criterionZh: r.criterionZh,
    sourceUrl: r.sourceUrl, sourceDomain: r.sourceDomain, fallbackSourceUrl: r.fallbackSourceUrl ?? null, fallbackSourceDomain: r.fallbackSourceDomain ?? null,
    readingTolerance: r.readingTolerance ?? null, eventKind: r.eventKind as EventKind, eventStartsAt: iso(r.eventStartsAt)!, eventZone: r.eventZone,
    observedStartsAt: iso(r.observedStartsAt), voidDeadlineAt: iso(r.voidDeadlineAt)!, probabilityEstimate: num(r.probabilityEstimate),
    probabilitySource: r.probabilitySource ?? null, linkedMarketId: r.linkedMarketId ?? null, outcome: (r.outcome as MaswaliOutcome | null) ?? null,
    voidReason: (r.voidReason as MaswaliVoidReason | null) ?? null, evidence: r.evidence ?? null, evidenceCaptureRef: r.evidenceCaptureRef ?? null,
    sealedBy: r.sealedBy ?? null, sealedAt: iso(r.sealedAt), twoOfficerAtStage1: r.twoOfficerAtStage1 ?? null, stage2By: r.stage2By ?? null,
    stage2At: iso(r.stage2At), aiSuggestion: r.aiSuggestion ?? null,
  };
}
function toTicket(r: any): StoredTicket {
  return {
    id: r.id, positionId: r.positionId, cycleId: r.cycleId, userId: r.userId, serial: r.serial,
    selections: Array.isArray(r.selections) ? (r.selections as string[]) : [], salt: r.salt, selectionsHash: r.selectionsHash, picksKey: r.picksKey,
    status: r.status as TicketState, cancelledAt: iso(r.cancelledAt), closeAtPurchase: iso(r.closeAtPurchase)!, rulesVersion: r.rulesVersion,
    score: r.score ?? null, won: r.won ?? null, payout: num(r.payout), frozenReason: r.frozenReason ?? null, lastViewedAt: iso(r.lastViewedAt),
    createdAt: iso(r.createdAt)!,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const prismaWeeks: WeekStore = {
  async get(id) { const r = await pc().maswaliCycle.findUnique({ where: { id } }); return r ? toWeek(r) : null; },
  async getByMarketId(marketId) { const r = await pc().maswaliCycle.findUnique({ where: { marketId } }); return r ? toWeek(r) : null; },
  async getByCode(code) { const r = await pc().maswaliCycle.findUnique({ where: { code } }); return r ? toWeek(r) : null; },
  async list(opts) {
    const rows = await pc().maswaliCycle.findMany({
      where: { ...(opts?.states ? { state: { in: opts.states } } : {}), ...(opts?.visibility ? { visibility: opts.visibility } : {}) },
      orderBy: { seq: "desc" },
      ...(opts?.limit != null ? { take: opts.limit } : {}),
    });
    return rows.map(toWeek);
  },
  async openFor(visibility) { const r = await pc().maswaliCycle.findFirst({ where: { state: "OPEN", visibility } }); return r ? toWeek(r) : null; },
  async maxSeq() { const r = await pc().maswaliCycle.aggregate({ _max: { seq: true } }); return r._max.seq ?? 0; },
  async create(w) {
    await pc().maswaliCycle.create({
      data: {
        id: w.id, marketId: w.marketId, code: w.code, seq: w.seq, visibility: w.visibility, state: w.state,
        opensAt: new Date(w.opensAt), closesAt: new Date(w.closesAt), finalDeadlineAt: new Date(w.finalDeadlineAt),
        rulesSnapshot: (w.rulesSnapshot ?? undefined) as Prisma.InputJsonValue | undefined, questionSetHash: w.questionSetHash,
        isFinal: w.isFinal, createdBy: w.createdBy, createdAt: new Date(w.createdAt),
      },
    });
  },
  async patch(id, fields, tx) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const coerce = WEEK_PATCHABLE[k];
      if (!coerce) throw new Error(`weekStore.patch: '${k}' is not a patchable column`);
      data[k] = coerce(v);
    }
    if (Object.keys(data).length === 0) return;
    await db_(tx).maswaliCycle.update({ where: { id }, data });
  },
  async stampOpen(id, f, tx) {
    const r = await db_(tx).maswaliCycle.updateMany({
      where: { id, state: "DRAFT", rulesSnapshot: { equals: Prisma.DbNull } },
      data: { marketId: f.marketId, rulesSnapshot: f.rulesSnapshot as Prisma.InputJsonValue, questionSetHash: f.questionSetHash, opensAt: new Date(f.opensAt), state: "OPEN" },
    });
    return r.count === 1;
  },
  async moveClose(id, from, to, tx) {
    const r = await db_(tx).maswaliCycle.updateMany({ where: { id, state: "OPEN", closesAt: new Date(from) }, data: { closesAt: new Date(to) } });
    return r.count === 1;
  },
  async stampClose(id, f, tx) {
    const r = await db_(tx).maswaliCycle.updateMany({
      where: { id, state: "OPEN", closedAt: null },
      data: { closedAt: new Date(f.closedAt), ticketCount: f.ticketCount, salesAtClose: f.salesAtClose, ticketMerkleRoot: f.ticketMerkleRoot, state: "CLOSED" },
    });
    return r.count === 1;
  },
  async claimCarry(id, rolloverIn, tx) {
    const r = await db_(tx).maswaliCycle.updateMany({ where: { id, rolloverIn: null }, data: { rolloverIn } });
    return r.count === 1;
  },
  async bumpTicketCount(id, delta, tx) {
    // An atomic increment, computed by the database; the CHECK refuses a count below 0.
    await db_(tx).maswaliCycle.update({ where: { id }, data: { ticketCount: { increment: delta } } });
  },
  async stampSettlement(id, f, tx) {
    const r = await db_(tx).maswaliCycle.updateMany({
      where: { id, state: "RESOLVING", settledAt: null, settlementGroupId: null },
      data: {
        state: f.state, jackpot: f.jackpot, fee: f.fee, traLevy: f.traLevy, gbtLevy: f.gbtLevy, topUp: f.topUp,
        winningTickets: f.winningTickets, sharePerTicket: f.sharePerTicket, paidTotal: f.paidTotal, carryOut: f.carryOut,
        dustCarried: f.dustCarried, settlementGroupId: f.settlementGroupId, settledAt: new Date(f.settledAt), releasedBy: f.releasedBy,
      },
    });
    return r.count === 1;
  },
};

const prismaQuestions: QuestionStore = {
  async listForWeek(cycleId, tx) {
    const rows = await db_(tx).maswaliQuestion.findMany({ where: { cycleId }, orderBy: { slot: "asc" } });
    return rows.map(toQuestion);
  },
  async get(id) { const r = await pc().maswaliQuestion.findUnique({ where: { id } }); return r ? toQuestion(r) : null; },
  async createMany(cycleId, rows) {
    await pc().maswaliQuestion.createMany({
      data: rows.map((r) => ({
        id: r.id, cycleId, role: r.role, ordinal: r.ordinal, slot: r.slot, category: r.category,
        textEn: r.textEn, textSw: r.textSw, textZh: r.textZh, criterionEn: r.criterionEn, criterionSw: r.criterionSw, criterionZh: r.criterionZh,
        sourceUrl: r.sourceUrl, sourceDomain: r.sourceDomain, fallbackSourceUrl: r.fallbackSourceUrl, fallbackSourceDomain: r.fallbackSourceDomain,
        readingTolerance: r.readingTolerance, eventKind: r.eventKind, eventStartsAt: new Date(r.eventStartsAt), eventZone: r.eventZone,
        voidDeadlineAt: new Date(r.voidDeadlineAt), probabilityEstimate: r.probabilityEstimate, probabilitySource: r.probabilitySource,
        linkedMarketId: r.linkedMarketId,
      })),
    });
  },
  async editDraftQuestion(id, fields) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (!DRAFT_EDITABLE.has(k as keyof DraftQuestionFields)) throw new Error(`questionStore.editDraftQuestion: '${k}' is not a draft field`);
      data[k] = k === "eventStartsAt" || k === "voidDeadlineAt" ? new Date(v as string) : v;
    }
    if (Object.keys(data).length === 0) return;
    await pc().maswaliQuestion.update({ where: { id }, data });
  },
  async patch(id, fields, tx) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const coerce = QUESTION_PATCHABLE[k];
      if (!coerce) throw new Error(`questionStore.patch: '${k}' is not a patchable column`);
      data[k] = coerce(v);
    }
    if (Object.keys(data).length === 0) return;
    await db_(tx).maswaliQuestion.update({ where: { id }, data });
  },
};

const prismaTickets: TicketStore = {
  async get(id) { const r = await pc().maswaliTicket.findUnique({ where: { id } }); return r ? toTicket(r) : null; },
  async getBySerial(serial) { const r = await pc().maswaliTicket.findUnique({ where: { serial } }); return r ? toTicket(r) : null; },
  async getByPositionId(positionId) { const r = await pc().maswaliTicket.findUnique({ where: { positionId } }); return r ? toTicket(r) : null; },
  async listForWeek(cycleId, opts) {
    const rows = await db_(opts?.tx).maswaliTicket.findMany({ where: { cycleId, ...(opts?.status ? { status: opts.status } : {}) }, orderBy: { id: "asc" } });
    return rows.map(toTicket);
  },
  async listForUser(userId, opts) {
    const rows = await pc().maswaliTicket.findMany({
      where: { userId, ...(opts?.cycleId ? { cycleId: opts.cycleId } : {}) },
      orderBy: { createdAt: "desc" },
      ...(opts?.limit != null ? { take: opts.limit } : {}),
    });
    return rows.map(toTicket);
  },
  async countLiveForUser(cycleId, userId, tx) {
    return db_(tx).maswaliTicket.count({ where: { cycleId, userId, NOT: { status: "CANCELLED" } } });
  },
  async lossLimitExclusionsSince(userId, sinceIso, tx) {
    // ⚠️ The timestamps are `timestamp WITHOUT time zone` holding UTC: the bound is an ISO string cast `::timestamp`
    // (Postgres drops the Z and compares UTC to UTC), never a JS Date the driver could serialise in the container's zone.
    // Sums cast `::text` and parsed here: `payout` and `stake` are Decimal(18,2).
    const rows = await db_(tx).$queryRaw<Array<{ sum: string | null }>>`
      SELECT COALESCE(SUM(
               CASE WHEN t."status" = 'SETTLED' AND t."won" AND c."settledAt" >= ${sinceIso}::timestamp THEN COALESCE(t."payout", 0) ELSE 0 END
             + CASE WHEN t."createdAt" < ${sinceIso}::timestamp
                     AND ((t."status" = 'CANCELLED' AND t."cancelledAt" >= ${sinceIso}::timestamp)
                       OR (p."status" = 'VOID' AND p."settledAt" >= ${sinceIso}::timestamp))
                    THEN p."stake" ELSE 0 END
             ), 0)::text AS "sum"
        FROM "MaswaliTicket" t
        JOIN "MaswaliCycle" c ON c."id" = t."cycleId"
        JOIN "Position" p ON p."id" = t."positionId"
       WHERE t."userId" = ${userId}`;
    const n = Number(rows[0]?.sum ?? 0);
    if (!Number.isFinite(n)) throw new Error("maswali-dal: the loss-limit exclusions could not be read");
    return Math.round(n);
  },
  async create(t, tx) {
    await db_(tx).maswaliTicket.create({
      data: {
        id: t.id, positionId: t.positionId, cycleId: t.cycleId, userId: t.userId, serial: t.serial,
        selections: [...t.selections] as Prisma.InputJsonValue, salt: t.salt, selectionsHash: t.selectionsHash, picksKey: t.picksKey,
        status: t.status, closeAtPurchase: new Date(t.closeAtPurchase), rulesVersion: t.rulesVersion, createdAt: new Date(t.createdAt),
      },
    });
  },
  async cancelTicket(id, cancelledAt, tx) {
    const r = await db_(tx).maswaliTicket.updateMany({ where: { id, status: "LIVE" }, data: { status: "CANCELLED", cancelledAt: new Date(cancelledAt) } });
    return r.count === 1;
  },
  async settleTicket(id, f, tx) {
    const r = await db_(tx).maswaliTicket.updateMany({ where: { id, status: "LIVE" }, data: { status: "SETTLED", score: f.score, won: f.won, payout: f.payout } });
    return r.count === 1;
  },
  async patch(id, fields) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const coerce = TICKET_PATCHABLE[k];
      if (!coerce) throw new Error(`ticketStore.patch: '${k}' is not a patchable column`);
      data[k] = coerce(v);
    }
    if (Object.keys(data).length === 0) return;
    await pc().maswaliTicket.update({ where: { id }, data });
  },
  async countAllForWeek(cycleId, tx) {
    return db_(tx).maswaliTicket.count({ where: { cycleId } });
  },
  async settleWeekTickets(cycleId, rows, tx) {
    // ⭐ BULK, NOT ROW BY ROW (MB-31's 10,000-ticket budget): one UPDATE … FROM (VALUES …) per batch, each value bound
    // and cast explicitly (a bound JS number is not an int4 to Postgres). Conditional on LIVE, so a re-run settles nothing.
    let n = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const values = Prisma.join(batch.map((r) => Prisma.sql`(${r.id}, ${r.score}::int, ${r.won}::boolean, ${r.payout}::numeric, ${r.frozenReason ?? null}::text)`));
      n += await db_(tx).$executeRaw`
        UPDATE "MaswaliTicket" AS t
           SET "status" = 'SETTLED', "score" = v.score, "won" = v.won, "payout" = v.payout, "frozenReason" = v.frozen
          FROM (VALUES ${values}) AS v(id, score, won, payout, frozen)
         WHERE t."id" = v.id AND t."cycleId" = ${cycleId} AND t."status" = 'LIVE'`;
    }
    return n;
  },
};

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";

export const weekStore: WeekStore = usePrisma ? prismaWeeks : memoryWeeks;
export const questionStore: QuestionStore = usePrisma ? prismaQuestions : memoryQuestions;
export const ticketStore: TicketStore = usePrisma ? prismaTickets : memoryTickets;

/** The two halves, by name, for the two-store suites (`runTwoStores`). */
export const __maswaliStores = { memory: { weekStore: memoryWeeks, questionStore: memoryQuestions, ticketStore: memoryTickets },
  prisma: { weekStore: prismaWeeks, questionStore: prismaQuestions, ticketStore: prismaTickets } };

/** ⚠️ TEST SEAM ONLY: empty the memory stores. A no-op on Postgres. */
export function __resetMaswaliMemoryStores(): void {
  if (usePrisma) return;
  memWeeks.clear();
  memQuestions.clear();
  memTickets.clear();
}

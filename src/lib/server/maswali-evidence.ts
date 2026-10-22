/**
 * MASWALI MILLIONEA — THE PER-WEEK EVIDENCE PACK (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 8, MB-92).
 *
 * "The Board asks for an audit." One file per week that says what the platform recorded about it, built on demand from
 * records kept 7 years (docs/DATA-RETENTION.md §1). What is FINAL once the week is (settled or voided) reads the same
 * however late the pack is built: its frozen rules, its graded set, its tickets, its commitment and its money groups. What
 * can still MOVE is read as it stands when the pack is built, and the pack says when (`generatedAt`): a winning share's
 * state (Compliance may still release or forfeit it — each a new audit row and, for a forfeit, a ledger group of its own),
 * the objections and their reviews, and a winner's account role and status. The cluster report reads the platform's
 * records over the window that ends at the week's CLOSE, never at the build (S6 review R2-3), so every later pack reads
 * the same span. It carries:
 *   · the week and its frozen rules — the rules snapshot, and the fee its market froze beside the levies;
 *   · the fifteen questions as frozen, each with its result, its void ground, its evidence and capture reference, its
 *     officer and its second officer;
 *   · the audit rows of the week's life and of every seal, confirmation, correction and proposed void, and of any share
 *     Compliance held, released or forfeited;
 *   · the objections against the week;
 *   · the commitment — the question-set hash, the Merkle root and every ticket's leaf — RECOMPUTED here from the stored
 *     rows and compared with what was published;
 *   · the settlement's ledger group line by line (or the week void's refund group), and every movement of the guarantee
 *     up to the week's end;
 *   · the integrity report (the winners and the shares under review) and the cluster report (MB-35);
 *   · every ticket, as a CSV whose SHA-256 the pack names, so the two files belong together — and that CSV is built on
 *     its own for the download's `part=tickets` (`maswaliEvidenceTickets`, R5), so no section of the pack holds it back.
 *
 * ⛔ READ ONLY. Nothing here writes, locks or moves money; the route that serves the pack records each export.
 * ⛔ ONLY A FINAL WEEK — settled, or voided. Before that its tickets are a pick aggregate (MB-34, MB-95): the integrity page
 *    is Compliance's view of a week in progress, and the sealing officer never sees either.
 * ⛔ NO SALT, NO NAME, NO NUMBER. A ticket's salt is its owner's alone (MB-32), so the pack proves each leaf server-side and
 *    reports the count; accounts appear by id only — the pack is a file that leaves the console, and an audit matches ids
 *    against the platform, not people against a list. No audit row carries its IP or device here. ⚠️ An objection is
 *    carried as its player wrote it: its words are evidence, and the pack does not edit them.
 */
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma, hasDatabase } from "./prisma";
import { questionStore, ticketStore, weekStore, type StoredQuestion, type StoredTicket, type StoredWeek } from "./maswali-dal";
import { getAuditByActionsDurable, getAuditForTargetsDurable, type AuditEntry } from "./audit";
import { marketStore } from "./market-dal";
import { db } from "./store";
import { acct } from "./ledger";
import { clusterReport, type ClusterReport } from "./maswali-integrity";
import { canonicalSelections, leafHash, merkleRoot, questionSetHash, type FrozenQuestion } from "@/lib/maswali-commitment";
import { toCsv } from "@/lib/contacts/csv-write";
import { shareNoteOf, shareStateOf } from "@/lib/maswali-share-note";

/** The week's own audit actions the pack carries — its life, never the purchases (the ticket CSV is those). S6-DOCS (item 8):
 *  the float check's two findings both — the float short (`float_low`) and the float that could not be read
 *  (`float_unread`, S7-F2's fail-closed row) — so an auditor reads every payout made without a float on record. */
export const EVIDENCE_WEEK_ACTIONS = [
  "maswali.week.drafted", "maswali.week.draft_edited", "maswali.week.parity_attested", "maswali.week.opened",
  "maswali.week.close_moved", "maswali.week.closed", "maswali.week.graded_set_final", "maswali.week.voided",
  "maswali.week.refunded", "maswali.week.carry_claimed", "maswali.week.settled", "maswali.sunset.ordered",
  "maswali.sunset.passed_on", "maswali.settlement.guarantee_short", "maswali.settlement.jackpot_short",
  "maswali.settlement.float_low", "maswali.settlement.float_unread", "maswali.seal.new_device", "maswali.scheduler.step_failed",
] as const;
/** Every act on one of the fifteen questions. */
export const EVIDENCE_QUESTION_ACTIONS = ["maswali.question.sealed", "maswali.question.confirmed", "maswali.question.corrected", "maswali.question.void_proposed"] as const;
/** Compliance's decisions on a winning share (MB-43, OD-07). */
export const EVIDENCE_SHARE_ACTIONS = ["maswali.share.held", "maswali.share.released", "maswali.share.forfeited"] as const;
/** The most rows one audit read returns; a read that reaches it says so (`complete: false`), it never cuts in silence. */
const AUDIT_READ_LIMIT = 5_000;

/** R2-10 · the platform-wide sales pause and its lifting (`maswali-pause.ts`): rows that name no week, carried by every week
 *  whose sale window they fall inside. */
export const EVIDENCE_PAUSE_ACTIONS = ["maswali.sales.paused", "maswali.sales.resumed"] as const;

/** R2-10 · the pause rows that are one week's: those inside its sale window — its open to its close (the scheduled close
 *  if it never closed) — and, R3, the start row of a pause still in force when the week opened: the last change before
 *  the open, when that change is a pause. A pause lifted before the open is not the week's. */
export function salesPauseRowsFor(week: Pick<StoredWeek, "opensAt" | "closedAt" | "closesAt">, entries: readonly AuditEntry[]): AuditEntry[] {
  const from = Date.parse(week.opensAt), to = Date.parse(week.closedAt ?? week.closesAt);
  const pauses = entries.filter((e) => (EVIDENCE_PAUSE_ACTIONS as readonly string[]).includes(e.action));
  const inside = pauses.filter((e) => { const at = Date.parse(e.createdAt); return at >= from && at <= to; });
  const before = pauses.filter((e) => Date.parse(e.createdAt) < from)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  const last = before[before.length - 1];
  return last && last.action === EVIDENCE_PAUSE_ACTIONS[0] ? [last, ...inside] : inside;
}

/** MB-92 (S6 review R2-8a) · what the pack says for a question whose evidence capture was never taken: the capture is
 *  MB-80's, which no seal writes yet — a statement, never a bare null an auditor could read as "lost". ⛔ In words: the
 *  auditor reads the pack, and a programme code means nothing to them (S6-ADMIN, DESIGN_AUTHORITY §M8a item 29). */
export const EVIDENCE_CAPTURE_NOT_TAKEN = "no capture was taken: the platform does not record source captures yet";

/** The ticket CSV's columns, in order. */
export const EVIDENCE_TICKET_COLUMNS = [
  "serial", "ticket_id", "account_id", "position_id", "status", "bought_at", "cancelled_at", "close_at_purchase",
  "rules_version", "picks", "selections_hash", "score", "won", "payout", "share", "share_note",
] as const;

export type EvidenceAuditRow = {
  id: string; createdAt: string; category: string; action: string; actorId: string | null;
  targetType: string | null; targetId: string | null; payload: unknown; entryHash: string | null;
};
export type EvidenceLedgerLine = {
  id: string; groupId: string; account: string; entryType: string; amount: string; memo: string | null;
  txnId: string | null; marketId: string | null; userId: string | null; createdAt: string;
};
/** A ledger read: the lines, or why there are none to show — never an empty list standing in for an unread one. */
export type EvidenceLedger = { state: "read"; lines: EvidenceLedgerLine[]; sumTzs: number } | { state: "not-kept" | "unreadable"; lines: null; sumTzs: null };

export type MaswaliEvidencePack = {
  kind: "50pick.millionea.evidence";
  version: 1;
  generatedAt: string;
  week: StoredWeek;
  rules: { snapshot: unknown; feeSnapshot: unknown | null };
  /** The fifteen questions as stored — each capture reference, or `EVIDENCE_CAPTURE_NOT_TAKEN` when none was taken. */
  questions: Array<Omit<StoredQuestion, "evidenceCaptureRef"> & { evidenceCaptureRef: string }>;
  commitment: {
    questionSetHash: string | null; questionSetRecomputed: string | null; questionSetMatches: boolean | null;
    ticketMerkleRoot: string | null; ticketCount: number; rootRecomputed: string; rootMatches: boolean | null;
    /** Every committed ticket's leaf recomputed from its stored answers and salt (the salt never leaves the server). */
    leaves: { committed: number; verified: number };
  };
  audit: { rows: EvidenceAuditRow[]; complete: boolean };
  objections: unknown[];
  /** R2-10 · `forfeits`: every share Compliance forfeited back to the jackpot, one group per forfeit (`maswali_forfeit_<txn>`). */
  ledger: { settlement: EvidenceLedger | null; voidRefund: EvidenceLedger | null; guarantee: EvidenceLedger; forfeits: EvidenceLedger | null };
  integrity: {
    winners: Array<{ serial: string; ticketId: string; accountId: string; payout: number; share: "paid" | "held" | "forfeited"; accountRole: string | null; accountStatus: string | null; accountAgeDaysAtClose: number | null }>;
    sharesHeld: number;
    sharesForfeited: number;
  };
  /** The cluster report, with accounts by id only. */
  clusters: Omit<ClusterReport, "groups" | "crowded" | "lines" | "weekState" | "undecidedShares" | "coverage" | "boardCoverage"> & {
    /** The week's board share (the report's `boardCoverage`), under the name the pack has always printed (S6-INT). */
    coverage: number;
    /** R5 · the report's one order (`clusterLineOrder`), as the lines' ids: the order Compliance saw them in. */
    order: string[];
    groups: EvidenceClusterLine[];
    /** R3 · each crowded place the week's holders share, on its own line — accounts by id only, as the groups. R4 · every
     *  holder on it, read whole (the report itself carries the first few). */
    crowded: EvidenceClusterLine[];
  };
  tickets: { count: number; columns: readonly string[]; sha256: string };
};

/** One cluster line as the pack carries it: the report's line, its accounts by id only. */
export type EvidenceClusterLine = Omit<ClusterReport["lines"][number], "accounts"> & { accounts: Array<{ userId: string; tickets: number }> };

export type EvidenceResult = { ok: true; pack: MaswaliEvidencePack; csv: string } | { ok: false; error: string; notFinal?: true };
/** R5 · `part=tickets`: the ticket CSV alone, and what its export record names. */
export type EvidenceTicketsResult =
  | { ok: true; week: StoredWeek; csv: string; tickets: { count: number; sha256: string } }
  | { ok: false; error: string; notFinal?: true };

const dbPresent = () => hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
const shareOf = (t: StoredTicket) => shareStateOf(t.frozenReason);

/**
 * The weeks a pack is built for: settled or voided. What is FINAL then is the week's graded set, its tickets, its
 * commitment and its money groups; what can still MOVE is a winning share's state — Compliance may hold, release or
 * forfeit it after the settlement (OD-07) — so a later pack reads the share as it stands, and the audit rows say when it
 * moved.
 */
export const evidenceReady = (w: Pick<StoredWeek, "state">): boolean => w.state === "SETTLED" || w.state === "VOIDED";

function auditRow(e: AuditEntry): EvidenceAuditRow {
  return {
    id: e.id, createdAt: e.createdAt, category: e.category, action: e.action, actorId: e.actorId ?? null,
    targetType: e.targetType ?? null, targetId: e.targetId ?? null, payload: e.payload ?? null, entryHash: e.entryHash ?? null,
  };
}

/** Ledger lines by a filter, oldest first — on Postgres. The memory store keeps no ledger lines (it mirrors balances). */
async function ledgerLines(where: Prisma.LedgerEntryWhereInput): Promise<EvidenceLedger> {
  if (!dbPresent()) return { state: "not-kept", lines: null, sumTzs: null };
  const c = prisma();
  if (!c) return { state: "unreadable", lines: null, sumTzs: null };
  try {
    const rows = await c.ledgerEntry.findMany({ where, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const lines = rows.map((r): EvidenceLedgerLine => ({
      id: r.id, groupId: r.groupId, account: r.account, entryType: String(r.entryType), amount: r.amount.toFixed(2),
      memo: r.memo ?? null, txnId: r.txnId ?? null, marketId: r.marketId ?? null, userId: r.userId ?? null, createdAt: r.createdAt.toISOString(),
    }));
    // Summed in whole cents from the stored two-place decimals, so a group's balance is exact (MR-26: it must be 0).
    const cents = lines.reduce((s, l) => s + Math.round(Number(l.amount) * 100), 0);
    return { state: "read", lines, sumTzs: cents / 100 };
  } catch (err) {
    console.error("[maswali-evidence] a ledger read failed:", (err as Error)?.message ?? err);
    return { state: "unreadable", lines: null, sumTzs: null };
  }
}

/** The question as the open froze it — the same fields, in the same shape, `openWeek` hashed. */
const frozenOf = (q: StoredQuestion): FrozenQuestion => ({
  role: q.role, ordinal: q.ordinal, slot: q.slot, category: q.category, textEn: q.textEn, textSw: q.textSw, textZh: q.textZh,
  criterionEn: q.criterionEn, criterionSw: q.criterionSw, criterionZh: q.criterionZh, sourceUrl: q.sourceUrl,
  fallbackSourceUrl: q.fallbackSourceUrl, eventStartsAt: q.eventStartsAt, eventZone: q.eventZone, voidDeadlineAt: q.voidDeadlineAt,
});

/** The ticket CSV: every ticket the week sold, cancelled ones included, by serial. ⛔ No salt and no name. */
function ticketCsv(tickets: readonly StoredTicket[]): string {
  const rows = [...tickets].sort((a, b) => a.serial.localeCompare(b.serial)).map((t) => {
    let picks: string;
    try { picks = canonicalSelections(t.selections); } catch { picks = t.selections.join("|"); }
    const won = t.status === "SETTLED" && t.won === true;
    return [
      t.serial, t.id, t.userId, t.positionId, t.status, t.createdAt, t.cancelledAt, t.closeAtPurchase, t.rulesVersion, picks,
      // ⛔ The share's note through the ONE projection (`maswali-share-note.ts`): an officer's words, or the neutral phrase
      // for a hold the settlement placed itself — never the settlement's own words (D19/D20).
      t.selectionsHash, t.score, t.won == null ? null : t.won ? "true" : "false", t.payout, won ? shareOf(t) : null, won ? shareNoteOf(t.frozenReason) : null,
    ];
  });
  return toCsv([[...EVIDENCE_TICKET_COLUMNS], ...rows], { bom: true });
}

/** The final week a pack or its CSV is built for — or, by name, why there is none. */
async function finalWeek(weekId: string): Promise<{ ok: true; week: StoredWeek } | { ok: false; error: string; notFinal?: true }> {
  const week = await weekStore.get(weekId);
  if (!week) return { ok: false, error: "No such week." };
  if (!evidenceReady(week)) {
    return { ok: false, notFinal: true, error: `Week ${week.code} is ${week.state.toLowerCase()}: its evidence pack is ready once it is settled or voided.` };
  }
  return { ok: true, week };
}

/**
 * R5 · THE TICKET CSV ALONE (`part=tickets`): the week and its tickets, and nothing else — no cluster report, no ledger
 * and no audit read — so a section of the pack that cannot be read never holds back the CSV a refund or a payout is
 * checked against. Byte for byte the CSV the pack names by its SHA-256.
 */
export async function maswaliEvidenceTickets(weekId: string): Promise<EvidenceTicketsResult> {
  const f = await finalWeek(weekId);
  if (!f.ok) return f;
  const tickets = await ticketStore.listForWeek(f.week.id);
  const csv = ticketCsv(tickets);
  return { ok: true, week: f.week, csv, tickets: { count: tickets.length, sha256: createHash("sha256").update(csv).digest("hex") } };
}

/**
 * ⭐ THE EVIDENCE PACK FOR ONE FINAL WEEK, and the ticket CSV it names. Refuses a week that is not final, by name.
 * A read that fails throws, so the route answers that the pack could not be built — never a pack with a hole in it;
 * the exceptions are stated in the pack itself (the ledger's `state`, the audit's `complete`, and the cluster report's
 * `readable` — one rule for every part of that report's read, R5).
 */
export async function maswaliEvidencePack(weekId: string, now: Date = new Date()): Promise<EvidenceResult> {
  const f = await finalWeek(weekId);
  if (!f.ok) return f;
  const week = f.week;
  const [questions, tickets, market] = await Promise.all([
    questionStore.listForWeek(week.id),
    ticketStore.listForWeek(week.id),
    week.marketId ? marketStore.get(week.marketId) : Promise.resolve(null),
  ]);
  const committed = tickets.filter((t) => t.status !== "CANCELLED");

  // ── The commitment, recomputed from what is stored and compared with what was published (MR-13, MB-32).
  let questionSetRecomputed: string | null = null;
  try { questionSetRecomputed = questionSetHash(questions.map(frozenOf)); } catch { questionSetRecomputed = null; }
  const rootRecomputed = merkleRoot(committed.map((t) => ({ ticketId: t.id, leaf: t.selectionsHash })));
  const verified = committed.filter((t) => {
    try { return leafHash({ weekId: week.id, ticketId: t.id, salt: t.salt, picks: t.selections }) === t.selectionsHash; } catch { return false; }
  }).length;

  // ── The audit rows: the week's life, its questions' seals, the shares Compliance decided. ⛔ No time floor: the target
  //    ids are this week's own (its id, its questions', its winners'), so they already confine the read, and a floor at
  //    the week's `createdAt` would only drop rows — a week drafted on an injected clock is stamped ahead of the real clock
  //    its audit rows carry.
  const since = new Date(0).toISOString();
  const winners = tickets.filter((t) => t.status === "SETTLED" && t.won === true);
  const reads = await Promise.all([
    getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [week.id], actions: EVIDENCE_WEEK_ACTIONS, sinceIso: since, limit: AUDIT_READ_LIMIT }),
    getAuditForTargetsDurable({
      targetType: "MaswaliQuestion",
      // The scheduler names a question it could not read by `<week>#<slot>`; those proposals belong to the week too.
      targetIds: [...questions.map((q) => q.id), ...Array.from({ length: 15 }, (_, i) => `${week.id}#${i + 1}`)],
      actions: EVIDENCE_QUESTION_ACTIONS, sinceIso: since, limit: AUDIT_READ_LIMIT,
    }),
    winners.length > 0
      ? getAuditForTargetsDurable({ targetType: "MaswaliTicket", targetIds: winners.map((t) => t.id), actions: EVIDENCE_SHARE_ACTIONS, sinceIso: since, limit: AUDIT_READ_LIMIT })
      : Promise.resolve({ entries: [] as AuditEntry[], truncated: false }),
  ]);
  // R2-10 · and the platform-wide sales pause, where it fell inside this week's sale window — R3, and a pause still in
  // force when the week opened (its start row came before the open).
  const pauses = await getAuditByActionsDurable([...EVIDENCE_PAUSE_ACTIONS], { category: "COMPLIANCE", limit: AUDIT_READ_LIMIT });
  const rows = [...reads.flatMap((r) => r.entries), ...salesPauseRowsFor(week, pauses.entries)].map(auditRow)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  // ── The money: the settlement's group (or the void's refund group), and the guarantee's own movements to the week's end
  //    — its settlement for a settled week, the void's own record for a voided one, so a pack built later reads the same
  //    lines. ⛔ The settlement's group is named as well as the instant: its lines are stamped as they post, an instant
  //    AFTER `settledAt`, so an instant alone would leave out the week's own floor top-up.
  const voidedAt = rows.find((r) => r.action === "maswali.week.voided")?.createdAt ?? null;
  const endIso = week.settledAt ?? voidedAt ?? now.toISOString();
  const guaranteeWhere: Prisma.LedgerEntryWhereInput = week.settlementGroupId
    ? { account: acct.maswaliGuarantee, OR: [{ createdAt: { lte: new Date(endIso) } }, { groupId: week.settlementGroupId }] }
    : { account: acct.maswaliGuarantee, createdAt: { lte: new Date(endIso) } };
  const [settlement, voidRefund, guarantee, forfeits] = await Promise.all([
    week.state === "SETTLED" && week.settlementGroupId ? ledgerLines({ groupId: week.settlementGroupId }) : Promise.resolve(null),
    week.state === "VOIDED" ? ledgerLines({ groupId: `maswali_void_${week.id}` }) : Promise.resolve(null),
    ledgerLines(guaranteeWhere),
    // R2-10 · each forfeit's own group: both its lines carry the week's market, so the read takes whole groups.
    week.state === "SETTLED" && week.marketId ? ledgerLines({ marketId: week.marketId, groupId: { startsWith: "maswali_forfeit_" } }) : Promise.resolve(null),
  ]);

  // ── The integrity report: every winner, with the account's standing; the shares still under review.
  const accounts = new Map((await db.user.findByIds(winners.map((t) => t.userId))).map((u) => [u.id, u] as const));
  const closeMs = Date.parse(week.closedAt ?? week.closesAt);
  const integrity: MaswaliEvidencePack["integrity"] = {
    winners: [...winners].sort((a, b) => a.serial.localeCompare(b.serial)).map((t) => {
      const u = accounts.get(t.userId);
      const createdMs = u ? Date.parse(u.createdAt) : Number.NaN;
      return {
        serial: t.serial, ticketId: t.id, accountId: t.userId, payout: Math.round(t.payout ?? 0), share: shareOf(t),
        accountRole: u?.role ?? null, accountStatus: u?.status ?? null,
        accountAgeDaysAtClose: Number.isFinite(createdMs) && Number.isFinite(closeMs) ? Math.floor((closeMs - createdMs) / 86_400_000) : null,
      };
    }),
    sharesHeld: winners.filter((t) => shareOf(t) === "held").length,
    sharesForfeited: winners.filter((t) => shareOf(t) === "forfeited").length,
  };

  // R2-3 · the report over the week's own window (it ends at the close, and the report says so): the one Compliance saw.
  // R5 · built WHOLE in one read: every crowded line's holders come in the report's own statement, with its own ticket
  // counts — never one read per line — each list as long as its count (an invariant that read asserts). A read that
  // fails is stated, never thrown: the section says `readable: false` (R6) and the pack is still built.
  // ⛔ Field by field, never a spread — the section and each of its lines: a field the report gains is a decision here,
  // not a passenger (the report's accounts carry names, and the pack carries ids only).
  const report = await clusterReport(week, now, { crowdedWhole: true });
  const lineOut = (g: ClusterReport["lines"][number]): EvidenceClusterLine => ({
    id: g.id, basis: g.basis, detail: g.detail, accountCount: g.accountCount, tickets: g.tickets, combos: g.combos,
    coverage: g.coverage, winners: g.winners, accounts: g.accounts.map(({ userId, tickets: n }) => ({ userId, tickets: n })),
  });
  const clusters: MaswaliEvidencePack["clusters"] = {
    weekId: report.weekId, code: report.code, holders: report.holders, readable: report.readable, window: report.window,
    // S6-INT · the pack's `coverage` stays the board share it always printed (`boardCoverage`); the report's read disclosure
    // (`report.coverage`, S5's object) says nothing is left out of a report built whole, so the pack does not repeat it.
    combos: report.combos, coverage: report.boardCoverage, resultsFinal: report.resultsFinal, groupsWithWinner: report.groupsWithWinner,
    order: report.lines.map((g) => g.id),
    groups: report.groups.map(lineOut),
    crowded: report.crowded.map(lineOut),
  };

  const csv = ticketCsv(tickets);
  const pack: MaswaliEvidencePack = {
    kind: "50pick.millionea.evidence",
    version: 1,
    generatedAt: now.toISOString(),
    week,
    rules: { snapshot: week.rulesSnapshot, feeSnapshot: market?.feeSnapshot ?? null },
    // R2-8a · a capture never taken says so, in words (MB-80 owed).
    questions: questions.map((q) => ({ ...q, evidenceCaptureRef: q.evidenceCaptureRef ?? EVIDENCE_CAPTURE_NOT_TAKEN })),
    commitment: {
      questionSetHash: week.questionSetHash, questionSetRecomputed,
      questionSetMatches: week.questionSetHash && questionSetRecomputed ? week.questionSetHash === questionSetRecomputed : null,
      ticketMerkleRoot: week.ticketMerkleRoot, ticketCount: week.ticketCount, rootRecomputed,
      rootMatches: week.ticketMerkleRoot ? week.ticketMerkleRoot === rootRecomputed : null,
      leaves: { committed: committed.length, verified },
    },
    audit: { rows, complete: reads.every((r) => !r.truncated) && !pauses.truncated },
    objections: week.marketId ? await db.objection.listForMarket(week.marketId) : [],
    ledger: { settlement, voidRefund, guarantee, forfeits },
    integrity,
    clusters,
    tickets: { count: tickets.length, columns: EVIDENCE_TICKET_COLUMNS, sha256: createHash("sha256").update(csv).digest("hex") },
  };
  return { ok: true, pack, csv };
}

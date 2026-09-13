/**
 * ADM3 — KYC/AML risk scoring (Batch 3 §3).
 *
 * A real, explainable risk score (0–100) derived ONLY from live signals — no
 * fabricated numbers. Every point is attributed to a named factor the officer
 * can see. Approvals at or above KYC_MAKER_CHECKER_THRESHOLD require a second
 * officer (maker-checker), enforced in the workstation actions.
 *
 * We deliberately DON'T invent a sanctions/PEP score or a document-liveness
 * score — those feeds don't exist yet, so they stay as officer-judgment
 * checklist items rather than fake meter points.
 *
 * ── ONE TRANSACTION SCAN, TWO READERS (2026-09-13) ───────────────────────────
 *
 * ⭐ WHY `kycCaseRead` EXISTS. From 2026-09-13 identity is asked before a WITHDRAWAL and before
 * nothing else (docs/COMPLIANCE-DECISIONS.md, 2026-09-13), so the officer opening /admin/kyc/[id]
 * is no longer unlocking a new account — they are deciding whether to release money the platform
 * already holds. The workstation therefore shows a "Money at stake" card, and every figure on it
 * comes from the same `db.txn.listForUser` rows this score already reads.
 * ⛔ The score used to read those rows and THROW THEM AWAY. A second scan for the card would be
 * the same query twice per case render, so the rows are returned beside the score instead:
 * `kycCaseRead` is the one read, `kycRiskScore` is kept as the narrow API the three approval
 * guards call (they need only `.score`), and `kycMoneyFacts` is the pure summary of the rows.
 *
 * ⛔ THE MONEY FACTS ARE EVIDENCE, NOT AN ATTESTATION, AND NOT A SCORE FACTOR. They are shown to
 * the officer; they add no points, and no checkbox discharges anything about them. A "the balance
 * looks legitimate" tick would be an AML judgment wearing a KYC checkbox — `escalateKycToAmlAction`
 * is the real route for a money concern.
 */
import { db, type StoredTxn, type StoredKycStageRow, type StoredWallet } from "./store";
import { getAuditPage, getAuditByActionsDurable, type AuditEntry } from "./audit";
import { readKycMoneySnapshot } from "./kyc-money";
import { formatTzs } from "@/lib/utils";

export const KYC_MAKER_CHECKER_THRESHOLD = 70;
const AML_THRESHOLD_TZS = 1_000_000;

export type RiskFactor = { label: string; points: number; detail: string };
export type KycRisk = { score: number; band: "low" | "medium" | "high"; factors: RiskFactor[] };

/** The risk score and the transaction rows it was computed from — one scan, see the header. */
export type KycCaseRead = { risk: KycRisk; txns: StoredTxn[] };

/**
 * THE ONE READ. Throws if the transaction read throws — a caller that renders money from it must
 * say the figures could not be read, never draw them as zero.
 */
export async function kycCaseRead(userId: string): Promise<KycCaseRead> {
  const factors: RiskFactor[] = [];
  const now = Date.now();
  const user = await db.user.findById(userId);
  // One user is a WHERE clause. This pulled every transaction on the platform into memory
  // to look at one player, on a page an officer opens per player.
  const txns = await db.txn.listForUser(userId);
  const confirmed = txns.filter((t) => t.status === "CONFIRMED");

  // 1 · Large withdrawals over the AML reporting threshold.
  const bigWd = confirmed.filter((t) => t.type === "WITHDRAWAL" && Math.abs(t.amount) >= AML_THRESHOLD_TZS);
  if (bigWd.length) factors.push({ label: "Large withdrawals", points: Math.min(30, bigWd.length * 15), detail: `${bigWd.length} ≥ ${formatTzs(AML_THRESHOLD_TZS)}` });

  // 2 · Transactions already held for AML review.
  const amlTxns = txns.filter((t) => t.status === "AML_REVIEW");
  if (amlTxns.length) factors.push({ label: "AML-held transactions", points: Math.min(30, amlTxns.length * 20), detail: `${amlTxns.length} awaiting AML clearance` });

  // 3 · Rapid deposit velocity (structuring signal).
  const dep24 = confirmed.filter((t) => t.type === "DEPOSIT" && Date.parse(t.createdAt) >= now - 24 * 3600_000);
  if (dep24.length >= 5) factors.push({ label: "Rapid deposits", points: Math.min(20, (dep24.length - 4) * 5), detail: `${dep24.length} deposits in 24h` });

  // 4 · Brand-new account.
  if (user && Date.parse(user.createdAt) >= now - 3 * 24 * 3600_000) {
    factors.push({ label: "New account", points: 10, detail: "opened < 3 days ago" });
  }

  // 5 · Source-of-funds missing despite large cumulative deposits.
  const totalDeposits = confirmed.filter((t) => t.type === "DEPOSIT").reduce((s, t) => s + t.amount, 0);
  const sof = await Promise.resolve(db.sourceOfFunds.get(userId)).catch(() => null);
  if (totalDeposits >= 5_000_000 && !sof) {
    factors.push({ label: "No source-of-funds", points: 15, detail: `${formatTzs(totalDeposits)} deposited, SoF not on file` });
  }

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  const band: KycRisk["band"] = score >= KYC_MAKER_CHECKER_THRESHOLD ? "high" : score >= 40 ? "medium" : "low";
  return { risk: { score, band, factors }, txns };
}

/** The score alone — what the approval guards ask. Same read, same numbers, as `kycCaseRead`. */
export async function kycRiskScore(userId: string): Promise<KycRisk> {
  return (await kycCaseRead(userId)).risk;
}

/** What one account has put in, taken out and staked — the workstation's "Money at stake" card. */
export type KycMoneyFacts = {
  /** Σ CONFIRMED deposits, and how many. */
  depositedTzs: number;
  depositCount: number;
  /** Σ CONFIRMED withdrawals that have left, and how many. */
  withdrawnTzs: number;
  withdrawalCount: number;
  /** Σ withdrawals still leaving (PROCESSING or AML_REVIEW) — owed, not yet paid. */
  inFlightTzs: number;
  /** CONFIRMED stakes (`BET_PLACED`), polls and Up & Down alike, and their sum. */
  betCount: number;
  stakedTzs: number;
  /** The first CONFIRMED deposit, or null when the account has never deposited. */
  firstDepositAt: string | null;
};

/**
 * Pure over the rows `kycCaseRead` returns. ⛔ CONFIRMED ONLY for money that has moved: a PENDING
 * deposit has not arrived and a FAILED withdrawal did not leave, and counting either would state a
 * sum the ledger does not hold. ⚠️ Amounts are taken as magnitudes — a stake or a withdrawal is
 * stored signed on some paths, and the card states flows, not a running balance (the balance is
 * the wallet's, read beside it).
 */
export function kycMoneyFacts(txns: readonly StoredTxn[]): KycMoneyFacts {
  const out: KycMoneyFacts = {
    depositedTzs: 0, depositCount: 0,
    withdrawnTzs: 0, withdrawalCount: 0,
    inFlightTzs: 0,
    betCount: 0, stakedTzs: 0,
    firstDepositAt: null,
  };
  for (const t of txns) {
    const amt = Math.abs(t.amount);
    if (t.type === "DEPOSIT" && t.status === "CONFIRMED") {
      out.depositedTzs += amt;
      out.depositCount += 1;
      if (out.firstDepositAt === null || t.createdAt < out.firstDepositAt) out.firstDepositAt = t.createdAt;
    } else if (t.type === "WITHDRAWAL") {
      if (t.status === "CONFIRMED") { out.withdrawnTzs += amt; out.withdrawalCount += 1; }
      else if (t.status === "PROCESSING" || t.status === "AML_REVIEW") out.inFlightTzs += amt;
    } else if (t.type === "BET_PLACED" && t.status === "CONFIRMED") {
      out.betCount += 1;
      out.stakedTzs += amt;
    }
  }
  return out;
}

// ── THE CASH-OUT WE REFUSED — `withdraw.kyc_blocked` (2026-09-13) ─────────────────────────────

/**
 * ⭐ THE ONLY DIRECT MEASUREMENT OF THE HARM THE 2026-09-13 LADDER CAN PRODUCE: how many times, and for
 * how much, a person reached for money they hold and was refused because we have not verified them.
 * Climbing with a short queue means the prompting is wrong; climbing with a long queue means staffing is.
 * `withdraw()` (wallet-service.ts) writes exactly one COMPLIANCE row per refusal, `targetType: "User"`,
 * with the requested `amount` in its payload.
 *
 * ⛔ DURABLE, NEVER THE RING (`getAuditByActionsDurable`): the ring is per-container and empties on every
 * deploy, so a 7-day count served from it would read low after every release. ⚠️ `truncated` is carried
 * through, and every reader below says when a count is a floor rather than a total.
 */
export const WITHDRAW_KYC_BLOCKED = "withdraw.kyc_blocked";

export type BlockedCashOut = {
  userId: string;
  at: string;
  /** What was asked for, from the row's payload. Null if a row carries none — never read as zero. */
  amountTzs: number | null;
  /** ⛔ An officer's retry (`retryWithdrawalAction` / `bulkRetryAction`, S10) is not the player reaching
   *  for their money. It is kept apart so it cannot inflate the harm count or reorder the queue. */
  operatorInitiated: boolean;
};

export function toBlockedCashOut(e: AuditEntry): BlockedCashOut | null {
  if (e.action !== WITHDRAW_KYC_BLOCKED) return null;
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const userId = e.targetId ?? (typeof p.onBehalfOf === "string" ? p.onBehalfOf : null);
  if (!userId) return null;
  const amountTzs = typeof p.amount === "number" && Number.isFinite(p.amount) ? Math.abs(p.amount) : null;
  return { userId, at: e.createdAt, amountTzs, operatorInitiated: p.operatorInitiated === true };
}

/** Newest first. `total` is a real COUNT of the action; `truncated` means `rows` stops short of it. */
export type BlockedCashOutRead = { rows: BlockedCashOut[]; total: number; truncated: boolean };

/** One durable read. Throws on a failed read — a caller renders "could not be read", never zero. */
export async function readBlockedCashOuts(limit = 1000): Promise<BlockedCashOutRead> {
  const r = await getAuditByActionsDurable([WITHDRAW_KYC_BLOCKED], { category: "COMPLIANCE", limit });
  const rows = r.entries.map(toBlockedCashOut).filter((x): x is BlockedCashOut => x !== null);
  return { rows, total: r.total, truncated: r.truncated };
}

export type BlockedCashOutWindow = {
  /** Player-initiated refusals in the window. */
  attempts: number;
  /** Distinct players among them. */
  players: number;
  /** Σ the amounts asked for, over the attempts that carry one. */
  tzs: number;
  /** Attempts whose row carries no amount — counted, not summed. */
  amountUnknown: number;
  /** Officer retries in the window, reported beside the count and never inside it. */
  operatorRetries: number;
  /** False when the read was truncated INSIDE the window: every figure above is then a floor. */
  complete: boolean;
};

/** Pure. ⚠️ `complete` is true when the read was not truncated, or when its oldest row is already older
 *  than the window — the window's boundary then fell inside the rows we hold. */
export function tallyBlockedCashOuts(read: BlockedCashOutRead, sinceMs: number): BlockedCashOutWindow {
  let attempts = 0, tzs = 0, amountUnknown = 0, operatorRetries = 0;
  const players = new Set<string>();
  for (const r of read.rows) {
    if (Date.parse(r.at) < sinceMs) continue;
    if (r.operatorInitiated) { operatorRetries += 1; continue; }
    attempts += 1;
    players.add(r.userId);
    if (r.amountTzs === null) amountUnknown += 1;
    else tzs += r.amountTzs;
  }
  const oldest = read.rows[read.rows.length - 1];
  const complete = !read.truncated || (!!oldest && Date.parse(oldest.at) < sinceMs);
  return { attempts, players: players.size, tzs, amountUnknown, operatorRetries, complete };
}

export type PlayerCashOuts = { count: number; lastAt: string; lastAmountTzs: number | null };

/** Player-initiated refusals per player, from the rows read (newest first, so the first seen is the last). */
export function blockedCashOutsByPlayer(read: BlockedCashOutRead): Map<string, PlayerCashOuts> {
  const out = new Map<string, PlayerCashOuts>();
  for (const r of read.rows) {
    if (r.operatorInitiated) continue;
    const seen = out.get(r.userId);
    if (seen) seen.count += 1;
    else out.set(r.userId, { count: 1, lastAt: r.at, lastAmountTzs: r.amountTzs });
  }
  return out;
}

// ── QUEUE ORDER — money-weighted AGE, never a product (2026-09-13) ────────────────────────────

/**
 * ⭐ WHY THE REVIEW QUEUE IS NO LONGER PLAIN FIFO BY DEFAULT. From 2026-09-13 a file with us can be a
 * withdrawal waiting on our review (COMPLIANCE-DECISIONS 2026-09-13, S14). The officer's default order is:
 *   1. a player whose cash-out we have ALREADY refused — they asked for their money and were told to wait;
 *   2. then by the BUCKET of what the account holds — ≥ TZS 1,000,000 (the AML two-officer threshold),
 *      ≥ TZS 100,000, any balance, nothing;
 *   3. then oldest first WITHIN the bucket, whichever way the buckets are read.
 *
 * ⛔ BUCKETS, NOT A CONTINUOUS PRODUCT. `balance × age` lets one large balance leapfrog a week-old small
 * one indefinitely — the queue would quietly starve small balances, a fairness failure a regulator names.
 * A bucket bounds the jump: within one, time decides.
 * ⛔ AN ORDERING AID, NOT A POLICY. It decides who is looked at first, never whether anyone is reviewed,
 * and no ruling set these floors — they are orders of magnitude, with the one meaningful line (TZS 1M)
 * borrowed from the AML hold. Oldest-first (FIFO) stays one labelled click away on every queue that
 * offers this order, and `listPendingKyc` itself still returns FIFO.
 * ⛔ MONEY RIGHTS ONLY. The held bucket is a standing-balance fact, so a page offers this order only to a
 * viewer with money rights whose wallet read succeeded; everyone else gets FIFO.
 */
export type KycHeldBucket = 0 | 1 | 2 | 3;

export function kycHeldBucket(heldTzs: number): KycHeldBucket {
  if (heldTzs >= AML_THRESHOLD_TZS) return 3;
  if (heldTzs >= 100_000) return 2;
  if (heldTzs > 0) return 1;
  return 0;
}

export const KYC_HELD_BUCKET_LABEL: Record<KycHeldBucket, string> = {
  3: "Holds ≥ TZS 1M",
  2: "Holds ≥ TZS 100K",
  1: "Holds money",
  0: "Holds nothing",
};

export type QueuePriorityFacts = { attemptedCashOut: boolean; heldTzs: number; waitingSince: string | null };

/** The rank alone: a refused cash-out outranks every bucket, then the bucket. Never multiplied by age. */
export function kycQueuePriority(p: Pick<QueuePriorityFacts, "attemptedCashOut" | "heldTzs">): number {
  return (p.attemptedCashOut ? 10 : 0) + kycHeldBucket(p.heldTzs);
}

/**
 * The comparator. `desc` = highest priority first (the default). ⛔ The tie-break is ALWAYS oldest first,
 * in both directions — flipping the buckets must not also flip time, or "lowest priority first" would
 * starve the oldest file of its own bucket.
 */
export function compareQueuePriority<T>(get: (row: T) => QueuePriorityFacts, dir: "asc" | "desc" = "desc"): (a: T, b: T) => number {
  return (a, b) => {
    const A = get(a), B = get(b);
    const rank = kycQueuePriority(B) - kycQueuePriority(A);
    if (rank !== 0) return dir === "desc" ? rank : -rank;
    return (A.waitingSince ?? "").localeCompare(B.waitingSince ?? "");
  };
}

/** "42m", "7h", "3d 4h" — how long a file has waited. An age, never a clock time; one spelling for every queue. */
export function kycWaitedLabel(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(0, Math.floor(ms / 60_000))}m`;
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

// ── THE QUEUE PAGES' ONE READ OF IDENTITY × MONEY (2026-09-13) ───────────────────────────────

export type KycQueueIdentity = {
  /** Newest submission per user (`listStageFacts`), or null when that read FAILED. */
  facts: StoredKycStageRow[] | null;
  /** Every wallet, or null — either the viewer has no money rights (never read) or the read failed. */
  wallets: StoredWallet[] | null;
  /** True only when a money viewer's wallet read FAILED — the two nulls above must not read alike. */
  walletsFailed: boolean;
};

/**
 * ⭐ WHAT /admin/kyc AND /admin/approvals BOTH NEED, READ ONE WAY. The files (for the stage words and
 * "was identity ever approved"), and — for a viewer with money rights only — the wallets, for the held
 * bucket, the priority order and the funded list. Two hand-written copies of this would drift on the
 * failure branches, which is exactly where a compliance screen must not.
 *
 * 🔴 `canSeeMoney` IS ASKED BY THE CALLER BEFORE THIS RUNS, and a viewer without it never reads a wallet —
 * privileged data that is never fetched cannot leak (RBAC: SUPPORT reads `money.figures` masked).
 * ⭐ `readKycMoneySnapshot` for a money viewer, so its FACTS-FIRST order (the safe skew on a compliance
 * figure) is kept. ⛔ Never throws, and a failure is never an empty list: the facts failing leaves the
 * wallets readable on their own (nothing is joined to them), and the wallets failing leaves the files.
 */
export async function readKycQueueIdentity(canSeeMoney: boolean): Promise<KycQueueIdentity> {
  const readFacts = async (): Promise<StoredKycStageRow[] | null> => {
    try { return await db.kyc.listStageFacts(); } catch { return null; }
  };
  if (!canSeeMoney) return { facts: await readFacts(), wallets: null, walletsFailed: false };
  const snap = await readKycMoneySnapshot();
  if (snap.ok) return { facts: snap.facts, wallets: snap.wallets, walletsFailed: false };
  if (snap.failed === "wallets") return { facts: await readFacts(), wallets: null, walletsFailed: true };
  let wallets: StoredWallet[] | null = null;
  try { wallets = await db.wallet.listAll(); } catch { wallets = null; }
  return { facts: null, wallets, walletsFailed: wallets === null };
}

/** Audit-derived approval recommendation (maker) for the high-risk two-officer
 *  path. Returns the recommender + when, if a live recommendation exists that
 *  is newer than the last decision reset. */
export async function getApprovalRecommendation(userId: string): Promise<{ officerId: string; officerName: string | null; at: string } | null> {
  const events = getAuditPage({ category: "COMPLIANCE", limit: 10000 }).filter(
    (e) => e.targetId === userId && (e.action === "kyc.approve.recommended" || e.action === "kyc.approve.recommendation_cleared"),
  );
  const latest = events[0]; // newest-first
  if (!latest || latest.action !== "kyc.approve.recommended" || !latest.actorId) return null;
  const u = await db.user.findById(latest.actorId);
  return { officerId: latest.actorId, officerName: u?.displayName?.trim() || latest.actorId, at: latest.createdAt };
}

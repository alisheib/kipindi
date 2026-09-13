/**
 * S1 — WHAT HAPPENS TO THE BALANCE OF A PLAYER WE HAVE FINALLY REFUSED.
 *
 * ⭐ THE HOLE THIS CLOSES (docs/COMPLIANCE-DECISIONS.md 2026-09-13). From 2026-09-13 a player deposits
 * and plays BEFORE anyone checks who they are. So a refusal at identity review can land on an account
 * holding real money — and before this module the platform had no answer at all: no refund path, no
 * forfeiture path, no ledger action, no published rule. A 16-year-old who typed a false date of birth,
 * deposited, won and was refused `UNDERAGE` at cash-out would have left a balance in the wallet forever.
 *
 * ⭐ ALI'S RULING: an officer decides each case, with a recorded reason. No fixed rule. What makes that a
 * POLICY rather than a gap is the shape built here:
 *   1. a CLOSED set of four outcomes (`refused-funds-outcomes.ts`), each writing its OWN audit action;
 *   2. a mandatory typed justification, and the deciding officer is never the player;
 *   3. REAL money actions — a return goes through the ordinary payout rail (`withdraw()` with the
 *      narrowly-typed `refusedFundsReturn` option: the same exactly-once transaction, the same
 *      reconcile sweep, the same TZS 1,000,000 two-officer AML hold, registered number only, no fee);
 *      a forfeiture is a confirmed debit posted atomically with its ledger group;
 *   4. the player is told the decision and the refusal reason (Terms §3a promises exactly that);
 *   5. ONE report an inspector can be handed (`refusedFundsReport`).
 *
 * ⛔ WHO IT APPLIES TO: an account whose verification stands REJECTED on a FINAL code (`UNDERAGE`,
 * `SANCTIONED`, `DUPLICATE_IDENTITY`). The refusal itself froze the wallet (`kyc-service.ts`). A
 * recoverable refusal is not decided here — the player can simply submit again. An account once
 * approved and later finally refused IS decided here too: its wallet is frozen like any other, and
 * nobody else can decide what happens to the money in it.
 *
 * ⛔ WHAT IT MUST NEVER DO: decide while money is in flight (a hold), return below the rail minimum,
 * return while the payout rail is not accepting requests, or move money before every precondition that
 * can be checked has been checked. The order inside a decision is fixed and commented where it happens.
 */
import { db, type StoredTxn } from "./store";
import { audit, getAuditByActionsDurable, type AuditEntry } from "./audit";
import { withLock } from "./locks";
import { withdraw, forfeitRefusedBalance } from "./wallet-service";
import { getPayoutStatus, payoutsAcceptingRequests } from "./payout-status";
import { addWalletFreeze } from "./wallet-freeze";
import { randomId } from "./crypto";
import { notifyRefusedFundsDecision } from "./notification-service";
import { sendEmailToUser, refusedFundsDecisionHtml } from "./email";
import { isFinalRefusal } from "@/lib/kyc-refusal";
import { currentFreezeReasons } from "@/lib/wallet-freeze-reasons";
import { PROVIDER_MIN_PAYOUT_TZS } from "@/lib/payout";
import { normalizeTzLocalDigits } from "@/lib/phone-normalize";
import {
  REFUSED_FUNDS_ACTION,
  REFUSED_FUNDS_OUTCOMES,
  RETURNS_MONEY,
  REFUSED_FUNDS_JUSTIFICATION_MIN,
  REFUSED_FUNDS_JUSTIFICATION_MAX,
  isRefusedFundsOutcome,
  isReturnProvider,
  type RefusedFundsOutcome,
  type ReturnProvider,
} from "@/lib/refused-funds-outcomes";

/** The player-safe sentence for each final code — the reason the player is WRITTEN (never the officer's note). */
const PLAYER_REASON: Record<string, string> = {
  UNDERAGE: "You must be 18 or older to use 50pick.",
  SANCTIONED: "We're unable to verify this identity.",
  DUPLICATE_IDENTITY: "This identity is already registered to another account.",
};

type Availability = { allowed: boolean; why: string | null; returnTzs: number; forfeitTzs: number };

export type RefusedFundsPosition = {
  userId: string;
  /** May an officer take a decision on this account at all? */
  eligible: boolean;
  /** Officer-facing reason when not eligible. */
  whyNot: string | null;
  kycId: string | null;
  kycStatus: string | null;
  rejectReason: string | null;
  walletStatus: "ACTIVE" | "FROZEN" | "CLOSED" | null;
  walletHolds: string[];
  balance: number;
  hold: number;
  bonusBalance: number;
  /** Σ confirmed deposits, gross. */
  confirmedDeposits: number;
  /** Σ withdrawals that have left or are leaving (CONFIRMED / PROCESSING / AML_REVIEW). */
  paidOut: number;
  /** min(balance, max(0, deposits − paid out)) — what "return the deposits" would send. */
  returnableDeposits: number;
  /** Network of the most recent confirmed mobile-money deposit — the form's default for a return. */
  lastDepositProvider: ReturnProvider | null;
  payoutsOpen: boolean;
  minPayout: number;
  outcomes: Record<RefusedFundsOutcome, Availability>;
};

function moneyFacts(txns: StoredTxn[]) {
  const confirmedDeposits = txns
    .filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const paidOut = txns
    .filter((t) => t.type === "WITHDRAWAL" && (t.status === "CONFIRMED" || t.status === "PROCESSING" || t.status === "AML_REVIEW"))
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const lastMobileMoney = txns
    .filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED" && isReturnProvider(t.provider))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    confirmedDeposits,
    paidOut,
    lastDepositProvider: lastMobileMoney && isReturnProvider(lastMobileMoney.provider) ? lastMobileMoney.provider : null,
  };
}

const NONE: Availability = { allowed: false, why: null, returnTzs: 0, forfeitTzs: 0 };

/**
 * Everything an officer needs to decide, read fresh, with each outcome's availability AND the reason
 * when it is not available — so the case page offers no choice the server would refuse.
 */
export async function refusedFundsPosition(userId: string): Promise<RefusedFundsPosition> {
  const [k, w, txns, payouts] = await Promise.all([
    db.kyc.findByUserId(userId),
    db.wallet.findByUserId(userId),
    db.txn.listForUser(userId),
    getPayoutStatus(),
  ]);
  const facts = moneyFacts(txns);
  const balance = w?.balance ?? 0;
  const hold = w?.hold ?? 0;
  const payoutsOpen = payoutsAcceptingRequests(payouts.status);
  const returnableDeposits = Math.min(balance, Math.max(0, facts.confirmedDeposits - facts.paidOut));

  const base = {
    userId,
    kycId: k?.id ?? null,
    kycStatus: k?.status ?? null,
    rejectReason: k?.rejectReason ?? null,
    walletStatus: w?.status ?? null,
    walletHolds: w ? currentFreezeReasons(w) : [],
    balance,
    hold,
    bonusBalance: w?.bonusBalance ?? 0,
    confirmedDeposits: facts.confirmedDeposits,
    paidOut: facts.paidOut,
    returnableDeposits,
    lastDepositProvider: facts.lastDepositProvider,
    payoutsOpen,
    minPayout: PROVIDER_MIN_PAYOUT_TZS,
  };
  const closedOutcomes = { RETURN_DEPOSITS: NONE, RETURN_BALANCE: NONE, HOLD_PENDING_APPEAL: NONE, FORFEIT: NONE };

  if (!k || k.status !== "REJECTED" || !isFinalRefusal(k.rejectReason)) {
    return {
      ...base, eligible: false, outcomes: closedOutcomes,
      whyNot: "Only a verification refused on a FINAL code (under 18, sanctions, duplicate identity) has a balance to decide here. A recoverable refusal is resubmitted by the player.",
    };
  }
  if (!w) return { ...base, eligible: false, outcomes: closedOutcomes, whyNot: "This player has no wallet." };
  if (w.status === "CLOSED") return { ...base, eligible: false, outcomes: closedOutcomes, whyNot: "The wallet is closed." };

  // The preconditions every money outcome shares.
  const moneyBlock =
    hold > 0 ? `A payout of ${hold.toLocaleString("en")} TZS is already in flight. Wait for it to settle, then decide.`
    : balance <= 0 ? "There is no withdrawable balance to decide."
    : null;
  const railBlock = payoutsOpen ? null : "The payout rail is not accepting requests right now, so nothing can be sent.";
  const belowMin = (n: number) => `TZS ${n.toLocaleString("en")} is below the smallest amount the payout rail can send (TZS ${PROVIDER_MIN_PAYOUT_TZS.toLocaleString("en")}).`;

  const returnDeposits: Availability = (() => {
    if (moneyBlock) return { allowed: false, why: moneyBlock, returnTzs: 0, forfeitTzs: 0 };
    if (returnableDeposits <= 0) return { allowed: false, why: "Nothing the player paid in is left to return — every deposit is accounted for by earlier payouts.", returnTzs: 0, forfeitTzs: 0 };
    if (railBlock) return { allowed: false, why: railBlock, returnTzs: returnableDeposits, forfeitTzs: balance - returnableDeposits };
    if (returnableDeposits < PROVIDER_MIN_PAYOUT_TZS) return { allowed: false, why: belowMin(returnableDeposits), returnTzs: returnableDeposits, forfeitTzs: balance - returnableDeposits };
    return { allowed: true, why: null, returnTzs: returnableDeposits, forfeitTzs: balance - returnableDeposits };
  })();
  const returnBalance: Availability = (() => {
    if (moneyBlock) return { allowed: false, why: moneyBlock, returnTzs: 0, forfeitTzs: 0 };
    if (railBlock) return { allowed: false, why: railBlock, returnTzs: balance, forfeitTzs: 0 };
    if (balance < PROVIDER_MIN_PAYOUT_TZS) return { allowed: false, why: belowMin(balance), returnTzs: balance, forfeitTzs: 0 };
    return { allowed: true, why: null, returnTzs: balance, forfeitTzs: 0 };
  })();
  const forfeit: Availability = moneyBlock
    ? { allowed: false, why: moneyBlock, returnTzs: 0, forfeitTzs: 0 }
    : { allowed: true, why: null, returnTzs: 0, forfeitTzs: balance };
  const holdOutcome: Availability = { allowed: true, why: null, returnTzs: 0, forfeitTzs: 0 };

  return {
    ...base,
    eligible: true,
    whyNot: null,
    outcomes: { RETURN_DEPOSITS: returnDeposits, RETURN_BALANCE: returnBalance, HOLD_PENDING_APPEAL: holdOutcome, FORFEIT: forfeit },
  };
}

export type RefusedFundsDecision =
  | {
      ok: true;
      decisionId: string;
      outcome: RefusedFundsOutcome;
      returnedTzs: number;
      forfeitedTzs: number;
      payoutTxnId: string | null;
      payoutStatus: string | null;
      /** Set when a return's payout did not start. The decision and any forfeiture stand; the rest of
       *  the balance stays frozen for the officer to decide again. */
      payoutError: string | null;
    }
  | { ok: false; error: string };

/**
 * Carry out an officer's decision about a finally-refused player's balance.
 *
 * ⛔ THE ORDER IS THE CONTRACT:
 *   1. every precondition that can be checked is checked, on a fresh read, before any money moves;
 *   2. the identity-refusal hold is confirmed on the wallet (a refusal written before 2026-09-13 has none);
 *   3. a forfeiture (FORFEIT, or the remainder of RETURN_DEPOSITS) commits atomically FIRST — if it
 *      fails, nothing has moved and the decision is refused;
 *   4. then the return payout is dispatched through `withdraw()`;
 *   5. then the decision is written, AWAITED, under its own audit action, whatever step 4 returned;
 *   6. then — only if everything was carried out — the player is told.
 * Serialised per player, so two officers cannot decide the same balance at once.
 */
export async function decideRefusedFunds(input: {
  officerId: string;
  userId: string;
  outcome: string;
  justification: string;
  provider?: string | null;
}): Promise<RefusedFundsDecision> {
  const { officerId, userId } = input;
  if (!userId) return { ok: false, error: "Missing player." };
  if (officerId === userId) {
    audit({ category: "SECURITY", action: "kyc.refused_funds.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: "You cannot decide about your own balance." };
  }
  if (!isRefusedFundsOutcome(input.outcome)) return { ok: false, error: `Choose one of: ${REFUSED_FUNDS_OUTCOMES.join(", ")}.` };
  const outcome = input.outcome;
  const justification = (input.justification ?? "").trim().slice(0, REFUSED_FUNDS_JUSTIFICATION_MAX);
  if (justification.length < REFUSED_FUNDS_JUSTIFICATION_MIN) {
    return { ok: false, error: `A written justification of at least ${REFUSED_FUNDS_JUSTIFICATION_MIN} characters is required.` };
  }
  const provider = RETURNS_MONEY.has(outcome) ? input.provider : null;
  if (RETURNS_MONEY.has(outcome) && !isReturnProvider(provider)) {
    return { ok: false, error: "Choose the mobile-money network the money should be returned on." };
  }

  return withLock(`refused-funds:${userId}`, async (): Promise<RefusedFundsDecision> => {
    // ── 1 · fresh preconditions ───────────────────────────────────────────────
    const pos = await refusedFundsPosition(userId);
    if (!pos.eligible) return { ok: false, error: pos.whyNot ?? "This account has no balance decision to take." };
    const avail = pos.outcomes[outcome];
    if (!avail.allowed) return { ok: false, error: avail.why ?? "That outcome is not available for this account." };
    const user = await db.user.findById(userId);
    if (!user) return { ok: false, error: "Player not found." };

    // ── 2 · the freeze must be standing ─────────────────────────────────────────
    if (!pos.walletHolds.includes("IDENTITY_REFUSED")) {
      const f = await addWalletFreeze(userId, "IDENTITY_REFUSED", { actorId: officerId, note: `identity refused · ${pos.rejectReason}`, ref: { kycId: pos.kycId, via: "refused-funds" } });
      if (!f.ok) return { ok: false, error: `The wallet could not be frozen, so nothing was decided: ${f.error}` };
    }

    const decisionId = `rfd_${randomId(10)}`;
    let forfeitedTzs = 0;
    let forfeitTxnId: string | null = null;

    // ── 3 · forfeiture first, atomically ────────────────────────────────────────
    if (avail.forfeitTzs > 0) {
      const f = await forfeitRefusedBalance({ userId, officerId, amountTzs: avail.forfeitTzs, decisionRef: decisionId, note: justification });
      if (!f.ok) return { ok: false, error: f.error };
      forfeitedTzs = avail.forfeitTzs;
      forfeitTxnId = f.txnId;
    }

    // ── 4 · the return payout ───────────────────────────────────────────────────
    let payoutTxnId: string | null = null;
    let payoutStatus: string | null = null;
    let payoutError: string | null = null;
    let returnedTzs = 0;
    if (RETURNS_MONEY.has(outcome) && avail.returnTzs > 0) {
      const r = await withdraw(
        userId,
        { provider: provider as ReturnProvider, amount: avail.returnTzs, msisdn: normalizeTzLocalDigits(user.phoneE164) },
        `rfd:${decisionId}`,
        officerId,
        { refusedFundsReturn: { decisionId } },
      );
      if (r.ok && r.data) {
        payoutTxnId = r.data.txnId;
        payoutStatus = r.data.status;
        returnedTzs = avail.returnTzs;
      } else {
        payoutError = r.ok ? "The payout returned no transaction." : r.error;
      }
    }

    // ── 5 · the decision, under its own action, whatever happened above ─────────
    await audit({
      category: "COMPLIANCE",
      action: REFUSED_FUNDS_ACTION[outcome],
      actorId: officerId,
      targetType: "User",
      targetId: userId,
      payload: {
        decisionId,
        outcome,
        justification,
        kycId: pos.kycId,
        rejectCode: pos.rejectReason,
        balanceBefore: pos.balance,
        confirmedDeposits: pos.confirmedDeposits,
        paidOutBefore: pos.paidOut,
        returnableDeposits: pos.returnableDeposits,
        intendedReturnTzs: RETURNS_MONEY.has(outcome) ? avail.returnTzs : 0,
        returnedTzs,
        forfeitedTzs,
        forfeitTxnId,
        payoutTxnId,
        payoutStatus,
        payoutError,
        provider: provider ?? null,
        instruction: "Owner ruling 2026-09-13 · an officer decides a finally-refused player's balance case by case, with a recorded reason",
      },
    });

    // ── 6 · the player is told — only when the decision was carried out in full ──
    if (!payoutError) {
      const facts = { outcome, returnedTzs, forfeitedTzs, balanceTzs: pos.balance };
      notifyRefusedFundsDecision(userId, facts).catch(() => {});
      sendEmailToUser(userId, (email) => ({
        to: email,
        subject: outcome === "HOLD_PENDING_APPEAL" ? "Your balance is held · Salio lako limeshikiliwa" : "Decision on your balance · Uamuzi kuhusu salio lako",
        html: refusedFundsDecisionHtml({ ...facts, reason: PLAYER_REASON[pos.rejectReason ?? ""] ?? "We're unable to verify this identity.", reference: decisionId }),
        tag: "kyc-refused-funds",
      })).catch(() => {});
    }

    return { ok: true, decisionId, outcome, returnedTzs, forfeitedTzs, payoutTxnId, payoutStatus, payoutError };
  });
}

// ── THE REPORT AN INSPECTOR CAN BE HANDED ───────────────────────────────────────

export type RefusedFundsDecisionRow = {
  at: string;
  decisionId: string | null;
  outcome: RefusedFundsOutcome | null;
  officerId: string | null;
  userId: string | null;
  justification: string;
  rejectCode: string | null;
  balanceBefore: number | null;
  returnedTzs: number;
  forfeitedTzs: number;
  payoutTxnId: string | null;
  payoutStatus: string | null;
  payoutError: string | null;
  entryHash: string | null;
};

export type RefusedAccountRow = {
  userId: string;
  kycId: string;
  rejectCode: string;
  balance: number;
  hold: number;
  walletStatus: "ACTIVE" | "FROZEN" | "CLOSED" | null;
  lastDecision: RefusedFundsDecisionRow | null;
  /** Money is held and no decision has closed the case (none taken, or the last one was a hold). */
  open: boolean;
};

const OUTCOME_BY_ACTION = new Map(Object.entries(REFUSED_FUNDS_ACTION).map(([o, a]) => [a, o as RefusedFundsOutcome]));

function num(x: unknown): number { return typeof x === "number" && Number.isFinite(x) ? x : 0; }
function str(x: unknown): string | null { return typeof x === "string" ? x : null; }

export function toDecisionRow(e: AuditEntry): RefusedFundsDecisionRow {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  return {
    at: e.createdAt,
    decisionId: str(p.decisionId),
    outcome: OUTCOME_BY_ACTION.get(e.action) ?? null,
    officerId: e.actorId ?? null,
    userId: e.targetId ?? null,
    justification: str(p.justification) ?? "",
    rejectCode: str(p.rejectCode),
    balanceBefore: typeof p.balanceBefore === "number" ? p.balanceBefore : null,
    returnedTzs: num(p.returnedTzs),
    forfeitedTzs: num(p.forfeitedTzs),
    payoutTxnId: str(p.payoutTxnId),
    payoutStatus: str(p.payoutStatus),
    payoutError: str(p.payoutError),
    entryHash: e.entryHash ?? null,
  };
}

/**
 * Every balance decision ever taken, beside every finally-refused account and where its money stands.
 *
 * ⛔ DURABLE, NEVER THE RING — a report that claims completeness must come from the table
 * (`getAuditByActionsDurable`). ⚠️ `decisionsTruncated` and `accountsFailed` are returned so the page
 * can say so: a list that quietly stops, or a failed read shown as "no refused accounts", is a false
 * compliance all-clear.
 */
export async function refusedFundsReport(): Promise<{
  decisions: RefusedFundsDecisionRow[];
  decisionsTotal: number;
  decisionsTruncated: boolean;
  accounts: RefusedAccountRow[];
  accountsFailed: boolean;
}> {
  const durable = await getAuditByActionsDurable(Object.values(REFUSED_FUNDS_ACTION), { category: "COMPLIANCE", limit: 2000 });
  const decisions = durable.entries.map(toDecisionRow);
  const lastByUser = new Map<string, RefusedFundsDecisionRow>();
  for (const d of decisions) if (d.userId && !lastByUser.has(d.userId)) lastByUser.set(d.userId, d); // newest first

  let accounts: RefusedAccountRow[] = [];
  let accountsFailed = false;
  try {
    const [facts, wallets] = await Promise.all([db.kyc.listStageFacts(), db.wallet.listAll()]);
    const walletByUser = new Map(wallets.map((w) => [w.userId, w]));
    accounts = facts
      .filter((f) => f.status === "REJECTED" && isFinalRefusal(f.rejectReason))
      .map((f) => {
        const w = walletByUser.get(f.userId);
        const last = lastByUser.get(f.userId) ?? null;
        const held = (w?.balance ?? 0) + (w?.hold ?? 0);
        return {
          userId: f.userId,
          kycId: f.id,
          rejectCode: f.rejectReason ?? "",
          balance: w?.balance ?? 0,
          hold: w?.hold ?? 0,
          walletStatus: w?.status ?? null,
          lastDecision: last,
          open: held > 0 && (!last || last.outcome === "HOLD_PENDING_APPEAL"),
        };
      })
      .sort((a, b) => Number(b.open) - Number(a.open) || (b.balance + b.hold) - (a.balance + a.hold));
  } catch {
    accountsFailed = true;
  }
  return { decisions, decisionsTotal: durable.total, decisionsTruncated: durable.truncated, accounts, accountsFailed };
}
